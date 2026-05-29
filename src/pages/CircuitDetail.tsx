import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Bell,
  Clock,
  Route,
  Star,
  MapPin,
  CloudOff,
  Play,
  Loader2,
  Key,
  BarChart3,
  ChevronRight,
  ShoppingCart,
  Tag,
} from "lucide-react";
import { useCircuit } from "@/hooks/useCircuits";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import RouteMap from "@/components/RouteMap";
import CircuitReviews from "@/components/CircuitReviews";
import { useToast } from "@/hooks/use-toast";
import tiloFox from "@/assets/tilo-fox-peek.png";

const CircuitDetail = () => {
  const { id } = useParams();
  const { data: circuit, isLoading } = useCircuit(id);
  const { user } = useAuth();
  const { toast } = useToast();
  const [promoCode, setPromoCode] = useState("");
  const [buying, setBuying] = useState(false);
  const [accessKey, setAccessKey] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [checkingKey, setCheckingKey] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);

  useEffect(() => {
    if (!user || !id) return;
    supabase
      .from("purchases")
      .select("id")
      .eq("user_id", user.id)
      .eq("circuit_id", id)
      .limit(1)
      .then(({ data }) => {
        if (data && data.length > 0) {
          setHasPurchased(true);
          setUnlocked(true);
        }
      });
  }, [user, id]);

  const isCreator = user && circuit && circuit.creator_id === user.id;
  const hasAccess = unlocked || hasPurchased || isCreator || (circuit && circuit.price === 0);

  const handleBuy = async () => {
    if (!user) {
      toast({ title: "Connectez-vous", description: "Vous devez être connecté pour acheter un circuit.", variant: "destructive" });
      return;
    }
    setBuying(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: { circuitId: id, promoCode: promoCode.trim() || undefined },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      if (data?.url) window.open(data.url, "_blank");
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    } finally {
      setBuying(false);
    }
  };

  const handleAccessKey = async () => {
    if (!accessKey.trim()) return;
    setCheckingKey(true);
    const { data } = await supabase
      .from("access_keys")
      .select("*")
      .eq("key", accessKey.trim().toLowerCase())
      .limit(1);

    if (data && data.length > 0) {
      const k = data[0] as any;
      if (k.unlimited || (k.uses_remaining && k.uses_remaining > 0)) {
        setUnlocked(true);
        const unlockedCircuits = JSON.parse(sessionStorage.getItem("unlocked_circuits") || "[]");
        if (!unlockedCircuits.includes(id)) {
          unlockedCircuits.push(id);
          sessionStorage.setItem("unlocked_circuits", JSON.stringify(unlockedCircuits));
        }
        toast({ title: "Clé valide ✅", description: "Accès gratuit débloqué !" });
      } else {
        toast({ title: "Clé expirée", description: "Cette clé n'est plus valide.", variant: "destructive" });
      }
    } else {
      toast({ title: "Clé invalide", description: "Cette clé n'existe pas.", variant: "destructive" });
    }
    setCheckingKey(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fbf1e6]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!circuit) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#fbf1e6]">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">Circuit introuvable</h1>
          <Link to="/" className="text-primary hover:underline">Retour à l'accueil</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fbf1e6]">
      {/* Top header */}
      <header className="sticky top-0 z-30 bg-[#fbf1e6]/90 backdrop-blur-md">
        <div className="max-w-md mx-auto px-4 pt-4 pb-3 flex items-center justify-between">
          <Link
            to="/"
            className="w-11 h-11 rounded-full bg-white shadow-sm flex items-center justify-center text-foreground hover:scale-105 transition-transform"
            aria-label="Retour"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-display text-3xl font-extrabold text-foreground tracking-tight">Tilo</span>
          </div>
          <button className="relative w-11 h-11 rounded-full bg-white shadow-sm flex items-center justify-center text-foreground hover:scale-105 transition-transform" aria-label="Notifications">
            <Bell className="w-5 h-5" />
            <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-primary" />
          </button>
        </div>
      </header>

      <main className="max-w-md mx-auto px-4 pb-20 space-y-5">
        {/* Hero card */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-3xl overflow-hidden bg-white shadow-card"
        >
          <div className="relative h-64">
            <img src={circuit.image} alt={circuit.title} className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/60 to-transparent" />

            <div className="relative p-5 flex flex-col h-full">
              <span className="inline-flex items-center gap-1.5 self-start px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-bold uppercase tracking-wide">
                <MapPin className="w-3.5 h-3.5" /> Circuit
              </span>

              <h1 className="font-display text-4xl font-extrabold text-foreground mt-3 leading-tight drop-shadow-sm">
                {circuit.title}
              </h1>

              <p className="font-display text-3xl font-extrabold text-primary mt-2">
                {circuit.price === 0 ? "Gratuit" : `${circuit.price} €`}
              </p>

              <div className="flex items-center gap-1.5 mt-2 text-sm">
                <Star className={`w-4 h-4 ${circuit.rating > 0 ? "text-primary fill-primary" : "text-primary"}`} />
                <span className="text-muted-foreground">({circuit.review_count} avis)</span>
              </div>
            </div>
          </div>

          {/* Stats pill */}
          <div className="px-5 -mt-4 pb-5">
            <div className="bg-white rounded-full shadow-elevated border border-border/40 px-3 py-3 flex items-center justify-between divide-x divide-border/40">
              <Stat icon={<Clock className="w-4 h-4 text-primary" />} value={circuit.duration} />
              <Stat icon={<Route className="w-4 h-4 text-primary" />} value={circuit.distance} />
              <Stat icon={<MapPin className="w-4 h-4 text-primary" />} value={`${circuit.stops.length} arrêts`} />
              <Stat icon={<BarChart3 className="w-4 h-4 text-primary" />} value={circuit.difficulty} />
            </div>
          </div>
        </motion.section>

        {/* CTA Démarrer */}
        {hasAccess ? (
          <Link
            to={`/navigate/${circuit.id}`}
            className="relative flex items-center justify-center gap-3 w-full py-5 rounded-2xl bg-primary text-primary-foreground font-display text-xl font-bold shadow-elevated hover:opacity-95 active:scale-[0.99] transition-all overflow-hidden"
          >
            <span className="w-9 h-9 rounded-full bg-white/25 flex items-center justify-center">
              <Play className="w-5 h-5 fill-current" />
            </span>
            Démarrer le circuit
            <MapPin className="absolute right-5 w-5 h-5 opacity-80" />
          </Link>
        ) : circuit.price > 0 ? (
          <button
            onClick={handleBuy}
            disabled={buying}
            className="flex items-center justify-center gap-3 w-full py-5 rounded-2xl bg-primary text-primary-foreground font-display text-xl font-bold shadow-elevated hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50"
          >
            {buying ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShoppingCart className="w-5 h-5" />}
            {buying ? "Redirection..." : `Acheter — ${circuit.price} €`}
          </button>
        ) : null}


        {/* J'ai une clé card with fox */}
        {!hasAccess && (
        <section className="relative bg-white rounded-2xl p-5 pr-32 shadow-card overflow-hidden">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full border-2 border-primary/40 flex items-center justify-center shrink-0">
                <Key className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-display text-xl font-bold text-foreground leading-tight">J'ai une clé</h3>
                <p className="text-sm text-muted-foreground mt-0.5">Débloquez un avantage ou un accès</p>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2 bg-[#fbf1e6] rounded-xl p-1.5 border border-border/40 relative z-10">
              <input
                type="text"
                placeholder="Saisir votre code"
                value={accessKey}
                onChange={(e) => setAccessKey(e.target.value)}
                className="flex-1 bg-transparent px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />
              <button
                onClick={handleAccessKey}
                disabled={checkingKey || !accessKey.trim()}
                className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {checkingKey ? <Loader2 className="w-4 h-4 animate-spin" /> : "Appliquer"}
              </button>
            </div>

            <img
              src={tiloFox}
              alt=""
              aria-hidden
              className="absolute -right-4 -top-2 w-32 h-32 object-contain pointer-events-none select-none"
            />
          </section>
        )}

        {/* Hors-ligne */}
        <button className="w-full flex items-center gap-4 bg-white rounded-2xl p-4 shadow-card hover:shadow-elevated transition-shadow text-left">
          <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <CloudOff className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground">Hors-ligne</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Téléchargez ce circuit pour l'utiliser sans connexion.</p>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
        </button>

        {/* Aperçu du parcours */}
        <section>
          <h2 className="font-display text-lg font-bold text-foreground mb-3 px-1">Aperçu du parcours</h2>
          <div className="bg-white rounded-2xl overflow-hidden shadow-card">
            <RouteMap route={circuit.route} stops={circuit.stops} className="h-56" />
          </div>
        </section>

        {/* Étapes */}
        <section>
          <h2 className="font-display text-lg font-bold text-foreground mb-3 px-1">Étapes du circuit</h2>
          <div className="space-y-2.5">
            {circuit.stops.map((stop, i) => (
              <div key={stop.id} className="bg-white rounded-2xl p-3 shadow-card flex items-center gap-3">
                <div className="relative">
                  <div className="w-9 h-9 rounded-full bg-primary text-primary-foreground font-bold text-sm flex items-center justify-center">
                    {i + 1}
                  </div>
                  {i < circuit.stops.length - 1 && (
                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-0.5 h-2 bg-primary/30" />
                  )}
                </div>
                <div className="w-12 h-12 rounded-xl overflow-hidden bg-muted shrink-0">
                  {stop.photo_url ? (
                    <img src={stop.photo_url} alt={stop.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-sm leading-tight truncate">{stop.title}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">{stop.description || "Site touristique"}</p>
                </div>
                <div className="flex items-center gap-1 text-primary text-xs font-medium shrink-0">
                  <Clock className="w-3.5 h-3.5" />
                  {stop.duration}
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </div>
            ))}
          </div>
        </section>

        {/* Avis */}
        <section className="bg-white rounded-2xl p-5 shadow-card">
          <CircuitReviews circuitId={circuit.id} />
        </section>
      </main>
    </div>
  );
};

const Stat = ({ icon, value }: { icon: React.ReactNode; value: string }) => (
  <div className="flex-1 flex items-center justify-center gap-1.5 px-2">
    {icon}
    <span className="text-xs font-semibold text-foreground whitespace-nowrap">{value}</span>
  </div>
);

export default CircuitDetail;
