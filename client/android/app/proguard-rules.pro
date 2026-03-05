# Capacitor core — do not obfuscate bridge classes
-keep class com.getcapacitor.** { *; }
-keep class com.zenflow.app.** { *; }

# Keep JavaScript interface annotations
-keepattributes JavascriptInterface
-keepattributes *Annotation*

# Preserve enums
-keepclassmembers enum * {
    public static **[] values();
    public static ** valueOf(java.lang.String);
}

