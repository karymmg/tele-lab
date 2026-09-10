import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'tn.telephonic.pro',
  appName: 'Telephonic Pro',
  webDir: 'dist',

  server: {
    url: 'https://www.telephonic-pro.tn/',
    cleartext: false
  }
};

export default config;