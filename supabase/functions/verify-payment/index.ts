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

  // Use service role to insert purchases/commissions
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    if (!user) throw new Error("Non authentifié");

    const { sessionId } = await req.json();
    if (!sessionId) throw new Error("sessionId requis");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== "paid") {
      throw new Error("Paiement non complété");
    }

    const meta = session.metadata || {};
    if (meta.user_id !== user.id) {
      throw new Error("Session non autorisée");
    }

    // Check if purchase already recorded
    const { data: existing } = await supabaseAdmin
      .from("purchases")
      .select("id")
      .eq("user_id", user.id)
      .eq("circuit_id", meta.circuit_id)
      .limit(1);

    if (existing && existing.length > 0) {
      return new Response(JSON.stringify({ success: true, already_purchased: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Record purchase
    const finalPrice = Number(meta.final_price);
    const { data: purchase, error: purchaseErr } = await supabaseAdmin
      .from("purchases")
      .insert({
        user_id: user.id,
        circuit_id: meta.circuit_id,
        amount: finalPrice,
        promo_code_id: meta.promo_code_id || null,
      })
      .select()
      .single();

    if (purchaseErr) throw new Error("Erreur enregistrement achat: " + purchaseErr.message);

    // If promo code was used, create commission
    if (meta.promo_code_id) {
      const { data: promo } = await supabaseAdmin
        .from("promo_codes")
        .select("creator_id, commission_percent")
        .eq("id", meta.promo_code_id)
        .single();

      if (promo) {
        const commissionAmount = finalPrice * (Number(promo.commission_percent) / 100);
        await supabaseAdmin.from("commissions").insert({
          creator_id: promo.creator_id,
          purchase_id: purchase.id,
          promo_code_id: meta.promo_code_id,
          amount: commissionAmount,
          status: "pending",
        });
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
