
-- Promo codes table for professionals
CREATE TABLE public.promo_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  code text NOT NULL UNIQUE,
  discount_percent numeric NOT NULL DEFAULT 10,
  commission_percent numeric NOT NULL DEFAULT 30,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.promo_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can view own promo codes" ON public.promo_codes
  FOR SELECT TO authenticated USING (auth.uid() = creator_id);

CREATE POLICY "System can insert promo codes" ON public.promo_codes
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);

-- Commissions table
CREATE TABLE public.commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL,
  purchase_id uuid NOT NULL REFERENCES public.purchases(id) ON DELETE CASCADE,
  promo_code_id uuid NOT NULL REFERENCES public.promo_codes(id),
  amount numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators can view own commissions" ON public.commissions
  FOR SELECT TO authenticated USING (auth.uid() = creator_id);

-- Add promo_code_used to purchases
ALTER TABLE public.purchases ADD COLUMN promo_code_id uuid REFERENCES public.promo_codes(id);

-- Add business_type to profiles for professionals
ALTER TABLE public.profiles ADD COLUMN business_type text;

-- Anyone can look up a promo code by code value (for applying at checkout)
CREATE POLICY "Anyone can lookup promo codes" ON public.promo_codes
  FOR SELECT TO public USING (true);
