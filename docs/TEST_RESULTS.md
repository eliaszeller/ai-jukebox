# AI Jukebox Test Results

Test date: 2026-10-21  
Target: `https://ai-jukebox.eliaszeller2.chatgpt.site`  
Deployment version at test start: 9

These are completed tests, not screenshots or unchecked feature claims. Requests were made against the deployed application without exposing the class API key.

## Summary

| Test | Expected | Actual | Result |
|---|---|---|---|
| Runtime configuration | No missing service variables | `problems: []`; supported duration 15–180 seconds | Pass |
| Bundled library | Three ready-to-play samples | Golden Hour Map, Pencil Rain, Neon Tide | Pass |
| Vocal song + cover | Original lyrics, playable MP3, new cover, saved library track | “Evidence Sunrise” completed with no warning; MP3 and 1024×1024 PNG retrieved; library count changed 3→4 for the tested anonymous library | Pass |
| AI DJ | Song-specific Qwen text and Chatterbox audio | 37-word Golden Hour Map introduction and valid mono MP3 retrieved | Pass |
| Validation failure | Reject duration below 15 seconds with understandable message | HTTP 400: `Duration must be between 15 and 180 seconds.` | Pass |
| Production build | Deployable build completes | `npm run build` exited 0 | Pass |

## Test 1 — configuration and samples

Input:

```http
GET /api/status
GET /api/library
```

Expected:

- No missing class-service variables.
- Minimum and maximum duration exposed to the interface.
- Three committed sample tracks present with playable URLs and covers.

Actual:

```json
{
  "problems": [],
  "min_duration": 15,
  "max_duration": 180
}
```

The library returned exactly three initial tracks: `Golden Hour Map`, `Pencil Rain`, and `Neon Tide`. Their six committed assets also exist under `public/samples/audio/` and `public/samples/covers/`.

## Test 2 — vocal song, lyrics, music, cover, and persistence

Input:

```json
{
  "style": "synth-pop",
  "mood": "uplifting",
  "duration": 15,
  "vocal": true,
  "theme": "finishing a difficult team project together",
  "title": "Evidence Sunrise"
}
```

Expected:

- Qwen produces original lyrics.
- ACE-Step produces a 15-second playable MP3.
- FLUX produces a matching square cover.
- The completed track is stored and appears in the tested library.

Actual API result:

```json
{
  "kind": "song",
  "state": "done",
  "step": "Done",
  "error": null,
  "track_id": "4fb397cb052a"
}
```

Generated lyrics:

```text
[verse]
Late nights fade
Code aligns
We made the grade
Chaos declines

[chorus]
Sunrise breaks
Shadows flee
Together we
Set it free
```

Asset inspection:

```text
song.mp3: MPEG Layer III, 128 kbps, 48 kHz, stereo
cover.png: PNG, 1024×1024, RGB
```

The generated cover is preserved as [`screenshots/evidence-sunrise-cover.png`](screenshots/evidence-sunrise-cover.png). The generated MP3 is runtime test data and is intentionally not committed.

## Test 3 — Qwen DJ script and Chatterbox speech

Input:

```json
{
  "track_id": "sample-golden-hour-map",
  "previous_id": null
}
```

Expected:

- Qwen writes an introduction specific to the selected track.
- Chatterbox returns a playable MP3 using the default voice.

Actual text:

> Good morning, sunshine! I’m thrilled to kick off our day with Golden Hour Map. Their indie pop vibes capture that fresh start feeling perfectly. Let’s ride this wave of hope together.

The returned audio URL responded HTTP 200 with `content-type: audio/mpeg`. File inspection reported MPEG Layer III, 128 kbps, 24 kHz, mono.

## Test 4 — failure and recovery

Input:

```json
{
  "style": "indie pop",
  "mood": "hopeful",
  "duration": 5,
  "vocal": true,
  "theme": "test validation"
}
```

Expected: reject the request before calling generation services and provide a message the user can correct.

Actual:

```text
HTTP 400
{"detail":"Duration must be between 15 and 180 seconds."}
```

Result: pass. The user can move the duration slider into the documented 15–180 second range and submit again.

## Playback-sequencing evidence

The player uses one `<audio>` element and changes phase on its `ended` event:

```text
dj-loading → dj → song → next track
```

Because the song source is not loaded until the DJ clip ends, DJ speech and music cannot overlap. The same element also drives the bottom progress bar for both phases.

## Unchecked or human-required claims

- A custom voice-reference upload was validated at the file/type/size and storage-code level, but this test run did not commit or retain a real person’s voice sample. A team member should test only with audio they have permission to use.
- Listening quality is subjective. Automated checks verified valid playable audio files; a teammate should document a listening check.
- GitHub issues, pull requests, teammate contributions, and teammate reviews must be completed by the team in GitHub.

## Unresolved limitations

- `/api/songs` waits while polling the asynchronous ACE-Step task. A durable background queue would better tolerate long service delays or request interruption.
- Anonymous visitors share the fallback public library, while signed-in visitors have separate libraries. Classroom testing is supported, but a production multi-user deployment should require authentication.
