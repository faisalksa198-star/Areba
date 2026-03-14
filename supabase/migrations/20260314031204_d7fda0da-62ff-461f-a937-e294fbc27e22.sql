
-- Replace the order number generation function to use active season
CREATE OR REPLACE FUNCTION public.generate_order_number()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
DECLARE
  _season_name text;
  _next_num integer;
BEGIN
  -- Get the active season name (should be a year number like 2026, 2027)
  SELECT season_name INTO _season_name
  FROM public.season_settings
  WHERE is_active = true
  LIMIT 1;

  -- Fallback to current year if no active season
  IF _season_name IS NULL THEN
    _season_name := EXTRACT(YEAR FROM now())::text;
  END IF;

  -- Find the max order number for this season prefix and increment
  SELECT COALESCE(
    MAX(
      CASE
        WHEN order_number LIKE _season_name || '-%'
        THEN NULLIF(split_part(order_number, '-', 2), '')::integer
        ELSE NULL
      END
    ),
    4999
  ) + 1
  INTO _next_num
  FROM public.orders
  WHERE order_number LIKE _season_name || '-%';

  NEW.order_number := _season_name || '-' || _next_num::text;
  RETURN NEW;
END;
$function$;

-- Function to ensure only one season is active at a time
CREATE OR REPLACE FUNCTION public.enforce_single_active_season()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.is_active = true THEN
    UPDATE public.season_settings
    SET is_active = false
    WHERE id != NEW.id AND is_active = true;
  END IF;
  RETURN NEW;
END;
$function$;

-- Create trigger for single active season
DROP TRIGGER IF EXISTS trg_single_active_season ON public.season_settings;
CREATE TRIGGER trg_single_active_season
  BEFORE INSERT OR UPDATE ON public.season_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_single_active_season();
