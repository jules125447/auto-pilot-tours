import { Link } from "react-router-dom";
import { Search, MapPin, Star, Clock, ArrowRight, Home, Map, Heart, User as UserIcon, Mountain, Castle, Waves, Users, Sun, Trees } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCircuits } from "@/hooks/useCircuits";
import ConsentBanner from "@/components/ConsentBanner";
import tiloLogo from "@/assets/tilo-logo.png";
import circuitsBg from "@/assets/circuits-bg.png";

const IconRoute = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 64 64" className={className} fill="none">
    <path d="M14 50 C 14 30, 50 34, 50 14" stroke="currentColor" strokeWidth="6" strokeLinecap="round" fill="none" />
    <circle cx="14" cy="50" r="5" fill="currentColor" />
  </svg>
);

const categories = [
  { key: "all", label: "Tous", icon: IconRoute },
  { key: "nature", label: "Nature", icon: Mountain },
  { key: "patrimoine", label: "Patrimoine", icon: Castle },
  { key: "mer", label: "Bord de mer", icon: Waves },
  { key: "famille", label: "Famille", icon: Users },
];

const ambiances = [
  { label: "Nature", icon: Trees },
  { label: "Culture", icon: Castle },
  { label: "Évasion", icon: Sun },
];

const Circuits = () => {
  const { user } = useAuth();
  const { data: circuits = [], isLoading } = useCircuits();

  const featured = circuits[0];
  const otherCircuits = circuits.slice(1);

  return (
    <div className="relative min-h-screen bg-background pb-28 font-sans overflow-hidden">
      {/* Decorative background */}
      <img
        src={circuitsBg}
        alt=""
        aria-hidden="true"
        className="pointer-events-none select-none absolute top-0 left-0 right-0 w-full h-auto object-cover z-0"
        style={{
          WebkitMaskImage: "linear-gradient(to bottom, black 55%, transparent 100%)",
          maskImage: "linear-gradient(to bottom, black 55%, transparent 100%)",
        }}
      />

      <div className="relative z-10">
        {/* Header */}
        <header className="px-5 pt-6 text-center">
          <img src={tiloLogo} alt="Tilo" className="h-28 sm:h-32 w-auto mx-auto -my-4" />
          <h1 className="font-display text-[2.75rem] sm:text-[3rem] leading-none font-black text-foreground tracking-tight">
            Circuits
          </h1>
          <p className="text-muted-foreground text-[15px] mt-2">
            Explorez nos itinéraires audio partout en France
          </p>
        </header>

        <main className="px-5 mt-5 space-y-5">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/70" strokeWidth={2.5} />
            <input
              type="text"
              placeholder="Rechercher un circuit ou une région"
              className="w-full pl-14 pr-14 py-4 rounded-full bg-white shadow-card text-[15px] text-foreground placeholder:text-muted-foreground/80 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              aria-label="Rechercher"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-card"
            >
              <Search className="w-5 h-5" strokeWidth={2.5} />
            </button>
          </div>

          {/* Categories */}
          <div className="flex gap-2.5 overflow-x-auto -mx-5 px-5 pb-1 scrollbar-hide">
            {categories.map((c, i) => {
              const Icon = c.icon;
              const active = i === 0;
              return (
                <button
                  key={c.key}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-full whitespace-nowrap text-[14px] font-bold shadow-card transition-all ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-white text-foreground"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? "" : "text-primary"}`} strokeWidth={2.5} />
                  {c.label}
                </button>
              );
            })}
          </div>

          {/* Featured (latest) circuit */}
          {featured && (
            <div className="rounded-3xl bg-white shadow-card overflow-hidden">
              <div className="grid grid-cols-[40%_1fr]">
                <div className="relative">
                  <img src={featured.image} alt={featured.title} className="w-full h-full object-cover aspect-square" />
                  <span className="absolute top-3 left-3 inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/95 text-primary text-[11px] font-bold shadow-card">
                    <Star className="w-3 h-3 fill-primary text-primary" /> À la une
                  </span>
                </div>
                <div className="p-4 flex flex-col">
                  <h3 className="font-display font-black text-foreground text-[22px] leading-tight line-clamp-2">
                    {featured.title}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[13px] text-foreground mt-1.5">
                    <MapPin className="w-4 h-4 text-primary fill-primary" strokeWidth={0} />
                    <span className="truncate">{featured.region || "France"}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-3 text-[13px] text-foreground font-bold">
                    <span className="flex items-center gap-1">
                      <Star className="w-3.5 h-3.5 fill-primary text-primary" />
                      {(featured.rating || 0).toFixed(1).replace(".", ",")}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-foreground/70" strokeWidth={2.5} />
                      {featured.duration || "—"}
                    </span>
                    <span className="flex items-center gap-1 text-primary">
                      <IconRoute className="w-3.5 h-3.5" />
                      <span className="text-foreground">{featured.distance || "—"}</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Link
                      to={`/circuit/${featured.id}`}
                      className="flex-1 inline-flex items-center justify-center py-3 rounded-full bg-primary text-primary-foreground font-bold text-[14px] shadow-card"
                    >
                      Voir le circuit
                    </Link>
                    <Link
                      to={`/circuit/${featured.id}`}
                      aria-label="Voir"
                      className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-card"
                    >
                      <ArrowRight className="w-5 h-5" strokeWidth={2.5} />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* All circuits */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-black text-foreground text-[20px]">Circuits</h3>
            </div>
            <div className="space-y-3">
              {isLoading && (
                <div className="rounded-2xl bg-white shadow-card p-5 text-muted-foreground">Chargement...</div>
              )}
              {otherCircuits.map((c) => (
                <Link
                  key={c.id}
                  to={`/circuit/${c.id}`}
                  className="rounded-2xl bg-white shadow-card p-3 flex items-center gap-3"
                >
                  <img src={c.image} alt={c.title} className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-display font-black text-foreground text-[16px] leading-tight line-clamp-1">
                      {c.title}
                    </h4>
                    <div className="flex items-center gap-1 text-[12px] text-foreground/80 mt-1">
                      <MapPin className="w-3.5 h-3.5 text-primary fill-primary" strokeWidth={0} />
                      <span className="truncate">{c.region || "France"}</span>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-[12px] text-foreground font-bold">
                      <span className="flex items-center gap-1">
                        <Star className="w-3.5 h-3.5 fill-primary text-primary" />
                        {(c.rating || 0).toFixed(1).replace(".", ",")}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" strokeWidth={2.4} />
                        {c.duration || "—"}
                      </span>
                      <span className="flex items-center gap-1 text-primary">
                        <IconRoute className="w-3.5 h-3.5" />
                        <span className="text-foreground">{c.distance || "—"}</span>
                      </span>
                    </div>
                  </div>
                  <div className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 shadow-card">
                    <ArrowRight className="w-5 h-5" strokeWidth={2.5} />
                  </div>
                </Link>
              ))}
            </div>
          </section>

          {/* Ambiances */}
          <section>
            <h3 className="font-display font-black text-foreground text-[20px] mb-3">Parcourir par ambiance</h3>
            <div className="grid grid-cols-3 gap-2.5">
              {ambiances.map((a) => {
                const Icon = a.icon;
                return (
                  <button
                    key={a.label}
                    className="rounded-2xl bg-white shadow-card p-3 flex flex-col items-start gap-2"
                  >
                    <Icon className="w-7 h-7 text-primary" strokeWidth={2.5} />
                    <span className="font-display font-black text-foreground text-[14px]">{a.label}</span>
                  </button>
                );
              })}
            </div>
          </section>
        </main>
      </div>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pt-2 pointer-events-none">
        <div className="max-w-md mx-auto rounded-3xl bg-white/95 backdrop-blur-xl shadow-elevated pointer-events-auto">
          <div className="grid grid-cols-4">
            {[
              { icon: Home, label: "Accueil", to: "/", active: false },
              { icon: Map, label: "Circuits", to: "/circuits", active: true },
              { icon: Heart, label: "Favoris", to: "/my-circuits", active: false },
              { icon: UserIcon, label: "Profil", to: user ? "/profile" : "/auth", active: false },
            ].map((t) => (
              <Link
                key={t.label}
                to={t.to}
                className={`flex flex-col items-center justify-center gap-1 py-3 ${t.active ? "text-primary" : "text-muted-foreground"}`}
              >
                {t.active ? (
                  <t.icon className="w-6 h-6 fill-primary text-primary" strokeWidth={0} />
                ) : (
                  <t.icon className="w-6 h-6" strokeWidth={2} />
                )}
                <span className="text-[12px] font-semibold">{t.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <ConsentBanner />
    </div>
  );
};

export default Circuits;
