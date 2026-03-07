
-- 1. App Role Enum
CREATE TYPE public.app_role AS ENUM ('owner', 'manager', 'customer_service');

-- 2. Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 3. User Roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Owners can manage roles" ON public.user_roles FOR ALL USING (public.has_role(auth.uid(), 'owner'));

-- 4. Master Data: Abaya Designs
CREATE TABLE public.abaya_designs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.abaya_designs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth can view designs" ON public.abaya_designs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owners/managers manage designs" ON public.abaya_designs FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager'));

-- 5. Master Data: Sleeve Styles
CREATE TABLE public.sleeve_styles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.sleeve_styles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth can view sleeves" ON public.sleeve_styles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owners/managers manage sleeves" ON public.sleeve_styles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager'));

-- 6. Master Data: Scarf Styles
CREATE TABLE public.scarf_styles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.scarf_styles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth can view scarves" ON public.scarf_styles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owners/managers manage scarves" ON public.scarf_styles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager'));

-- 7. Master Data: Fonts
CREATE TABLE public.fonts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  preview_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.fonts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth can view fonts" ON public.fonts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owners/managers manage fonts" ON public.fonts FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager'));

-- 8. Master Data: Cities
CREATE TABLE public.cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.cities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth can view cities" ON public.cities FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owners/managers manage cities" ON public.cities FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager'));

-- 9. Ready Kits
CREATE TABLE public.ready_kits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  abaya_design_id UUID REFERENCES public.abaya_designs(id),
  sleeve_style_id UUID REFERENCES public.sleeve_styles(id),
  scarf_style_id UUID REFERENCES public.scarf_styles(id),
  scarf_color TEXT,
  font_id UUID REFERENCES public.fonts(id),
  price DECIMAL(10,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.ready_kits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth can view kits" ON public.ready_kits FOR SELECT TO authenticated USING (true);
CREATE POLICY "Owners/managers manage kits" ON public.ready_kits FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager'));

-- 10. Orders
CREATE TYPE public.order_status AS ENUM ('pending_data', 'in_progress', 'completed', 'cancelled');

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT NOT NULL UNIQUE,
  employee_id UUID NOT NULL REFERENCES auth.users(id),
  kit_id UUID REFERENCES public.ready_kits(id),
  school_name TEXT,
  city_id UUID REFERENCES public.cities(id),
  leader_name TEXT,
  leader_phone TEXT,
  student_count INTEGER DEFAULT 0,
  status order_status NOT NULL DEFAULT 'pending_data',
  leader_link TEXT,
  registration_link TEXT,
  tracking_link TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Auth can view orders" ON public.orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth can create orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = employee_id);
CREATE POLICY "Employee/owners can update orders" ON public.orders FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'owner') OR public.has_role(auth.uid(), 'manager') OR auth.uid() = employee_id);

-- 11. Timestamp trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_abaya_designs_updated_at BEFORE UPDATE ON public.abaya_designs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_sleeve_styles_updated_at BEFORE UPDATE ON public.sleeve_styles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_scarf_styles_updated_at BEFORE UPDATE ON public.scarf_styles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_fonts_updated_at BEFORE UPDATE ON public.fonts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cities_updated_at BEFORE UPDATE ON public.cities FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_ready_kits_updated_at BEFORE UPDATE ON public.ready_kits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_orders_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 12. Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 13. Storage bucket for images
INSERT INTO storage.buckets (id, name, public) VALUES ('images', 'images', true);
CREATE POLICY "Anyone can view images" ON storage.objects FOR SELECT USING (bucket_id = 'images');
CREATE POLICY "Auth can upload images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'images');
CREATE POLICY "Auth can update images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'images');
CREATE POLICY "Auth can delete images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'images');
