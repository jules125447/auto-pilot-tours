import { Link } from "react-router-dom";
import { Search, MapPin, Star, Clock, ArrowRight, Home, Map, Heart, User as UserIcon, Headphones, Waves, Castle, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCircuits } from "@/hooks/useCircuits";
import { useFavorites } from "@/hooks/useFavorites";
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
  { key: "ecouter", label: "À écouter", icon: Headphones },
  { key: "mer", label: "Bord de mer", icon: Waves },
  { key: "patrimoine", label: "Patrimoine", icon: Castle },
  { key: "famille", label: "Famille", icon: Users },
];

const Favorites = () => {
  const { user } = useAuth();
  const { data: circuits = [], isLoading } = useCircuits();
  const { favorites, toggle, isFavorite } = useFavorites();

  const favCircuits = circuits.filter((c) => favorites.includes(c.id));

  return (
    <div className="relative min-h-screen bg-background pb-28 font-sans overflow-hidden">
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
        <header className="px-5 pt-6 text-center">
          <img src={tiloLogo} alt="Tilo" className="h-28 sm:h-32 w-auto mx-auto -my-4" />
          <h1 className="font-display text-[2.75rem] sm:text-[3rem] leading-none font-black text-foreground tracking-tight">
            Favoris
          </h1>
          <p className="text-muted-foreground text-[15px] mt-2">
            Retrouvez vos circuits préférés à tout moment
          </p>
        </header>

        <main className="px-5 mt-5 space-y-5">
          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-foreground/70" strokeWidth={2.5} />
            <input
              type="text"
              placeholder="Rechercher dans mes favoris"
              className="w-full pl-14 pr-5 py-4 rounded-full bg-white shadow-card text-[15px] text-foreground placeholder:text-muted-foreground/80 focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div className="flex gap-2.5 overflow-x-auto -mx-5 px-5 pb-1 scrollbar-hide">
            {categories.map((c, i) => {
              const Icon = c.icon;
              const active = i === 0;
              return (
                <button
                  key={c.key}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-full whitespace-nowrap text-[14px] font-bold shadow-card transition-all ${
                    active ? "bg-primary text-primary-foreground" : "bg-white text-foreground"
                  }`}
                >
                  <Icon className={`w-4 h-4 ${active ? "" : "text-primary"}`} strokeWidth={2.5} />
                  {c.label}
                </button>
              );
            })}
          </div>

          <section>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display font-black text-foreground text-[20px]">Mes favoris</h3>
            </div>

            {isLoading ? (
              <div className="rounded-2xl bg-white shadow-card p-5 text-muted-foreground">Chargement...</div>
            ) : favCircuits.length === 0 ? (
              <div className="rounded-2xl bg-white shadow-card p-6 text-center">
                <Heart className="w-10 h-10 text-primary/60 mx-auto mb-3" strokeWidth={2} />
                <p className="font-display font-black text-foreground text-[16px]">Aucun favori pour le moment</p>
                <p className="text-muted-foreground text-[13px] mt-1">
                  Ajoutez vos circuits préférés en appuyant sur le cœur
                </p>
                <Link
                  to="/circuits"
                  className="mt-4 inline-flex items-center justify-center px-5 py-3 rounded-full bg-primary text-primary-foreground font-bold text-[14px] shadow-card"
                >
                  Découvrir les circuits
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {favCircuits.map((c) => (
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
                    <button
                      aria-label="Retirer des favoris"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggle(c.id);
                      }}
                      className="w-10 h-10 flex items-center justify-center flex-shrink-0"
                    >
                      <Heart
                        className={`w-6 h-6 ${isFavorite(c.id) ? "fill-primary text-primary" : "text-foreground/40"}`}
                        strokeWidth={2.2}
                      />
                    </button>
                    <div className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 shadow-card">
                      <ArrowRight className="w-5 h-5" strokeWidth={2.5} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pt-2 pointer-events-none">
        <div className="max-w-md mx-auto rounded-3xl bg-white/95 backdrop-blur-xl shadow-elevated pointer-events-auto">
          <div className="grid grid-cols-4">
            {[
              { icon: Home, label: "Accueil", to: "/", active: false },
              { icon: Map, label: "Circuits", to: "/circuits", active: false },
              { icon: Heart, label: "Favoris", to: "/favorites", active: true },
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

export default Favorites;
