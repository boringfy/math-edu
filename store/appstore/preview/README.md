# App Preview recording

Run `scripts/record-app-preview.sh` on a Mac with Xcode, an iOS Simulator
runtime, CocoaPods, `jq`, FFmpeg, Java 17+, and [Maestro CLI](https://docs.maestro.dev/maestro-cli/how-to-install-maestro-cli).
Run `npm ci` at the repository root first. If the ignored `frontend/ios`
project does not exist, the script generates it with Expo prebuild and runs
`pod install`.
Pass `iphone` or `ipad` to record just one size. The script builds the Release
app, creates its own clean simulators, dismisses first-launch consent without
opting into tracking, runs the UI tour as a test, records the real display, and
validates the exported MP4. A failed build, UI assertion, or media check fails
the pipeline. No synthetic app screens are used.

Videos are written to `store/appstore/previews/ios/`. Review them before upload;
they are local deliverables, not automatically sent to App Store Connect. The
tour is in `tour.yaml`, and first-launch setup is in `prepare.yaml`. The
dedicated simulator app is reinstalled for each run, so its test progress is
cleared. The pipeline shuts those dedicated simulators down afterward; other
simulators are left alone.

Apple's [App Preview specifications](https://developer.apple.com/help/app-store-connect/reference/app-information/app-preview-specifications)
require a 15–30 second video. This pipeline checks H.264, at most 30 fps,
the accepted portrait dimensions, stereo 48 kHz AAC, and the 500 MB file-size cap. The output
contains a silent stereo audio track; the app's own audio is not captured by
Maestro's screen recorder. If demonstration sound is needed, record it separately
and replace the silent track before submission.

Set `MAESTRO_BIN`, `PREVIEW_OUTPUT_DIR`, `PREVIEW_BUILD_DIR`, or
`PREVIEW_RUNTIME_ID` to override defaults. `PREVIEW_SKIP_BUILD=1` reuses an
existing Release `.app` in `PREVIEW_BUILD_DIR`.
