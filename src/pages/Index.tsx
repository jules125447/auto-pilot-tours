import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Search, Bell, Play, MapPin, Star, Clock, ArrowRight, Home, Map, Heart, User as UserIcon, Car, Headphones } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCircuits } from "@/hooks/useCircuits";
import ConsentBanner from "@/components/ConsentBanner";
import tiloLogo from "@/assets/tilo-logo.png";
import tiloLogoRound from "@/assets/tilo-logo-round.png";
import tiloHero from "@/assets/tilo-hero-map.png";
import tiloPencil from "@/assets/tilo-pencil.png";
import imgVillages from "@/assets/circuit-villages-perches.jpg";
import imgCote from "@/assets/circuit-cote-sauvage.jpg";
import imgChateaux from "@/assets/circuit-chateaux-loire.jpg";
import bannerAventure from "@/assets/banner-aventure.jpg";

// Inline SVG icons matching mockup (flat solid orange)
const IconRoute = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 64 64" className={className} fill="none">
    <path d="M14 50 C 14 30, 50 34, 50 14" stroke="hsl(15 85% 55%)" strokeWidth="6" strokeLinecap="round" fill="none" />
    <circle cx="14" cy="50" r="5" fill="hsl(15 85% 55%)" />
  </svg>
);
const IconAudio = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 64 64" className={className} fill="hsl(15 85% 55%)">
    <rect x="8" y="26" width="6" height="12" rx="2" />
    <rect x="18" y="20" width="6" height="24" rx="2" />
    <rect x="28" y="14" width="6" height="36" rx="3" />
    <rect x="38" y="20" width="6" height="24" rx="2" />
    <rect x="48" y="26" width="6" height="12" rx="2" />
  </svg>
);
const IconPencil = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 64 64" className={className} fill="hsl(15 85% 55%)">
    <path d="M44 6 L58 20 L24 54 L8 56 L10 40 Z" />
  </svg>
);
const IconMountain = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 64 64" className={className} fill="hsl(15 85% 55%)">
    <path d="M4 52 L22 22 L34 40 L42 30 L60 52 Z" />
    <circle cx="22" cy="18" r="3" fill="#fff" />
  </svg>
);
const IconCastle = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 64 64" className={className} fill="hsl(15 85% 55%)">
    <path d="M6 22 v6 h4 v-4 h6 v4 h4 v-6 h4 v6 h4 v-4 h6 v4 h4 v-6 h4 v6 h4 v-4 h6 v4 h4 v-6 v32 h-52 z" />
    <rect x="26" y="34" width="12" height="20" fill="hsl(32 70% 94%)" />
  </svg>
);
const IconFamily = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 64 64" className={className} fill="hsl(15 85% 55%)">
    <circle cx="20" cy="16" r="6" />
    <path d="M10 56 v-16 a10 10 0 0 1 20 0 v16 z" />
    <circle cx="42" cy="20" r="5" />
    <path d="M34 56 v-14 a8 8 0 0 1 16 0 v14 z" />
    <circle cx="56" cy="26" r="3.5" />
    <path d="M50 56 v-10 a6 6 0 0 1 12 0 v10 z" />
  </svg>
);

const Index = () => {
  const { user } = useAuth();
  const { data: circuits = [] } = useCircuits();

  const firstName = useMemo(() => {
    const name = (user?.user_metadata?.display_name as string) || user?.email?.split("@")[0] || "Clara";
    return name.charAt(0).toUpperCase() + name.slice(1);
  }, [user]);

  const featured = circuits[0];

  const recommended = [
    { id: circuits[0]?.id, title: "Villages perchés", region: "Alpes-de-Haute-Provence", rating: 4.8, duration: "3h15", distance: "98 km", image: imgVillages },
    { id: circuits[1]?.id, title: "Route des châteaux", region: "Val de Loire", rating: 4.7, duration: "2h40", distance: "84 km", image: imgChateaux },
  ];

  return (
    <div className="min-h-screen bg-background pb-28 font-sans">
      {/* Header */}
      <header className="px-5 pt-4 pb-2 flex items-center justify-between">
        <img src={tiloLogo} alt="Tilo" className="h-12 w-auto" />
        <button className="relative w-12 h-12 rounded-full bg-white shadow-card flex items-center justify-center">
          <Bell className="w-5 h-5 text-foreground" strokeWidth={2.2} />
          <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-primary" />
        </button>
      </header>

      <main className="px-5 space-y-5">
        {/* Greeting */}
        <section className="pt-2">
          <h1 className="font-display text-[2.1rem] leading-[1.05] font-black text-foreground tracking-tight">
            Bonjour {firstName} <span>👋</span>
          </h1>
          <p className="text-muted-foreground text-base mt-1">Où partons-nous aujourd'hui ?</p>
        </section>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-primary" strokeWidth={2.5} />
          <input
            type="text"
            placeholder="Rechercher un circuit ou une région"
            className="w-full pl-14 pr-4 py-4 rounded-full bg-white shadow-card text-[15px] text-foreground placeholder:text-muted-foreground/80 focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>

        {/* Hero card */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative rounded-3xl overflow-hidden bg-white shadow-card"
        >
          <img src={tiloHero} alt="Tilo, votre compagnon de voyage" className="w-full h-auto block" />
          <div className="absolute inset-0 p-5 flex flex-col justify-between">
            <div>
              <h2 className="font-display font-black text-foreground leading-[1.05] text-[1.5rem] max-w-[55%]">
                Votre prochaine{" "}
                <span className="text-primary block">aventure</span>
                commence ici.
              </h2>
            </div>
            <div className="max-w-[55%]">
              <div className="flex items-center gap-2 text-primary font-bold text-sm">
                <Headphones className="w-4 h-4" strokeWidth={2.5} />
                Audio géolocalisé
              </div>
              <p className="text-muted-foreground text-xs mt-1">Histoires et conseils à chaque étape.</p>
              <Link
                to={featured ? `/navigate/${featured.id}` : "/"}
                className="mt-3 inline-flex items-center justify-center w-14 h-14 rounded-full bg-white text-primary shadow-elevated ring-4 ring-primary/30"
                aria-label="Démarrer"
              >
                <Play className="w-6 h-6 ml-1 fill-current" />
              </Link>
            </div>
          </div>
        </motion.div>

        {/* Circuit du jour */}
        <Link
          to={featured ? `/circuit/${featured.id}` : "/"}
          className="block rounded-3xl bg-white shadow-card overflow-hidden"
        >
          <div className="flex items-center gap-3 p-3">
            <img src={imgVillages} alt="" className="w-[110px] h-[110px] rounded-2xl object-cover flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-primary text-[11px] font-bold uppercase tracking-wider">CIRCUIT DU JOUR</p>
              <h3 className="font-display font-black text-foreground text-[18px] leading-tight mt-0.5">Les villages perchés</h3>
              <div className="flex items-center gap-1 text-[13px] text-muted-foreground mt-1.5">
                <MapPin className="w-3.5 h-3.5 text-primary fill-primary" strokeWidth={0} />
                <span>Alpes de Haute-Provence</span>
              </div>
              <div className="flex items-center gap-2 mt-2 text-[13px] text-foreground font-bold">
                <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-primary text-primary" />4,8</span>
                <span className="w-1 h-1 rounded-full bg-primary" />
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" strokeWidth={2.5} />3h15</span>
                <span className="w-1 h-1 rounded-full bg-primary" />
                <span className="flex items-center gap-1"><IconRoute className="w-3.5 h-3.5" />98 km</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 shadow-card">
              <ArrowRight className="w-5 h-5" strokeWidth={2.5} />
            </div>
          </div>
        </Link>

        {/* 3 action cards : Explorer / Écouter / Créer */}
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { Icon: IconRoute, title: "Explorer", desc: "Trouvez des circuits partout en France.", to: "/" },
            { Icon: IconAudio, title: "Écouter", desc: "Laissez-vous guider par nos histoires.", to: "/" },
            { Icon: IconPencil, title: "Créer", desc: "Imaginez et partagez vos propres trajets.", to: "/creator" },
          ].map((a) => (
            <Link key={a.title} to={a.to} className="rounded-2xl bg-white shadow-card p-3 flex flex-col gap-2">
              <a.Icon className="w-7 h-7" />
              <div>
                <h4 className="font-display font-black text-foreground text-[13px] leading-tight">{a.title}</h4>
                <p className="text-[10px] text-muted-foreground leading-snug mt-1">{a.desc}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Continuer l'écoute */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-black text-foreground text-[20px]">Continuer l'écoute</h3>
            <Link to="/my-circuits" className="text-primary text-sm font-bold">Voir tout</Link>
          </div>
          <div className="rounded-2xl bg-white shadow-card p-3 flex items-center gap-3">
            <img src={imgCote} alt="" className="w-14 h-14 rounded-xl object-cover flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-display font-black text-foreground text-[15px] truncate">La côte sauvage</p>
              <p className="text-[12px] text-muted-foreground">Bretagne</p>
              <div className="h-1.5 rounded-full bg-muted mt-2 overflow-hidden">
                <div className="h-full w-[40%] bg-primary rounded-full" />
              </div>
            </div>
            <button className="w-12 h-12 rounded-full bg-white shadow-card border border-border/40 flex items-center justify-center flex-shrink-0">
              <Play className="w-5 h-5 ml-0.5 fill-primary text-primary" />
            </button>
          </div>
        </section>

        {/* Lancer mon aventure CTA */}
        <Link
          to={featured ? `/navigate/${featured.id}` : "/"}
          className="relative flex items-center justify-center rounded-full bg-primary text-primary-foreground py-4 px-6 font-display font-black text-[17px] shadow-glow"
        >
          <IconRoute className="w-7 h-7 absolute left-5" />
          <span>Lancer mon aventure</span>
          <Car className="w-5 h-5 absolute right-12 opacity-90" />
          <MapPin className="w-5 h-5 absolute right-5 fill-current" strokeWidth={0} />
        </Link>

        {/* 3 features bottom */}
        <div className="grid grid-cols-3 gap-2.5 pt-1">
          {[
            { Icon: IconRoute, title: "Circuits interactifs", desc: "Parcourez des régions autrement." },
            { Icon: IconAudio, title: "Audio géolocalisé", desc: "Des histoires qui se déclenchent au bon endroit." },
            { Icon: IconPencil, title: "Créez vos trajets", desc: "Imaginez, personnalisez et partagez vos propres circuits." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl bg-white shadow-card p-3 text-center flex flex-col items-center gap-1.5">
              <f.Icon className="w-7 h-7" />
              <h4 className="font-display font-black text-foreground text-[12px] leading-tight">{f.title}</h4>
              <p className="text-[10px] text-muted-foreground leading-snug">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Circuits recommandés */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-black text-foreground text-[20px]">Circuits recommandés</h3>
            <Link to="/" className="text-primary text-sm font-bold">Voir tout</Link>
          </div>
          <div className="space-y-3">
            {recommended.map((c) => (
              <Link
                key={c.title}
                to={c.id ? `/circuit/${c.id}` : "/"}
                className="flex items-center gap-3 rounded-3xl bg-white shadow-card p-3"
              >
                <img src={c.image} alt={c.title} className="w-[110px] h-[110px] rounded-2xl object-cover flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <h4 className="font-display font-black text-foreground text-[18px] leading-tight">{c.title}</h4>
                  <div className="flex items-center gap-1 text-[13px] text-muted-foreground mt-1.5">
                    <MapPin className="w-3.5 h-3.5 text-primary fill-primary" strokeWidth={0} />
                    <span>{c.region}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-[13px] text-foreground font-bold">
                    <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-primary text-primary" />{c.rating.toString().replace(".", ",")}</span>
                    <span className="w-1 h-1 rounded-full bg-primary" />
                    <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" strokeWidth={2.5} />{c.duration}</span>
                    <span className="w-1 h-1 rounded-full bg-primary" />
                    <span className="flex items-center gap-1"><IconRoute className="w-3.5 h-3.5" />{c.distance}</span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0 shadow-card">
                  <ArrowRight className="w-5 h-5" strokeWidth={2.5} />
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Explorer par thème */}
        <section>
          <h3 className="font-display font-black text-foreground text-[20px] mb-3">Explorer par thème</h3>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { Icon: IconMountain, label: "Nature" },
              { Icon: IconCastle, label: "Patrimoine" },
              { Icon: IconFamily, label: "Famille" },
            ].map((t) => (
              <button key={t.label} className="flex flex-col items-center justify-center gap-2 rounded-2xl bg-white shadow-card py-4 px-2">
                <t.Icon className="w-9 h-9" />
                <span className="font-display font-black text-foreground text-[13px]">{t.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Créez votre propre trajet */}
        <Link to="/creator" className="block relative rounded-3xl bg-white shadow-card overflow-hidden">
          <div className="flex items-stretch gap-1 pr-4">
            <img src={tiloPencil} alt="" className="w-[140px] h-[170px] object-contain flex-shrink-0" />
            <div className="flex-1 min-w-0 py-4 pr-2">
              <h4 className="font-display font-black text-foreground text-[17px] leading-tight">Créez votre propre trajet</h4>
              <p className="text-[12px] text-muted-foreground leading-snug mt-1.5">
                Imaginez votre parcours idéal, ajoutez vos étapes et partagez votre aventure.
              </p>
              <span className="mt-3 inline-flex items-center justify-center bg-primary text-primary-foreground font-display font-black text-[13px] rounded-full px-5 py-2.5 shadow-card">
                Créer un trajet
              </span>
            </div>
          </div>
        </Link>

        {/* Prêt pour une nouvelle aventure */}
        <Link to="/" className="block rounded-2xl bg-white shadow-card overflow-hidden relative">
          <img src={bannerAventure} alt="" className="absolute right-0 top-0 h-full w-[55%] object-cover opacity-90" />
          <div className="relative flex items-center gap-3 p-4">
            <img src={tiloLogoRound} alt="" className="w-12 h-12 object-contain flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <h4 className="font-display font-black text-foreground text-[15px] leading-tight">Prêt pour une nouvelle aventure ?</h4>
              <p className="text-[11px] text-muted-foreground leading-snug mt-0.5">De nouveaux circuits vous attendent chaque semaine.</p>
            </div>
            <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center flex-shrink-0">
              <ArrowRight className="w-4 h-4" strokeWidth={2.5} />
            </div>
          </div>
        </Link>
      </main>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pt-2 pointer-events-none">
        <div className="max-w-md mx-auto rounded-3xl bg-white/95 backdrop-blur-xl shadow-elevated pointer-events-auto">
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

export default Index;
