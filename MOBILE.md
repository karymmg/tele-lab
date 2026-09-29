# Tele Lab mobile apps

The Android and iOS projects are Capacitor apps with the built Tele Lab site bundled locally. Shop, repair, tracking, and account data still use the online Supabase service and require an internet connection.

## Refresh the native projects after a web change

```sh
npm run build:mobile
```

This builds the website and copies it into both native projects.

## Android

Open the project in Android Studio:

```sh
npm run android:open
```

Or build a debug APK from the terminal:

```sh
cd android
./gradlew assembleDebug
```

The APK is written to `android/app/build/outputs/apk/debug/app-debug.apk`.

## iOS

iOS builds require macOS with Xcode. Open the project with `npm run ios:open`, select the `App` target, configure an Apple development team for signing, then build or archive it in Xcode.

The app identifier is `tn.telephonic.pro`. Store releases also require release signing and the corresponding Google Play or Apple Developer account setup.
