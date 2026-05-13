import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { setAnalyticsConsent } from "@/lib/analytics";
import { motion, AnimatePresence } from "framer-motion";
import { Shield } from "lucide-react";

const KEY = "analytics_consent";

export default function ConsentBanner() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (localStorage.getItem(KEY) === null) setShow(true);
  }, []);

  const decide = (v: boolean) => {
    setAnalyticsConsent(v);
    setShow(false);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ y: 100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 100, opacity: 0 }}
          className="fixed bottom-4 left-4 right-4 md:left-auto md:right-6 md:max-w-sm z-[1000]"
        >
          <div className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl p-4">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Shield className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm mb-1">Améliorer l'expérience</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Nous collectons des données de navigation anonymisées pour améliorer les circuits.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="ghost" className="flex-1" onClick={() => decide(false)}>Refuser</Button>
              <Button size="sm" className="flex-1" onClick={() => decide(true)}>Accepter</Button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
