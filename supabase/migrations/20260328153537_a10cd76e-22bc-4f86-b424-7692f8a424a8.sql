
-- Function to upgrade a user to creator role and create promo code
CREATE OR REPLACE FUNCTION public.register_professional(
  _business_type text,
  _promo_code text
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Add creator role if not exists
  INSERT INTO public.user_roles (user_id, role)
  VALUES (auth.uid(), 'creator')
  ON CONFLICT (user_id, role) DO NOTHING;

  -- Update profile with business type
  UPDATE public.profiles
  SET business_type = _business_type
  WHERE user_id = auth.uid();

  -- Create promo code
  INSERT INTO public.promo_codes (creator_id, code, discount_percent, commission_percent)
  VALUES (auth.uid(), _promo_code, 10, 30)
  ON CONFLICT (code) DO NOTHING;
END;
$$;
