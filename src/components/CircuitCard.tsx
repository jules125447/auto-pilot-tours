import { MapPin, Clock, Route, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import type { CircuitWithStops } from "@/hooks/useCircuits";

interface CircuitCardProps {
  circuit: CircuitWithStops;
  index?: number;
}

const difficultyColor: Record<string, string> = {
  Facile: "bg-primary/10 text-primary",
  Modéré: "bg-accent/10 text-accent-foreground",
  Difficile: "bg-destructive/10 text-destructive",
};

const CircuitCard = ({ circuit, index = 0 }: CircuitCardProps) => {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: index * 0.1 }}>
      <Link to={`/circuit/${circuit.id}`} className="block group">
        <div className="rounded-xl overflow-hidden bg-card shadow-card hover:shadow-elevated transition-all duration-500 hover:-translate-y-1">
          <div className="relative aspect-[4/3] overflow-hidden">
            <img src={circuit.image} alt={circuit.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
            <div className="absolute top-3 left-3">
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${difficultyColor[circuit.difficulty || "Facile"]}`}>
                {circuit.difficulty}
              </span>
            </div>
            <div className="absolute top-3 right-3 bg-card/90 backdrop-blur-sm rounded-full px-3 py-1">
              <span className="text-sm font-semibold text-foreground">{circuit.price} €</span>
            </div>
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-foreground/60 to-transparent p-4 pt-12">
              <p className="text-primary-foreground text-xs font-medium flex items-center gap-1">
                <MapPin className="w-3 h-3" /> {circuit.region}
              </p>
            </div>
          </div>
          <div className="p-4">
            <h3 className="font-display text-lg font-semibold text-card-foreground mb-1 group-hover:text-primary transition-colors">
              {circuit.title}
            </h3>
            <p className="text-muted-foreground text-sm line-clamp-2 mb-3">{circuit.description}</p>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {circuit.duration}</span>
                <span className="flex items-center gap-1"><Route className="w-3.5 h-3.5" /> {circuit.distance}</span>
              </div>
              <span className="flex items-center gap-1 text-accent">
                <Star className="w-3.5 h-3.5 fill-current" /> {circuit.rating}
                <span className="text-muted-foreground">({circuit.review_count})</span>
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default CircuitCard;
