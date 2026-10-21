# Independent GitHub ZIP Installation Test

This document records a clean-room install from the GitHub-generated ZIP rather than from the development checkout.

## Automated independent-environment verification

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
