# Migration hybride vers Google Maps

## Stratégie

- **Web (preview Lovable + PWA)** : Google Maps JavaScript API
- **iOS/Android (Capacitor)** : `@capacitor/google-maps` (officiel, plus maintenu que `@capacitor-community/google-maps`)
- **Snap-to-road** : Google Roads API (`snapToRoads` + `nearestRoads`) appelée en REST depuis le client
- **Directions** : Google Directions API en REST (fallback OSRM gardé si quota dépassé)
- **Clé** : `VITE_GOOGLE_MAPS_API_KEY` ajoutée via formulaire sécurisé (clé publishable restreinte par referrer/bundle id côté Google Cloud)

## Architecture

```text
src/lib/maps/
  ├── googleMapsLoader.ts      Loader unique de l'API JS (async + callback)
  ├── googleRoadsApi.ts        snapToRoads / nearestRoads (REST)
  ├── googleDirectionsApi.ts   Directions + recalcul d'itinéraire
  └── platform.ts              detectPlatform() : 'web' | 'ios' | 'android'

src/components/navigation/
  ├── NavigationMap.tsx        Aiguillage web vs natif
  ├── NavigationMapWeb.tsx     Google Maps JS (remplace l'actuel MapLibre)
  └── NavigationMapNative.tsx  @capacitor/google-maps (iOS/Android)
```

## Étapes

1. **Demander la clé** `VITE_GOOGLE_MAPS_API_KEY` (formulaire sécurisé)
2. **Installer** `@capacitor/google-maps` + types `@types/google.maps`
3. **Loader JS** : chargement async avec `loading=async` + `callback=initGoogleMaps`, paramètres `libraries=geometry,marker`
4. **NavigationMapWeb** : reprend la logique actuelle (route polyline orange, marqueurs POI, FixedUserArrow, traveled/remaining split, tracking caméra 220ms), tracé via `google.maps.Polyline` et marqueurs DOM via `OverlayView`
5. **NavigationMapNative** : carte native plein écran, polyline + markers via l'API Capacitor, communique avec React pour le tracking caméra et les évènements pan/zoom (sortie tracking)
6. **Snap-to-road Google** : remplace le `mapMatcher.ts` local. Buffer des 10 derniers points GPS → `snapToRoads?interpolate=true&path=...` → utilise le `location` du snap le plus récent comme position affichée. Throttle à 1 appel / 1.5s pour rester sous quota
7. **Directions API** : `routing.ts` — nouvelle fonction `fetchGoogleDirections(origin, waypoints, destination)` avec `mode=driving`, `language=fr`. Récupère `steps` (instructions HTML nettoyées) pour le banner
8. **Recalcul off-route** : si position raw > 60m de la polyline pendant 2 fixes, appel Directions depuis position courante vers prochain POI, mise à jour de `activeSnapRoute`
9. **Voice guidance** : utilise les `steps` Google (`maneuver`, `html_instructions`, `distance.value`) au lieu de la détection locale — instructions natives donc plus précises
10. **Fallback** : si la clé Google est absente ou si un appel renvoie `OVER_QUERY_LIMIT`/`REQUEST_DENIED`, fallback automatique vers MapLibre + OSRM + matcher local
11. **Capacitor config** : ajouter `GoogleMaps` plugin dans `capacitor.config.ts` avec les clés iOS/Android (mêmes restrictions à configurer côté Google Cloud)
12. **Suppression progressive** : MapLibre reste pour le studio créateur (déjà sur Leaflet en partie) et comme fallback navigation web

## Détails techniques

- **Sécurité clé** : la clé `VITE_*` est exposée au bundle (c'est attendu pour Maps JS). Elle DOIT être restreinte côté Google Cloud :
  - HTTP referrers : `*.lovable.app/*`, `*.lovableproject.com/*`, domaine custom
  - Application restrictions iOS : bundle id `app.lovable.2db36d945b96439e91496901232e8092`
  - APIs autorisées : Maps JavaScript API, Maps SDK iOS, Maps SDK Android, Roads API, Directions API, Geocoding API
- **Quotas à surveiller** : Roads API coûte $10/1000 requêtes, Directions $5/1000. Throttling agressif côté client + cache du dernier itinéraire calculé
- **Pas d'AdvancedMarker** : on reste sur `google.maps.Marker` (pas de `mapId` requis)
- **Suppression** : `src/lib/mapMatcher.ts` reste utilisé uniquement en fallback offline ; `mapLibreConfig.ts` reste pour le studio
- **Capacitor sync** : après ajout du plugin, l'utilisateur devra `git pull` + `npm install` + `npx cap sync` localement pour tester en natif

## Risques

- Coût Google Maps non négligeable si l'app décolle (alerte budget conseillée)
- L'API Capacitor Google Maps a une UX différente (carte native rendue au-dessus du WebView, peut compliquer les overlays React — on utilisera `disableDefaultUI` et nos overlays React par-dessus avec un trou transparent)
- Le snap-to-road Google est en REST async donc introduit une latence ~200-400ms — on garde l'interpolation locale entre deux snaps pour la fluidité visuelle

Valide ce plan et je commence par te demander la clé API.
