
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS logo_embroidery_image_url text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS back_embroidery_image_urls text[] DEFAULT '{}';
