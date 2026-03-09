
-- Allow anon to SELECT from reference tables used in scarf design joins
CREATE POLICY "Anon can view scarf_styles" ON public.scarf_styles FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can view date_types" ON public.date_types FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can view scarf_methods" ON public.scarf_methods FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can view embroidery_directions" ON public.embroidery_directions FOR SELECT TO anon USING (true);
CREATE POLICY "Anon can view fonts" ON public.fonts FOR SELECT TO anon USING (true);
