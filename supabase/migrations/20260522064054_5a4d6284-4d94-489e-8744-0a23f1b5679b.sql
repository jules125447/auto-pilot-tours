ALTER TABLE public.circuits
  ADD COLUMN IF NOT EXISTS tilo_personality jsonb NOT NULL DEFAULT
    '{"dominant_expression":"happy","energy_level":3,"style":"friendly"}'::jsonb;

ALTER TABLE public.audio_zones
  ADD COLUMN IF NOT EXISTS tilo_mood text;