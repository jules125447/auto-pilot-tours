
CREATE TABLE public.map_annotations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  circuit_id UUID NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  image_url TEXT,
  caption TEXT DEFAULT '',
  size TEXT NOT NULL DEFAULT 'medium',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.map_annotations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view annotations of visible circuits"
ON public.map_annotations FOR SELECT
USING (EXISTS (
  SELECT 1 FROM circuits c
  WHERE c.id = map_annotations.circuit_id
  AND (c.published = true OR auth.uid() = c.creator_id)
));

CREATE POLICY "Creators can insert annotations"
ON public.map_annotations FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM circuits c
  WHERE c.id = map_annotations.circuit_id
  AND auth.uid() = c.creator_id
));

CREATE POLICY "Creators can update annotations"
ON public.map_annotations FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM circuits c
  WHERE c.id = map_annotations.circuit_id
  AND auth.uid() = c.creator_id
));

CREATE POLICY "Creators can delete annotations"
ON public.map_annotations FOR DELETE
USING (EXISTS (
  SELECT 1 FROM circuits c
  WHERE c.id = map_annotations.circuit_id
  AND auth.uid() = c.creator_id
));
