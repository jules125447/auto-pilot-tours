import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, Route, Star, MapPin, Download, Play, Car, Eye, UtensilsCrossed, ParkingCircle, Landmark, Loader2, Tag, ShoppingCart, Key } from "lucide-react";
import { useCircuit } from "@/hooks/useCircuits";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import RouteMap from "@/components/RouteMap";
import CircuitReviews from "@/components/CircuitReviews";

import { useToast } from "@/hooks/use-toast";

const stopTypeIcons: Record<string, typeof Eye> = {
  viewpoint: Eye,
  restaurant: UtensilsCrossed,
  parking: ParkingCircle,
  site: Landmark,
};

const stopTypeLabels: Record<string, string> = {
  viewpoint: "Point de vue",
  restaurant: "Restaurant",
  parking: "Parking",
  site: "Site touristique",
};

const CircuitDetail = () => {
  const { id } = useParams();
  const { data: circuit, isLoading } = useCircuit(id);
  const { user } = useAuth();
  const { toast } = useToast();
  const [promoCode, setPromoCode] = useState("");
  const [buying, setBuying] = useState(false);
  const [accessKey, setAccessKey] = useState("");
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [checkingKey, setCheckingKey] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(false);
  const [checkingPurchase, setCheckingPurchase] = useState(true);

  // Check if user already purchased this circuit
  useEffect(() => {
    if (!user || !id) {
      setCheckingPurchase(false);
      return;
    }
    const check = async () => {
      const { data } = await supabase
        .from("purchases")
        .select("id")
        .eq("user_id", user.id)
        .eq("circuit_id", id)
        .limit(1);
      if (data && data.length > 0) {
        setHasPurchased(true);
        setUnlocked(true);
      }
      setCheckingPurchase(false);
    };
    check();
  }, [user, id]);

  // Also check if user is the creator
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
        // Store unlocked circuits in sessionStorage so NavigationView can check
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!circuit) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">Circuit introuvable</h1>
          <Link to="/" className="text-primary hover:underline">Retour à l'accueil</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="relative h-[50vh] min-h-[350px]">
        <img src={circuit.image} alt={circuit.title} className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/30 to-background" />
        <div className="absolute top-4 left-4 z-10">
          <Link to="/" className="flex items-center gap-2 px-3 py-2 rounded-lg glass text-foreground text-sm font-medium hover:bg-card/90 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Retour
          </Link>
        </div>
      </div>

      <div className="container relative -mt-24 z-10 pb-16">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-card rounded-2xl shadow-elevated p-6 md:p-8 mb-8">
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-1 mb-2">
                <MapPin className="w-3.5 h-3.5" /> {circuit.region}
              </p>
              <h1 className="font-display text-3xl md:text-4xl font-bold text-card-foreground">{circuit.title}</h1>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-foreground">{circuit.price} €</p>
              <div className="flex items-center gap-1 text-accent mt-1">
                <Star className="w-4 h-4 fill-current" /> {circuit.rating}
                <span className="text-muted-foreground text-sm">({circuit.review_count} avis)</span>
              </div>
            </div>
          </div>

          <p className="text-muted-foreground mb-6 leading-relaxed">{circuit.description}</p>

          <div className="flex flex-wrap gap-4 mb-6">
            {[
              { icon: Clock, label: circuit.duration },
              { icon: Route, label: circuit.distance },
              { icon: MapPin, label: `${circuit.stops.length} arrêts` },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2 px-4 py-2 rounded-lg bg-muted text-sm text-foreground">
                <item.icon className="w-4 h-4 text-muted-foreground" />
                {item.label}
              </div>
            ))}
            <div className={`px-4 py-2 rounded-lg text-sm font-medium ${
              circuit.difficulty === "Facile" ? "bg-primary/10 text-primary" :
              circuit.difficulty === "Modéré" ? "bg-accent/10 text-accent-foreground" :
              "bg-destructive/10 text-destructive"
            }`}>
              {circuit.difficulty}
            </div>
          </div>

          {/* Promo code + Buy OR Unlocked */}
          {hasAccess ? (
            <div className="flex flex-col sm:flex-row gap-3">
              <Link to={`/navigate/${circuit.id}`} className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-gradient-hero text-primary-foreground font-semibold text-lg hover:opacity-90 transition-opacity">
                <Car className="w-5 h-5" /> Démarrer le circuit
              </Link>
              <button className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-muted text-foreground font-medium hover:bg-muted/80 transition-colors">
                <Download className="w-5 h-5" /> Hors-ligne
              </button>
            </div>
          ) : (
            <>
              {circuit.price > 0 && (
                <div className="bg-muted/50 rounded-xl p-4 mb-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Tag className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">Code promo</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Entrez votre code"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                      className="flex-1 px-4 py-2.5 rounded-lg bg-card text-foreground text-sm border border-border placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                  </div>
                </div>
              )}

              {/* Access key section */}
              {showKeyInput ? (
                <div className="bg-primary/5 rounded-xl p-4 mb-4 border border-primary/20">
                  <div className="flex items-center gap-2 mb-3">
                    <Key className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium text-foreground">Clé d'accès</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Entrez votre clé"
                      value={accessKey}
                      onChange={(e) => setAccessKey(e.target.value)}
                      className="flex-1 px-4 py-2.5 rounded-lg bg-card text-foreground text-sm border border-border placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <button
                      onClick={handleAccessKey}
                      disabled={checkingKey}
                      className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50"
                    >
                      {checkingKey ? <Loader2 className="w-4 h-4 animate-spin" /> : "Valider"}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowKeyInput(true)}
                  className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors mb-4"
                >
                  <Key className="w-4 h-4" /> J'ai une clé d'accès
                </button>
              )}

              <div className="flex flex-col sm:flex-row gap-3">
                {circuit.price > 0 ? (
                  <button
                    onClick={handleBuy}
                    disabled={buying}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-gradient-hero text-primary-foreground font-semibold text-lg hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {buying ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShoppingCart className="w-5 h-5" />}
                    {buying ? "Redirection..." : `Acheter — ${circuit.price} €`}
                  </button>
                ) : (
                  <Link to={`/navigate/${circuit.id}`} className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-gradient-hero text-primary-foreground font-semibold text-lg hover:opacity-90 transition-opacity">
                    <Car className="w-5 h-5" /> Démarrer le circuit
                  </Link>
                )}
                <button className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-muted text-foreground font-medium hover:bg-muted/80 transition-colors">
                  <Download className="w-5 h-5" /> Hors-ligne
                </button>
              </div>
            </>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card rounded-2xl shadow-card overflow-hidden mb-8">
          <h2 className="font-display text-xl font-semibold text-card-foreground p-6 pb-0">Aperçu du parcours</h2>
          <div className="p-4">
            <RouteMap route={circuit.route} stops={circuit.stops} className="h-[350px] rounded-xl" />
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <h2 className="font-display text-xl font-semibold text-foreground mb-4">Étapes du circuit</h2>
          <div className="space-y-3">
            {circuit.stops.map((stop, i) => {
              const StopIcon = stopTypeIcons[stop.type] || MapPin;
              return (
                <div key={stop.id} className="bg-card rounded-xl shadow-card p-4 flex items-start gap-4">
                  <div className="flex flex-col items-center gap-1">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <StopIcon className="w-5 h-5 text-primary" />
                    </div>
                    <span className="text-xs text-muted-foreground">{i + 1}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-card-foreground">{stop.title}</h3>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {stopTypeLabels[stop.type]}
                      </span>
                    </div>
                    {stop.photo_url && (
                      <img src={stop.photo_url} alt={stop.title} className="w-full h-32 object-cover rounded-lg mb-2" />
                    )}
                    <p className="text-sm text-muted-foreground mb-1">{stop.description}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {stop.duration}</span>
                      {circuit.audio_zones.some((az) => Math.abs(az.lat - stop.lat) < 0.001 && Math.abs(az.lng - stop.lng) < 0.001) && (
                        <span className="flex items-center gap-1 text-secondary">
                          <Play className="w-3 h-3" /> Audio disponible
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

        <CommunitySlots circuitId={circuit.id} />

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <CircuitReviews circuitId={circuit.id} />
        </motion.div>
      </div>
    </div>
  );
};

export default CircuitDetail;
