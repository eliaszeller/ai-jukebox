# Midnight Radio — AI Jukebox

A self-contained Node.js app that creates original songs, matching cover art, and a collection player with spoken AI DJ transitions. No paid APIs, external web assets, package dependencies, or bundled music are used.

## Open the local app

[Open Midnight Radio in Chrome or your browser](http://127.0.0.1:3001/#moods)

This localhost link opens the app running on your own computer; it is not a public deployment. Start the app on port 3001 before opening it. After configuring the class credentials as described below, run these commands in PowerShell from the app folder:

```powershell
$env:PORT = "3001"
npm start
```

If you start the app on its default port instead, open [localhost:3000](http://127.0.0.1:3000/).

## Mood playlists

Open **Mood playlists** for a recommendation based on the browser's local time and weekday. Morning (5–11 AM) is Slow Wake-Up; afternoon (11 AM–5 PM) is Find Your Flow; evening (5–10 PM) is Evening Unwind; overnight (10 PM–5 AM) is Late-Night Grind for studying. The day themes run from Sunday Reset through Monday Momentum, Tuesday Tunnel Vision, Wednesday Balance, Thursday Push, Friday Freedom, and Saturday Drift. Morning and study prompts prioritize quiet or steady instrumental music over the weekday theme.

Use the time/day selectors to plan ahead, or **Use right now** to return to the local clock. Recommendations refresh every minute, including when a new day begins. Playback never starts or changes itself when the clock changes. **Play this mood** starts the DJ or changes the next pick in your active session; it uses the DJ's selected music source, song length and generation limit. New originals require an enabled generation source and available class services.

As the DJ plays songs for that mood, their IDs are added to a playlist under **Your mood playlists**. **Replay** plays its saved available songs; **Continue** resumes curation for that mood; **Remove** removes the playlist membership without deleting any audio. Titles, song IDs and time/day preferences are stored only in this browser's local storage (up to 28 time/day combinations and 100 unique songs each). They persist across reloads on the same app address but do not sync across devices or ports; clearing browser storage removes them. If storage is blocked, playlists are kept for the current page session only. Deleted or unavailable songs are excluded from replay. Mood metadata and runtime audio are not included in GitHub or submission archives.

## Let the DJ take over

Open **Your DJ** in the sidebar. Tell it what you want to hear, choose a source, then select **Start DJ**. The DJ uses Qwen to choose music and Chatterbox to introduce it; new originals use ACE-Step and FLUX for music and matching cover art.

- **Library + new originals:** choose a fitting saved song or create a new one when the request calls for it.
- **My library only:** pick from playable songs already in this app. A small library may repeat songs after other options are exhausted.
- **New originals only:** compose each next song for your session, including when the library starts empty.
- **Send request:** change the next pick with text such as “more rap,” “calmer jazz,” or “instrumental synth for studying.” Your current song keeps playing while the next choice is updated.
- **More like this:** give positive feedback that informs subsequent choices. **New direction** (or the player's Next button) skips the current song and avoids it for the rest of the session.
- The DJ prepares one pick ahead while you listen, including its spoken introduction. An Up next panel explains why it was chosen. Generation and speech can still cause gaps if the class services take longer than the current song.
- Set a new-song length and a limit of 3, 10, or 25 generation attempts per session. After the limit, mixed mode continues from the library; new-originals-only mode pauses with a clear message. Stop and restart to change source, length, or limit.
- **End session**, the player's Stop button, or manually playing a library track ends autonomous DJ mode. A service call already underway may finish and save its song, but no later stages or picks are launched for that stopped session. Closing the tab ends polling; no continuing chain of generations runs in the background.

Taste feedback and listening context belong to the current session and reset on restart or page reload. Songs created by the DJ remain in your library. This is an original, request-led DJ experience inspired by Spotify's product design; it does not access Spotify's catalog, history, account, or DJ X voice. Requests are typed; microphone input is not included. Spoken hosting stays in English and uses Chatterbox's built-in voice. The AI DJ transitions checkbox controls manual collection playback; takeover mode prepares its own introductions automatically.

If generation fails, use **Retry next pick**. An incomplete original remains on the shelf and can be retried there. If only DJ speech fails, the song still plays with an on-screen notice. Keep the page and server open for continuous listening. Only one next pick is prepared per session, and the existing two-track generation limit is retained. Active sessions are held in server memory; restarting the server ends them. Generated DJ audio is stored in the excluded data directory alongside music and artwork.

## Run from the ZIP

1. Extract the ZIP and open a terminal in `ai-jukebox`.
2. Install Node.js 22.9 or newer (Node 22 LTS recommended).
3. Copy `.env.example` to `.env`. Set `CLASS_API_KEY` to the key supplied by your class. Never share this file.
4. Run `npm start`.
5. Open http://127.0.0.1:3000. The three bundled sample songs appear in **Your library** on first start (see [Sample songs](#sample-songs)).

No `npm install` or build step is needed. On Windows, copy the example with `Copy-Item .env.example .env`; on macOS/Linux use `cp .env.example .env`.

Instead of entering a key, remove `CLASS_API_KEY` from `.env` and set `CLASS_ENDPOINTS_FILE` to the absolute path of your original endpoint file, stored outside the app. For a Windows path use forward slashes, for example `C:/path/to/class-endpoints.txt`. The backend reads the key into memory. The endpoint file is never served or copied.

## Try all required features

1. Pick a Synth, Jazz, Rap, Punk, Pop, or Rock card for a starting preset, or describe your own song. The form also offers Hip-hop, R&B, Electronic / EDM, House, Country, Metal, Reggae, Folk, Classical, Lo-fi, and Ambient. Choose mood, length and tempo. Start with a 10-second test. Rap, Punk, Pop, and Rock cards enable vocals; Synth and Jazz start as instrumentals.
2. Leave Instrumental enabled, or disable it for vocals. Enter your original lyrics under the advanced options or leave blank for Qwen to write them. The language selector controls song vocals; the DJ speaks English.
3. Choose a cover direction and select Generate track & cover. Progress is shown on the shelf. Songs and artwork are generated with the same concept.
4. Create a second track (or use the samples). Enable AI DJ transitions, choose a personality, and select Play all. Playback follows creation order: introduction → song → spoken transition → next song.
5. DJ voice: by default the DJ speaks with Chatterbox's built-in voice and no upload is needed. To customize it, select **Upload DJ voice (MP3/WAV)** under the library heading and choose a 5–30 second recording you have permission to use (8 MB max). The status line confirms the reference; the next introduction is cloned from it. **Use default voice** switches back. The reference is held in server memory for the session only — it is never written to disk, logged, committed, or sent anywhere except the Chatterbox service.
6. Use pause, next, stop, the seek bar, and volume controls in the fixed bottom player. Volume is hidden on narrow screens; use device volume there. Search your library by title, genre, or mood, and use the sidebar for navigation or direct track playback. If the browser blocks autoplay after generation, press the bottom player’s Play button.
7. Download individual songs and covers; view lyrics or delete tracks from the shelf.

The library starts with the three sample songs. Generated tracks and metadata persist in `data/` across restarts. Failed music or image generation preserves the other result. Retry resumes an existing music task when available; a failed task starts fresh. Restarted generation is marked interrupted and can be resumed with Retry.

## Required service mapping

| Feature | Class service | API request |
|---|---|---|
| Song concepts, original lyrics, DJ script | Qwen3.6-35B-A3B, port 9001 | `POST /v1/chat/completions` |
| Matching cover | FLUX.2 klein 4B, port 9006 | `POST /v1/images/generations`, base64 image response |
| Song audio | ACE-Step 1.5 XL Turbo, port 9007 | `POST /release_task`, `POST /query_result`, then returned `/v1/audio` URL |
| Spoken DJ | Chatterbox Multilingual V3, port 9008 | `POST /v1/audio/speech`, model `chatterbox-v3`; optional `ref_audio` (base64 MP3/WAV) for voice cloning |

All connections use the supplied `dobolyi.com` class host. Music uses the class server's loaded default model. No requests go to port 9000. Authentication is added only by the backend. The browser accesses only this app's same-origin API and locally stored media.

Request formats were checked against the class services' live OpenAPI schemas and [ACE-Step API documentation](https://github.com/ace-step/ACE-Step-1.5/blob/main/docs/en/API.md). The speech schema is available at http://dobolyi.com:9008/openapi.json and the image schema at http://dobolyi.com:9006/openapi.json.

## Deploy on a server

Use a persistent Node.js host with outbound access to the four class ports. Static-only hosting cannot run the backend. Set `HOST=0.0.0.0`, a strong `APP_PASSWORD`, and `CLASS_API_KEY` in your host's secret environment settings. Put an HTTPS reverse proxy in front of port 3000. Browser sign-in accepts any username and the configured app password. Do not expose HTTP Basic authentication over public plaintext HTTP.

Set `DATA_DIR` to persistent storage if needed. Use one server process; this small classroom app shares one collection among authenticated visitors. It is not a multi-user account system. It limits music generation to two concurrent tracks, and waits up to about 20 minutes of polling plus individual request timeouts. DJ generation takes place before playback and may add a pause between songs. If speech fails, an error is shown and music continues.

Docker is optional:

```sh
docker build -t midnight-radio .
docker run --rm -p 127.0.0.1:3000:3000 --env-file .env -e HOST=0.0.0.0 -v midnight-radio-data:/app/data midnight-radio
```

Set `APP_PASSWORD` in `.env` before running the container. The Docker build context uses an allowlist; `.env`, media, and uploads are excluded. Mount a readable endpoint file separately if you use `CLASS_ENDPOINTS_FILE` instead of a key.

## Privacy and submission

- Keep `.env`, endpoint files, `data/`, uploads, and voice references out of source control and archives. `.gitignore` includes these exclusions.
- The only upload is the optional DJ voice reference. It is validated (MP3/WAV signature, 8 MB limit), kept in server memory for the running session, and forwarded only to Chatterbox as `ref_audio`. It is never saved to disk, so it cannot end up in GitHub or a submission archive. There are no third-party songs, lyrics, images, or voice samples in this package; the bundled samples were generated by the class services (see below).
- Creative prompts and generated text are sent to the class services for generation. Saved metadata and generated media stay in the server's data directory until deleted.
- Logs contain only the startup URL. Upstream error bodies and credentials are not logged or returned to the browser.
- Class connections use the HTTP URLs provided by the course. Use this within the class's intended network environment.
- To make another submission, use `npm run package`. The packager includes only an explicit source-file allowlist and rejects any file containing your configured class key.

## Sample songs

`samples/manifest.json` describes three songs (dreamy synth, happy pop with vocals, chill jazz). Their audio, titles, lyrics and covers are produced by the class endpoints with one command, run from the app folder with credentials in `.env`:

```sh
npm run samples
```

For each entry the script asks Qwen (port 9001) for a title, production caption, cover prompt and — for the vocal pop track — original lyrics; sends the caption and lyrics to ACE-Step (port 9007) for a 60-second render; and sends the cover prompt to FLUX (port 9006). It writes `samples/<id>.mp3` and `samples/<id>.png` and records the generated title, lyrics, prompts, timestamp and the model used for each step back into the manifest, so the provenance of every sample is in the repository. Pass one or more IDs to regenerate only those entries.

On startup the server copies any complete sample into `data/` and marks it `Sample` in the library. Deleting a sample writes a `.deleted` marker so it does not return on restart. The sample media and manifest are included in the submission ZIP by `npm run package`; nothing else from `data/` is.

> Status: the manifest in this branch has not yet been filled in — run `npm run samples` once with class credentials and commit the resulting `samples/` folder before submission.

## Test results

Inputs, expected behaviour and observed results. "Completed" rows were verified against the live class services on the dates in [Verification](#verification); "Unchecked" rows have automated coverage but have not been exercised against the live services from this branch yet.

| # | Feature | Input | Expected | Actual | Status |
|---|---|---|---|---|---|
| 1 | Custom song generation | Jazz preset, Chill, 10-second test, instrumental | Qwen concept, ACE-Step audio, track on shelf with play/download | Instrumental track generated and played (Oct 19) | Completed |
| 2 | Custom song generation (vocals) | Rap preset, Energetic, 30 s, Instrumental off, lyrics blank | Qwen writes original lyrics; track plays; Lyrics button shows them | Verified via automated `plan` tests (custom lyrics retained, instrumental override); live vocal render not re-checked on this branch | Unchecked |
| 3 | Matching cover art | Same request as #1, art direction "Cinematic abstract photography" | FLUX cover shown on the same card and in the player | Cover generated and displayed with the correct track (Oct 19) | Completed |
| 4 | Integrated AI DJ (default voice) | Two playable tracks, AI DJ transitions on, Play all | Qwen script → Chatterbox speech → song → next script → next song, no overlap | Playback completed through the second song with transitions (team browser test, see Verification) | Completed |
| 5 | Integrated AI DJ (custom voice) | Upload a 10-second WAV, then Play all | Status shows the file name; introductions use the cloned voice | Server validation, cache invalidation and `ref_audio` payload covered by automated tests; live clone not yet heard from this branch | Unchecked |
| 6 | Failure case: music service unavailable | Stop the ACE-Step service / invalid key, generate a track | Card shows a readable error with Retry; cover (if generated) is kept; Retry resumes | Automated tests: a failed task clears its ID so Retry starts fresh, and an HTTP 401 message never exposes the key. Not yet forced against the live service from this branch | Unchecked |
| 7 | Failure case: bad voice upload | Upload a `.txt` renamed to `.wav` | Rejected with "not a valid MP3 or WAV file"; the current voice is unchanged | Rejected as expected and a previously uploaded voice was kept (local HTTP check, Oct 22) | Completed |
| 8 | Sample library | First start after `npm run samples` | Three sample tracks with titles and covers, marked Sample, playable | Seeding, media serving and delete-marker behaviour verified with stand-in files (Oct 22); real generated samples pending | Unchecked |

Unresolved: the live clone quality with `ref_audio` has not been evaluated from this branch; long ACE-Step queues can still leave gaps between songs because introductions are prepared just before playback.

## Design judgment

**Choice: run music and cover generation in parallel and persist after both settle.** `generate()` in `server.mjs` launches ACE-Step and FLUX with `Promise.allSettled`, then saves the track. The alternative — sequential calls that fail fast — is simpler, but during testing the music queue was the slow, flaky part while FLUX returned in seconds. With allSettled a FLUX failure after a two-minute music render no longer throws the audio away: the card shows the error, and Retry only re-runs the missing half because `generate()` skips any branch whose result already exists. The evidence is the automated tests "resume uses existing task, and failed task clears ID for retry" and "music submits once, polls pending to completion", plus the `t.audio?null:…` / `t.cover?null:…` guards in `generate()` that make a retry reuse whichever half already succeeded. A forced live failure (stop one service mid-generation) is still on the list to record before submission.

**Limitation investigated: DJ speech cannot be pre-rendered for manual playback.** For manual Play all, the introduction is requested only when the previous song ends, so a slow Chatterbox call shows up as silence under "Preparing your DJ". We looked at pre-generating every introduction when a track is created, but the script depends on the *previous* track and the chosen personality, so the cache key (`previous|style|voice`) would be wrong most of the time. The compromise is a per-track cache of the last introduction plus one-pick-ahead preparation in autonomous DJ mode. What we learned: the correct unit to cache is the transition, not the track, and the voice reference has to be part of that key or an uploaded voice would silently replay an old default-voice intro.

## Screenshots

Add interface captures to `docs/` (they are picked up by `npm run package`): the home and library view with the sample songs, a generating card with its stage text, a finished card with cover art, the player during an AI DJ introduction, and the DJ voice upload status. Suggested names: `docs/01-library.png`, `docs/02-generating.png`, `docs/03-cover.png`, `docs/04-dj.png`, `docs/05-voice.png`.

## Verification

Run `npm test` for integration contract tests using simulated responses (no network or credentials needed). Tests cover asynchronous music polling, resume and failure behavior, off-origin credential protection, sanitized errors, lyrics handling, DJ speech payloads with and without a voice reference, voice-reference validation, autonomous selection, request changes, cancellation, feedback, session limits, and heartbeat expiry (22 tests).

Live verification on October 19, 2026 succeeded for Qwen song planning, a FLUX cover image, a 10-second ACE-Step instrumental, and a Qwen-written Chatterbox DJ introduction. Test media is excluded from this submission. Service availability and queue times may change.

The browser test also created two tracks and completed collection playback through the second song, with AI DJ transitions enabled. HTTP checks passed for audio byte ranges, invalid input rejection, blocked configuration-file access, and cross-origin write protection. All six automated tests passed again from an extracted submission ZIP.

Troubleshooting: HTTP 401 indicates an incorrect class key; connection errors suggest network restrictions or an unavailable service; HTTP 429 means a busy queue. Generation errors appear on the affected track with Retry. Keep the server running while jobs complete.

The refreshed interface uses a Spotify-inspired desktop layout with dark panels, sidebar navigation, green controls, genre cards, library search, and a custom bottom player. It retains Midnight Radio branding and has no Spotify account, assets, or API dependency. Browser checks confirmed the Rap preset, search filtering, sidebar playback, and seeking.

Autonomous DJ verification: all 15 automated checks passed. Live class-service checks created a new jazz original from an empty library, changed the next generated song to synth through a request, selected an existing track in library-only mode, generated spoken introductions, and confirmed session stopping. Browser verification confirmed session controls and automatic playback.

Mood-playlist verification: all 20 automated checks passed, including time boundaries, overnight behavior, all weekday themes, manual overrides, persistence serialization, duplicate handling, and invalid stored data.
