# Plan : Espace Admin & Analytics

## 1. Sécurité & accès admin

**Important** : Je ne vais PAS coder en dur les identifiants `julesbailly39130@gmail.com / julessuzy39` dans le code (faille critique). À la place :
- Tu créeras le compte normalement via la page d'inscription avec ces identifiants
- Je te donnerai une commande SQL (via migration) pour ajouter le rôle `admin` à ton `user_id`
- L'enum `app_role` sera étendu avec `admin` (déjà présent dans la fonction `has_role`, à confirmer)
- Une policy RLS + un hook `useIsAdmin()` côté client protègent l'accès au dashboard

Bouton "Admin" discret en bas du footer → redirige vers `/auth?admin=1` puis `/admin` si rôle admin.

## 2. Tracking des données analytics

Aujourd'hui **aucune donnée d'usage n'est collectée** (pas de table sessions, events, plays audio, etc.). Pour avoir un vrai dashboard, il faut d'abord enregistrer ces événements. Je vais créer :

- `navigation_sessions` : un trajet utilisateur (circuit_id, user_id, started_at, ended_at, completed, distance_m, duration_s)
- `gps_pings` : positions GPS échantillonnées (session_id, lat, lng, speed, timestamp) → heatmap
- `stop_visits` : passage à un POI (session_id, stop_id, dwell_seconds)
- `audio_plays` : lectures audio (session_id, audio_zone_id, played_seconds, completed)

RLS : insert autorisé pour user authentifié sur ses propres lignes, select réservé admin (via `has_role`).

Hooks d'instrumentation ajoutés dans `NavigationView.tsx` et `useVoiceGuidance.ts` pour logger ces events en arrière-plan (batch toutes les ~10s pour les pings GPS).

## 3. Dashboard `/admin`

Layout sidebar style Stripe/Notion avec sections :

- **Vue d'ensemble** : KPI cards (utilisateurs actifs 7j/30j, sessions, revenus, taux complétion, circuit top)
- **Trajets** : circuits les plus empruntés, durée moyenne, distance moyenne, taux abandon, horaires d'utilisation (graph par heure/jour de semaine)
- **GPS & Heatmap** : carte Leaflet avec `leaflet.heat` (ajout dépendance) sur les `gps_pings`, filtres période/circuit
- **Audio** : top audios, temps d'écoute moyen, taux complétion, audios ignorés
- **Engagement** : sessions terminées vs abandonnées, stops favoris, retours
- **Business** : revenus mensuels (line chart), revenus par circuit (bar), nombre d'achats, conversion, top circuits rentables (utilise `purchases`)
- **Filtres globaux** : période (7j/30j/90j/all), région, circuit

Composants : `recharts` (déjà installé) pour les graphiques, cartes shadcn avec gradients orange/amber existants, animations framer-motion subtiles.

## 4. RGPD

- Note dans le footer "Données anonymisées à des fins d'analyse"
- Une `Edge Function delete-my-data` supprimera sessions/pings/plays liés au user (bouton dans page profil — version simple)
- Tracking actif uniquement après acceptation (banner cookies léger, stocké en localStorage)

## Détails techniques

**Fichiers créés :**
- `src/pages/AdminDashboard.tsx` (layout + routing interne par tabs)
- `src/components/admin/{KpiCard,SessionsChart,RevenueChart,GpsHeatmap,AudioStats,Filters}.tsx`
- `src/hooks/useIsAdmin.ts`, `src/hooks/useAnalyticsTracker.ts`
- `src/lib/analytics.ts` (batch d'events)
- Migration : tables analytics + RLS + extension enum `app_role` si besoin
- Footer mis à jour (lien Admin discret)
- Route `/admin` ajoutée dans `App.tsx`, protégée par `useIsAdmin`

**Dépendance :** `leaflet.heat` pour la heatmap.

**Hors scope (pour rester focalisé) :**
- Saisons / régions touristiques avancées (nécessiterait géocodage inverse à grande échelle)
- Suppression RGPD complète automatisée (version simple : bouton delete)
- Auth 2FA admin (pas demandé mais possible plus tard)

## Étape 1 après ton accord

Je crée la migration (tables + RLS) et te demande de l'approuver. Ensuite j'implémente le tracking + dashboard. Tu pourras ensuite te connecter avec ton compte et je passerai ton `user_id` en `admin` via une commande à exécuter.

Tu valides ?
