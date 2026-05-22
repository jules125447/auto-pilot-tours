import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type EventType =
  | "welcome"
  | "circuit_start"
  | "speed_warning"
  | "poi_arrival"
  | "poi_commentary"
  | "joke"
  | "idle_banter"
  | "trip_end";

const BASE_SYSTEM_PROMPT = `Tu es Tilo, un compagnon de voyage virtuel pour l'application AutoPilot Tours (circuits touristiques en voiture).

Règles strictes:
- Réponds en FRANÇAIS uniquement
- Tutoie l'utilisateur
- 1 à 2 phrases MAX (moins de 180 caractères)
- Ton oral, naturel, comme un ami passager
- Pas d'émojis, pas de caractères spéciaux, pas de listes
- Le texte sera lu par synthèse vocale, écris donc comme on parle
- Ne te présente pas, ne dis pas "je suis Tilo"
- Pas de phrase qui commence par "En tant que..."`;

const EXPRESSION_HINTS: Record<string, string> = {
  happy: "Ton chaleureux, souriant, optimiste.",
  calm: "Ton posé, doux, apaisant.",
  surprised: "Ton enjoué, étonné, vif.",
  funny: "Ton blagueur, taquin, qui glisse une pointe d'humour.",
  amazed: "Ton émerveillé, contemplatif, plein d'admiration.",
  mysterious: "Ton intrigant, qui suggère sans tout dévoiler.",
  energetic: "Ton dynamique, motivant, qui donne envie de bouger.",
  sad: "Ton mélancolique, doux, presque nostalgique.",
  angry: "Ton bougon mais bienveillant, légèrement râleur.",
};

const STYLE_HINTS: Record<string, string> = {
  friendly: "Comme un copain de road-trip détendu.",
  guide: "Comme un guide local cultivé qui partage des anecdotes.",
  comedian: "Comme un humoriste qui place une vanne légère.",
  poet: "Comme un poète rêveur, image évocatrice.",
  coach: "Comme un coach motivant, phrases qui boostent.",
};

function buildSystemPrompt(personality: any): string {
  if (!personality || typeof personality !== "object") return BASE_SYSTEM_PROMPT;
  const expr = EXPRESSION_HINTS[personality.dominant_expression] || "";
  const style = STYLE_HINTS[personality.style] || "";
  const energy = typeof personality.energy_level === "number" ? personality.energy_level : 3;
  const energyHint =
    energy <= 2 ? "Niveau d'énergie bas: parle doucement, sans excitation."
    : energy >= 4 ? "Niveau d'énergie élevé: sois pétillant et enthousiaste."
    : "Niveau d'énergie modéré.";
  const extras = [expr, style, energyHint].filter(Boolean).join(" ");
  return extras ? `${BASE_SYSTEM_PROMPT}\n\nPersonnalité pour ce circuit: ${extras}` : BASE_SYSTEM_PROMPT;
}

function userPromptFor(eventType: EventType, ctx: Record<string, unknown>): string {
  switch (eventType) {
    case "welcome":
      return `L'utilisateur "${ctx.userName ?? "voyageur"}" démarre le circuit "${ctx.circuitName ?? ""}". ${ctx.circuitDescription ? `Contexte: ${ctx.circuitDescription}.` : ""} Présente-toi en disant que tu t'appelles Tilo et que tu seras son guide tout au long de cette sortie. Souhaite-lui la bienvenue chaleureusement, mentionne brièvement le circuit, et donne envie de partir à l'aventure. 2 à 3 phrases courtes, ton oral et amical.`;
    case "circuit_start":
      return `L'utilisateur vient d'atteindre le point de départ du circuit "${ctx.circuitName ?? ""}". Annonce avec enthousiasme que ça y est, le circuit commence officiellement maintenant. 1 à 2 phrases courtes, ton oral et excité.`;
    case "speed_warning":
      return `L'utilisateur roule à ${ctx.speed} km/h, ce qui est un peu rapide pour profiter du paysage. Invite-le gentiment à lever le pied, avec humour, sans le sermonner.`;
    case "poi_arrival":
      return `L'utilisateur vient d'arriver au point d'intérêt "${ctx.poiName ?? ""}". ${ctx.poiDescription ? `Détails: ${ctx.poiDescription}.` : ""} Annonce l'arrivée avec enthousiasme et invite à prendre une pause photo.`;
    case "poi_commentary":
      return `On approche du point d'intérêt "${ctx.poiName ?? ""}". ${ctx.poiDescription ? `Détails: ${ctx.poiDescription}.` : ""} Glisse une remarque touristique courte et vivante.`;
    case "joke":
      return `Glisse une petite blague légère ou une remarque amusante sur le fait de rouler / le paysage / la route. Reste bienveillant.`;
    case "idle_banter":
      return `Petit commentaire d'ambiance pour rendre le trajet plus vivant. Tu peux évoquer la météo, la route, l'aventure, ou donner un conseil malin.`;
    case "trip_end":
      return `L'utilisateur termine le circuit "${ctx.circuitName ?? ""}". Remercie-le et félicite-le pour ce beau voyage.`;
  }
}

const FALLBACKS: Record<EventType, string[]> = {
  welcome: ["Salut, moi c'est Tilo ! Je serai ton guide pour cette sortie. Allez, on s'installe et on profite, la route est à nous !"],
  circuit_start: ["Ça y est, le circuit commence ! Accroche-toi, on est partis pour l'aventure."],
  speed_warning: ["Doucement, on est là pour profiter du paysage, pas pour battre un record."],
  poi_arrival: ["On y est, prends le temps de regarder autour de toi."],
  poi_commentary: ["Regarde bien autour, c'est un endroit qui vaut le détour."],
  joke: ["Si la route pouvait parler, elle te dirait merci pour la balade."],
  idle_banter: ["Belle balade hein ? Profite bien du chemin."],
  trip_end: ["Et voilà, super circuit ! À très vite pour une nouvelle aventure."],
};

function pickFallback(eventType: EventType): string {
  const list = FALLBACKS[eventType] ?? ["On continue, profite bien !"];
  return list[Math.floor(Math.random() * list.length)];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const eventType = (body.eventType as EventType) || "idle_banter";
    const context = (body.context as Record<string, unknown>) || {};
    const personality = body.personality;
    const systemPrompt = buildSystemPrompt(personality);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPromptFor(eventType, context) },
        ],
        max_tokens: 120,
      }),
    });

    if (!response.ok) {
      if (response.status === 429 || response.status === 402) {
        return new Response(
          JSON.stringify({ text: pickFallback(eventType), fallback: true }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ text: pickFallback(eventType), fallback: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();
    const text = (data.choices?.[0]?.message?.content || "").trim();

    return new Response(
      JSON.stringify({ text: text || pickFallback(eventType), fallback: !text }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("tilo-speak error:", e);
    return new Response(
      JSON.stringify({ text: "Allez, on profite de la route !", fallback: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
