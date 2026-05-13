
-- Sessions de navigation
CREATE TABLE public.navigation_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  circuit_id UUID NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  completed BOOLEAN NOT NULL DEFAULT false,
  distance_m INTEGER NOT NULL DEFAULT 0,
  duration_s INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_nav_sessions_circuit ON public.navigation_sessions(circuit_id);
CREATE INDEX idx_nav_sessions_user ON public.navigation_sessions(user_id);
CREATE INDEX idx_nav_sessions_started ON public.navigation_sessions(started_at DESC);

ALTER TABLE public.navigation_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own sessions" ON public.navigation_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);
CREATE POLICY "Users can update own sessions" ON public.navigation_sessions
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all sessions" ON public.navigation_sessions
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users can view own sessions" ON public.navigation_sessions
  FOR SELECT USING (auth.uid() = user_id);

-- GPS pings (heatmap)
CREATE TABLE public.gps_pings (
  id BIGSERIAL PRIMARY KEY,
  session_id UUID NOT NULL,
  circuit_id UUID NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  speed_kmh DOUBLE PRECISION,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_gps_circuit ON public.gps_pings(circuit_id);
CREATE INDEX idx_gps_session ON public.gps_pings(session_id);
CREATE INDEX idx_gps_recorded ON public.gps_pings(recorded_at DESC);

ALTER TABLE public.gps_pings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert gps pings" ON public.gps_pings
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view gps pings" ON public.gps_pings
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Visites de stops
CREATE TABLE public.stop_visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  circuit_id UUID NOT NULL,
  stop_id UUID NOT NULL,
  dwell_seconds INTEGER NOT NULL DEFAULT 0,
  visited_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_stop_visits_circuit ON public.stop_visits(circuit_id);
CREATE INDEX idx_stop_visits_stop ON public.stop_visits(stop_id);

ALTER TABLE public.stop_visits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert stop visits" ON public.stop_visits
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view stop visits" ON public.stop_visits
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Lectures audio
CREATE TABLE public.audio_plays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  circuit_id UUID NOT NULL,
  audio_zone_id UUID NOT NULL,
  played_seconds INTEGER NOT NULL DEFAULT 0,
  total_seconds INTEGER,
  completed BOOLEAN NOT NULL DEFAULT false,
  played_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_audio_plays_circuit ON public.audio_plays(circuit_id);
CREATE INDEX idx_audio_plays_zone ON public.audio_plays(audio_zone_id);

ALTER TABLE public.audio_plays ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can insert audio plays" ON public.audio_plays
  FOR INSERT WITH CHECK (true);
CREATE POLICY "Admins can view audio plays" ON public.audio_plays
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Permettre aux admins de voir tous les achats
CREATE POLICY "Admins can view all purchases" ON public.purchases
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));

-- Permettre aux admins de voir tous les profiles (déjà public en SELECT)
-- Permettre aux admins de voir tous les rôles
CREATE POLICY "Admins can view all roles" ON public.user_roles
  FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
