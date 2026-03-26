import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.pathrefiner',
  appName: 'Life Balance Planner',
  webDir: 'dist',
  server: {
    url: "https://5b1a8f45-9369-44b9-a604-86aacd261a2d.lovableproject.com?forceHideBadge=true",
    cleartext: true
  }
};

export default config;
