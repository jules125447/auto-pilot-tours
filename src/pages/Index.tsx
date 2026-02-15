import { useState } from "react";
import { motion } from "framer-motion";
import { Search, MapPin, Compass, Car, Loader2 } from "lucide-react";
import CircuitCard from "@/components/CircuitCard";
import Header from "@/components/Header";
import { useCircuits } from "@/hooks/useCircuits";
import heroImage from "@/assets/hero-jura.jpg";

const regions = [
  { name: "Jura" },
  { name: "Côte d'Azur" },
  { name: "Provence" },
  { name: "Alpes" },
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

      {/* Hero */}
      <section className="relative h-[70vh] min-h-[500px] flex items-center justify-center overflow-hidden">
        <img src={heroImage} alt="Route panoramique" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-b from-foreground/40 via-foreground/30 to-background" />
        <div className="relative z-10 text-center px-4 max-w-3xl">
          <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="font-display text-4xl md:text-6xl font-bold text-primary-foreground mb-4 leading-tight">
            Explorez la France<br /><span className="text-accent">au volant</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.2 }} className="text-primary-foreground/80 text-lg md:text-xl mb-8">
            Des circuits touristiques guidés par GPS avec commentaires audio automatiques
          </motion.p>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.4 }} className="relative max-w-lg mx-auto">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
            <input type="text" placeholder="Rechercher un circuit ou une région..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-12 pr-4 py-4 rounded-2xl bg-card/95 backdrop-blur-sm text-foreground shadow-elevated text-base focus:outline-none focus:ring-2 focus:ring-primary/50" />
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12 border-b border-border">
        <div className="container">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Compass, title: "GPS intégré", desc: "Navigation virage par virage sur les plus belles routes" },
              { icon: MapPin, title: "Audio géolocalisé", desc: "Commentaires automatiques déclenchés par votre position" },
              { icon: Car, title: "Mode conduite", desc: "Interface plein écran optimisée pour le volant" },
            ].map((f, i) => (
              <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 + i * 0.1 }} className="flex items-start gap-4 p-4">
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <f.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{f.title}</h3>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Regions filter */}
      <section className="py-8">
        <div className="container">
          <div className="flex items-center gap-3 overflow-x-auto pb-2 scrollbar-hide">
            <button onClick={() => setSelectedRegion(null)} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${!selectedRegion ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
              Tous les circuits
            </button>
            {regions.map((r) => (
              <button key={r.name} onClick={() => setSelectedRegion(r.name)} className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${selectedRegion === r.name ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80"}`}>
                {r.name}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Circuits grid */}
      <section className="pb-16">
        <div className="container">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-foreground mb-6">
            {selectedRegion ? `Circuits en ${selectedRegion}` : "Circuits populaires"}
          </h2>
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : filteredCircuits.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Compass className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Aucun circuit trouvé</p>
              <p className="text-sm">Essayez une autre recherche ou région</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredCircuits.map((circuit, i) => (
                <CircuitCard key={circuit.id} circuit={circuit} index={i} />
              ))}
            </div>
          )}
        </div>
      </section>

      <footer className="border-t border-border py-8">
        <div className="container text-center text-sm text-muted-foreground">
          <p>© 2026 RoadTrip — Circuits touristiques guidés en France</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
