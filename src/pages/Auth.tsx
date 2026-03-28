import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Car, Mail, Lock, User, ArrowLeft, Eye, EyeOff, Building2, Tent, MapPin as MapPinIcon, Home } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

const businessTypes = [
  { value: "camping", label: "Camping", icon: Tent },
  { value: "office_tourisme", label: "Office de tourisme", icon: MapPinIcon },
  { value: "gite", label: "Gîte / Hébergement", icon: Home },
  { value: "autre", label: "Autre professionnel", icon: Building2 },
];

function generatePromoCode(name: string): string {
  const clean = name.replace(/[^a-zA-Z0-9]/g, "").toUpperCase().slice(0, 6);
  const suffix = Math.random().toString(36).substring(2, 5).toUpperCase();
  return `${clean || "PRO"}${suffix}`;
}

const Auth = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isPro, setIsPro] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) setError(error.message);
      else navigate("/");
    } else {
      const { error } = await signUp(email, password, displayName);
      if (error) {
        setError(error.message);
        setLoading(false);
        return;
      }

      // If pro signup, register as professional
      if (isPro && businessType) {
        // Wait for trigger to create profile
        await new Promise((r) => setTimeout(r, 1500));
        const code = generatePromoCode(displayName);
        await supabase.rpc("register_professional", {
          _business_type: businessType,
          _promo_code: code,
        } as any);
      }

      navigate("/");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" /> Retour à l'accueil
        </Link>

        <div className="bg-card rounded-2xl shadow-elevated p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-lg bg-gradient-hero flex items-center justify-center">
              <Car className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="font-display text-2xl font-bold text-card-foreground">
              {isLogin ? "Connexion" : "Inscription"}
            </h1>
          </div>

          {/* Account type toggle (signup only) */}
          {!isLogin && (
            <div className="mb-6">
              <div className="grid grid-cols-2 gap-2 p-1 bg-muted rounded-xl">
                <button
                  type="button"
                  onClick={() => setIsPro(false)}
                  className={`py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                    !isPro ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  <User className="w-4 h-4 inline mr-1.5" />
                  Utilisateur
                </button>
                <button
                  type="button"
                  onClick={() => setIsPro(true)}
                  className={`py-2.5 px-3 rounded-lg text-sm font-medium transition-all ${
                    isPro ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  <Building2 className="w-4 h-4 inline mr-1.5" />
                  Professionnel
                </button>
              </div>
              {isPro && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  className="text-xs text-muted-foreground mt-3 bg-primary/5 p-3 rounded-lg border border-primary/10"
                >
                  <Building2 className="w-3.5 h-3.5 inline mr-1 text-primary" />
                  Campings, offices de tourisme, gîtes… Accédez à votre dashboard pro, un code promo -10% pour vos clients, et touchez <strong className="text-primary">30% de commission</strong> sur chaque vente.
                </motion.p>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder={isPro ? "Nom de l'établissement" : "Nom d'affichage"}
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-muted text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                </div>

                {isPro && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="grid grid-cols-2 gap-2"
                  >
                    {businessTypes.map((bt) => (
                      <button
                        key={bt.value}
                        type="button"
                        onClick={() => setBusinessType(bt.value)}
                        className={`flex items-center gap-2 p-3 rounded-xl border text-sm font-medium transition-all ${
                          businessType === bt.value
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-muted text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <bt.icon className="w-4 h-4" />
                        {bt.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </>
            )}
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-muted text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="w-full pl-11 pr-11 py-3 rounded-xl bg-muted text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>

            {error && <p className="text-sm text-destructive bg-destructive/10 p-3 rounded-lg">{error}</p>}

            <button
              type="submit"
              disabled={loading || (!isLogin && isPro && !businessType)}
              className="w-full py-3 rounded-xl bg-gradient-hero text-primary-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? "Chargement..." : isLogin ? "Se connecter" : isPro ? "Créer mon compte pro" : "S'inscrire"}
            </button>
          </form>

          <p className="text-center text-sm text-muted-foreground mt-6">
            {isLogin ? "Pas encore de compte ?" : "Déjà un compte ?"}{" "}
            <button onClick={() => { setIsLogin(!isLogin); setError(null); }} className="text-primary font-medium hover:underline">
              {isLogin ? "S'inscrire" : "Se connecter"}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
