# Fresh ZIP installation test — October 22, 2026

Source: ai-jukebox-ea491c92f1aceb55b6ecc9a21c386b1e58a8883c.zip downloaded from GitHub by the user.
Commit: ea491c92f1aceb55b6ecc9a21c386b1e58a8883c.
Test folder: <fresh extraction parent>/ai-jukebox-ea491c92f1aceb55b6ecc9a21c386b1e58a8883c.
Environment: Windows, Node 22.23.2, npm 12.0.2. Agent-assisted test; human listening and personal findings remain to be added by the teammate.

## Installation

The user extracted the ZIP. Before installation this folder had no node_modules, .dev.vars, or .wrangler state. No dependencies, compiled files, databases, or generated songs were copied from the existing development installation.

- npm ci: PASS, 682 packages installed. Deprecation and blocked install-script notices did not prevent build or launch.
- npm run build: PASS, all five stages completed.
- README local database migration: PASS, two SQL commands.
- node --test tests/interfaces.test.mjs: PASS, 1 test, 0 failures.
- Runtime configuration: PASS, problems: [].
- Local app: http://127.0.0.1:8788/jukebox. A different port prevents confusion with the development install on 8787.

### Documentation issue found

The plain README npm start command previously failed to load the root private variables when using the generated dist/server/wrangler.json. Use an explicit file argument:

```powershell
npm.cmd start -- --env-file "<absolute path to extracted project>/.dev.vars" --port 8788
```

Private configuration was recreated from the external class endpoint file in Git-ignored .dev.vars. No class keys or voice recordings are included in this report. Do not submit this installed folder as a new ZIP; it now contains local configuration and runtime state. Submit the original matching GitHub ZIP.

## Live integration results

| Test inputs | Expected | Actual |
|---|---|---|
| Three bundled samples | Music and cover files available | PASS: all three sample audio/cover pairs download successfully |
| Invalid duration: 5 seconds, Jazz/Chill/instrumental | Reject before generation; server remains usable | PASS: HTTP 400, Duration must be between 15 and 180 seconds; subsequent valid generation succeeded |
| ZIP Sunrise: Synth-pop/Hopeful/vocal/15 s | Lyrics, playable audio, matching new cover, library entry | PASS: done without warnings; AI lyrics present; audio and cover downloads successful; approximately 12 s generation |
| ZIP Rain: Smooth jazz/Chill/instrumental/15 s | Audio, matching new cover, library entry | PASS: done without warnings; no lyrics; audio and cover downloads successful; approximately 13 s generation |
| Default DJ: Golden Hour Map after Pencil Rain | Song-specific text and audio without upload | PASS: introduction names Golden Hour Map; 142,892 audio bytes |
| Invalid reference: invalid.txt | Clear rejection followed by successful valid upload | PASS: HTTP 400; subsequent MP3 and WAV requests succeeded |
| Synthetic MP3 reference upload and DJ | Reference saved, speech generated | PASS: 112,556 speech bytes returned |
| Synthetic WAV reference upload and DJ | Reference saved, speech generated | PASS: 123,692 speech bytes returned |
| Reset default voice | Stored reference removed | PASS: voice id null; reference removed from local bucket |

Reference clips were original class-generated synthetic speech. They were held in test-process memory, uploaded only to the local app/class service, and reset afterward. No personal recording was used. HTTP success does not establish subjective voice similarity.

## Teammate completion

Add your own name/date and listening findings after using this ZIP copy. Confirm audio quality, intelligible vocals, absence of vocals in the instrumental, artwork relevance, and reference voice resemblance. The API tests do not replace your personal findings or demonstrate the browser file-picker workflow.

## Browser checks on this ZIP copy

- PASS: generated ZIP Sunrise and ZIP Rain displayed with their covers in a five-track library.
- PASS: ZIP Sunrise music decoded with a 15-second duration and advancing currentTime.
- PASS: automatic advancement from ZIP Sunrise to the next DJ clip and ZIP Rain music, without another Play action.
- PASS: pause set audio.paused=true; resume set audio.paused=false and continued the ZIP Rain source.
- PASS: switched to Midnight Radio and Afterhours while playback continued; library and queue remained. Restored AI Jukebox afterward.
- Initial playback-label observation: the user later attributed this to browser sizing and requested exclusion from unresolved defects. No application fix is claimed.
- Later sections below document browser uploads and Skip checks. The user subsequently confirmed voice similarity was good.

Evidence screenshot: screenshots/zip-test-library.png.

No application source was changed and nothing was committed or pushed. The report is a local test artifact. Original downloaded ZIP remains the submission source for the tested commit.

## Skip retest

PASS: Skip during a DJ introduction starts that same track's music. PASS: Skip during music advances to the next queued track's DJ. PASS: immediate Skip after Play now bypasses DJ preparation and starts ZIP Rain. Skip is disabled when playback has ended; Play all fills the queue but a playback action is still needed. This implementation uses Skip to bypass the intro first, rather than always skip the whole track. No app source changed.


## Remaining checks and authorized personal WAV — October 22, 2026

- PASS browser invalid extension: invalid.txt produced Please choose an MP3 or WAV file.
- PASS browser recovery: synthetic-reference.mp3 selected through the visible Upload voice label and produced Custom voice set. Upcoming DJ intros will use it.
- PASS browser oversized file: an 11 MB test WAV produced That file is larger than 10 MB; the previous valid voice selection remained.
- Browser security declined a subsequent synthetic WAV upload. No workaround was attempted. The user then explicitly requested testing Recording.wav from their OneDrive Sound Recordings folder.
- PASS browser WAV: the authorized Recording.wav (921,682 bytes) uploaded through the picker and appeared as the selected custom voice. The app generated song-specific DJ text and successfully played /api/files/dj/5ca015b6359c.mp3 (16.2 seconds, advancing playback time), then continued into music. Voice resemblance needs a human listening assessment.
- PASS refresh: selected MP3 voice remained after browser reload. Generated songs remained available.
- PASS full process restart: five track IDs matched the pre-restart baseline; all ten song/cover URLs returned HTTP 200 with nonempty assets. Recording.wav remained selected after restart.
- PASS reset through browser: Use default changed the UI to Default voice / Back to the default voice. The personal source file in OneDrive was not edited or copied into repository source.
- PASS cover regeneration: ZIP Rain received regenerated artwork; its audio remained available and library count stayed at five.
- PASS credential-response checks: .dev.vars, .env and service-source URLs returned HTTP 404. API status and public scripts/pages contained no literal configured class key. This is not a proof against every possible credential exposure path.

Only local runtime files and this evidence report were added. Nothing was committed, pushed, or deployed.

## Browser form generation and duration check

PASS: entered ZIP Browser Test, Ambient/Calm/instrumental, requested 45 seconds through the browser form. Status moved from Generating lyrics, music, and cover art to Ready in library. The song automatically joined Up Next, music decoded in the browser with duration exactly 45 seconds, and playback started successfully. This complements the earlier 15-second generation checks.

## Final assessment

The tested ZIP installs, builds, launches locally, generates both song types and covers, plays queued DJ/music sequences, accepts MP3 and an explicitly authorized WAV through the browser, rejects invalid/oversized files, resets references, and retains generated media across restart. The startup configuration issue was corrected subsequently by the absolute-path local launcher. The user confirmed good voice similarity and requested exclusion of the playback display observation as browser sizing; forced class-service outages and every possible retry condition were not simulated. All original ZIP source files remain unchanged. No GitHub actions were performed.

## User confirmation and finalization

The user confirmed voice similarity was good on October 22, 2026. The user also reported the earlier manual test list passed and identified the Play/Pause display observation as an issue with their browser size, asking that it be ignored. These are user-reported findings, separate from agent observations above. The personal recording remains outside source and submission files; the app's stored reference was reset afterward. The screenshots contain interface evidence, not audio recordings.

The repository's npm start now uses a local launcher that resolves the absolute project-root .dev.vars path. This is a subsequent change to the tested ZIP and requires final-commit startup verification. The original application source was unchanged during the ZIP tests; this report's documentation and launch-script updates were made afterward. Other untested subjective quality judgments are not marked passed by inference.

## Finalization branch validation — October 22, 2026

On local branch codex/assignment-3-finalization:
- npm test: PASS, five tests covering interface switching, reserved-port rejection, embedded-credential rejection, same-origin media downloads, and upstream-error credential redaction/redirect prevention.
- npm run build: PASS, all five stages.
- Plain npm start: PASS, the absolute-path launcher loads root .dev.vars; /api/status returns problems: []. A relative --env-file argument alone was insufficient with the generated Wrangler configuration.
- Live regression: Finalization Check / Ambient / Calm / 15 seconds / instrumental: PASS, song and cover generated without warnings and both media downloads returned HTTP 200.
- Live Qwen/Chatterbox DJ for the regression track: PASS, text and playable audio response retrieved.

The initial redirect-hardening trial used a fetch mode unsupported by the edge runtime; it was replaced with manual redirect handling, rebuilt, and the live regression passed. No deployed final GitHub ZIP is claimed by these local-branch checks. After merging, record the final commit and verify startup from its exact GitHub ZIP.
