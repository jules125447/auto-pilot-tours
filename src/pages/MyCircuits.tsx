import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ShoppingBag } from "lucide-react";
import Header from "@/components/Header";

const MyCircuits = () => {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background pt-16">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">Connectez-vous</h1>
          <p className="text-muted-foreground mb-4">Pour accéder à vos circuits achetés</p>
          <Link to="/auth" className="px-6 py-3 rounded-xl bg-gradient-hero text-primary-foreground font-semibold">
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-8 pt-24">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">Mes circuits</h1>
          <p className="text-muted-foreground mb-8">Vos circuits achetés et téléchargés</p>

          <div className="flex items-center justify-center py-16">
            <div className="text-center">
              <ShoppingBag className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h2 className="font-display text-xl font-semibold text-foreground mb-2">Aucun circuit acheté</h2>
              <p className="text-muted-foreground mb-6">Explorez notre catalogue et achetez votre premier circuit !</p>
              <Link to="/" className="px-6 py-3 rounded-xl bg-gradient-hero text-primary-foreground font-semibold">
                Explorer les circuits
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default MyCircuits;
