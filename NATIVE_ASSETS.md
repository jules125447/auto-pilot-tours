# Assets natifs (icône + splash screen)

Les fichiers sources sont :

- `public/tilo-icon.png` (1024×1024) — icône de l'app
- `public/tilo-splash.png` — splash screen

## Génération automatique pour iOS & Android

Une fois le projet exporté sur GitHub et cloné en local :

```bash
npm install -D @capacitor/assets
npx capacitor-assets generate \
  --iconBackgroundColor "#FB923C" \
  --splashBackgroundColor "#FB923C" \
  --assetPath public
```

Cela génère toutes les tailles requises (`AppIcon.appiconset` pour iOS,
`mipmap-*` pour Android) à partir de `public/tilo-icon.png` et
`public/tilo-splash.png`.

À refaire après chaque mise à jour des sources, puis `npx cap sync`.

## Permissions à ajouter manuellement (1 fois)

### iOS — `ios/App/App/Info.plist`
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Tilo a besoin de votre position pour vous guider sur le circuit.</string>
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>Tilo continue de vous guider même quand l'écran est éteint.</string>
<key>UIBackgroundModes</key>
<array>
  <string>location</string>
  <string>audio</string>
</array>
```

### Android — `android/app/src/main/AndroidManifest.xml`
```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
<uses-permission android:name="android.permission.FOREGROUND_SERVICE_LOCATION" />
<uses-permission android:name="android.permission.WAKE_LOCK" />
```
