-- Allow authenticated users to read profiles (for employee name display)
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Anon can view profiles" ON public.profiles
  FOR SELECT TO anon USING (true);