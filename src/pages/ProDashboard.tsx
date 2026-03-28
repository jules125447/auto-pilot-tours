import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { DollarSign, Users, Copy, Check, QrCode, Share2, TrendingUp, Loader2, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PromoCode {
  id: string;
  code: string;
  discount_percent: number;
  commission_percent: number;
}

interface Commission {
  id: string;
  amount: number;
  status: string;
  created_at: string;
}

const ProDashboard = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [promoCode, setPromoCode] = useState<PromoCode | null>(null);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [totalSales, setTotalSales] = useState(0);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      setLoading(true);
      const [promoRes, commissionsRes, purchasesRes] = await Promise.all([
        supabase.from("promo_codes").select("*").eq("creator_id", user.id).limit(1),
        supabase.from("commissions").select("*").eq("creator_id", user.id).order("created_at", { ascending: false }),
        supabase.from("purchases").select("*").eq("user_id", user.id),
      ]);

      if (promoRes.data && promoRes.data.length > 0) {
        setPromoCode(promoRes.data[0] as any);
      }
      if (commissionsRes.data) {
        setCommissions(commissionsRes.data as any);
        setTotalRevenue(commissionsRes.data.reduce((sum: number, c: any) => sum + Number(c.amount), 0));
        setTotalSales(commissionsRes.data.length);
      }
      setLoading(false);
    };
    load();
  }, [user]);

  const siteUrl = window.location.origin;
  const shareLink = promoCode ? `${siteUrl}?promo=${promoCode.code}` : siteUrl;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({ title: "Copié !", description: "Le lien a été copié dans le presse-papier." });
    setTimeout(() => setCopied(false), 2000);
  };

  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(shareLink)}`;

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background pt-16">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">Connectez-vous</h1>
          <p className="text-muted-foreground mb-4">Accédez à votre dashboard professionnel</p>
          <Link to="/auth" className="px-6 py-3 rounded-xl bg-gradient-hero text-primary-foreground font-semibold">Se connecter</Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container max-w-5xl pt-24 pb-16 px-4">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-3xl md:text-4xl font-bold text-foreground mb-2">Dashboard Professionnel</h1>
          <p className="text-muted-foreground mb-8">Gérez votre activité et vos revenus</p>
        </motion.div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          {[
            { icon: DollarSign, label: "Revenus totaux", value: `${totalRevenue.toFixed(2)} €`, color: "text-primary" },
            { icon: Users, label: "Ventes avec code promo", value: String(totalSales), color: "text-accent-foreground" },
            { icon: TrendingUp, label: "Commission", value: "30%", color: "text-primary" },
          ].map((stat) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card rounded-2xl shadow-card p-6 border border-border/50"
            >
              <stat.icon className={`w-6 h-6 ${stat.color} mb-3`} />
              <p className="font-display text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-sm text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Promo code section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card rounded-2xl shadow-card p-6 border border-border/50 mb-8"
        >
          <h2 className="font-display text-xl font-bold text-foreground mb-4 flex items-center gap-2">
            <Share2 className="w-5 h-5 text-primary" />
            Votre code promo
          </h2>

          {promoCode ? (
            <div className="space-y-5">
              {/* Code display */}
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-primary/5 border-2 border-dashed border-primary/30 rounded-xl px-5 py-4 text-center">
                  <p className="font-display text-3xl font-black text-primary tracking-widest">{promoCode.code}</p>
                  <p className="text-xs text-muted-foreground mt-1">-{promoCode.discount_percent}% pour vos clients</p>
                </div>
                <button
                  onClick={() => handleCopy(promoCode.code)}
                  className="p-3 rounded-xl bg-muted hover:bg-muted/80 text-foreground transition-colors"
                >
                  {copied ? <Check className="w-5 h-5 text-primary" /> : <Copy className="w-5 h-5" />}
                </button>
              </div>

              {/* Share link */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 block">Lien de partage</label>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={shareLink}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-muted text-foreground text-sm border border-border"
                  />
                  <button
                    onClick={() => handleCopy(shareLink)}
                    className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* QR Code */}
              <div>
                <label className="text-sm font-medium text-foreground mb-2 flex items-center gap-1.5">
                  <QrCode className="w-4 h-4" /> QR Code
                </label>
                <div className="bg-white p-4 rounded-xl inline-block">
                  <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48" />
                </div>
                <p className="text-xs text-muted-foreground mt-2">Imprimez ce QR code et affichez-le dans votre établissement</p>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground">Aucun code promo attribué. Contactez le support.</p>
          )}
        </motion.div>

        {/* Commissions history */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card rounded-2xl shadow-card p-6 border border-border/50"
        >
          <h2 className="font-display text-xl font-bold text-foreground mb-4">Historique des commissions</h2>
          {commissions.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Aucune commission pour le moment</p>
              <p className="text-sm mt-1">Partagez votre code promo pour commencer à gagner</p>
            </div>
          ) : (
            <div className="space-y-3">
              {commissions.map((c) => (
                <div key={c.id} className="flex items-center justify-between p-4 rounded-xl bg-muted">
                  <div>
                    <p className="font-medium text-foreground">{Number(c.amount).toFixed(2)} €</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(c.created_at).toLocaleDateString("fr-FR", { day: "numeric", month: "long", year: "numeric" })}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    c.status === "paid" ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent-foreground"
                  }`}>
                    {c.status === "paid" ? "Payée" : "En attente"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ProDashboard;
