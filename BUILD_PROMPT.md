# Overarching Task: Build an AI Jukebox
Build an app that (1) generates customizable songs, (2) generates 
matching cover art, and (3) plays a song collection with AI-generated 
spoken DJ commentary between tracks.
# Required Class Services
- Qwen3.6-35B-A3B on port 9001 for text generation.
- FLUX.2 klein 4B on port 9006 for cover art.
- ACE-Step 1.5 XL Turbo on port 9007 for music.
- Chatterbox Multilingual V3 on port 9008 for DJ speech.
Use the supplied class-endpoints.txt for connection details, or ask our 
team if it is unavailable. Follow each service's documented request 
format. Use these class services for the required features. You may use 
other class endpoints for optional features, but the core app must work 
with class services and credentials alone. Do not use paid services for 
any app features, including optional features. Do not use port 9000 for 
app requests.
# Safeguards
- Keep credentials server-side and out of GitHub, submission archives, 
browser code, logs, and documentation. Use placeholders in configuration 
examples.
- Never commit user uploads or voice-reference recordings to GitHub or 
include them in submission archives.
- Do not bundle third-party music, lyrics, cover art, or voice samples 
with the app.

# Added simplicity requirements
Use one local Node.js server and one buildless HTML page. Use no external packages, paid services, or third-party bundled media. Keep keys in server memory loaded from an external class endpoint file or ignored .env. Include three generated samples, session library, sequential single-player DJ playback, retry controls, tests, and honest documentation.

Build provenance: implemented in Codex. Retained here for team review; no Hermes session is claimed.
