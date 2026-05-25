import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.lovable.2db36d945b96439e91496901232e8092",
  appName: "auto-pilot-tours",
  webDir: "dist",
  // Hot-reload from Lovable sandbox on physical devices / emulators.
  // Remove `server.url` for a production store build (and run `npx cap sync`).
  server: {
    url: "https://2db36d94-5b96-439e-9149-6901232e8092.lovableproject.com?forceHideBadge=true",
    cleartext: true,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: "#FFF7ED",
      showSpinner: false,
    },
    Geolocation: {
      // iOS-only — Android perms are declared in AndroidManifest.xml after `npx cap add android`
      permissions: ["location"],
    },
  },
  ios: {
    contentInset: "always",
    limitsNavigationsToAppBoundDomains: false,
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;
