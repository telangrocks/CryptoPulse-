/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_WS_BASE_URL: string;
  readonly VITE_BACKEND_URL: string;
  readonly VITE_HTTPS: string;
  readonly NODE_ENV: string;
  readonly DEV: boolean;
  readonly PROD: boolean;
  // Add more env variables as needed
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Global variables defined in vite.config.ts
declare const __DEV__: boolean;
declare const __PROD__: boolean;