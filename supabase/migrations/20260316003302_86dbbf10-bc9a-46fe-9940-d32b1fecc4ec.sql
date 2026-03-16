
CREATE TABLE public.music_segments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  circuit_id UUID NOT NULL REFERENCES public.circuits(id) ON DELETE CASCADE,
  start_lat DOUBLE PRECISION NOT NULL,
  start_lng DOUBLE PRECISION NOT NULL,
  end_lat DOUBLE PRECISION NOT NULL,
  end_lng DOUBLE PRECISION NOT NULL,
  track_id TEXT NOT NULL,
  track_name TEXT NOT NULL,
  artist_name TEXT,
  preview_url TEXT,
  artwork_url TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.music_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read music segments" ON public.music_segments FOR SELECT USING (true);
CREATE POLICY "Authenticated users can insert music segments" ON public.music_segments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Users can delete own circuit music segments" ON public.music_segments FOR DELETE TO authenticated USING (
  circuit_id IN (SELECT id FROM public.circuits WHERE creator_id = auth.uid())
);
