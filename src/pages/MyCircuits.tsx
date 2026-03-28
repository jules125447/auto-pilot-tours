import { useAuth } from "@/contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ShoppingBag, Edit, Trash2, MapPin, Clock, Star } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const MyCircuits = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: circuits, isLoading } = useQuery({
    queryKey: ["my-circuits", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("circuits")
        .select("*")
        .eq("creator_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (circuitId: string) => {
      const { error } = await supabase.from("circuits").delete().eq("id", circuitId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-circuits"] });
      toast.success("Circuit supprimé avec succès");
    },
    onError: () => {
      toast.error("Erreur lors de la suppression");
    },
  });

  const handleDelete = (id: string, title: string) => {
    if (confirm(`Supprimer le circuit "${title}" ? Cette action est irréversible.`)) {
      deleteMutation.mutate(id);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background pt-16">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold text-foreground mb-2">Connectez-vous</h1>
          <p className="text-muted-foreground mb-4">Pour accéder à vos circuits</p>
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
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground mb-2">Mes circuits</h1>
              <p className="text-muted-foreground">Gérez vos circuits créés</p>
            </div>
            <Button onClick={() => navigate("/creator")} className="bg-gradient-hero text-primary-foreground font-semibold rounded-xl">
              + Nouveau circuit
            </Button>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-muted-foreground">Chargement...</p>
            </div>
          ) : !circuits || circuits.length === 0 ? (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <ShoppingBag className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <h2 className="font-display text-xl font-semibold text-foreground mb-2">Aucun circuit créé</h2>
                <p className="text-muted-foreground mb-6">Créez votre premier circuit dès maintenant !</p>
                <Link to="/creator" className="px-6 py-3 rounded-xl bg-gradient-hero text-primary-foreground font-semibold">
                  Créer un circuit
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              {circuits.map((circuit) => (
                <motion.div
                  key={circuit.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-card rounded-2xl border border-border p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4"
                >
                  {circuit.image_url && (
                    <img
                      src={circuit.image_url}
                      alt={circuit.title}
                      className="w-full sm:w-24 h-20 object-cover rounded-xl"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-display text-lg font-semibold text-foreground truncate">{circuit.title}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${circuit.published ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground"}`}>
                        {circuit.published ? "Publié" : "Brouillon"}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                      {circuit.region && (
                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{circuit.region}</span>
                      )}
                      {circuit.duration && (
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" />{circuit.duration}</span>
                      )}
                      {circuit.rating && Number(circuit.rating) > 0 && (
                        <span className="flex items-center gap-1"><Star className="w-3.5 h-3.5" />{Number(circuit.rating).toFixed(1)}</span>
                      )}
                      <span>{Number(circuit.price).toFixed(2)} €</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/creator?edit=${circuit.id}`)}
                      className="rounded-xl"
                    >
                      <Edit className="w-4 h-4 mr-1" /> Modifier
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(circuit.id, circuit.title)}
                      disabled={deleteMutation.isPending}
                      className="rounded-xl"
                    >
                      <Trash2 className="w-4 h-4 mr-1" /> Supprimer
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default MyCircuits;
