
-- Drop the foreign key constraint on creator_id so we can have system/demo circuits
ALTER TABLE public.circuits DROP CONSTRAINT IF EXISTS circuits_creator_id_fkey;

-- Also update RLS to allow anonymous SELECT on published circuits
DROP POLICY IF EXISTS "Anyone can view published circuits" ON public.circuits;
CREATE POLICY "Anyone can view published circuits" 
ON public.circuits 
FOR SELECT 
USING (published = true OR auth.uid() = creator_id);

-- Update circuit_stops and audio_zones SELECT policies to also allow anon access to published
DROP POLICY IF EXISTS "Anyone can view stops of visible circuits" ON public.circuit_stops;
CREATE POLICY "Anyone can view stops of visible circuits" 
ON public.circuit_stops 
FOR SELECT 
USING (EXISTS (SELECT 1 FROM circuits c WHERE c.id = circuit_stops.circuit_id AND (c.published = true OR auth.uid() = c.creator_id)));

DROP POLICY IF EXISTS "Anyone can view audio of visible circuits" ON public.audio_zones;
CREATE POLICY "Anyone can view audio of visible circuits" 
ON public.audio_zones 
FOR SELECT 
USING (EXISTS (SELECT 1 FROM circuits c WHERE c.id = audio_zones.circuit_id AND (c.published = true OR auth.uid() = c.creator_id)));
