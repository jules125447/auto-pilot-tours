# Plan — Tilo personnalisé + contrôle vitesse + chat IA

Cette demande est large. Je propose de la livrer en **3 lots** pour garder chaque étape testable. Tu valides, et on attaque le lot 1 tout de suite.

---

## Lot 1 — Tilo expressif + Point contrôle de vitesse (priorité haute)

### A. Refonte visuelle de Tilo (`TiloCompanion.tsx`)
Ajouter un système d'expressions réelles, pas juste un bob générique.

Nouveau prop : `expression: 'happy' | 'neutral' | 'surprised' | 'amazed' | 'calm' | 'mysterious' | 'sad' | 'funny' | 'energetic'`

Chaque expression modifie :
- **Yeux** : forme (ronds, plissés, étoilés, mi-clos), position des sourcils
- **Bouche** : courbe (sourire, droite, ouverte O, rictus)
- **Couleur joues** : rose pour heureux/gêné, transparent pour neutre
- **Animation tête** : bob lent (calme), rapide (énergie), penchée (mystère)

Clignement automatique toutes les 3-5s (déjà partiel, à renforcer avec scaleY animé).

Lip sync : quand `speaking=true`, bouche s'ouvre/ferme à 8Hz (déjà partiel).

### B. Point contrôle de vitesse (nouveau type de stop)
Migration DB : ajouter `'speed_check'` comme valeur possible dans `circuit_stops.stop_type` (déjà text libre, pas de contrainte → pas de migration nécessaire, juste convention).

Dans `CircuitEditorMap` / éditeur de stops : ajouter option "⚠️ Contrôle de vitesse" dans le sélecteur de type.

Dans `NavigationView.tsx` :
- Détecter approche d'un stop `stop_type === 'speed_check'` (< 100m)
- Déclencher séquence dédiée :
  1. Tilo apparaît avec expression `surprised`
  2. Animation existante `grabbed` du speedometer (déjà OK)
  3. Tilo regarde le compteur 2s
  4. Tilo commente selon vitesse réelle :
     - `> limite+10` → expression `funny`, "Oula, on est pressé !"
     - `±10 de limite` → expression `happy`, "Parfait rythme."
     - `< 30 km/h` → expression `calm`, "Balade tranquille, j'aime bien."
  5. Speedometer revient, Tilo disparaît après 4s

Nouveau type d'event Tilo : `speed_check` avec contexte `{ speed, limit, verdict }`.

---

## Lot 2 — Personnalisation Tilo par circuit

### A. Migration DB
```sql
ALTER TABLE circuits ADD COLUMN tilo_personality jsonb 
  DEFAULT '{"dominant_expression":"happy","energy_level":"medium","style":"friendly"}';
```

### B. Éditeur de circuit
Nouveau panneau "Personnalité de Tilo" dans `CircuitCreator.tsx` :
- Select expression dominante (9 options)
- Slider énergie (calme → dynamique)
- Select style (relax / humoristique / mystérieux / éducatif)

### C. Application runtime
`NavigationView` charge `circuit.tilo_personality` et le passe à `useTilo` + `TiloCompanion`. Le prompt de `tilo-speak` reçoit la personnalité pour adapter le ton.

---

## Lot 3 — Bouton flottant Tilo + conversation IA

### A. Nouveau composant `TiloChatButton.tsx`
Bouton flottant en bas (au-dessus de la NavigationBar), icône avatar Tilo.
- État idle : pulse douce
- État "highlight" (quand Tilo le présente) : glow orange + scale 1.2
- Désactivé en mode conduite : grisé avec tooltip "Disponible à l'arrêt"

Détection arrêt : `speed < 5 km/h` pendant > 3s.

### B. Message d'onboarding (1ère fois par session)
Au premier `welcome`, Tilo ajoute : "Tu vois le bouton avec mon visage en bas ? Tape dessus à l'arrêt pour me parler. Surtout pas en conduisant, hein !"
Le bouton fait son animation glow à ce moment.

### C. Edge function `tilo-chat`
Nouvelle fonction (différente de `tilo-speak`) qui :
- Reçoit l'historique de la conversation
- Système prompt = persona Tilo + personnalité du circuit + contexte (POIs proches)
- Stream la réponse
- Modèle : `google/gemini-3-flash-preview`

### D. Sheet de conversation
`TiloChatSheet.tsx` — bottom sheet avec :
- Avatar Tilo animé (expression réactive)
- Historique messages (markdown)
- Input texte + bouton micro (Web Speech API → texte)
- TTS sur les réponses

À la fermeture : Tilo dit "Je repasse en mode guide de route 👍"

---

## Lot 4 (optionnel) — Analytics admin
- Nouvelle table `tilo_interactions` (type, emotion, speed_at, circuit_id, session_id)
- Section dans `AdminDashboard` : top interactions, émotions, questions, impact vitesse

---

## Détails techniques

**Fichiers à créer :**
- `src/components/navigation/TiloChatButton.tsx`
- `src/components/navigation/TiloChatSheet.tsx`
- `src/lib/tiloExpressions.ts` (mapping expression → SVG params)
- `supabase/functions/tilo-chat/index.ts`

**Fichiers à modifier :**
- `src/components/navigation/TiloCompanion.tsx` (système d'expressions)
- `src/hooks/useTilo.ts` (event `speed_check`, expression courante)
- `src/pages/NavigationView.tsx` (détection speed_check, intégration bouton)
- `src/pages/CircuitCreator.tsx` (panneau personnalité + type speed_check)
- `src/components/creator/CircuitEditorMap.tsx` (icône speed_check)
- `supabase/functions/tilo-speak/index.ts` (event `speed_check`, prise en compte personnalité)

**Migrations :**
- 1 seule : ajout colonne `tilo_personality` sur `circuits`

---

## Question

Le périmètre total = ~4h de build. **Je propose d'attaquer immédiatement le Lot 1** (Tilo expressif + point contrôle de vitesse) qui apporte 80% de la valeur visible. On enchaîne avec Lot 2 et 3 après ton retour. OK pour démarrer comme ça ?