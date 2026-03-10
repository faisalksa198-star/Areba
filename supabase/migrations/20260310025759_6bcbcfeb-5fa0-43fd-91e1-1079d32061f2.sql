
-- Add 'shipped' to order_status enum
ALTER TYPE public.order_status ADD VALUE IF NOT EXISTS 'shipped' BEFORE 'completed';

-- Add tracking_number column to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS tracking_number text;
