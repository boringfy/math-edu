# Tip products for App Store Connect and Google Play Console

The Settings screen uses native in-app purchases. Create the following four **consumable** one-time products under `com.hashfront.mathedu` in both stores. Set their US base prices exactly as shown; the app displays each store's localized `displayPrice` instead of assuming every customer pays in USD.

| Product ID | US price | Suggested display name |
| --- | ---: | --- |
| `tip_099` | $0.99 | Small tip |
| `tip_299` | $2.99 | Kind tip |
| `tip_599` | $5.99 | Generous tip |
| `tip_999` | $9.99 | Big thank-you tip |

Tips are optional and grant no coins, levels, badges, or other benefits. They can be bought repeatedly. The app consumes each completed transaction so another tip at the same amount is possible.

Before submitting a build:

1. In App Store Connect, complete the Paid Apps agreement, banking, and tax setup; create the four consumable products with metadata, review screenshots, and the prices above. Enable the In-App Purchase capability for the iOS app ID / Xcode target and submit the first in-app purchases with the app for review.
2. In Google Play Console, complete the payments profile, upload an internal-test build, create and activate the four one-time products with matching IDs and prices.
3. Build a new native binary after adding `expo-iap` (`expo prebuild`/EAS build). The production EAS profile pins the Android store to `play`. Expo Go cannot process these purchases.
4. On a physical iPhone using an App Store sandbox tester and an Android device enrolled in Play internal testing, verify each tier, cancellation, an interrupted purchase, repeat purchase of a consumed tier, and that no learning progress or coins change. Store product metadata is not available in Jest or a normal simulator build.

Do not submit the tip UI for review until the store products are available and a sandbox transaction has been tested on each platform.
