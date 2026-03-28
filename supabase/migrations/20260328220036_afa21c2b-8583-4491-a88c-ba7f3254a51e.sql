
-- Circuit slots for community bookings
CREATE TABLE public.circuit_slots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  circuit_id UUID NOT NULL REFERENCES public.circuits(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  slot_date DATE NOT NULL,
  slot_time TEXT NOT NULL CHECK (slot_time IN ('morning', 'afternoon')),
  party_size INTEGER NOT NULL DEFAULT 1,
  open_to_others BOOLEAN NOT NULL DEFAULT true,
  message TEXT,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(circuit_id, user_id, slot_date, slot_time)
);

ALTER TABLE public.circuit_slots ENABLE ROW LEVEL SECURITY;

-- Anyone can view slots (community feature)
CREATE POLICY "Anyone can view circuit slots"
  ON public.circuit_slots FOR SELECT
  TO public
  USING (true);

-- Authenticated users can insert their own slots
CREATE POLICY "Users can insert own slots"
  ON public.circuit_slots FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own slots
CREATE POLICY "Users can update own slots"
  ON public.circuit_slots FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can delete their own slots
CREATE POLICY "Users can delete own slots"
  ON public.circuit_slots FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Enable realtime for live participant tracking
ALTER PUBLICATION supabase_realtime ADD TABLE public.circuit_slots;
