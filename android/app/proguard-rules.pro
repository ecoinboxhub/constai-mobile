-optimizationpasses 5
-overloadaggressively
-repackageclasses ''
-allowaccessmodification
-mergeinterfacesaggressively

-keep class com.facebook.hermes.** { *; }
-keep class com.facebook.jni.** { *; }
-keep class * implements com.facebook.react.bridge.NativeModule { *; }

-dontwarn com.google.errorprone.annotations.**
-dontwarn com.google.crypto.tink.**
-dontwarn javax.annotation.**
