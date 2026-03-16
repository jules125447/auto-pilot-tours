
DROP POLICY "Authenticated users can insert music segments" ON public.music_segments;
CREATE POLICY "Users can insert music segments for own circuits" ON public.music_segments FOR INSERT TO authenticated WITH CHECK (
  circuit_id IN (SELECT id FROM public.circuits WHERE creator_id = auth.uid())
);
