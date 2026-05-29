import { Link } from "react-router-dom";
import {
  Mail,
  MapPin,
  Pencil,
  Map as MapIcon,
  Heart,
  Clock,
  User as UserIcon,
  SlidersHorizontal,
  Bell,
  Download,
  HelpCircle,
  Shield,
  Crown,
  Headphones,
  ChevronRight,
  Home,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import tiloLogo from "@/assets/tilo-logo.png";
import circuitsBg from "@/assets/circuits-bg.png";
import tiloMascot from "@/assets/tilo-mascot.png";

const menuItems = [
  { icon: UserIcon, label: "Mes informations", sub: "Nom, email et localisation" },
  { icon: SlidersHorizontal, label: "Préférences", sub: "Thèmes et centres d'intérêt" },
  { icon: Bell, label: "Notifications", sub: "Alertes et nouveautés" },
  { icon: Download, label: "Téléchargements", sub: "Circuits disponibles hors ligne" },
  { icon: HelpCircle, label: "Aide & support", sub: "FAQ et contact" },
  { icon: Shield, label: "Confidentialité", sub: "Données et permissions" },
];

const Profile = () => {
  const { user } = useAuth();
  const displayName =
    (user?.user_metadata as any)?.display_name || user?.email?.split("@")[0] || "Voyageur Tilo";
  const email = user?.email || "hello@tilo.app";
  const initials = displayName
    .split(" ")
    .map((s: string) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

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
            Profil
          </h1>
          <p className="text-muted-foreground text-[15px] mt-2">
            Gérez votre compte et vos préférences
          </p>
        </header>

        <main className="px-5 mt-5 space-y-5">
          {/* User card */}
          <div className="rounded-3xl bg-white shadow-card p-4">
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full bg-primary/10 text-primary flex items-center justify-center font-display font-black text-2xl flex-shrink-0 overflow-hidden">
                {initials || <UserIcon className="w-8 h-8" />}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-display font-black text-foreground text-[22px] leading-tight truncate">
                  {displayName}
                </h2>
                <div className="flex items-center gap-1.5 text-[13px] text-foreground/80 mt-1 truncate">
                  <Mail className="w-4 h-4 text-primary" strokeWidth={2.5} />
                  <span className="truncate">{email}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[13px] text-foreground/80 mt-0.5">
                  <MapPin className="w-4 h-4 text-primary fill-primary" strokeWidth={0} />
                  <span>France</span>
                </div>
              </div>
            </div>
            <Link
              to="/auth"
              className="mt-4 inline-flex items-center justify-center gap-2 w-full py-3 rounded-full border-2 border-primary text-primary font-bold text-[14px]"
            >
              <Pencil className="w-4 h-4" strokeWidth={2.5} />
              Modifier mon profil
            </Link>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2.5 mt-4">
              {[
                { icon: MapIcon, label: "Circuits explorés", value: "0" },
                { icon: Heart, label: "Favoris", value: "0" },
                { icon: Clock, label: "Temps d'écoute", value: "0h" },
              ].map((s) => (
                <div key={s.label} className="rounded-2xl bg-secondary/40 p-3">
                  <s.icon className="w-5 h-5 text-primary mb-1" strokeWidth={2.5} />
                  <div className="text-[11px] text-muted-foreground leading-tight">{s.label}</div>
                  <div className="font-display font-black text-foreground text-[18px] leading-tight">
                    {s.value}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Menu list */}
          <div className="rounded-3xl bg-white shadow-card overflow-hidden divide-y divide-border/50">
            {menuItems.map((m) => (
              <button
                key={m.label}
                className="w-full flex items-center gap-3 p-4 text-left active:bg-secondary/40 transition-colors"
              >
                <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                  <m.icon className="w-5 h-5" strokeWidth={2.5} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display font-black text-foreground text-[16px] leading-tight">
                    {m.label}
                  </div>
                  <div className="text-[12px] text-muted-foreground mt-0.5 truncate">{m.sub}</div>
                </div>
                <ChevronRight className="w-5 h-5 text-primary flex-shrink-0" strokeWidth={2.5} />
              </button>
            ))}
          </div>

          {/* Subscription */}
          <div className="rounded-3xl bg-white shadow-card p-4 flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
              <Crown className="w-5 h-5 fill-primary" strokeWidth={2.5} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-display font-black text-foreground text-[16px] leading-tight">
                Mon abonnement
              </div>
              <div className="text-[12px] text-muted-foreground mt-0.5">Accès premium à venir</div>
            </div>
            <span className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-[12px] font-bold whitespace-nowrap">
              Bientôt disponible
            </span>
          </div>

          {/* Help CTA */}
          <div className="relative rounded-3xl bg-white shadow-card p-4 pr-32 overflow-hidden min-h-[150px]">
            <h3 className="font-display font-black text-foreground text-[18px] leading-tight">
              Besoin d'aide pour préparer votre prochaine aventure ?
            </h3>
            <p className="text-[12px] text-muted-foreground mt-1.5">
              Notre équipe est là pour vous accompagner.
            </p>
            <button className="mt-3 inline-flex items-center gap-2 px-5 py-3 rounded-full bg-primary text-primary-foreground font-bold text-[14px] shadow-card">
              <Headphones className="w-4 h-4" strokeWidth={2.5} />
              Contacter Tilo
            </button>
            <img
              src={tiloMascot}
              alt=""
              aria-hidden="true"
              className="absolute -right-4 bottom-0 h-[150px] w-auto object-contain pointer-events-none select-none"
            />
          </div>
        </main>
      </div>

      {/* Bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 px-4 pb-4 pt-2 pointer-events-none">
        <div className="max-w-md mx-auto rounded-3xl bg-white/95 backdrop-blur-xl shadow-elevated pointer-events-auto">
          <div className="grid grid-cols-4">
            {[
              { icon: Home, label: "Accueil", to: "/", active: false },
              { icon: MapIcon, label: "Circuits", to: "/circuits", active: false },
              { icon: Heart, label: "Favoris", to: "/favorites", active: false },
              { icon: UserIcon, label: "Profil", to: "/profile", active: true },
            ].map((t) => (
              <Link
                key={t.label}
                to={t.to}
                className={`flex flex-col items-center justify-center gap-1 py-3 ${
                  t.active ? "text-primary" : "text-muted-foreground"
                }`}
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
    </div>
  );
};

export default Profile;
