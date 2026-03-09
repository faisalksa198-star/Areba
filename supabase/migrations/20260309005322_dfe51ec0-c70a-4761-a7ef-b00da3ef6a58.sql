-- Add shipping fields to orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS recipient_name text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS recipient_phone text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS shipping_city_id uuid REFERENCES public.cities(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS district text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS address_details text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS national_address text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS data_submitted boolean DEFAULT false;