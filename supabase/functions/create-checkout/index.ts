import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user?.email) throw new Error("Non authentifié");

    const { circuitId, promoCode } = await req.json();
    if (!circuitId) throw new Error("circuitId requis");

    // Fetch circuit
    const { data: circuit, error: circuitErr } = await supabaseClient
      .from("circuits")
      .select("id, title, price, image_url")
      .eq("id", circuitId)
      .single();
    if (circuitErr || !circuit) throw new Error("Circuit introuvable");

    let finalPrice = Number(circuit.price);
    let promoCodeId: string | null = null;
    let discountPercent = 0;

    // Check promo code
    if (promoCode) {
      const { data: promo } = await supabaseClient
        .from("promo_codes")
        .select("*")
        .eq("code", promoCode.toUpperCase())
        .limit(1);

      if (promo && promo.length > 0) {
        promoCodeId = promo[0].id;
        discountPercent = Number(promo[0].discount_percent);
        finalPrice = finalPrice * (1 - discountPercent / 100);
      }
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Find or create customer
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const origin = req.headers.get("origin") || "https://auto-pilot-tours.lovable.app";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: circuit.title,
              ...(circuit.image_url ? { images: [circuit.image_url] } : {}),
            },
            unit_amount: Math.round(finalPrice * 100),
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/payment-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/circuit/${circuitId}`,
      metadata: {
        circuit_id: circuitId,
        user_id: user.id,
        promo_code_id: promoCodeId || "",
        original_price: String(circuit.price),
        final_price: String(finalPrice),
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
