
-- Create roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'creator', 'user');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);

-- User roles table
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

-- Circuits table
CREATE TABLE public.circuits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  region TEXT,
  duration TEXT,
  distance TEXT,
  difficulty TEXT DEFAULT 'Facile',
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  rating DECIMAL(3,2) DEFAULT 0,
  review_count INT DEFAULT 0,
  image_url TEXT,
  route JSONB DEFAULT '[]'::jsonb,
  published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.circuits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published circuits" ON public.circuits FOR SELECT USING (published = true OR auth.uid() = creator_id);
CREATE POLICY "Creators can insert circuits" ON public.circuits FOR INSERT WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators can update own circuits" ON public.circuits FOR UPDATE USING (auth.uid() = creator_id);
CREATE POLICY "Creators can delete own circuits" ON public.circuits FOR DELETE USING (auth.uid() = creator_id);

-- Circuit stops
CREATE TABLE public.circuit_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circuit_id UUID NOT NULL REFERENCES public.circuits(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  stop_type TEXT DEFAULT 'site',
  duration TEXT,
  sort_order INT DEFAULT 0,
  photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.circuit_stops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view stops of visible circuits" ON public.circuit_stops FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.circuits c WHERE c.id = circuit_id AND (c.published = true OR auth.uid() = c.creator_id)));
CREATE POLICY "Creators can manage stops" ON public.circuit_stops FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.circuits c WHERE c.id = circuit_id AND auth.uid() = c.creator_id));
CREATE POLICY "Creators can update stops" ON public.circuit_stops FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.circuits c WHERE c.id = circuit_id AND auth.uid() = c.creator_id));
CREATE POLICY "Creators can delete stops" ON public.circuit_stops FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.circuits c WHERE c.id = circuit_id AND auth.uid() = c.creator_id));

-- Audio zones
CREATE TABLE public.audio_zones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  circuit_id UUID NOT NULL REFERENCES public.circuits(id) ON DELETE CASCADE,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  radius_meters INT DEFAULT 100,
  audio_text TEXT,
  audio_url TEXT,
  auto_play BOOLEAN DEFAULT true,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.audio_zones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view audio of visible circuits" ON public.audio_zones FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.circuits c WHERE c.id = circuit_id AND (c.published = true OR auth.uid() = c.creator_id)));
CREATE POLICY "Creators can manage audio" ON public.audio_zones FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.circuits c WHERE c.id = circuit_id AND auth.uid() = c.creator_id));
CREATE POLICY "Creators can update audio" ON public.audio_zones FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.circuits c WHERE c.id = circuit_id AND auth.uid() = c.creator_id));
CREATE POLICY "Creators can delete audio" ON public.audio_zones FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.circuits c WHERE c.id = circuit_id AND auth.uid() = c.creator_id));

-- Purchases
CREATE TABLE public.purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  circuit_id UUID NOT NULL REFERENCES public.circuits(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, circuit_id)
);
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own purchases" ON public.purchases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own purchases" ON public.purchases FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', NEW.email));
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_circuits_updated_at BEFORE UPDATE ON public.circuits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Circuit images storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('circuit-images', 'circuit-images', true);

CREATE POLICY "Anyone can view circuit images" ON storage.objects FOR SELECT USING (bucket_id = 'circuit-images');
CREATE POLICY "Authenticated users can upload circuit images" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'circuit-images' AND auth.role() = 'authenticated');
CREATE POLICY "Users can update own circuit images" ON storage.objects FOR UPDATE USING (bucket_id = 'circuit-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Audio files storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('audio-files', 'audio-files', true);

CREATE POLICY "Anyone can view audio files" ON storage.objects FOR SELECT USING (bucket_id = 'audio-files');
CREATE POLICY "Authenticated users can upload audio" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'audio-files' AND auth.role() = 'authenticated');
