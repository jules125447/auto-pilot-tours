import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, MapPin, Compass, Car, Loader2, PlusCircle, ArrowRight, Sparkles, Volume2, Headphones, Navigation2, Star } from "lucide-react";
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

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero — editorial split layout */}
      <section className="relative overflow-hidden bg-background">
        <div className="pointer-events-none absolute inset-0 opacity-[0.18]" style={{
          backgroundImage: "radial-gradient(circle at 20% 20%, hsl(var(--primary) / 0.45), transparent 45%), radial-gradient(circle at 85% 80%, hsl(var(--secondary) / 0.35), transparent 50%)"
        }} />
        <div className="pointer-events-none absolute inset-0 mix-blend-overlay opacity-[0.04]" style={{
          backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")"
        }} />

        <div className="container max-w-7xl px-4 pt-12 md:pt-16 pb-14 md:pb-20 relative z-10">
          <div className="grid lg:grid-cols-12 gap-10 lg:gap-8 items-center">
            {/* LEFT — copy */}
            <div className="lg:col-span-7">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: "easeOut" }}
              >
                <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-semibold tracking-wide uppercase mb-7 border border-primary/20">
                  <Sparkles className="w-3.5 h-3.5" />
                  Nouveau · Audio géolocalisé
                </span>

                <h1 className="font-display font-black text-foreground leading-[0.88] tracking-tight text-[clamp(2.75rem,8vw,6.5rem)] mb-7">
                  La route<br />
                  devient un<br />
                  <span className="relative inline-block">
                    <span className="relative z-10 bg-gradient-to-br from-primary via-primary to-secondary bg-clip-text text-transparent italic">spectacle</span>
                    <span className="absolute left-0 right-0 bottom-1 md:bottom-2 h-3 md:h-4 bg-primary/20 -z-0 -skew-x-6" aria-hidden />
                  </span>.
                </h1>

                <p className="text-muted-foreground text-base md:text-lg max-w-xl leading-relaxed mb-9">
                  Des circuits scénarisés avec narration audio qui se déclenche
                  automatiquement aux bons endroits. Vous conduisez, on raconte.
                </p>

                <motion.div
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.25 }}
                  className="flex flex-col sm:flex-row gap-3 mb-10"
                >
                  <div className="relative flex-1 max-w-md group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                    <input
                      type="text"
                      placeholder="Une région, une route, une envie…"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-4 py-4 rounded-2xl bg-card text-foreground shadow-elevated text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-primary/40 border border-border/60"
                    />
                  </div>
                  <Link
                    to="/creator"
                    className="inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-foreground text-background font-semibold text-sm md:text-base hover:bg-foreground/90 transition-colors whitespace-nowrap shadow-elevated"
                  >
                    <PlusCircle className="w-5 h-5" />
                    Créer un circuit
                  </Link>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.5 }}
                  className="flex flex-wrap items-center gap-x-7 gap-y-3 text-sm"
                >
                  <div className="flex items-center gap-1.5">
                    <div className="flex -space-x-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-primary text-primary" />
                      ))}
                    </div>
                    <span className="font-semibold text-foreground">4.9/5</span>
                    <span className="text-muted-foreground">· conducteurs</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Headphones className="w-4 h-4 text-primary" />
                    <span><span className="font-semibold text-foreground">100%</span> mains libres</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Navigation2 className="w-4 h-4 text-primary" />
                    <span>Hors-ligne</span>
                  </div>
                </motion.div>
              </motion.div>
            </div>

            {/* RIGHT — visual stack */}
            <div className="lg:col-span-5 relative">
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.9, ease: "easeOut", delay: 0.15 }}
                className="relative aspect-[4/5] max-w-md mx-auto lg:max-w-none"
              >
                <div className="relative h-full w-full rounded-[2rem] overflow-hidden shadow-elevated ring-1 ring-border/60">
                  <img
                    src={heroImage}
                    alt="Route panoramique en France"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent" />

                  <div className="absolute bottom-5 left-5 right-5 flex items-center gap-3 p-3 pr-4 rounded-2xl bg-background/85 backdrop-blur-md border border-border/50 shadow-elevated">
                    <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-display font-bold text-sm text-foreground truncate">Route des Sapins</p>
                      <p className="text-xs text-muted-foreground truncate">Jura · 42 km · 1h20 d'audio</p>
                    </div>
                  </div>
                </div>

                <motion.div
                  initial={{ opacity: 0, x: -20, y: -10 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.7 }}
                  className="absolute -top-4 -left-4 md:-left-8 px-4 py-3 rounded-2xl bg-card border border-border shadow-elevated flex items-center gap-2.5"
                >
                  <span className="relative flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-primary" />
                  </span>
                  <span className="text-xs font-semibold text-foreground">Audio en lecture</span>
                </motion.div>

                <motion.div
                  initial={{ opacity: 0, x: 20, y: 10 }}
                  animate={{ opacity: 1, x: 0, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.85 }}
                  className="absolute -bottom-5 -right-3 md:-right-8 px-4 py-3 rounded-2xl bg-foreground text-background shadow-elevated flex items-center gap-2.5"
                >
                  <Car className="w-4 h-4" />
                  <span className="text-xs font-semibold">Mode conduite</span>
                </motion.div>
              </motion.div>
            </div>
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
                Circuits
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
