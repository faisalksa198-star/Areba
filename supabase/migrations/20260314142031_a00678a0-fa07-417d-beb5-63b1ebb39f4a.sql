
-- Add ready_kit-like default columns to salla_products
ALTER TABLE public.salla_products
  ADD COLUMN abaya_design_id uuid REFERENCES public.abaya_designs(id),
  ADD COLUMN sleeve_style_id uuid REFERENCES public.sleeve_styles(id),
  ADD COLUMN scarf_style_id uuid REFERENCES public.scarf_styles(id),
  ADD COLUMN scarf_method_id uuid REFERENCES public.scarf_methods(id),
  ADD COLUMN hat_style_id uuid REFERENCES public.hat_styles(id),
  ADD COLUMN font_id uuid REFERENCES public.fonts(id),
  ADD COLUMN date_type_id uuid REFERENCES public.date_types(id),
  ADD COLUMN embroidery_direction_id uuid REFERENCES public.embroidery_directions(id),
  ADD COLUMN embroidery_color text,
  ADD COLUMN abaya_color text,
  ADD COLUMN abaya_color_degree text,
  ADD COLUMN scarf_color text,
  ADD COLUMN scarf_color_degree text,
  ADD COLUMN hat_color text,
  ADD COLUMN hat_color_degree text,
  ADD COLUMN sleeve_color text;

-- Add source_table to salla_product_options for dynamic data linking
ALTER TABLE public.salla_product_options
  ADD COLUMN source_table text;
