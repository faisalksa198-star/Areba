
-- Add purple package fields to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS purple_package_enabled boolean DEFAULT false;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS purple_package_count integer DEFAULT 0;

-- Add purple package field to students
ALTER TABLE public.students ADD COLUMN IF NOT EXISTS has_purple_package boolean DEFAULT false;
