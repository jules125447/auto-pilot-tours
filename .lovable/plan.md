## Objectifs

1. **Écran de chargement (splash) Tilo** affiché instantanément au lancement, avec animation de transition vers la page d'accueil.
2. **Refonte mobile de la page d'accueil** (`/`) avec mise en page plus lisible et belles animations.
3. **Fond de carte : aucun changement** (CartoDB Voyager conservé).

---

## 1. Splash screen Tilo

**Asset** : copier l'image uploadée vers `public/tilo-splash.png` (référencée directement dans `index.html` pour un affichage instantané, avant même le bundle React).

**Affichage instantané** :
- Dans `index.html` : `<link rel="preload" as="image" href="/tilo-splash.png">` + `<div id="splash">` avec image + texte, stylé via `<style>` inline dans `<head>`. Visible dès la première frame.
- Fond crème identique à l'image (`#f5ede2`), mascotte centrée, texte "Chargement de votre aventure…" en bas.
- Quand React monte, `main.tsx` ajoute la classe `splash-hide` au `#splash` → animation de sortie (fade + scale up sur le renard, fondu du fond) → suppression du DOM après ~900ms.
- Durée minimale ~1.2s pour laisser le temps aux animations.

**Animations internes du splash** (CSS pur) :
- Mascotte : entrée scale + bounce douce.
- Texte : fade-in décalé.
- Points de pagination : pulse séquentiel (déjà visibles sur l'image).
- Sortie : zoom léger + fade global.

---

## 2. Refonte mobile de la page d'accueil

Cible : viewport < 768px. Desktop inchangé.

**Problèmes actuels** :
- Titre trop gros sur mobile (`clamp(2.25rem, 7vw, 5rem)`), lignes mal cassées.
- Stats 3 colonnes serrées.
- Pas de présence visuelle de Tilo.
- Hiérarchie CTA faible.

**Nouvelle structure mobile** :

```
┌────────────────────────┐
│ Header                 │
├────────────────────────┤
│ [Badge "Nouveau"]      │
│ Titre compact 3 lignes │
│ Sous-titre court       │
│ [🦊 Tilo flottant]    │ ← petite mascotte animée
│ [🔍 Recherche]         │
│ [+ Créer un circuit]   │
│ ⭐4.9 · 🎧 · 📡         │ ← ligne unique
├────────────────────────┤
│ Stats scroll horiz     │ ← au lieu de 3 cols
├────────────────────────┤
│ Régions (chips)        │
├────────────────────────┤
│ Circuits 1 col         │
└────────────────────────┘
```

**Animations mobiles (framer-motion)** :
- Titre : stagger fade + slide up sur chaque ligne.
- Mascotte : flottement infini `y: [0, -8, 0]`.
- Cartes circuits : `whileInView` fade + slide up progressif.
- CTA : effet shine au tap.
- Chips régions : scale au tap.

**Responsive** :
- Hero `pt-6 pb-10` mobile vs `pt-16 pb-20` desktop.
- Titre `text-4xl` mobile, `text-7xl` desktop.
- Stats `flex overflow-x-auto` mobile, `grid grid-cols-3` desktop.

---

## Fichiers

**Modifiés** :
- `index.html` — splash inline (HTML + CSS dans `<head>`).
- `src/main.tsx` — retrait du splash après mount React.
- `src/index.css` — animations sortie splash + keyframes mobile.
- `src/pages/Index.tsx` — refonte Hero mobile + mascotte flottante + animations enrichies.

**Créés** :
- `public/tilo-splash.png` — copie de l'image uploadée.

**Pas de changement** : backend, DB, fond de carte, navigation, Tilo in-app.
