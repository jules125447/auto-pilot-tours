import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Search, Bell, Play, MapPin, Star, Clock, ArrowRight, Home, Map, Heart, User as UserIcon, Car, Headphones } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCircuits } from "@/hooks/useCircuits";
import ConsentBanner from "@/components/ConsentBanner";
import tiloLogo from "@/assets/tilo-logo.png";
import tiloFox from "@/assets/tilo-fox.png";
import heroMapBg from "@/assets/hero-map-bg.png";
import imgVillages from "@/assets/circuit-villages-perches.jpg";
import imgCote from "@/assets/circuit-cote-sauvage.jpg";

const IconRoute = ({ className = "" }: { className?: string }) => (
  <svg viewBox="0 0 64 64" className={className} fill="none">
    <path d="M14 50 C 14 30, 50 34, 50 14" stroke="hsl(15 85% 55%)" strokeWidth="6" strokeLinecap="round" fill="none" />
    <circle cx="14" cy="50" r="5" fill="hsl(15 85% 55%)" />
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

  return (
    <div className="min-h-screen bg-background pb-28 font-sans">
      {/* Header — logo + bell vertically centered */}
      <header className="px-5 pt-4 pb-2 relative flex items-center justify-center min-h-[80px]">
        <img src={tiloLogo} alt="Tilo" className="h-56 sm:h-64 w-auto -my-10" />
        <button className="absolute right-5 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white shadow-card flex items-center justify-center flex-shrink-0">
          <Bell className="w-5 h-5 text-foreground" strokeWidth={2.2} />
          <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-primary" />
        </button>
      </header>

      <main className="px-5 space-y-5">
        {/* Greeting */}
        <section className="pt-3">
          <h1 className="font-display text-[2.25rem] leading-[1.05] font-black text-foreground tracking-tight">
            Bonjour {firstName} <span>👋</span>
          </h1>
          <p className="text-muted-foreground text-[15px] mt-1">Où partons-nous aujourd'hui ?</p>
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

        {/* Hero card — map bg + fox + text */}
        <div className="relative rounded-3xl shadow-card bg-[#fdf6ed] aspect-[16/10]">
          <div className="absolute inset-0 rounded-3xl overflow-hidden">
            <img
              src={heroMapBg}
              alt=""
              className="absolute inset-y-0 left-0 w-full h-full object-cover object-center"
              style={{ WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)", maskImage: "linear-gradient(to bottom, transparent 0%, black 18%, black 82%, transparent 100%)" }}
            />
          </div>
          <img
            src={tiloFox}
            alt="Tilo"
            className="absolute right-[-6%] bottom-0 h-[125%] w-auto object-contain drop-shadow-xl pointer-events-none z-10"
          />
          <div className="relative h-full p-5 flex flex-col justify-between z-0">
            <div className="max-w-[55%]">
              <h2 className="font-display font-black text-foreground leading-[1.02] text-[1.5rem]">
                Votre prochaine
              </h2>
              <h2 className="font-display font-black text-primary leading-[1.02] text-[2.2rem] -mt-1">
                aventure
              </h2>
              <h2 className="font-display font-black text-foreground leading-[1.02] text-[1.5rem] -mt-0.5">
                commence ici.
              </h2>
              <div className="mt-3 flex items-center gap-2 text-primary font-bold text-[15px]">
                <Headphones className="w-5 h-5" strokeWidth={2.5} />
                Audio géolocalisé
              </div>
              <p className="text-muted-foreground text-[12px] mt-1 leading-snug">Histoires et conseils à chaque étape.</p>
            </div>
            <Link
              to={featured ? `/navigate/${featured.id}` : "/"}
              className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white text-primary shadow-elevated ring-[6px] ring-primary/20 self-start"
              aria-label="Démarrer"
            >
              <Play className="w-7 h-7 ml-1 fill-current" />
            </Link>
          </div>
        </div>

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

        {/* 3 action cards */}
        <div className="grid grid-cols-3 gap-2.5">
          {[
            { icon: <IconRoute className="w-8 h-8" />, title: "Explorer", desc: "Trouvez des circuits partout en France.", to: "/" },
            { icon: <Headphones className="w-8 h-8 text-primary" strokeWidth={2.5} />, title: "Écouter", desc: "Laissez-vous guider par nos histoires.", to: "/" },
            { icon: (
              <svg viewBox="0 0 64 64" className="w-8 h-8" fill="hsl(15 85% 55%)"><path d="M44 6 L58 20 L24 54 L8 56 L10 40 Z" /></svg>
            ), title: "Créer", desc: "Imaginez et partagez vos propres trajets.", to: "/creator" },
          ].map((a) => (
            <Link key={a.title} to={a.to} className="rounded-2xl bg-white shadow-card p-3 flex flex-col gap-2">
              {a.icon}
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
