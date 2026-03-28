import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Send, MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  id: string;
  user_id: string;
  display_name: string | null;
  message: string;
  created_at: string;
}

interface SlotChatProps {
  circuitId: string;
  slotDate: string;
  slotTime: string;
}

const SlotChat = ({ circuitId, slotDate, slotTime }: SlotChatProps) => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    const { data } = await supabase
      .from("slot_messages")
      .select("*")
      .eq("circuit_id", circuitId)
      .eq("slot_date", slotDate)
      .eq("slot_time", slotTime)
      .order("created_at", { ascending: true });
    setMessages((data as Message[]) || []);
  };

  useEffect(() => {
    if (!open) return;
    fetchMessages();
    const channel = supabase
      .channel(`chat-${circuitId}-${slotDate}-${slotTime}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "slot_messages",
        filter: `circuit_id=eq.${circuitId}`,
      }, () => fetchMessages())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [open, circuitId, slotDate, slotTime]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!user || !text.trim()) return;
    setSending(true);
    await supabase.from("slot_messages").insert({
      circuit_id: circuitId,
      slot_date: slotDate,
      slot_time: slotTime,
      user_id: user.id,
      display_name: user.email?.split("@")[0] || "Anonyme",
      message: text.trim(),
    } as any);
    setText("");
    setSending(false);
  };

  const unreadCount = messages.length;

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(!open)}
        className="gap-1.5 relative"
      >
        <MessageCircle className="w-3.5 h-3.5" />
        Tchat
        {unreadCount > 0 && !open && (
          <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold">
            {unreadCount}
          </span>
        )}
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 280 }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-2 rounded-xl border border-border bg-card overflow-hidden flex flex-col"
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/50">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5 text-primary" />
                Discussion du créneau
              </span>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <ScrollArea className="flex-1 px-3 py-2">
              {messages.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-4">
                  Aucun message. Soyez le premier à écrire ! 💬
                </p>
              )}
              {messages.map((msg) => {
                const isOwn = msg.user_id === user?.id;
                return (
                  <div key={msg.id} className={`mb-2 flex ${isOwn ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-xl px-3 py-1.5 ${
                      isOwn ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                    }`}>
                      {!isOwn && (
                        <p className="text-[10px] font-semibold opacity-70">{msg.display_name || "Anonyme"}</p>
                      )}
                      <p className="text-sm">{msg.message}</p>
                      <p className="text-[9px] opacity-50 text-right mt-0.5">
                        {new Date(msg.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </ScrollArea>
            {user ? (
              <div className="flex gap-2 px-3 py-2 border-t border-border">
                <Input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Votre message..."
                  className="text-sm h-8"
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  maxLength={300}
                />
                <Button size="sm" onClick={handleSend} disabled={sending || !text.trim()} className="h-8 w-8 p-0">
                  <Send className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground text-center py-2 border-t border-border">
                Connectez-vous pour participer
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default SlotChat;
