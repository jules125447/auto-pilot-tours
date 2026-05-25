# Plan : App mobile native + GPS pro

Objectif : transformer l'app en vraie app mobile iOS/Android via **Capacitor**, avec un GPS de qualité Waze/Google Maps.

## 1. Mise en place de Capacitor

- Installer `@capacitor/core`, `@capacitor/cli`, `@capacitor/ios`, `@capacitor/android`
- Créer `capacitor.config.ts` :
  - `appId: app.lovable.2db36d945b96439e91496901232e8092`
  - `appName: auto-pilot-tours`
  - `server.url` pointant vers le sandbox Lovable (hot-reload sur appareil)
- Plugins natifs nécessaires :
  - `@capacitor/geolocation` → GPS hardware natif
  - `@capacitor/network` → détection offline pour le mode hors-ligne
  - `@capacitor/preferences` → stockage natif
  - `@capacitor-community/text-to-speech` → TTS natif (plus fluide que SpeechSynthesis web)
  - `@capacitor/status-bar` + `@capacitor/splash-screen` → finitions UI native
  - `@capawesome/capacitor-background-task` → maintenir le GPS actif en arrière-plan

## 2. Abstraction GPS (web ↔ natif)

Créer `src/lib/nativeGeolocation.ts` qui détecte la plateforme :
- Sur natif → `Geolocation.watchPosition` de Capacitor (chip GPS direct, haute précision, fonctionne écran éteint)
- Sur web → fallback `navigator.geolocation.watchPosition`

Avantages natif :
- Précision réelle 3-5 m (vs 10-30 m sur web)
- Pas de coupure quand l'écran s'éteint
- Accès boussole/accéléromètre

## 3. Filtrage GPS pro (Waze-like)

Nouveau module `src/lib/gpsFilter.ts` :
- **Rejet bruit** : ignorer positions avec `accuracy > 30 m`
- **Rejet sauts** : ignorer si vitesse implicite > 180 km/h entre 2 points
- **Filtre Kalman 1D** sur lat et lng séparément (lissage sans lag)
- **Hystérésis cap** : ne tourner la carte que si Δbearing > 8°
- **Vitesse moyenne glissante** sur 30 s pour ETA stable

## 4. Snap-to-road amélioré

Améliorer `src/lib/navigationMap.ts` :
- Remplacer `findClosestRouteIndex` par une **projection orthogonale** sur les segments (pas juste le point le plus proche)
- Ajouter **monotonie** : l'index ne peut que progresser sauf si écart > 40 m pendant > 5 s
- Pré-calculer `cumulativeDistances[]` pour calculer la distance restante en O(1) (somme des segments restants, pas vol d'oiseau)
- Si écart perpendiculaire > 40 m pendant > 5 s → re-route automatique via OSRM

## 5. Intégration dans `NavigationView.tsx` et `useUserLocation.ts`

- Brancher le nouveau hook `useNativeGeolocation` (natif + filtre + snap)
- Remplacer les calculs de distance bird's-eye par les distances cumulatives sur route
- ETA basée sur vitesse moyenne 30 s

## 6. Instructions de build (à exécuter par toi après export GitHub)

Lovable ne peut pas compiler le binaire iOS/Android. Une fois le code prêt :

1. **Export to Github** (bouton en haut à droite)
2. `git clone` ton repo localement
3. `npm install`
4. `npx cap add ios` et/ou `npx cap add android`
5. `npm run build && npx cap sync`
6. `npx cap run ios` (Mac + Xcode) ou `npx cap run android` (Android Studio)

À chaque `git pull` ensuite : `npm install && npm run build && npx cap sync`.

📖 Guide complet : https://lovable.dev/blog/2025-02-13-mobile-development-made-simple-with-capacitor

## Détails techniques

- Garde tout le code React existant : Capacitor encapsule, ne réécrit pas
- CartoDB Voyager conservé comme demandé
- Le fallback web reste fonctionnel (preview navigateur)
- TTS : double implémentation (Capacitor natif sur device, SpeechSynthesis sur web)
- Permission GPS demandée au 1er lancement via `Geolocation.requestPermissions()`
- Pour le GPS arrière-plan iOS : ajouter `NSLocationAlwaysAndWhenInUseUsageDescription` dans `Info.plist` (instruction fournie après build)
