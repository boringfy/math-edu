# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# The app ships on both platforms

Android and iOS are both real targets. Anything platform-specific — a native
module, a config plugin, a permission, a touch behaviour — has to be settled
for both, not just the one being built at the time.

# Tests

`cd frontend && npm test` runs four Jest projects:

| Project | What it holds | Runs |
| --- | --- | --- |
| `logic` | `src/lib`, `src/content` — grading, adaptation, sync, packs | once |
| `ios` | `src/screens`, `src/components`, `src/__tests__` | under `Platform.OS === 'ios'` |
| `android` | the same UI files | under `Platform.OS === 'android'` |
| `plugins` | `plugins/` — build-time config plugins, in plain Node | once |

So every screen test runs twice, once per platform, and
`src/__tests__/platform.test.tsx` holds what actually differs between the
two. Put generic behaviour in `logic`, where it runs once — a rule that only
holds on one platform belongs in the platform file with a reason beside it.
`npm run test:ios` / `test:android` / `test:logic` run one project.

`babel.config.js` exists because the per-platform Jest presets, unlike the
plain `jest-expo` one, do not inject Expo's Babel preset themselves.

Backend: `cd backend && npm test` (shared-code drift check, `tsc`, then vitest).

# Two difficulty systems, on purpose

`backend/src/content/lessonPools.ts` is the original 5x3 grid of (grade, tier).
It is **frozen**: it feeds the 60 authored lessons per grade, the packs baked
from it are pinned by `goldenHash.test.ts`, and the stop ids by
`stopIds.test.ts`. Don't re-tune it — a child mid-map keeps what they know.

`backend/src/factories/` is the ladder everything past those 60 lessons is
built from: one unbounded difficulty `d` (roughly `(grade-1)*3 + tier`, so the
old grid is d 1..15), with each factory's settings authored as a sparse ramp.
`ramps.test.ts` pins what every `d` means, because a child's progress is a `d`.

`backend/src/contract/`, `src/generators/` and `src/factories/` are copied
verbatim into `frontend/src/content/` by `npm run sync:shared`; the app builds
its own questions from them, so the copies must stay byte-identical and the
`--check` gate in `npm test` enforces it. Edit the backend original.
