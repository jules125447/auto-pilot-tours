import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin, Compass, Car, Loader2, PlusCircle, ArrowRight, Sparkles, Volume2, Award, Users } from "lucide-react";
import { Link } from "react-router-dom";
import CircuitCard from "@/components/CircuitCard";
import Header from "@/components/Header";
import { useCircuits } from "@/hooks/useCircuits";
import heroImage from "@/assets/hero-jura.jpg";

const regions = [
  { name: "Jura", emoji: "🏔️" },
  { name: "Côte d'Azur", emoji: "🌊" },
  { name: "Provence", emoji: "🌻" },
  { name: "Alpes", emoji: "⛰️" },
];

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const { data: circuits = [], isLoading } = useCircuits();

  const filteredCircuits = circuits.filter((c) => {
    const matchSearch =
      c.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.region || "").toLowerCase().includes(searchQuery.toLowerCase());
    const matchRegion = !selectedRegion || (c.region || "").includes(selectedRegion);
    return matchSearch && matchRegion;
  });

  const proCircuits = filteredCircuits.filter((c) => c.circuit_type === "pro");
  const amateurCircuits = filteredCircuits.filter((c) => c.circuit_type === "amateur");

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero — cinematic fullscreen */}
      <section className="relative h-screen min-h-[600px] flex items-end overflow-hidden">
        <img
          src={heroImage}
          alt="Route panoramique en France"
          className="absolute inset-0 w-full h-full object-cover scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />

        <div className="relative z-10 w-full pb-16 px-4">
          <div className="container max-w-5xl">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="mb-8"
            >
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
                <Sparkles className="w-4 h-4" />
                Circuits guidés par GPS
              </span>
              <h1 className="font-display text-5xl md:text-7xl lg:text-8xl font-900 text-foreground leading-[0.95] mb-5 tracking-tight">
                Roulez.<br />
                <span className="text-primary">Explorez.</span><br />
                Écoutez.
              </h1>
              <p className="text-muted-foreground text-lg md:text-xl max-w-xl leading-relaxed">
                Des road trips guidés avec audio géolocalisé. Montez en voiture, l'aventure commence.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="flex flex-col sm:flex-row gap-3"
            >
              <div className="relative flex-1 max-w-lg">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Où voulez-vous aller ?"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 rounded-2xl bg-card text-foreground shadow-elevated text-base focus:outline-none focus:ring-2 focus:ring-primary/40 border border-border/50"
                />
              </div>
              <Link
                to="/creator"
                className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-secondary text-secondary-foreground font-semibold text-base hover:opacity-90 transition-opacity whitespace-nowrap"
              >
                <PlusCircle className="w-5 h-5" />
                Créer un circuit
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="border-b border-border bg-card">
        <div className="container max-w-5xl">
          <div className="grid grid-cols-3 divide-x divide-border">
            {[
              { icon: Compass, value: `${circuits.length}+`, label: "Circuits" },
              { icon: Volume2, value: "Audio", label: "GPS guidé" },
              { icon: Car, value: "100%", label: "Mains libres" },
            ].map((stat) => (
              <div key={stat.label} className="flex items-center justify-center gap-3 py-5">
                <stat.icon className="w-5 h-5 text-primary" />
                <div>
                  <p className="font-display font-bold text-foreground text-lg leading-tight">{stat.value}</p>
                  <p className="text-muted-foreground text-xs">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Regions */}
      <section className="py-10">
        <div className="container max-w-5xl">
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
            <button
              onClick={() => setSelectedRegion(null)}
              className={`px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                !selectedRegion
                  ? "bg-primary text-primary-foreground shadow-glow"
                  : "bg-muted text-muted-foreground hover:text-foreground"
              }`}
            >
              Tous
            </button>
            {regions.map((r) => (
              <button
                key={r.name}
                onClick={() => setSelectedRegion(r.name)}
                className={`px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                  selectedRegion === r.name
                    ? "bg-primary text-primary-foreground shadow-glow"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {r.emoji} {r.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Circuits */}
      <section className="pb-20">
        <div className="container max-w-5xl">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="font-display text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                {selectedRegion ? selectedRegion : "À découvrir"}
              </h2>
              <p className="text-muted-foreground text-sm mt-1">
                {filteredCircuits.length} circuit{filteredCircuits.length > 1 ? "s" : ""} disponible{filteredCircuits.length > 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredCircuits.length === 0 ? (
            <div className="text-center py-20 text-muted-foreground">
              <Compass className="w-14 h-14 mx-auto mb-4 opacity-40" />
              <p className="text-lg font-medium">Aucun circuit trouvé</p>
              <p className="text-sm mt-1">Essayez une autre recherche ou région</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCircuits.map((circuit, i) => (
                <CircuitCard key={circuit.id} circuit={circuit} index={i} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* CTA bottom */}
      <section className="py-20 bg-secondary">
        <div className="container max-w-3xl text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-secondary-foreground mb-4 tracking-tight">
            Vous connaissez une route incroyable ?
          </h2>
          <p className="text-secondary-foreground/70 text-lg mb-8">
            Créez votre circuit, ajoutez des commentaires audio et partagez-le avec la communauté.
          </p>
          <Link
            to="/creator"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl bg-primary text-primary-foreground font-bold text-lg hover:opacity-90 transition-opacity"
          >
            Commencer à créer
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border py-8 bg-background">
        <div className="container text-center text-sm text-muted-foreground">
          <p>© 2026 RoadTrip — Circuits touristiques guidés en France</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
