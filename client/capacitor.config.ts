import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.zenflow.app',
  appName: 'Zenflow',
  webDir: 'dist',

  android: {
    // Matches the Zenflow cream background so no white flash on load
    backgroundColor: '#EFE3D5',

    // Allow navigation within the app origin
    allowMixedContent: false,

    // Identify Android WebView traffic on the server
    // Append 'ZenflowAndroid/1.0' to the existing user agent string
    overrideUserAgent: undefined,
    appendUserAgent: 'ZenflowAndroid/1.0',
  },

  server: {
    // Allow hot reload in development by not restricting hostname
    // This has no effect in production builds
    cleartext: true,
    androidScheme: 'https',
  },

  plugins: {
    LocalNotifications: {
      smallIcon: 'ic_stat_zenflow',
      iconColor: '#D7A36D',
      sound: 'meditation_bell',
    },
  },
}

export default config

