# Native app artwork

`logo.svg` is the source artwork for the Android and iOS app icons and launch screens.
After changing it, regenerate native assets with:

```sh
npx --yes @capacitor/assets generate --android --ios \
  --iconBackgroundColor '#03070A' \
  --iconBackgroundColorDark '#03070A' \
  --splashBackgroundColor '#03070A' \
  --splashBackgroundColorDark '#03070A'
```
