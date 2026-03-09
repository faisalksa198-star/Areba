-- Add optional image for date types (to display in scarf summary cards)
ALTER TABLE public.date_types
ADD COLUMN IF NOT EXISTS image_url text;