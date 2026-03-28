import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Calendar, Sun, Sunset, Plus, Trash2, MessageCircle, Loader2, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import SlotChat from "@/components/SlotChat";

interface Slot {
  id: string;
  circuit_id: string;
  user_id: string;
  slot_date: string;
  slot_time: string;
  party_size: number;
  open_to_others: boolean;
  message: string | null;
  display_name: string | null;
  created_at: string;
}

const SLOT_LABELS: Record<string, { label: string; icon: typeof Sun }> = {
  morning: { label: "Matin (9h–12h)", icon: Sun },
  afternoon: { label: "Après-midi (14h–17h)", icon: Sunset },
};

const getNextDays = (count: number) => {
  const days: string[] = [];
  const today = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d.toISOString().split("T")[0]);
  }
  return days;
};

const formatDate = (dateStr: string) => {
  const d = new Date(dateStr + "T00:00:00");
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);

  if (d.toDateString() === today.toDateString()) return "Aujourd'hui";
  if (d.toDateString() === tomorrow.toDateString()) return "Demain";

  return d.toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short" });
};

interface CommunitySlotsProps {
  circuitId: string;
}

const CommunitySlots = ({ circuitId }: CommunitySlotsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getNextDays(1)[0]);
  const [selectedTime, setSelectedTime] = useState<"morning" | "afternoon">("morning");
  const [partySize, setPartySize] = useState(1);
  const [openToOthers, setOpenToOthers] = useState(true);
  const [message, setMessage] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const days = getNextDays(7);

  const fetchSlots = async () => {
    const today = new Date().toISOString().split("T")[0];
    const { data } = await supabase
      .from("circuit_slots")
      .select("*")
      .eq("circuit_id", circuitId)
      .gte("slot_date", today)
      .order("slot_date", { ascending: true })
      .order("slot_time", { ascending: true });
    setSlots((data as Slot[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchSlots();

    const channel = supabase
      .channel(`slots-${circuitId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "circuit_slots",
        filter: `circuit_id=eq.${circuitId}`,
      }, () => {
        fetchSlots();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [circuitId]);

  const handleSubmit = async () => {
    if (!user) {
      toast({ title: "Connectez-vous", description: "Vous devez être connecté pour vous inscrire.", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("circuit_slots").insert({
      circuit_id: circuitId,
      user_id: user.id,
      slot_date: selectedDate,
      slot_time: selectedTime,
      party_size: Math.max(1, partySize),
      open_to_others: openToOthers,
      message: message.trim() || null,
      display_name: displayName.trim() || user.email?.split("@")[0] || "Anonyme",
    });

    if (error) {
      if (error.code === "23505") {
        toast({ title: "Déjà inscrit", description: "Vous êtes déjà inscrit sur ce créneau.", variant: "destructive" });
      } else {
        toast({ title: "Erreur", description: error.message, variant: "destructive" });
      }
    } else {
      toast({ title: "Inscrit ! 🎉", description: "Vous êtes inscrit sur ce créneau." });
      setShowForm(false);
      setMessage("");
      fetchSlots();
    }
    setSubmitting(false);
  };

  const handleDelete = async (slotId: string) => {
    await supabase.from("circuit_slots").delete().eq("id", slotId);
    fetchSlots();
    toast({ title: "Inscription annulée" });
  };

  const slotsByDate = slots.reduce<Record<string, Slot[]>>((acc, s) => {
    if (!acc[s.slot_date]) acc[s.slot_date] = [];
    acc[s.slot_date].push(s);
    return acc;
  }, {});

  const totalParticipants = slots.reduce((sum, s) => sum + s.party_size, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.35 }}
      className="mt-8"
    >
      <div className="bg-card rounded-2xl shadow-card p-6 md:p-8 border border-primary/10">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-card-foreground">
              Envie de faire ce circuit à plusieurs ? 🚗
            </h2>
            <p className="text-muted-foreground text-sm mt-1">
              Inscrivez-vous sur un créneau pour rouler en convoi avec d'autres passionnés. Retrouvez-vous sur la carte en temps réel !
            </p>
          </div>
        </div>

        {totalParticipants > 0 && (
          <div className="flex gap-3 mb-6">
            <div className="px-4 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4" />
              {totalParticipants} participant{totalParticipants > 1 ? "s" : ""} inscrit{totalParticipants > 1 ? "s" : ""}
            </div>
            <div className="px-4 py-2 rounded-lg bg-muted text-muted-foreground text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {Object.keys(slotsByDate).length} jour{Object.keys(slotsByDate).length > 1 ? "s" : ""}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : slots.length === 0 ? (
          <div className="text-center py-6 bg-muted/30 rounded-xl mb-4">
            <Users className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground text-sm">Aucun créneau planifié pour le moment.</p>
            <p className="text-muted-foreground text-xs mt-1">Soyez le premier à vous inscrire !</p>
          </div>
        ) : (
          <div className="space-y-4 mb-6">
            {Object.entries(slotsByDate).map(([date, dateSlots]) => {
              // Group by time slot for chat
              const timeGroups = dateSlots.reduce<Record<string, Slot[]>>((acc, s) => {
                if (!acc[s.slot_time]) acc[s.slot_time] = [];
                acc[s.slot_time].push(s);
                return acc;
              }, {});
              return (
              <div key={date}>
                <h3 className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-primary" />
                  {formatDate(date)}
                </h3>
                <div className="space-y-2">
                  {dateSlots.map((slot) => {
                    const TimeIcon = SLOT_LABELS[slot.slot_time]?.icon || Sun;
                    const isOwn = user?.id === slot.user_id;
                    return (
                      <motion.div
                        key={slot.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`rounded-xl p-4 border transition-colors ${
                          isOwn ? "border-primary/30 bg-primary/5" : "border-border bg-muted/30"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-start gap-3">
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                              <TimeIcon className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm text-card-foreground">
                                  {slot.display_name || "Anonyme"}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {SLOT_LABELS[slot.slot_time]?.label}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Users className="w-3 h-3" /> {slot.party_size} personne{slot.party_size > 1 ? "s" : ""}
                                </span>
                                {slot.open_to_others && (
                                  <span className="text-primary font-medium flex items-center gap-1">
                                    <UserPlus className="w-3 h-3" /> Ouvert aux autres
                                  </span>
                                )}
                              </div>
                              {slot.message && (
                                <p className="text-xs text-muted-foreground mt-2 flex items-start gap-1.5">
                                  <MessageCircle className="w-3 h-3 shrink-0 mt-0.5" />
                                  {slot.message}
                                </p>
                              )}
                            </div>
                          </div>
                          {isOwn && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(slot.id)}
                              className="text-destructive hover:text-destructive shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
                {/* Chat buttons per time slot */}
                {Object.entries(timeGroups).map(([time, _]) => (
                  <SlotChat key={`${date}-${time}`} circuitId={circuitId} slotDate={date} slotTime={time} />
                ))}
              </div>
              );
            })}
          </div>
        )}

        <AnimatePresence>
          {showForm ? (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-muted/50 rounded-xl p-5 space-y-4 border border-border"
            >
              <h3 className="font-semibold text-foreground text-sm">S'inscrire sur un créneau</h3>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Votre prénom / pseudo</label>
                <Input
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Ex: Jules"
                  className="text-sm"
                />
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Jour</label>
                <div className="flex gap-2 flex-wrap">
                  {days.map((day) => (
                    <button
                      key={day}
                      onClick={() => setSelectedDate(day)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                        selectedDate === day
                          ? "bg-primary text-primary-foreground"
                          : "bg-card border border-border text-foreground hover:border-primary/30"
                      }`}
                    >
                      {formatDate(day)}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Créneau</label>
                <div className="flex gap-2">
                  {(["morning", "afternoon"] as const).map((time) => {
                    const info = SLOT_LABELS[time];
                    const Icon = info.icon;
                    return (
                      <button
                        key={time}
                        onClick={() => setSelectedTime(time)}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                          selectedTime === time
                            ? "bg-primary text-primary-foreground"
                            : "bg-card border border-border text-foreground hover:border-primary/30"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {time === "morning" ? "Matin" : "Après-midi"}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Nombre de personnes dans votre véhicule</label>
                <div className="flex items-center gap-3">
                  <Button variant="outline" size="sm" onClick={() => setPartySize(Math.max(1, partySize - 1))}>-</Button>
                  <span className="text-lg font-bold text-foreground w-8 text-center">{partySize}</span>
                  <Button variant="outline" size="sm" onClick={() => setPartySize(Math.min(8, partySize + 1))}>+</Button>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setOpenToOthers(!openToOthers)}
                  className={`w-10 h-6 rounded-full transition-colors relative ${openToOthers ? "bg-primary" : "bg-muted-foreground/30"}`}
                >
                  <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${openToOthers ? "translate-x-5" : "translate-x-1"}`} />
                </button>
                <span className="text-sm text-foreground">Ouvert à accueillir d'autres participants</span>
              </div>

              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Un petit mot ? (optionnel)</label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ex: On part de Lyon, 2 voitures, ambiance chill 😎"
                  rows={2}
                  className="text-sm"
                  maxLength={200}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="flex-1 gap-2"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                  {submitting ? "Inscription..." : "M'inscrire"}
                </Button>
                <Button variant="outline" onClick={() => setShowForm(false)}>Annuler</Button>
              </div>
            </motion.div>
          ) : (
            <Button
              onClick={() => setShowForm(true)}
              className="w-full gap-2 py-6 text-base"
              size="lg"
            >
              <Plus className="w-5 h-5" /> S'inscrire sur un créneau
            </Button>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

export default CommunitySlots;
