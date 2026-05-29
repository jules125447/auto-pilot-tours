## Objectif

Remplacer **Leaflet + CartoDB raster** par **MapLibre GL JS + OpenFreeMap Liberty** (tuiles vectorielles, gratuit illimité, sans clé API).

**Bénéfices** : rendu vectoriel net à tous les zooms, plus de trous de tuiles, rotation Waze-like fluide native (GPU), zoom infini.

## Étapes

### 1. Dépendances
- Installer `maplibre-gl`
- Garder `leaflet` temporairement (utilisé encore dans Studio Creator et heatmap admin — migration en 2 temps)

### 2. Nouveau helper `src/lib/mapLibreConfig.ts`
- Style OpenFreeMap Liberty : `https://tiles.openfreemap.org/styles/liberty`
- Fallback : Positron (`https://tiles.openfreemap.org/styles/positron`)
- Helpers : `centerOnAnchoredPoint`, `getTrackingZoom`, `snapPositionToRoute` (réutilisable, géométrie pure — pas besoin de changer)

### 3. Migration des composants utilisateurs (priorité 1)
- **`RouteMap.tsx`** → MapLibre, polyline via `addSource/addLayer` GeoJSON, marqueurs POI via `Marker` MapLibre
- **`NavigationMap.tsx`** → MapLibre avec `map.setBearing()` natif (remplace la rotation CSS hack), `setPitch(0)` pour rester 2D, layer route + layer route-traveled
- **`FixedUserArrow.tsx`** → reste un overlay React fixe (pas de changement, c'est du DOM par-dessus la carte)
- **`navigationMap.ts`** → adapter `centerMapOnAnchoredPoint` à l'API MapLibre (`map.setCenter` + offset projeté)

### 4. Preload offline `useCircuitPreload.ts`
- Les tuiles vectorielles OpenFreeMap sont en `.pbf` au lieu de `.png`
- Adapter les URLs : `https://tiles.openfreemap.org/planet/...vector.pbf/{z}/{x}/{y}.pbf`
- Pré-cacher aussi les sprites + glyphs du style (fonts) sinon rendu cassé offline

### 5. Studio Creator (priorité 2, séparée si besoin)
- `CircuitEditorMap.tsx` et `CircuitTestMode.tsx` migrent ensuite (édition de tracé, snap-to-road OSRM inchangé)

### 6. Admin
- `GpsHeatmap.tsx` reste sur Leaflet pour l'instant (plugin heatmap), migration optionnelle plus tard

## Détails techniques

- MapLibre n'utilise pas `LatLng` mais `LngLat` (ordre inversé !) — adapter chaque coord
- Les marqueurs custom (POI emojis) passent par `new maplibregl.Marker({ element: divHTML })`
- La polyline traveled/remaining : 2 layers `line` filtrés sur l'index courant via `setFilter` ou découpe GeoJSON
- Rotation : `map.rotateTo(bearing, { duration: 0 })` (au lieu du CSS transform actuel)
- Ancrage à 78% écran : utilisation de `map.setPadding({ bottom: height * 0.4 })` qui décale le centre visuel proprement
- Le CSS `maplibre-gl/dist/maplibre-gl.css` doit être importé dans `main.tsx`

## Hors scope (à conserver tel quel)

- Logique GPS, filtre Kalman, snap-to-route, geofencing audio, TTS, musiques — aucun changement
- OSRM (routing) — inchangé
- Tous les autres composants (NavigationBar, HUD, etc.)

## Risques

- Migration importante : possible régressions visuelles sur la rotation et le zoom
- Le mode offline doit être retesté car les `.pbf` se cachent différemment
- Si OpenFreeMap a une coupure, fallback raster CartoDB en secours

## Validation

Tester après migration :
1. RouteMap sur CircuitDetail (aperçu)
2. Navigation live (rotation, zoom, ancrage utilisateur)
3. Mode offline (pré-charger un circuit puis couper le réseau)
