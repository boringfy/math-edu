#!/usr/bin/env bash
# Record a real release build on clean, pipeline-owned iOS simulators.
set -euo pipefail

repo_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
output_dir="${PREVIEW_OUTPUT_DIR:-$repo_dir/store/appstore/previews/ios}"
build_dir="${PREVIEW_BUILD_DIR:-$repo_dir/.preview-build}"
maestro_bin="${MAESTRO_BIN:-maestro}"
export MAESTRO_DRIVER_STARTUP_TIMEOUT="${MAESTRO_DRIVER_STARTUP_TIMEOUT:-300000}"
runtime_id="${PREVIEW_RUNTIME_ID:-$(xcrun simctl list runtimes -j | jq -r '[.runtimes[] | select(.isAvailable and (.identifier | contains("iOS")))] | sort_by(.version | split(".") | map(tonumber)) | last | .identifier')}"
only="${1:-both}"

case "$only" in iphone|ipad|both) ;; *) echo "Usage: $0 [iphone|ipad|both]" >&2; exit 2 ;; esac
for tool in xcrun xcodebuild jq ffmpeg ffprobe "$maestro_bin"; do
  command -v "$tool" >/dev/null || { echo "Missing required tool: $tool" >&2; exit 2; }
done
test -n "$runtime_id" && test "$runtime_id" != null || { echo "No available iOS simulator runtime" >&2; exit 2; }
mkdir -p "$output_dir" "$build_dir"

app_path="$build_dir/Build/Products/Release-iphonesimulator/HaveFunLearning.app"
if [[ "${PREVIEW_SKIP_BUILD:-0}" != 1 ]]; then
  if [[ ! -d "$repo_dir/frontend/ios/HaveFunLearning.xcworkspace" ]]; then
    command -v pod >/dev/null || { echo "CocoaPods is required to generate the iOS project" >&2; exit 2; }
    echo "Generating the iOS project and installing CocoaPods..."
    (cd "$repo_dir/frontend" && npx expo prebuild --platform ios --no-install)
    (cd "$repo_dir/frontend/ios" && pod install)
  fi
  echo "Building iOS Release app..."
  if ! (cd "$repo_dir/frontend/ios" && xcodebuild -workspace HaveFunLearning.xcworkspace \
    -scheme HaveFunLearning -configuration Release -sdk iphonesimulator \
    -destination 'generic/platform=iOS Simulator' -derivedDataPath "$build_dir" \
    "ARCHS=$(uname -m)" CODE_SIGNING_ALLOWED=NO build >"$build_dir/xcodebuild.log" 2>&1); then
    tail -80 "$build_dir/xcodebuild.log" >&2
    exit 1
  fi
fi
test -d "$app_path" || { echo "App not found: $app_path" >&2; exit 1; }

simulator_id() {
  local name="$1" type="$2" existing
  existing="$(xcrun simctl list devices -j | jq -r --arg name "$name" --arg runtime "$runtime_id" '.devices[$runtime][]? | select(.name == $name) | .udid' | head -1)"
  if [[ -n "$existing" ]]; then
    echo "$existing"
  else
    xcrun simctl create "$name" "$type" "$runtime_id"
  fi
}

validate_preview() {
  local path="$1" width="$2" height="$3" metadata audio_metadata duration size codec fps dimensions
  metadata="$(ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,width,height,r_frame_rate -show_entries format=duration,size -of json "$path")"
  duration="$(jq -r '.format.duration | tonumber' <<<"$metadata")"
  size="$(jq -r '.format.size | tonumber' <<<"$metadata")"
  codec="$(jq -r '.streams[0].codec_name' <<<"$metadata")"
  fps="$(jq -r '.streams[0].r_frame_rate | split("/") | (.[0] | tonumber) / (.[1] | tonumber)' <<<"$metadata")"
  dimensions="$(jq -r '.streams[0] | "\(.width)x\(.height)"' <<<"$metadata")"
  jq -en --argjson d "$duration" --argjson s "$size" --argjson f "$fps" \
    --arg c "$codec" --arg dimensions "$dimensions" --arg expected "${width}x${height}" \
    '$d >= 15 and $d <= 30 and $s <= 500000000 and $f <= 30 and $c == "h264" and $dimensions == $expected' >/dev/null || {
      echo "App Preview validation failed: $path ($duration s, $dimensions, $codec, $fps fps, $size bytes)" >&2
      exit 1
    }
  audio_metadata="$(ffprobe -v error -select_streams a:0 -show_entries stream=codec_name,sample_rate,channels -of json "$path")"
  jq -en --argjson a "$audio_metadata" \
    '$a.streams[0].codec_name == "aac" and $a.streams[0].sample_rate == "48000" and $a.streams[0].channels == 2' >/dev/null || {
      echo "App Preview must contain stereo 48 kHz AAC audio: $path" >&2
      exit 1
    }
  echo "Validated $path ($duration s, $dimensions, $codec, $fps fps, $size bytes)"
}

record_device() {
  local kind="$1" name="$2" type="$3" width="$4" height="$5" udid raw final maestro_dir raw_duration
  udid="$(simulator_id "$name" "$type")"
  echo "Using $name ($udid)"
  if [[ "$(xcrun simctl list devices -j | jq -r --arg udid "$udid" '.devices[][] | select(.udid == $udid) | .state')" != Booted ]]; then
    xcrun simctl boot "$udid"
  fi
  xcrun simctl bootstatus "$udid" -b
  xcrun simctl ui "$udid" appearance light
  xcrun simctl status_bar "$udid" override --time '9:41' --dataNetwork wifi --wifiMode active \
    --wifiBars 3 --batteryState charged --batteryLevel 100
  # These devices are created exclusively for this pipeline; removing the app
  # makes the review tour deterministic without touching another simulator.
  xcrun simctl uninstall "$udid" com.hashfront.mathedu >/dev/null 2>&1 || true
  xcrun simctl install "$udid" "$app_path"
  # Launch directly: Maestro's launchApp implicitly grants every permission,
  # which is unnecessary for the tour and can stall on simulator privacy APIs.
  xcrun simctl launch "$udid" com.hashfront.mathedu
  MAESTRO_CLI_NO_ANALYTICS=1 MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED=true \
    "$maestro_bin" test --device "$udid" "$repo_dir/store/appstore/preview/prepare.yaml"

  maestro_dir="$(mktemp -d "$build_dir/maestro-${kind}.XXXXXX")"
  final="$output_dir/have-fun-learning-${kind}.mp4"
  MAESTRO_CLI_NO_ANALYTICS=1 MAESTRO_CLI_ANALYSIS_NOTIFICATION_DISABLED=true \
    "$maestro_bin" test --device "$udid" --test-output-dir "$maestro_dir" \
    "$repo_dir/store/appstore/preview/tour.yaml"
  raw="$(find "$maestro_dir" -path '*/startRecording/app-tour.mp4' -print -quit)"
  test -n "$raw" && test -s "$raw" || { echo "Maestro did not produce a recording" >&2; exit 1; }
  raw_duration="$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$raw")"
  jq -en --argjson d "$raw_duration" '$d >= 15 and $d <= 30' >/dev/null || {
    echo "Recorded tour is $raw_duration seconds; adjust tour.yaml to stay within Apple's 15–30 second limit" >&2
    exit 1
  }

  # App Store Connect's accepted sizes are 886x1920 for 6.9-inch iPhone and
  # 1200x1600 for 13-inch iPad. Add a silent stereo AAC track for compatibility.
  ffmpeg -hide_banner -loglevel error -y -i "$raw" \
    -f lavfi -i anullsrc=channel_layout=stereo:sample_rate=48000 \
    -vf "scale=${width}:${height},fps=30" -shortest \
    -c:v libx264 -pix_fmt yuv420p -profile:v high -crf 18 -maxrate 12M -bufsize 24M \
    -c:a aac -b:a 192k -movflags +faststart "$final"
  validate_preview "$final" "$width" "$height"
  echo "Review video: $final"
  xcrun simctl shutdown "$udid" || true
}

if [[ "$only" == iphone || "$only" == both ]]; then
  record_device iphone 'Math Edu Preview iPhone' \
    com.apple.CoreSimulator.SimDeviceType.iPhone-17-Pro-Max 886 1920
fi
if [[ "$only" == ipad || "$only" == both ]]; then
  record_device ipad 'Math Edu Preview iPad' \
    com.apple.CoreSimulator.SimDeviceType.iPad-Pro-13-inch-M5-12GB 1200 1600
fi
