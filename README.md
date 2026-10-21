# Afterhours — AI Jukebox

A Spotify-inspired listening space for original AI music. Describe a song, customize its genre, mood, tempo, length, vocals, lyrics and cover style, then save it to a browser-local library. Radio mode generates fresh spoken introductions between tracks.

## Run locally

Requires Node.js 22 or later. No packages, paid services, external fonts, or bundled media are required.

```sh
npm run dev -- --endpoints /absolute/path/to/class-endpoints.txt
```

Open `http://127.0.0.1:4173`. The local server reads the class credential into memory; it does not copy the endpoint file. Alternatively, set `CLASS_API_KEY` in your shell and run `npm run dev`. Use a secret manager or your shell's secure input mechanism for the real value. `.env.example` contains placeholders only; the development server does not automatically load `.env` files.

Optional environment variables `TEXT_BASE_URL`, `ART_BASE_URL`, `MUSIC_BASE_URL`, and `SPEECH_BASE_URL` change the service host. Each must use its corresponding required port. `PORT` changes the local app port.

## Service contracts

| Feature | Class service | Request |
| --- | --- | --- |
| Song plan, original lyrics and DJ script | Qwen3.6-35B-A3B, 9001 | `POST /v1/chat/completions` |
| Matching cover art | FLUX.2 klein 4B, 9006 | `POST /v1/images/generations`, `b64_json` output |
| Original music | ACE-Step 1.5 XL Turbo, 9007 | `POST /release_task`, poll `POST /query_result`, download `GET /v1/audio` |
| Spoken DJ introduction | Chatterbox Multilingual V3, 9008 | `POST /v1/audio/speech`, model `chatterbox-v3`, built-in default voice |

Server credentials are sent only to the configured class service origins. The app never calls port 9000. No paid generation APIs or browser speech fallback are used. ACE-Step uses the server's default configured XL Turbo model, one track per task, with its documented asynchronous API. Class queues can increase generation time.

The request schemas were checked against the running class servers. Reference documentation: [ACE-Step API](https://github.com/ace-step/ACE-Step-1.5/blob/main/docs/en/API.md), [vLLM](https://docs.vllm.ai/en/latest/), and [vLLM-Omni](https://docs.vllm.ai/projects/vllm-omni/en/latest/). Chatterbox uses the class server's custom OpenAPI schema.

## Listening and storage

- Discover offers four editable creative presets. These are descriptions and original CSS illustrations, not bundled songs or model-generated covers.
- Song studio generates a plan, then music and artwork concurrently. Progress and completed audio/artwork are saved in IndexedDB. Refreshing resumes the same music task. Retry reuses completed generation steps.
- Your library supports search, liked tracks, details, original lyrics, downloads and deletion.
- Playback supports seeking, previous/next, shuffle, repeat and volume.
- Radio mode writes and voices an introduction before each track. Select a personality and language, and optionally upload an MP3 or WAV voice reference. Personality changes affect writing, pacing and expression; they do not select a different speaker identity. You can pause or skip speech. If a DJ service fails, the track still plays and an error with a retry control is shown. Pausing while an introduction is pending keeps speech and music paused until you resume.
- Recordings and artwork are kept in IndexedDB on the current browser and origin. They do not sync across devices or between the local and hosted app. Clearing site data removes the library. Download songs you want to keep.
- The library is initially empty. The app bundles no third-party music, lyrics, artwork or voice samples. Radio room accepts an optional MP3 or WAV voice reference (1–60 seconds, at most 8 MB), or uses the built-in default voice without an upload. References remain in tab memory, are sent only to the class Chatterbox service, and are never saved in IndexedDB or written to the project. Refreshing restores the default voice. Use a recording you have permission to use.
- Generation is driven by an open browser tab. Reopening the app resumes a persisted task; sleeping devices and closed tabs can delay progress. Temporary class-generated audio links must still be available when a task resumes.

## Secrets and source hygiene

Store `CLASS_API_KEY` and a separate cryptographically random `MEDIA_SIGNING_KEY` as server-side hosting secrets. The local server creates its signing secret in memory. Never put credentials in `worker/index.js`, frontend code, URLs, screenshots, docs, or a submission archive. The app does not log credentials, prompts or upstream error bodies. Media downloads require server-signed, origin-restricted URLs. Cross-origin API requests are rejected.

Keep the deployed app owner-private. It relies on the Sites authentication boundary. Do not change it to public without adding server-side user authorization and usage limits. The local preview binds only to loopback.

`.gitignore` excludes environment files, endpoint files, generated audio, uploads and recordings. Deployment builds include only the Worker entrypoint and hosting manifest. Runtime media and credentials are never in the build. Voice-reference uploads exist only in memory and are excluded from source, builds and submission archives.

## Verify and build

```sh
npm test
npm run build
npm run validate
```

For an optional real-service check while the local server is running:

```sh
node scripts/smoke-live.mjs
```

This makes a short original recording, artwork and DJ clip using the four class services and writes test outputs only to `/tmp/afterhours-live-test`, outside the project. It prints a redacted result summary. It can take several minutes and is separate from the offline test suite.

## Hosting

`worker/index.js` is a dependency-free Cloudflare-compatible ES module. `scripts/dev.mjs` runs the same request handler locally. The Sites Worker ESM build copies it into `dist/server/index.js` with `.openai/hosting.json`. Set `CLASS_API_KEY` and `MEDIA_SIGNING_KEY` as runtime secrets before deploying. The private hosted version and local version use the same class services.
