import { useState, useEffect } from "react";
import { Star, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

interface Review {
  id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  display_name?: string;
}

interface CircuitReviewsProps {
  circuitId: string;
}

const StarRating = ({ rating, onRate, interactive = false }: { rating: number; onRate?: (r: number) => void; interactive?: boolean }) => {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          disabled={!interactive}
          onClick={() => onRate?.(i)}
          onMouseEnter={() => interactive && setHover(i)}
          onMouseLeave={() => interactive && setHover(0)}
          className={`${interactive ? "cursor-pointer hover:scale-110" : "cursor-default"} transition-transform`}
        >
          <Star
            className={`w-5 h-5 transition-colors ${
              (hover || rating) >= i
                ? "text-accent fill-accent"
                : "text-muted-foreground/30"
            }`}
          />
        </button>
      ))}
    </div>
  );
};

const CircuitReviews = ({ circuitId }: CircuitReviewsProps) => {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState("");
  const [myExistingReview, setMyExistingReview] = useState<Review | null>(null);

  const fetchReviews = async () => {
    const { data } = await supabase
      .from("reviews")
      .select("*")
      .eq("circuit_id", circuitId)
      .order("created_at", { ascending: false });

    if (data) {
      // Fetch display names
      const userIds = [...new Set(data.map((r) => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);

      const nameMap = new Map(profiles?.map((p) => [p.user_id, p.display_name]) || []);
      const enriched = data.map((r) => ({ ...r, display_name: nameMap.get(r.user_id) || "Utilisateur" }));
      setReviews(enriched);

      if (user) {
        const mine = enriched.find((r) => r.user_id === user.id);
        if (mine) {
          setMyExistingReview(mine);
          setMyRating(mine.rating);
          setMyComment(mine.comment || "");
        }
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchReviews();
  }, [circuitId, user]);

  const handleSubmit = async () => {
    if (!user || myRating === 0) {
      toast.error("Sélectionnez une note");
      return;
    }
    setSubmitting(true);
    try {
      if (myExistingReview) {
        await supabase
          .from("reviews")
          .update({ rating: myRating, comment: myComment || null })
          .eq("id", myExistingReview.id);
        toast.success("Avis mis à jour !");
      } else {
        await supabase.from("reviews").insert({
          circuit_id: circuitId,
          user_id: user.id,
          rating: myRating,
          comment: myComment || null,
        });
        toast.success("Merci pour votre avis !");
      }
      await fetchReviews();
    } catch {
      toast.error("Erreur lors de l'envoi");
    }
    setSubmitting(false);
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const days = Math.floor(diff / 86400000);
    if (days === 0) return "Aujourd'hui";
    if (days === 1) return "Hier";
    if (days < 30) return `Il y a ${days} jours`;
    return `Il y a ${Math.floor(days / 30)} mois`;
  };

  return (
    <div>
      <h2 className="font-display text-xl font-semibold text-foreground mb-4">
        Avis ({reviews.length})
      </h2>

      {/* Write review form */}
      {user ? (
        <div className="bg-card rounded-xl shadow-card p-4 mb-4">
          <p className="text-sm font-medium text-card-foreground mb-2">
            {myExistingReview ? "Modifier votre avis" : "Laisser un avis"}
          </p>
          <StarRating rating={myRating} onRate={setMyRating} interactive />
          <Textarea
            value={myComment}
            onChange={(e) => setMyComment(e.target.value)}
            placeholder="Partagez votre expérience…"
            className="mt-3 resize-none"
            rows={3}
          />
          <button
            onClick={handleSubmit}
            disabled={submitting || myRating === 0}
            className="mt-3 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {myExistingReview ? "Mettre à jour" : "Publier"}
          </button>
        </div>
      ) : (
        <div className="bg-muted rounded-xl p-4 mb-4 text-center">
          <p className="text-sm text-muted-foreground">Connectez-vous pour laisser un avis</p>
        </div>
      )}

      {/* Reviews list */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : reviews.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Aucun avis pour le moment</p>
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {reviews.map((review) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card rounded-xl shadow-card p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="text-sm font-semibold text-card-foreground">
                      {review.display_name}
                    </p>
                    <p className="text-xs text-muted-foreground">{timeAgo(review.created_at)}</p>
                  </div>
                  <StarRating rating={review.rating} />
                </div>
                {review.comment && (
                  <p className="text-sm text-muted-foreground leading-relaxed">{review.comment}</p>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

export default CircuitReviews;
