import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { userName, circuitName, circuitDescription } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "system",
            content: `Tu es un guide touristique fun et chaleureux pour l'application AutoPilot Tours. 
Tu dois générer un message de bienvenue COURT (2-3 phrases max, moins de 200 caractères au total) pour un utilisateur qui démarre un circuit touristique en voiture.

Règles:
- Tutoie l'utilisateur
- Fais un jeu de mots ou une petite blague en rapport avec le prénom de l'utilisateur (rime, calembour, etc.)
- Mentionne le nom du circuit
- Termine par "Bonne route !" ou "C'est parti !"
- Garde un ton jovial et enthousiaste
- Le message sera lu à voix haute par synthèse vocale, donc écris comme on parle
- N'utilise PAS d'émojis ni de caractères spéciaux

Exemples:
- "Arthur, ça rime avec aventure ! Le circuit Côte d'Azur t'attend. Bonne route !"
- "Salut Marie, prête à en prendre plein la vue ? Le circuit des Châteaux commence maintenant. C'est parti !"
- "Léo le héros, bienvenue sur le circuit Provence ! Attache ta ceinture, ça va être magique !"`,
          },
          {
            role: "user",
            content: `Prénom: ${userName || "Voyageur"}
Nom du circuit: ${circuitName || "Circuit touristique"}
${circuitDescription ? `Description du circuit: ${circuitDescription}` : ""}

Génère le message de bienvenue.`,
          },
        ],
        max_tokens: 150,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const greeting = data.choices?.[0]?.message?.content?.trim() || "";

    return new Response(JSON.stringify({ greeting }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("welcome-greeting error:", e);
    // Fallback: return a generic greeting
    return new Response(
      JSON.stringify({ greeting: "" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
