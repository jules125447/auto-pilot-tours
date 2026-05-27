import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Search,
  Bell,
  Play,
  MapPin,
  Star,
  Clock,
  Route as RouteIcon,
  ArrowRight,
  Compass,
  Headphones,
  PenLine,
  Mountain,
  Castle,
  Users,
  Home,
  Map,
  Heart,
  User as UserIcon,
  Car,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCircuits } from "@/hooks/useCircuits";
import ConsentBanner from "@/components/ConsentBanner";
import tiloHero from "@/assets/tilo-hero-map.png";
import tiloPencil from "@/assets/tilo-pencil.png";
import tiloMascot from "@/assets/tilo-mascot.png";

const Index = () => {
  const { user } = useAuth();
  const { data: circuits = [] } = useCircuits();

  const firstName = useMemo(() => {
    const name = (user?.user_metadata?.display_name as string) || user?.email?.split("@")[0] || "voyageur";
    return name.charAt(0).toUpperCase() + name.slice(1);
  }, [user]);

  const featured = circuits[0];
  const recommended = circuits.slice(0, 2);

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Top bar */}
      <header className="px-5 pt-4 pb-2 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="relative w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-glow">
            <Car className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="font-display text-3xl font-black tracking-tight text-foreground">Tilo</span>
        </Link>
        <button className="relative w-11 h-11 rounded-full bg-card shadow-card flex items-center justify-center">
          <Bell className="w-5 h-5 text-foreground" />
          <span className="absolute top-2.5 right-2.5 w-2 h-2 rounded-full bg-primary" />
        </button>
      </header>

      <main className="px-5 space-y-6">
        {/* Greeting */}
        <section className="pt-2">
          <h1 className="font-display text-[2rem] leading-tight font-black text-foreground">
            Bonjour {firstName} <span className="inline-block">👋</span>
          </h1>
          <p className="text-muted-foreground text-base mt-1">Où partons-nous aujourd'hui ?</p>
        </section>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" />
          <input
            type="text"
            placeholder="Rechercher un circuit ou une région"
            className="w-full pl-12 pr-4 py-4 rounded-2xl bg-card shadow-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 border border-border/40"
          />
        </div>

        {/* Hero card */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-3xl overflow-hidden shadow-elevated bg-card border border-border/40"
        >
          <div className="relative grid grid-cols-5 items-center min-h-[260px]">
            <div className="col-span-3 p-5 relative z-10">
              <h2 className="font-display font-black text-foreground leading-[1.05] text-[1.6rem]">
                Votre prochaine{" "}
                <span className="text-primary italic">aventure</span>
                <br />commence ici.
              </h2>
              <div className="mt-4 flex items-center gap-2 text-primary font-bold text-sm">
                <Headphones className="w-4 h-4" />
                Audio géolocalisé
              </div>
              <p className="text-muted-foreground text-xs mt-1.5">Histoires et conseils à chaque étape.</p>
              <Link
                to={featured ? `/navigate/${featured.id}` : "/"}
                className="mt-4 inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary text-primary-foreground shadow-glow ring-4 ring-primary/15"
                aria-label="Démarrer"
              >
                <Play className="w-5 h-5 ml-0.5 fill-current" />
              </Link>
            </div>
            <div className="col-span-2 relative h-full">
              <img
                src={tiloHero}
                alt="Tilo le renard avec sa boussole"
                className="absolute right-[-10%] bottom-0 h-[260px] w-auto object-contain"
              />
            </div>
          </div>
        </motion.div>

        {/* Circuit du jour */}
        {featured && (
          <Link
            to={`/circuit/${featured.id}`}
            className="block rounded-3xl bg-card shadow-card border border-border/40 overflow-hidden"
          >
            <div className="flex items-center gap-3 p-3">
              <img
                src={featured.image}
                alt={featured.title}
                className="w-24 h-24 rounded-2xl object-cover flex-shrink-0"
              />
              <div className="flex-1 min-w-0">
                <p className="text-primary text-[10px] font-bold uppercase tracking-wider">Circuit du jour</p>
                <h3 className="font-display font-bold text-foreground text-base leading-tight mt-0.5 truncate">
                  {featured.title}
                </h3>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <MapPin className="w-3 h-3 text-primary" />
                  <span className="truncate">{featured.region || "France"}</span>
                </div>
                <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground font-medium">
                  <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-primary text-primary" />{featured.rating?.toFixed(1) || "—"}</span>
                  <span className="w-1 h-1 rounded-full bg-primary/50" />
                  <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{featured.duration || "—"}</span>
                  <span className="w-1 h-1 rounded-full bg-primary/50" />
                  <span className="flex items-center gap-1"><RouteIcon className="w-3 h-3" />{featured.distance || "—"}</span>
                </div>
              </div>
              <div className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
                <ArrowRight className="w-5 h-5" />
              </div>
            </div>
          </Link>
        )}

        {/* 3 action cards */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { icon: Compass, title: "Explorer", desc: "Trouvez des circuits partout en France.", to: "/" },
            { icon: Headphones, title: "Écouter", desc: "Laissez-vous guider par nos histoires.", to: "/" },
            { icon: PenLine, title: "Créer", desc: "Imaginez et partagez vos propres trajets.", to: "/creator" },
          ].map((a) => (
            <Link
              key={a.title}
              to={a.to}
              className="rounded-2xl bg-card shadow-card border border-border/40 p-3 flex flex-col gap-2"
            >
              <a.icon className="w-7 h-7 text-primary" strokeWidth={2.2} />
              <div>
                <h4 className="font-display font-bold text-foreground text-sm leading-tight">{a.title}</h4>
                <p className="text-[10px] text-muted-foreground leading-snug mt-0.5">{a.desc}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Continuer l'écoute */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-bold text-foreground text-lg">Continuer l'écoute</h3>
            <Link to="/my-circuits" className="text-primary text-sm font-semibold">Voir tout</Link>
          </div>
          {featured && (
            <div className="rounded-2xl bg-card shadow-card border border-border/40 p-3 flex items-center gap-3">
              <img src={featured.image} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-foreground text-sm truncate">{featured.title}</p>
                <p className="text-xs text-muted-foreground">{featured.region}</p>
                <div className="h-1.5 rounded-full bg-muted mt-2 overflow-hidden">
                  <div className="h-full w-1/3 bg-primary rounded-full" />
                </div>
              </div>
              <button className="w-11 h-11 rounded-full bg-card shadow-card border border-border/40 flex items-center justify-center flex-shrink-0">
                <Play className="w-4 h-4 ml-0.5 fill-primary text-primary" />
              </button>
            </div>
          )}
        </section>

        {/* Lancer mon aventure CTA */}
        <Link
          to={featured ? `/navigate/${featured.id}` : "/"}
          className="relative flex items-center justify-center gap-3 rounded-full bg-primary text-primary-foreground py-4 px-6 font-display font-bold text-base shadow-glow overflow-hidden"
        >
          <MapPin className="w-5 h-5" />
          <span>Lancer mon aventure</span>
          <Car className="w-5 h-5 absolute right-5 opacity-80" />
        </Link>

        {/* 3 features row (bottom image) */}
        <div className="grid grid-cols-3 gap-3 pt-2">
          {[
            { icon: RouteIcon, title: "Circuits interactifs", desc: "Parcourez des régions autrement." },
            { icon: Headphones, title: "Audio géolocalisé", desc: "Des histoires qui se déclenchent au bon endroit." },
            { icon: PenLine, title: "Créez vos trajets", desc: "Imaginez, personnalisez et partagez vos propres circuits." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl bg-card shadow-card border border-border/40 p-3 text-center flex flex-col items-center gap-2">
              <f.icon className="w-6 h-6 text-primary" strokeWidth={2.2} />
              <h4 className="font-display font-bold text-foreground text-[11px] leading-tight">{f.title}</h4>
              <p className="text-[9px] text-muted-foreground leading-snug">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Circuits recommandés */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-bold text-foreground text-lg">Circuits recommandés</h3>
            <Link to="/" className="text-primary text-sm font-semibold">Voir tout</Link>
          </div>
          <div className="space-y-3">
            {recommended.map((c) => (
              <Link
                key={c.id}
                to={`/circuit/${c.id}`}
                className="flex items-center gap-3 rounded-2xl bg-card shadow-card border border-border/40 p-3"
              >
                <img src={c.image} alt={c.title} className="w-24 h-24 rounded-2xl object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-display font-bold text-foreground text-base leading-tight truncate">{c.title}</h4>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                    <MapPin className="w-3 h-3 text-primary" />
                    <span className="truncate">{c.region || "France"}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5 text-[11px] text-muted-foreground font-medium">
                    <span className="flex items-center gap-1"><Star className="w-3 h-3 fill-primary text-primary" />{c.rating?.toFixed(1) || "—"}</span>
                    <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{c.duration || "—"}</span>
                    <span className="flex items-center gap-1"><RouteIcon className="w-3 h-3" />{c.distance || "—"}</span>
                  </div>
                </div>
                <div className="w-11 h-11 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
                  <ArrowRight className="w-5 h-5" />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Explorer par thème */}
        <section>
          <h3 className="font-display font-bold text-foreground text-lg mb-3">Explorer par thème</h3>
          <div className="grid grid-cols-3 gap-3">
            {[
              { icon: Mountain, label: "Nature" },
              { icon: Castle, label: "Patrimoine" },
              { icon: Users, label: "Famille" },
            ].map((t) => (
              <button key={t.label} className="flex items-center justify-center gap-2 rounded-2xl bg-card shadow-card border border-border/40 py-4 px-2">
                <t.icon className="w-5 h-5 text-primary" strokeWidth={2.2} />
                <span className="font-bold text-foreground text-sm">{t.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Créez votre propre trajet */}
        <Link to="/creator" className="block relative rounded-3xl bg-card shadow-card border border-border/40 overflow-hidden">
          <div className="flex items-center gap-2 p-4">
            <img src={tiloPencil} alt="" className="w-28 h-28 object-contain flex-shrink-0 -ml-2" />
            <div className="flex-1 min-w-0">
              <h4 className="font-display font-bold text-foreground text-base leading-tight">Créez votre propre trajet</h4>
              <p className="text-[11px] text-muted-foreground leading-snug mt-1.5">
                Imaginez votre parcours idéal, ajoutez vos étapes et partagez votre aventure.
              </p>
              <span className="mt-3 inline-flex items-center justify-center bg-primary text-primary-foreground font-bold text-xs rounded-full px-4 py-2">
                Créer un trajet
              </span>
            </div>
          </div>
        </Link>

        {/* Prêt pour une nouvelle aventure */}
        <Link to="/" className="block rounded-2xl bg-gradient-to-r from-accent/20 via-card to-card shadow-card border border-border/40 p-4">
          <div className="flex items-center gap-3">
            <img src={tiloMascot} alt="" className="w-12 h-12 rounded-full object-contain bg-primary/10 p-1.5" />
            <div className="flex-1 min-w-0">
              <h4 className="font-display font-bold text-foreground text-sm leading-tight">Prêt pour une nouvelle aventure ?</h4>
              <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">De nouveaux circuits vous attendent chaque semaine.</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
              <ArrowRight className="w-4 h-4" />
            </div>
          </div>
        </Link>
      </main>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pt-2 pointer-events-none">
        <div className="max-w-md mx-auto rounded-3xl bg-card/95 backdrop-blur-xl shadow-elevated border border-border/40 pointer-events-auto">
          <div className="grid grid-cols-4">
            {[
              { icon: Home, label: "Accueil", to: "/", active: true },
              { icon: Map, label: "Circuits", to: "/", active: false },
              { icon: Heart, label: "Favoris", to: "/my-circuits", active: false },
              { icon: UserIcon, label: "Profil", to: user ? "/my-circuits" : "/auth", active: false },
            ].map((t) => (
              <Link
                key={t.label}
                to={t.to}
                className={`flex flex-col items-center justify-center gap-1 py-3 ${
                  t.active ? "text-primary" : "text-muted-foreground"
                }`}
              >
                <t.icon className="w-5 h-5" strokeWidth={t.active ? 2.5 : 2} />
                <span className="text-[11px] font-semibold">{t.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </nav>

      <ConsentBanner />
    </div>
  );
};

export default Index;
