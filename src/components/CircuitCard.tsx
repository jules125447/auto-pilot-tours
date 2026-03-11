import { MapPin, Clock, Route, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import type { CircuitWithStops } from "@/hooks/useCircuits";

interface CircuitCardProps {
  circuit: CircuitWithStops;
  index?: number;
}

const difficultyLabel: Record<string, { bg: string; text: string }> = {
  Facile: { bg: "bg-accent/15", text: "text-accent-foreground" },
  Modéré: { bg: "bg-primary/15", text: "text-primary" },
  Difficile: { bg: "bg-destructive/15", text: "text-destructive" },
};

const CircuitCard = ({ circuit, index = 0 }: CircuitCardProps) => {
  const diff = difficultyLabel[circuit.difficulty || "Facile"] || difficultyLabel["Facile"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.08 }}
    >
      <Link to={`/circuit/${circuit.id}`} className="block group">
        <div className="rounded-2xl overflow-hidden bg-card shadow-card hover:shadow-elevated transition-all duration-500 hover:-translate-y-1 border border-border/50">
          {/* Image */}
          <div className="relative aspect-[16/10] overflow-hidden">
            <img
              src={circuit.image}
              alt={circuit.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/50 via-transparent to-transparent" />

            {/* Price pill */}
            <div className="absolute top-3 right-3 bg-card/90 backdrop-blur-sm rounded-full px-3 py-1 border border-border/30">
              <span className="text-sm font-bold text-foreground">{circuit.price} €</span>
            </div>

            {/* Bottom info on image */}
            <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
              <span className={`px-3 py-1 rounded-full text-xs font-semibold ${diff.bg} ${diff.text} backdrop-blur-sm`}>
                {circuit.difficulty}
              </span>
              <span className="flex items-center gap-1 text-primary-foreground text-xs font-medium">
                <MapPin className="w-3 h-3" /> {circuit.region}
              </span>
            </div>
          </div>

          {/* Content */}
          <div className="p-5">
            <h3 className="font-display text-lg font-bold text-card-foreground mb-1.5 group-hover:text-primary transition-colors leading-snug">
              {circuit.title}
            </h3>
            <p className="text-muted-foreground text-sm line-clamp-2 mb-4 leading-relaxed">
              {circuit.description}
            </p>
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" /> {circuit.duration}
                </span>
                <span className="flex items-center gap-1.5">
                  <Route className="w-3.5 h-3.5" /> {circuit.distance}
                </span>
              </div>
              <span className="flex items-center gap-1 text-primary font-semibold">
                <Star className="w-3.5 h-3.5 fill-current" /> {circuit.rating}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default CircuitCard;
