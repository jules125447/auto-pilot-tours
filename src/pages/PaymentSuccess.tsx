import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { CheckCircle, Loader2, ArrowLeft, Car } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";

const PaymentSuccess = () => {
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const { user } = useAuth();
  const [verifying, setVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId || !user) return;

    const verify = async () => {
      try {
        const { data, error: fnErr } = await supabase.functions.invoke("verify-payment", {
          body: { sessionId },
        });
        if (fnErr || data?.error) {
          setError(data?.error || fnErr?.message || "Erreur de vérification");
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setVerifying(false);
      }
    };
    verify();
  }, [sessionId, user]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex items-center justify-center min-h-[80vh] px-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card rounded-2xl shadow-elevated p-8 max-w-md w-full text-center"
        >
          {verifying ? (
            <>
              <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
              <h1 className="font-display text-2xl font-bold text-card-foreground mb-2">
                Vérification du paiement...
              </h1>
              <p className="text-muted-foreground">Un instant, nous confirmons votre achat.</p>
            </>
          ) : error ? (
            <>
              <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">⚠️</span>
              </div>
              <h1 className="font-display text-2xl font-bold text-card-foreground mb-2">Erreur</h1>
              <p className="text-muted-foreground mb-6">{error}</p>
              <Link to="/" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold">
                <ArrowLeft className="w-4 h-4" /> Retour à l'accueil
              </Link>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-primary" />
              </div>
              <h1 className="font-display text-2xl font-bold text-card-foreground mb-2">
                Paiement réussi ! 🎉
              </h1>
              <p className="text-muted-foreground mb-6">
                Votre circuit a été ajouté à votre compte. Vous pouvez le démarrer quand vous voulez.
              </p>
              <div className="flex flex-col gap-3">
                <Link
                  to="/my-circuits"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-hero text-primary-foreground font-semibold"
                >
                  <Car className="w-5 h-5" /> Mes circuits
                </Link>
                <Link
                  to="/"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-muted text-foreground font-medium"
                >
                  <ArrowLeft className="w-4 h-4" /> Retour à l'accueil
                </Link>
              </div>
            </>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default PaymentSuccess;
