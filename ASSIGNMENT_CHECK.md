# Assignment check — October 22, 2026

Checked against all three pages of the assignment PDF. GitHub requirements are excluded from this review at the user's request.

| Requirement | Result and evidence |
|---|---|
| Required services only; no port 9000 or paid features | PASS: loaded endpoint routes match ports 9001, 9006, 9007, 9008; port 9000 rejected. ACE inventory identifies `acestep/acestep-v15-xl-turbo`. No other generation providers in app code. |
| Custom style, mood, duration; instrumental and vocal songs | PASS: controls and validation present. Prior browser vocal test succeeded. This audit generated Sunset Test, Jazz/Dreamy/instrumental/30 seconds from a freshly extracted ZIP. |
| Qwen-generated vocal lyrics | PASS: sample vocal lyrics and prior browser vocal generation use Qwen; lyrics recorded in sample manifest. |
| New, correctly associated FLUX covers | PASS: new audit track returned its own cover; all three bundled covers exist as 512×512 PNGs and have distinct hashes. |
| New songs join session library | PASS: extracted app library increased from three to four; audio and cover download routes worked. |
| Qwen commentary and Chatterbox default voice | PASS: extracted app returned song-specific text and 125,612 bytes of generated speech without reference upload. |
| MP3 and WAV voice references | PASS at API level: extracted app returned 133,292 bytes with an MP3 reference and 114,092 bytes with a WAV reference. Both references were original synthetic speech held only in memory. Browser file-picker workflow and perceptual similarity are not established by these checks. |
| Three ready-to-play samples with titles and covers | PASS: three MP3s and three PNGs included in ZIP; each MP3 is 480,812 bytes. Manifest includes titles, settings, AI lyrics, and correct paths. Previous browser playback successfully decoded samples. |
| Play/pause, skip, automatic queue, speech/music sequence | PASS from prior browser tests recorded in TESTING.md. Code uses a single audio element and invalidates late DJ responses when changing tracks. New browser evidence captured during this audit. |
| Status, understandable errors, recovery | PASS: generation stage text, retry after generation failure, and DJ retry/music-only controls present. Invalid-title integration test returned a recoverable validation error; later successful requests confirmed continued operation. |
| Source, dependencies, configuration examples, sample assets in ZIP | PASS: required files checked by name; source and ZIP copies matched before this audit's documentation updates. Extracted copy ran with Node and the external class endpoint file, with no dependency on the development `.env` or `data/`. |
| Credentials and references excluded | PASS: exact class key scan found no matches in the archive; `.env`, endpoint file, uploads, and runtime data excluded. Reference clips never saved. |
| README setup, use, screenshots, sample provenance | PASS: instructions cover Node, configuration, launch, core features, and sample generation. Interface screenshot plus DJ evidence included. |
| Inputs, expected/actual results, failure, design choice and limitation | PASS: TESTING.md, this checklist, and README describe actual results, single-player design, service latency, partial-generation behavior, and the investigated network failure. |
| Original starter prompt retained | PASS: complete original starter prompt text compared against BUILD_PROMPT.md. |

## Still needs your group

- A teammate must install the extracted ZIP using only the README and class credentials, exercise all three core features, and explain the results in the group's own words. Agent testing does not satisfy this human requirement.
- Listen to generated music and voice output to assess musical quality, vocal intelligibility, artwork relevance, and custom-voice similarity.
- Check the MP3/WAV browser file-selection workflow with an authorized reference. The backend accepted both formats; this does not prove the browser picker or voice resemblance.
- The assignment describes building through Hermes. This implementation was built in Codex and explicitly says so. Retaining the prompt does not establish that Hermes was used; confirm the instructor's expectations.

## Scope limits

No claim is made that all possible errors, every duration, every style/mood combination, or all browsers were tested. This audit verifies the listed inputs and packaging, not subjective quality or team participation. GitHub and repository submission checks were intentionally omitted.
