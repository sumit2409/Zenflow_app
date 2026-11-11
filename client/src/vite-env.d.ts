/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ADSENSE_ENABLED?: string
  readonly VITE_SUPPORT_URL?: string
  readonly VITE_AFFILIATE_URL?: string
  readonly VITE_AFFILIATE_LABEL?: string
  readonly VITE_API_BASE_URL?: string
  readonly VITE_ANDROID_API_BASE_URL?: string
  readonly VITE_ENABLE_ANALYTICS_IN_DEV?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
