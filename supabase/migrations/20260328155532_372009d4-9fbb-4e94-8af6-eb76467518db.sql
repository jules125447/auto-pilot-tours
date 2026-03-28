CREATE TABLE public.access_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  unlimited boolean NOT NULL DEFAULT false,
  uses_remaining integer DEFAULT null,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.access_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can lookup keys" ON public.access_keys
  FOR SELECT TO public USING (true);