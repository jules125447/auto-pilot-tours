import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Clock, Route, Star, MapPin, Download, Play, Car, Eye, UtensilsCrossed, ParkingCircle, Landmark } from "lucide-react";
import { circuits } from "@/data/circuits";
import RouteMap from "@/components/RouteMap";

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
  const circuit = circuits.find((c) => c.id === id);

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
      {/* Hero */}
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card rounded-2xl shadow-elevated p-6 md:p-8 mb-8"
        >
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
                <span className="text-muted-foreground text-sm">({circuit.reviewCount} avis)</span>
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

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to={`/navigate/${circuit.id}`}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-gradient-hero text-primary-foreground font-semibold text-lg hover:opacity-90 transition-opacity"
            >
              <Car className="w-5 h-5" /> Démarrer le circuit
            </Link>
            <button className="flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-muted text-foreground font-medium hover:bg-muted/80 transition-colors">
              <Download className="w-5 h-5" /> Hors-ligne
            </button>
          </div>
        </motion.div>

        {/* Map */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl shadow-card overflow-hidden mb-8"
        >
          <h2 className="font-display text-xl font-semibold text-card-foreground p-6 pb-0">Aperçu du parcours</h2>
          <div className="p-4">
            <RouteMap
              route={circuit.route}
              stops={circuit.stops}
              className="h-[350px] rounded-xl"
            />
          </div>
        </motion.div>

        {/* Stops */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
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
                    <p className="text-sm text-muted-foreground mb-1">{stop.description}</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {stop.duration}</span>
                      {stop.audioText && (
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
      </div>
    </div>
  );
};

export default CircuitDetail;
