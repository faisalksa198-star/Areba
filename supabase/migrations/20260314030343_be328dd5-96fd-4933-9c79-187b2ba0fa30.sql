
-- Add submitted_at column to orders (the actual submission date by leader)
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS submitted_at timestamp with time zone DEFAULT NULL;

-- Backfill: for orders already submitted, set submitted_at = updated_at
UPDATE public.orders SET submitted_at = updated_at WHERE data_submitted = true AND submitted_at IS NULL;

-- Create season_settings table
CREATE TABLE public.season_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_name text NOT NULL DEFAULT '',
  start_date date NOT NULL,
  end_date date NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.season_settings ENABLE ROW LEVEL SECURITY;

-- Anyone authenticated can view
CREATE POLICY "Auth can view season_settings" ON public.season_settings FOR SELECT TO authenticated USING (true);

-- Owners/managers can manage
CREATE POLICY "Owners/managers insert season_settings" ON public.season_settings FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Owners/managers update season_settings" ON public.season_settings FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Owners/managers delete season_settings" ON public.season_settings FOR DELETE TO authenticated USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- Insert default season
INSERT INTO public.season_settings (season_name, start_date, end_date, is_active)
VALUES ('موسم 2025-2026', '2025-10-01', '2026-05-31', true);
