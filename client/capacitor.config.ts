import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'dev.marco.vault',
  appName: 'Vault',
  webDir: 'dist/vault-app/browser',
  server: { androidScheme: 'https' },
  plugins: {
    // le chiamate fetch passano dal layer nativo: niente problemi di CORS col tuo server
    CapacitorHttp: { enabled: true },
  },
};

export default config;
