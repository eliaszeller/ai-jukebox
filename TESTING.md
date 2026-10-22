# Test record — October 22, 2026

## Completed

| Input / check | Expected | Actual |
|---|---|---|
| Mountain Morning / acoustic folk / hopeful / vocals / 30 s | Original lyrics, playable music, matching cover | Qwen returned verse and chorus; ACE-Step returned MP3; FLUX returned PNG. Included in samples. |
| After Hours / lo-fi / relaxed / instrumental / 30 s | Instrumental music and separate matching art | MP3 and PNG generated and included. |
| Neon Weekend / electronic / energetic / instrumental / 30 s | Instrumental music and separate matching art | MP3 and PNG generated and included. All three audio files and all three images have distinct hashes. |
| Live API: Sunset Test / Jazz / Dreamy / instrumental / 30 s | New track joins session library; media downloadable | Library grew from 3 to 4. Both generated media downloads succeeded. |
| Live API: DJ for Sunset Test, default voice | Qwen introduction and Chatterbox audio | Speech endpoint returned 139,436 bytes of audio. |
| Live API: DJ with previous track and synthetic MP3 reference | Voice-reference request succeeds | Chatterbox returned 135,596 bytes. Reference was a generated speech clip kept in memory; no recording saved. |
| Browser: Queue all → Play | DJ then music; automatic next track | Observed Mountain Morning introduction, then automatic transition to After Hours with a different song-specific introduction; later Neon Weekend introduction. One audio element is used throughout. |
| Browser: pause during DJ preparation | Speech remains paused when ready | Player showed play icon and 0:00 for ready Neon Weekend speech. |
| Browser: Golden Hour / lo-fi / relaxed / vocals / 30 s | Form creates a new vocal track and cover | Status changed from Writing the song to Added to your library; collection grew from 3 to 4 with cover and expandable lyrics. |
| Browser: queue After Hours and press Skip | Stop current item and load next track | Player switched from Neon Weekend to After Hours and began preparing its DJ introduction. |
| Failure: network-isolated server | Understandable error and recovery controls | Displayed Qwen connection failure, Retry DJ introduction, and Continue with music. Restarted with network access; normal DJ playback succeeded. |
| Invalid title through generation API | 400 with useful field error | Rejected without creating a generation job. Subsequent normal requests succeeded. |
| `node --test` | All local checks pass | 7 passed, 0 failed: validation, reserved port, numeric payload types, three sample asset pairs, private file protection, invalid request, cross-origin rejection. |
| Extracted local ZIP: `node --test tests/app.test.mjs` | Code and sample assets work without development-only files | 7 passed, 0 failed from extracted copy; no `.env` or generated runtime data included. This is an automated packaging check, not the required teammate installation. |

## Limits and checks still needed

- A teammate must independently install from a GitHub ZIP. This has not been performed by a teammate.
- Human listening is still needed to assess music quality, lyrical intelligibility, and how closely the custom voice resembles a reference. A successful HTTP response does not establish those subjective qualities.
- Custom references were tested through the extracted app API using synthetic MP3 and WAV clips. Both returned speech successfully. Browser file-picker selection and perceptual voice similarity remain unverified.
- Longer durations, alternate browsers, and all failure types have not been exhaustively tested.
- Screenshot evidence is in `screenshot.png` and `dj-evidence.png`. These illustrate the interface, generated covers, queue, and DJ commentary/player; they do not substitute for the executable app.

The follow-up audit in ASSIGNMENT_CHECK.md reran all seven local checks, independently launched the extracted local ZIP, repeated music/art/default-DJ/MP3-reference integration tests, and verified WAV-reference support. All listed checks passed. It also compares the deliverables against the full assignment, excluding GitHub requirements at the user's request.

## Commands

`node --test` performs local automated checks. `node check-live.mjs` exercises the running server with the class services. It creates a temporary session track and speech but stores no reference recording or credentials. Sample metadata and lyrics are in `samples/manifest.json`.
