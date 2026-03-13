ALTER TABLE public.extra_scarves 
ADD COLUMN IF NOT EXISTS has_logo_embroidery boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS back_embroidery_text text;