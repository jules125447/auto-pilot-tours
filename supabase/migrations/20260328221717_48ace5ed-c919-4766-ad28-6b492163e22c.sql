
-- Slot messages table for community chat
CREATE TABLE public.slot_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  circuit_id uuid NOT NULL,
  slot_date date NOT NULL,
  slot_time text NOT NULL,
  user_id uuid NOT NULL,
  display_name text,
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.slot_messages ENABLE ROW LEVEL SECURITY;

-- Anyone can view messages for slots
CREATE POLICY "Anyone can view slot messages" ON public.slot_messages
  FOR SELECT TO public USING (true);

-- Authenticated users can insert own messages
CREATE POLICY "Users can insert own messages" ON public.slot_messages
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Users can delete own messages
CREATE POLICY "Users can delete own messages" ON public.slot_messages
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.slot_messages;
