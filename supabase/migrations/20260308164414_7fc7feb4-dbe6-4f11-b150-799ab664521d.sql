
-- Fix RLS policies for all master data tables: change from RESTRICTIVE to PERMISSIVE

-- abaya_designs
DROP POLICY IF EXISTS "Auth can view designs" ON public.abaya_designs;
DROP POLICY IF EXISTS "Owners/managers manage designs" ON public.abaya_designs;
CREATE POLICY "Anyone can view designs" ON public.abaya_designs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owners/managers manage designs" ON public.abaya_designs FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Owners/managers update designs" ON public.abaya_designs FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Owners/managers delete designs" ON public.abaya_designs FOR DELETE TO authenticated USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- sleeve_styles
DROP POLICY IF EXISTS "Auth can view sleeves" ON public.sleeve_styles;
DROP POLICY IF EXISTS "Owners/managers manage sleeves" ON public.sleeve_styles;
CREATE POLICY "Anyone can view sleeves" ON public.sleeve_styles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owners/managers insert sleeves" ON public.sleeve_styles FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Owners/managers update sleeves" ON public.sleeve_styles FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Owners/managers delete sleeves" ON public.sleeve_styles FOR DELETE TO authenticated USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- scarf_styles
DROP POLICY IF EXISTS "Auth can view scarves" ON public.scarf_styles;
DROP POLICY IF EXISTS "Owners/managers manage scarves" ON public.scarf_styles;
CREATE POLICY "Anyone can view scarves" ON public.scarf_styles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owners/managers insert scarves" ON public.scarf_styles FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Owners/managers update scarves" ON public.scarf_styles FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Owners/managers delete scarves" ON public.scarf_styles FOR DELETE TO authenticated USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- fonts
DROP POLICY IF EXISTS "Auth can view fonts" ON public.fonts;
DROP POLICY IF EXISTS "Owners/managers manage fonts" ON public.fonts;
CREATE POLICY "Anyone can view fonts" ON public.fonts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owners/managers insert fonts" ON public.fonts FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Owners/managers update fonts" ON public.fonts FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Owners/managers delete fonts" ON public.fonts FOR DELETE TO authenticated USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- cities
DROP POLICY IF EXISTS "Auth can view cities" ON public.cities;
DROP POLICY IF EXISTS "Owners/managers manage cities" ON public.cities;
CREATE POLICY "Anyone can view cities" ON public.cities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owners/managers insert cities" ON public.cities FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Owners/managers update cities" ON public.cities FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Owners/managers delete cities" ON public.cities FOR DELETE TO authenticated USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- ready_kits
DROP POLICY IF EXISTS "Auth can view kits" ON public.ready_kits;
DROP POLICY IF EXISTS "Owners/managers manage kits" ON public.ready_kits;
CREATE POLICY "Anyone can view kits" ON public.ready_kits FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owners/managers insert kits" ON public.ready_kits FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Owners/managers update kits" ON public.ready_kits FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Owners/managers delete kits" ON public.ready_kits FOR DELETE TO authenticated USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- hat_styles
DROP POLICY IF EXISTS "Auth can view hat_styles" ON public.hat_styles;
DROP POLICY IF EXISTS "Owners/managers manage hat_styles" ON public.hat_styles;
CREATE POLICY "Anyone can view hat_styles" ON public.hat_styles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owners/managers insert hat_styles" ON public.hat_styles FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Owners/managers update hat_styles" ON public.hat_styles FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Owners/managers delete hat_styles" ON public.hat_styles FOR DELETE TO authenticated USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- scarf_methods
DROP POLICY IF EXISTS "Auth can view scarf_methods" ON public.scarf_methods;
DROP POLICY IF EXISTS "Owners/managers manage scarf_methods" ON public.scarf_methods;
CREATE POLICY "Anyone can view scarf_methods" ON public.scarf_methods FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owners/managers insert scarf_methods" ON public.scarf_methods FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Owners/managers update scarf_methods" ON public.scarf_methods FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Owners/managers delete scarf_methods" ON public.scarf_methods FOR DELETE TO authenticated USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- embroidery_directions
DROP POLICY IF EXISTS "Auth can view embroidery_directions" ON public.embroidery_directions;
DROP POLICY IF EXISTS "Owners/managers manage embroidery_directions" ON public.embroidery_directions;
CREATE POLICY "Anyone can view embroidery_directions" ON public.embroidery_directions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owners/managers insert embroidery_directions" ON public.embroidery_directions FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Owners/managers update embroidery_directions" ON public.embroidery_directions FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Owners/managers delete embroidery_directions" ON public.embroidery_directions FOR DELETE TO authenticated USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));

-- date_types
DROP POLICY IF EXISTS "Auth can view date_types" ON public.date_types;
DROP POLICY IF EXISTS "Owners/managers manage date_types" ON public.date_types;
CREATE POLICY "Anyone can view date_types" ON public.date_types FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owners/managers insert date_types" ON public.date_types FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Owners/managers update date_types" ON public.date_types FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
CREATE POLICY "Owners/managers delete date_types" ON public.date_types FOR DELETE TO authenticated USING (has_role(auth.uid(), 'owner'::app_role) OR has_role(auth.uid(), 'manager'::app_role));
