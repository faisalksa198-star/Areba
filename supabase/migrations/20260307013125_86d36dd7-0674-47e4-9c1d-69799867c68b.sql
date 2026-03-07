
CREATE TABLE public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  serial_number integer NOT NULL,
  name text NOT NULL DEFAULT '',
  size text,
  scarf_choice text,
  hat_choice text,
  extra_services text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

-- Anon access for leader pages (accessed via unique links)
CREATE POLICY "Anon can read students by order" ON public.students FOR SELECT USING (true);
CREATE POLICY "Anon can insert students" ON public.students FOR INSERT WITH CHECK (true);
CREATE POLICY "Anon can update students" ON public.students FOR UPDATE USING (true);

-- Update trigger
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
