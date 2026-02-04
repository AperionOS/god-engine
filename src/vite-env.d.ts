/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_BUILD_SHA: string | undefined;
  readonly VITE_DEPLOY_URL: string | undefined;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
