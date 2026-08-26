# Boring Quest — content backend

Bakes every question, story and puzzle into versioned packs, and serves them
to the app.

The app has no generators in it. Everything a child is asked comes from here,
which means new content — and new *kinds* of content — ship without anyone
installing an app update.

## How it works

**Immutable packs, one mutable manifest.** A pack's filename carries its
content hash, so publishing never overwrites anything and any pack URL can be
cached for a year. The manifest is the only thing that changes.

```
GET /v1/manifest?platform=android&appVersion=1.2.0
→ { manifestVersion, packs: [ { id, version, sha256, url, bytes,
                                schemaVersion, minAppVersion } ] }
   Cache-Control: max-age=300, must-revalidate   + ETag

GET /packs/math.g3.a3f9c2b41d08.json
   Cache-Control: public, max-age=31536000, immutable
```

Publishing is writing a new manifest. **Rolling back is putting the old one
back** — no rebuild, no restart, since the manifest is read from disk per
request.

Clients decide what to activate by comparing pack hashes, not the manifest
version. That is deliberate: a server rebuilt from a clean checkout has no
memory of what it published before and starts numbering again at 1, and a
rollback publishes a *lower* version on purpose. Neither must be mistaken for
"nothing new".

### 16 packs

| Pack | Holds |
| --- | --- |
| `math.g1` … `math.g5` | the 60-lesson catalog + question pools keyed `topic:tier` |
| `reading.g1` … `reading.g5` | the authored stories and their questions |
| `logic.g1` … `logic.g5` | the 60-set catalog + puzzle pools keyed `family:tier` |
| `rules` | coin rates, daily challenges, star thresholds, typed-entry share |

About 15.5MB in total, but roughly **1MB over the wire** — it is repetitive
JSON and gzips about 16:1. A child downloads only the grade they play.

### Determinism

Baking twice must produce byte-identical packs, or every bake would look like
new content and every device would re-download everything for nothing. So the
generators draw from a seeded PRNG (`generators/rng.ts`) rather than
`Math.random()`, and a test fails the build if `Math.random` reappears.

Pack versions are derived from the content hash: unchanged content keeps its
version. Rotate all content without editing a generator by changing the seed:

```bash
BAKE_SEED=2026-09-01 npm run bake
```

### The one thing that must never break

Progress on a device is stored against a map stop's id. Content now ships
over the air, so an edit here reaches a child who is thirty stops into grade
3 — and inserting a story in the middle would shift every id after it and
silently reset their map.

So the ordered id list of all fifteen maps is pinned in
`test/__snapshots__/`. **Appending is fine. Reordering, removing or
renumbering fails the build.** If a change there is genuinely intended:

```bash
npm test -- -u
```

## Commands

| Command | What it does |
| --- | --- |
| `npm run bake` | Build packs + manifest into `dist/` |
| `npm run seed` | Build the shallower copy bundled into the app |
| `npm run serve` | Serve `dist/` on `:8787` |
| `npm run sync:contract` | Copy `src/contract/` into the app |
| `npm test` | Contract drift check, then the suite |
| `npm run typecheck` | `tsc --noEmit` |

## Layout

```
src/
  contract/     types shared with the app — the source of truth
  content/      authored stories, lesson and puzzle catalogs, rules
  generators/   the question generators, moved out of the app
  bake/         bake.ts, seed.ts, pools.ts, syncContract.ts, config.ts
  server/       app.ts (routes) + index.ts (listener)
```

`src/contract/` is owned here and copied into
`frontend/src/content/contract/`. Never edit the copy — `npm test` fails if
it has drifted.

## Running it

The image bakes the content during the build, so a container either starts
with a complete, verified set or fails to build. Nothing is generated on a
running server.

```bash
docker build -f backend/Dockerfile -t math-edu-content .      # from the repo root
docker run -d --name math-edu-content --restart unless-stopped \
  -p 8788:8787 math-edu-content
curl localhost:8788/healthz
```

`--restart unless-stopped` brings it back after a reboot. The container
listens on 8787 inside; map it to whatever is free outside.

To publish new content, rebuild the image and replace the container. Devices
pick it up on their next check and play it after their next restart.

### Pointing the app at it

The app is built against a fixed URL, so this is a build-time decision:

```bash
EXPO_PUBLIC_CONTENT_URL=http://192.168.0.113:8788 npm run android
```

Over plain HTTP, `plugins/withContentCleartext.js` permits cleartext for that
one host — Android blocks it by default in release builds, and without the
exemption every update check fails silently. Built with no URL, the app runs
on its bundled content and never touches the network.

Settings ▸ Content in the app shows which version is live, when it last
checked, and has a "Check now" button that skips the six-hour throttle.

## Adding content

1. Edit `src/content/` (a story, a lesson spec) or `src/generators/`
   (a new question kind) — **append, never reorder**.
2. `npm test` — the snapshot confirms no ids moved.
3. `npm run bake` — only genuinely changed packs get a new version.
4. Deploy `dist/`. Apps pick it up on their next check and play it after
   their next restart.

If new content needs a renderer only newer apps have, raise `minAppVersion`
in `bake/config.ts`. Older apps then keep the last pack they can draw instead
of breaking.
