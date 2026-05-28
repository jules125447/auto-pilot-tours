import { Link } from "react-router-dom";
import { ArrowLeft, Search } from "lucide-react";
import CircuitCard from "@/components/CircuitCard";
import ConsentBanner from "@/components/ConsentBanner";
import { useCircuits } from "@/hooks/useCircuits";

const Circuits = () => {
  const { data: circuits = [], isLoading } = useCircuits();

  return (
    <div className="min-h-screen bg-background pb-10 font-sans">
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-xl px-5 pt-5 pb-4 border-b border-border/40">
        <div className="flex items-center gap-3">
          <Link to="/" className="w-11 h-11 rounded-full bg-card shadow-card flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-foreground" strokeWidth={2.4} />
          </Link>
          <div>
            <h1 className="font-display text-3xl font-black text-foreground leading-none">Circuits</h1>
            <p className="text-muted-foreground text-sm mt-1">Tous les circuits disponibles</p>
          </div>
        </div>
        <div className="relative mt-4">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" strokeWidth={2.5} />
          <input
            type="text"
            placeholder="Rechercher un circuit ou une région"
            className="w-full pl-14 pr-4 py-4 rounded-full bg-card shadow-card text-[15px] text-foreground placeholder:text-muted-foreground/80 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
      </header>

      <main className="px-5 pt-5 space-y-4">
        {isLoading ? (
          <div className="rounded-2xl bg-card shadow-card p-5 text-muted-foreground">Chargement des circuits...</div>
        ) : circuits.length > 0 ? (
          circuits.map((circuit, index) => <CircuitCard key={circuit.id} circuit={circuit} index={index} />)
        ) : (
          <div className="rounded-2xl bg-card shadow-card p-5 text-muted-foreground">Aucun circuit disponible pour le moment.</div>
        )}
      </main>

      <ConsentBanner />
    </div>
  );
};

export default Circuits;