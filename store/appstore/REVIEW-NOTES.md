# App Review notes — Have Fun Learning

## Paste into "Notes" in App Store Connect

```
Have Fun Learning is a practice app for children in grades 1 to 5, covering maths, reading and logic.

NO ACCOUNT OR PURCHASE IS NEEDED. There is no sign-up or login. Open the app and tap START on the first lesson; all learning content is immediately available. The three subjects are the tabs along the bottom.

OPTIONAL TIPS. Settings has a Grown-ups section behind an adult-level arithmetic gate. It offers four repeatable consumable in-app purchases ($0.99, $2.99, $5.99, $9.99 US base prices), using StoreKit. Prices shown in the app come from the App Store. Tips give no coins, levels, badges, or other benefit. Canceling a purchase changes nothing.

WORKS WITHOUT A NETWORK. Authored questions and stories are bundled in the app. For the endless math and logic maps, the app saves a rolling window of five server-planned levels. After all five are completed offline, it asks the user to connect before continuing. On Apple devices progress synchronizes through the user's private iCloud key-value store.

ADAPTIVE LEVELS. While connected, unused prefetched levels are refreshed after completed work so difficulty and skill selection reflect the child's latest performance and mistakes. The level-planning request contains grade, subject, level, per-skill difficulty and struggling skill names; it contains no name, account, device ID or answer text.

DAILY REMINDER is optional. Settings lets the user choose a local time in 30-minute steps. Notification permission is requested only when the reminder is switched on; disabling it cancels the pending notification.

READING OUT LOUD uses the microphone. It is optional: every story can be read silently and answered without ever granting the permission. Speech recognition is forced on-device (requiresOnDeviceRecognition = true), so no audio is recorded and none is transmitted.

FEEDBACK FORMS. Settings contains "Suggest a kind of problem" and "Report a problem". These send the typed message together with an app-generated device UUID and the client IP, used only to rate-limit and to de-duplicate reports. This is declared under App Privacy as Device ID, Other User Content and Other Diagnostic Data, all for App Functionality. There is no advertising SDK or third-party advertising tracker in this binary. Optional first-party usage counts require a first-launch opt-in and can be turned off in Settings; App Privacy also declares Analytics for these events.

PRIVACY AND TERMS. Both pages are linked from Settings and hosted at https://hashfront.com/math-edu/privacy and https://hashfront.com/math-edu/terms. Support is at https://hashfront.com/math-edu/support.

"LOCK TO THIS APP" in Settings is an Android-only feature. On iOS the section explains that the same job is done by Guided Access in Settings > Accessibility, and no control is shown.

The app is portrait-only on iPhone and supports iPad.
```

---

## Things a reviewer may ask about, and the honest answer

**"Why does an offline app need the microphone?"**
Only for the optional read-aloud exercise, and only while a story is on screen.
The permission string says so. Declining it leaves every story fully playable.

**"Is there an AI chatbot in a children's app?"**
There is a tutor that explains a method after two wrong answers, generated
server-side. **It is disabled on the production server for this release** — no
model key is configured, `/v1/explain` returns 503, and the app hides the
feature. See `PRIVACY.md` for what has to change before switching it on.

**"Where does the content come from?"**
`https://math-edu.hashfront.com`. Content is signed by sha256 in a manifest and
verified after download. A reviewer with no network still gets the bundled copy.

---

## Deployment checks before uploading a build

### 1. Support and Privacy Policy URLs must resolve

These routes are implemented in the Hashfront website repository and must be deployed before review:

- `https://hashfront.com/math-edu/support`
- `https://hashfront.com/math-edu/privacy`
- `https://hashfront.com/math-edu/terms`

### 2. Enable iCloud on the App ID

Enable **iCloud → Key-value storage** for `com.hashfront.mathedu` in
Certificates, Identifiers & Profiles before creating the distribution profile.
The app entitlement is already configured.

### 3. Configure and test tip products

Create and submit the four consumable products listed in `store/TIPS.md`.
Complete the Paid Apps agreement, banking and tax setup, and verify a sandbox
purchase on a physical iPhone before submitting the app.

### 4. Confirm the app icon and screenshots

Review the current icon on an actual device and inspect every submitted
screenshot at full size. The existing iPhone and iPad screenshots may predate
the latest Settings, player-name and tip changes; regenerate any that do.

### 5. Version and build number

`app.json` starts at version `1.0.0`, iOS build `1`, and Android version code
`1`. The production EAS profile auto-increments subsequent uploads.

---

## Non-blocking, worth knowing

- **`expo-speech-recognition` is on `^56.0.1`** while every other Expo package is
  `~57`. It builds and works, but a caret on a major version behind the SDK is
  the kind of thing that breaks on a clean CI checkout.
- **No crash reporter.** Deliberate for privacy, but crashes in the field will be
  invisible; the only signal will be the bug-report form.
