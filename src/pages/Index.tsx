import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Compass, Car, Loader2, PlusCircle, ArrowRight, Sparkles, Volume2, Headphones, Navigation2, Star } from "lucide-react";
import { Link } from "react-router-dom";
import CircuitCard from "@/components/CircuitCard";
import Header from "@/components/Header";
import { useCircuits } from "@/hooks/useCircuits";
import ConsentBanner from "@/components/ConsentBanner";


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

      {/* Hero — centered, with floating Tilo on mobile */}
      <section className="relative overflow-hidden bg-background">
        <div className="pointer-events-none absolute inset-0 opacity-[0.18]" style={{
          backgroundImage: "radial-gradient(circle at 20% 20%, hsl(var(--primary) / 0.45), transparent 45%), radial-gradient(circle at 85% 80%, hsl(var(--secondary) / 0.35), transparent 50%)"
        }} />
        <div className="pointer-events-none absolute inset-0 mix-blend-overlay opacity-[0.04]" style={{
          backgroundImage: "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/></filter><rect width='100%25' height='100%25' filter='url(%23n)'/></svg>\")"
        }} />

        <div className="container max-w-5xl px-4 pt-6 md:pt-16 pb-8 md:pb-20 relative z-10 text-center">
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.08 } } }}
          >
            <motion.span
              variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-primary/10 text-primary text-[11px] md:text-xs font-semibold tracking-wide uppercase mb-4 md:mb-6 border border-primary/20"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Nouveau · Audio géolocalisé
            </motion.span>

            <motion.h1
              variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.6 } } }}
              className="font-display font-black text-foreground leading-[0.95] md:leading-[0.92] tracking-tight text-[2.5rem] sm:text-5xl md:text-7xl lg:text-[5rem] mb-4 md:mb-5"
            >
              La route<br />
              devient un<br />
              <span className="relative inline-block">
                <span className="relative z-10 bg-gradient-to-br from-primary via-primary to-secondary bg-clip-text text-transparent italic">spectacle</span>
                <span className="absolute left-0 right-0 bottom-1 md:bottom-2 h-2 md:h-3.5 bg-primary/20 -z-0 -skew-x-6" aria-hidden />
              </span>.
            </motion.h1>

            <motion.p
              variants={{ hidden: { opacity: 0, y: 10 }, show: { opacity: 1, y: 0 } }}
              className="text-muted-foreground text-sm md:text-lg max-w-xl mx-auto leading-relaxed mb-6 md:mb-8 px-2"
            >
              Des circuits scénarisés avec narration audio qui se déclenche
              automatiquement aux bons endroits. Vous conduisez, on raconte.
            </motion.p>

            {/* Floating Tilo mascot — mobile only */}
            <motion.div
              variants={{ hidden: { opacity: 0, scale: 0.8 }, show: { opacity: 1, scale: 1 } }}
              className="md:hidden flex justify-center mb-5"
            >
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 3.4, repeat: Infinity, ease: "easeInOut" }}
                className="relative"
              >
                <div className="absolute -inset-4 rounded-full bg-primary/15 blur-2xl" aria-hidden />
                <img
                  src="/tilo-splash.png"
                  alt="Tilo, votre compagnon de voyage"
                  className="relative w-40 h-40 object-contain object-center scale-[2.2] origin-center"
                  style={{ objectPosition: "center 62%" }}
                  loading="eager"
                />
              </motion.div>
            </motion.div>

            <motion.div
              variants={{ hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0 } }}
              className="flex flex-col sm:flex-row gap-3 mb-6 md:mb-8 max-w-lg mx-auto"
            >
              <div className="relative flex-1 group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  type="text"
                  placeholder="Une région, une route, une envie…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-card text-foreground shadow-elevated text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-primary/40 border border-border/60"
                />
              </div>
              <motion.div whileTap={{ scale: 0.96 }}>
                <Link
                  to="/creator"
                  className="group/cta relative overflow-hidden inline-flex w-full items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-foreground text-background font-semibold text-sm md:text-base hover:bg-foreground/90 transition-colors whitespace-nowrap shadow-elevated"
                >
                  <span className="pointer-events-none absolute inset-0 -translate-x-full group-hover/cta:translate-x-full transition-transform duration-700 ease-out bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                  <PlusCircle className="w-5 h-5" />
                  Créer un circuit
                </Link>
              </motion.div>
            </motion.div>

            <motion.div
              variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}
              className="flex flex-nowrap md:flex-wrap items-center justify-start md:justify-center gap-x-4 md:gap-x-6 gap-y-3 text-xs md:text-sm overflow-x-auto scrollbar-hide px-2 -mx-2"
            >
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <div className="flex -space-x-0.5">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 md:w-4 md:h-4 fill-primary text-primary" />
                  ))}
                </div>
                <span className="font-semibold text-foreground">4.9/5</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground flex-shrink-0">
                <Headphones className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
                <span><span className="font-semibold text-foreground">100%</span> mains libres</span>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground flex-shrink-0">
                <Navigation2 className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
                <span>Hors-ligne</span>
              </div>
            </motion.div>
          </motion.div>
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
              <motion.button
                key={r.name}
                whileTap={{ scale: 0.93 }}
                whileHover={{ scale: 1.04 }}
                onClick={() => setSelectedRegion(r.name)}
                className={`px-5 py-2.5 rounded-full text-sm font-semibold whitespace-nowrap transition-all ${
                  selectedRegion === r.name
                    ? "bg-primary text-primary-foreground shadow-glow"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {r.emoji} {r.name}
              </motion.button>
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
                <motion.div
                  key={circuit.id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.5, delay: Math.min(i * 0.06, 0.4), ease: "easeOut" }}
                >
                  <CircuitCard circuit={circuit} index={i} />
                </motion.div>
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
        <div className="container text-center text-sm text-muted-foreground space-y-2">
          <p>© 2026 RoadTrip — Circuits touristiques guidés en France</p>
          <p className="text-xs opacity-60">Données de navigation anonymisées à des fins d'amélioration du service.</p>
          <Link to="/admin" className="inline-block text-[10px] uppercase tracking-widest opacity-30 hover:opacity-100 transition-opacity">
            Admin
          </Link>
        </div>
      </footer>
      <ConsentBanner />
    </div>
  );
};

export default Index;
