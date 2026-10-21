# Afterhours acceptance checks

Verified 2026-10-21 using only the class services and the dependency-free app.

| Requirement | Evidence |
| --- | --- |
| Style, mood and duration; instrumental/vocal generation | Live ACE-Step output: a peaceful lo-fi instrumental (15.024 seconds) and joyful indie-pop vocal recording (30.024 seconds). Qwen returned original lyrics for the vocal song. Automated checks validate metadata and vocal lyrics, then save the generated recording to the library. |
| A new matching FLUX cover per custom song | Both live songs generated separate 768×768 covers. Visual inspection confirmed a misty green forest for the forest instrumental and a bicycle in golden sunrise light for the folk-pop theme. Automated checks confirm the correct image Blob stays attached to its track, including after retry. |
| Song-specific Qwen commentary spoken by Chatterbox | A live transition referenced the two songs and their sounds. Default-voice speech succeeded without a reference. Custom speech succeeded with both MP3 and WAV references. Reference recordings for these checks were synthesized using the class default voice and kept outside the project. |
| Play/pause, skip, automatic queue, no overlapping speech/music | Automated application-runtime tests exercise a two-track sequence: speech → music → speech → music. Media adapters assert that the other player is paused before every play call. Additional checks cover pause during pending speech, pause/resume during speech/music, skipping pending speech and ignoring a stale result. |
| Progress, errors and recovery | Studio reports planning/art/recording/save stages. Automated failure-and-retry checks confirm completed music/lyrics are reused when only cover generation fails. Failed DJ requests show a retry option while music continues. Invalid or oversized reference files are rejected without replacing a valid current voice. |
| Credentials and recording safeguards | Class credentials remain server-side. Voice references stay in memory for the current tab and go only to Chatterbox. Tests confirm references are absent from saved settings/library. Source archives exclude credentials, generated media, uploads and recordings. No bundled music, lyrics, art or voice samples. |

Run the 31 offline checks with `npm test`, then `npm run build` and `npm run validate`. API and application-runtime checks passed. Live model outputs were inspected as valid MP3 files and decoded covers. Browser-driven visual/layout and audible listening checks remain unverified because browser access was unavailable; the runtime tests use deterministic media and storage adapters rather than a real browser.

## Try the full flow

1. In **Song studio**, set a description, genre, mood and duration. Generate one instrumental and one vocal song (turn off **Instrumental only** and leave lyrics empty to get original AI lyrics).
2. Open **Your library** and confirm both songs have separate matching covers; play either song or use **Play collection**.
3. Open **Radio room** and tune in. First try the built-in default voice. Optionally choose an MP3 or WAV reference: 1–60 seconds, at most 8 MB. Refreshing clears the reference. **Use default voice** removes it immediately.
4. Let both tracks finish. The DJ introduction should finish before music starts, and the next queued track should start automatically with its own introduction. Try pausing during speech, pausing during music, and skipping.
5. If a service is busy, use the studio's **Try again** or radio's **Retry introduction**. Saved completed steps are reused. Download recordings to keep them before clearing browser storage.
