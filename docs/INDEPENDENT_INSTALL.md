# Independent GitHub ZIP Installation Test

This document records a clean-room install from the GitHub-generated ZIP rather than from the development checkout.

## Current main ZIP check — 2026-10-22

Tested application commit: `7e8aa385feb79cba6afe50ab0f8e2adc4e355d2c` (main at test time).
Source: https://github.com/eliaszeller/ai-jukebox/archive/7e8aa385feb79cba6afe50ab0f8e2adc4e355d2c.zip

This check was performed by the coding agent, not a teammate. It does not satisfy the human teammate requirement by itself.

Environment: macOS, Node `v26.7.0`, npm `11.19.0`. Extracted into a new temporary directory, without copying dependencies or runtime state from development.

| Check | Expected | Actual |
|---|---|---|
| Download and extract exact GitHub ZIP | Standalone source available | Passed |
| `npm ci` | Install using included lockfile | Passed; 684 packages installed; dependency deprecation/install-script notices did not block build |
| `npm run build` | Complete all five build stages | Passed |
| `node --test tests/interfaces.test.mjs` | Interface switching and saved preference pass | Passed, 1 test |
| README database initialization command | Create local tracks/settings tables | Passed, 2 SQL commands |
| `npm start` | Launch a loopback server | Passed, port 8787 |
| `GET /jukebox` | Serve app | HTTP 200 |
| `GET /api/library` | Serve fresh sample library | HTTP 200 |
| Sample MP3 download | Valid playable audio | HTTP 200; MPEG Layer III, 128 kbps, 48 kHz stereo |
| New song, cover, and spoken DJ generation | Complete with private class credentials | Not run in this clean-ZIP check |

Documentation correction found: the quick-start sequence previously omitted the database initialization step before `npm start`. The README now includes it and an explicit placeholder-only configuration block. This documentation revision does not change application code.

## Teammate procedure for the final main ZIP

1. On GitHub, open `main`, copy the final full commit SHA, and download that commit's ZIP. Record the SHA below. Do not use an existing development checkout.
2. Extract into a new folder. Follow README prerequisites, create `.dev.vars` privately from class documentation, install, build, initialize the local database, and launch. Never attach credentials, uploads, or voice recordings to the report.
3. Open `/jukebox`. Confirm the three samples have titles/covers and play. Change interfaces and verify the same library remains.
4. Generate a 15-second vocal song with style `Synth-Pop`, mood `Hopeful`, and theme `finishing our team project`. Record its title, whether original lyrics and playable audio appeared, and whether the displayed new cover matches the track.
5. Generate a 15-second instrumental (`Smooth Jazz`, `Chill`). Verify it joins the same library and plays.
6. Queue at least two songs. Verify default-voice spoken intros, automatic song advancement, no overlapping speech/music, pause/resume, skip, and progress during both speech and songs.
7. With a permitted MP3/WAV voice reference, verify an upcoming intro uses the custom voice; reset to default. Do not commit the recording.
8. Submit an invalid reference file and confirm an understandable error; then select a valid file or remove it and continue. Record expected and actual behavior. Also record any service failure/retry encountered rather than marking untested behavior passed.
9. Write your own findings and documentation corrections below. Submit them through your own PR and have a teammate review it. If problems remain, record them and retest after fixes.

| Field | Teammate entry (pending) |
|---|---|
| Name/date | |
| Exact final main commit SHA | |
| OS/Node/npm | |
| Install/build/database/launch | |
| Vocal inputs, expected, actual | |
| Instrumental inputs, expected, actual | |
| Matching cover expected/actual | |
| Queue, default DJ, pause/skip, overlap | |
| Custom voice/reset expected/actual | |
| Failure and recovery expected/actual | |
| Three UI/shared-library check | |
| Listening findings in your own words | |
| Problems found, corrections, retest | |
| PR and reviewer | |

## Historical automated independent-environment verification (EliasBranch)

- Status: **passed**
- Test date: 2026-10-21
- Source: `https://github.com/eliaszeller/ai-jukebox/archive/refs/heads/EliasBranch.zip`
- Environment: macOS, Node.js `v26.7.0`, npm `11.19.0`

Procedure and results:

  1. Download the GitHub ZIP.
     - Passed: the archive downloaded directly from GitHub without using the development checkout.
  2. Extract it into a newly created temporary directory outside the development checkout.
     - Passed: 143 repository files extracted into `/private/tmp/ai-jukebox-ziptest.pW9UYb/extracted/ai-jukebox-EliasBranch` before dependency installation.
  3. Verify safeguards and required files.
     - Passed: README, lockfile, test records, three screenshots, three sample MP3s, and three sample covers were present.
     - Passed: no `.dev.vars`, `.env`, committed voice reference, or literal class API key was found.
  4. Run `npm ci` using only the included lockfile.
     - Passed: 684 packages installed. npm emitted two package deprecation notices and its standard install-script review notice; neither prevented installation.
  5. Run `npm run build`.
     - Passed: all five vinext build phases completed and the `/` and `/api/:route*` routes were emitted.

This was a clean-room automated verification of the GitHub-generated ZIP. No application code, dependency, sample asset, credential, or endpoint address was added by the evidence record.

## Required teammate verification

The automated clean-room test does not replace the assignment’s explicit teammate requirement. Before Canvas submission, a teammate must independently repeat the steps using the README and class credentials, then add their own name, date, environment, results for all three core features, and any documentation corrections here through a pull request.

| Field | Teammate entry |
|---|---|
| Name | |
| Date | |
| Operating system and Node version | |
| `npm ci` | |
| `npm run build` | |
| Custom song generation | |
| Matching cover generation | |
| Default-voice DJ playback | |
| Voice-reference test, if authorized | |
| Failure case | |
| Documentation problems found/fixed | |
