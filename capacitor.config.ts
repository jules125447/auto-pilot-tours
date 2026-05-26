import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.2db36d945b96439e91496901232e8092",
  appName: "Tilo",
  webDir: "dist",
  // Hot-reload from Lovable sandbox on physical devices / emulators.
  // Remove `server.url` for a production store build (and run `npx cap sync`).
  server: {
    url: "https://2db36d94-5b96-439e-9149-6901232e8092.lovableproject.com?forceHideBadge=true",
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#FB923C",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
      splashFullScreen: true,
      splashImmersive: true,
    },
    Geolocation: {
      permissions: ["location"],
    },
    BackgroundGeolocation: {
      // Android foreground service notification — required by Google Play
      // when tracking GPS in background.
      backgroundMessage: "Tilo continue de vous guider sur votre circuit.",
      backgroundTitle: "Navigation Tilo en cours",
    },
    KeepAwake: {},
  },
  ios: {
    contentInset: "always",
    limitsNavigationsToAppBoundDomains: false,
    // Allow audio (TTS + music) to keep playing alongside Spotify/Apple Music
    backgroundColor: "#FB923C",
  },
  android: {
    allowMixedContent: true,
    backgroundColor: "#FB923C",
  },
};

export default config;
