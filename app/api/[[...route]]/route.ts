import { env } from "cloudflare:workers";
import { generateCover, generateMusic, speak, writeCoverPrompt, writeDj, writeSong } from "@/lib/jukebox-services";

type Track = Record<string, any>;
type Context = { params: Promise<{ route?: string[] }> };

const samples: Track[] = [
  { id: "sample-golden-hour-map", title: "Golden Hour Map", style: "indie pop", mood: "hopeful", duration: 60, vocal: true, theme: "A hopeful first morning in a new city.", lyrics: "[verse]\nSunlight cuts the blinds\nDust motes dance and spin\nI haven't learned the streets\nBut I let them in\n\n[chorus]\nOh, the sky is wide open blue\nEverything feels brand new", audio_url: "/samples/audio/golden-hour-map.mp3", cover_url: "/samples/covers/golden-hour-map.png", sample: true },
  { id: "sample-pencil-rain", title: "Pencil Rain", style: "lo-fi hip hop", mood: "chill", duration: 60, vocal: false, theme: "A rainy afternoon of studying by the window.", lyrics: "", audio_url: "/samples/audio/pencil-rain.mp3", cover_url: "/samples/covers/pencil-rain.png", sample: true },
  { id: "sample-neon-tide", title: "Neon Tide", style: "synthwave", mood: "nostalgic", duration: 60, vocal: true, theme: "A midnight drive along the coast with the radio on.", lyrics: "[verse]\nWind blows cold\nOn empty roads\nNeon bleeds\nOn ocean nodes\n\n[chorus]\nDrive it home\nThrough the velvet night", audio_url: "/samples/audio/neon-tide.mp3", cover_url: "/samples/covers/neon-tide.png", sample: true },
];

function userId(request: Request) { return request.headers.get("oai-authenticated-user-id") || "owner"; }
function safeUser(id: string) { return id.replace(/[^a-zA-Z0-9_-]/g, "_"); }
function uid() { return crypto.randomUUID().replaceAll("-", "").slice(0, 12); }
function mp3Duration(bytes: Uint8Array) {
  let offset = 0;
  if (bytes.length > 10 && bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) {
    offset = 10 + ((bytes[6] & 0x7f) << 21) + ((bytes[7] & 0x7f) << 14) + ((bytes[8] & 0x7f) << 7) + (bytes[9] & 0x7f);
  }
  const mpeg1Layer3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320];
  const mpeg2Layer3 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160];
  for (let i = offset; i + 3 < bytes.length; i++) {
    if (bytes[i] !== 0xff || (bytes[i + 1] & 0xe0) !== 0xe0) continue;
    const version = (bytes[i + 1] >> 3) & 0x03;
    const layer = (bytes[i + 1] >> 1) & 0x03;
    const bitrateIndex = (bytes[i + 2] >> 4) & 0x0f;
    if (version === 1 || layer !== 1 || bitrateIndex === 0 || bitrateIndex === 15) continue;
    const bitrate = (version === 3 ? mpeg1Layer3 : mpeg2Layer3)[bitrateIndex];
    if (bitrate) return Math.max(1, Math.round(((bytes.length - i) * 8) / (bitrate * 1000) * 10) / 10);
  }
  return null;
}
function errorResponse(error: unknown, status = 500) {
  const message = error instanceof Error ? error.message : "Something unexpected went wrong.";
  return Response.json({ detail: message }, { status });
}
function bindings() {
  if (!env.DB || !env.BUCKET) throw new Error("Hosted storage is not configured.");
  return { db: env.DB, bucket: env.BUCKET };
}

async function tracksFor(user: string) {
  const { db } = bindings();
  const result = await db.prepare("SELECT payload FROM tracks WHERE user_id = ? ORDER BY created_at").bind(user).all<{ payload: string }>();
  return [...samples, ...result.results.map(row => JSON.parse(row.payload))];
}
async function trackFor(user: string, id: string) {
  const sample = samples.find(track => track.id === id);
  if (sample) return sample;
  const { db } = bindings();
  const row = await db.prepare("SELECT payload FROM tracks WHERE user_id = ? AND id = ?").bind(user, id).first<{ payload: string }>();
  return row ? JSON.parse(row.payload) as Track : null;
}
async function saveTrack(user: string, track: Track) {
  const { db } = bindings();
  await db.prepare("INSERT OR REPLACE INTO tracks (id, user_id, payload, created_at) VALUES (?, ?, ?, ?)").bind(track.id, user, JSON.stringify(track), track.created || Date.now()).run();
}

export async function GET(request: Request, context: Context) {
  try {
    const route = (await context.params).route || [];
    const user = userId(request);
    if (route[0] === "status") {
      const required = ["CLASS_API_KEY", "QWEN_BASE_URL", "QWEN_MODEL", "FLUX_BASE_URL", "FLUX_MODEL", "ACESTEP_BASE_URL", "CHATTERBOX_BASE_URL", "CHATTERBOX_MODEL"] as const;
      return Response.json({ problems: required.filter(key => !env[key]).map(key => `${key} is not configured`), min_duration: 15, max_duration: 180 });
    }
    if (route[0] === "library") return Response.json({ tracks: await tracksFor(user) });
    if (route[0] === "voice") {
      const { db } = bindings();
      const row = await db.prepare("SELECT value FROM settings WHERE user_id = ? AND key = 'voice'").bind(user).first<{ value: string }>();
      return Response.json(row ? JSON.parse(row.value) : { id: null, name: null });
    }
    if (route[0] === "files" && route[1]) {
      const { bucket } = bindings();
      const object = await bucket.get(`${safeUser(user)}/${route.slice(1).join("/")}`);
      if (!object) return new Response("Not found", { status: 404 });
      const headers = new Headers(); object.writeHttpMetadata(headers); headers.set("Cache-Control", "private, max-age=86400"); headers.set("Content-Length", String(object.size));
      return new Response(object.body, { headers });
    }
    return Response.json({ detail: "Unknown endpoint" }, { status: 404 });
  } catch (error) { return errorResponse(error); }
}

export async function POST(request: Request, context: Context) {
  try {
    const route = (await context.params).route || [];
    const user = userId(request);
    const { bucket, db } = bindings();
    if (route[0] === "songs") {
      const params = await request.json() as { style?: string; mood?: string; artist?: string; duration?: number; vocal?: boolean; theme?: string; title?: string };
      const style = String(params.style || "").trim(), mood = String(params.mood || "").trim(), artist = String(params.artist || "").trim().slice(0, 120), duration = Number(params.duration);
      if (style.length < 2 || mood.length < 2) return errorResponse(new Error("Style and mood are required."), 400);
      if (duration < 15 || duration > 180) return errorResponse(new Error("Duration must be between 15 and 180 seconds."), 400);
      const text = await writeSong({ style, mood, artist, duration, vocal: params.vocal !== false, theme: params.theme, title: params.title });
      const id = uid();
      const caption = `${style}, ${mood} mood${artist ? `, broad production and arrangement inspiration from ${artist} without copying any existing song or voice` : ""}${params.vocal === false ? ", instrumental" : ", original vocals"}`;
      const music = await generateMusic(caption, text.lyrics, duration);
      await bucket.put(`${safeUser(user)}/tracks/${id}/song.mp3`, music.bytes, { httpMetadata: { contentType: "audio/mpeg" } });
      const track: Track = { id, title: text.title, style, mood, artist: artist || null, duration, vocal: params.vocal !== false, theme: text.theme, lyrics: text.lyrics, caption, audio_url: `/api/files/tracks/${id}/song.mp3`, cover_url: null, cover_error: null, music_meta: music.meta, created: Date.now() };
      try {
        const prompt = await writeCoverPrompt(track); const cover = await generateCover(prompt);
        await bucket.put(`${safeUser(user)}/tracks/${id}/cover.png`, cover, { httpMetadata: { contentType: "image/png" } });
        track.cover_url = `/api/files/tracks/${id}/cover.png`; track.cover_prompt = prompt;
      } catch (error) { track.cover_error = error instanceof Error ? error.message : "Cover generation failed."; }
      await saveTrack(user, track);
      return Response.json({ id: uid(), kind: "song", params, state: track.cover_error ? "done_with_warning" : "done", step: "Done", error: track.cover_error, track_id: id, created: Date.now() });
    }
    if (route[0] === "tracks" && route[1] && route[2] === "cover") {
      const track = await trackFor(user, route[1]);
      if (!track) return errorResponse(new Error("Unknown track"), 404);
      const prompt = await writeCoverPrompt(track); const cover = await generateCover(prompt);
      await bucket.put(`${safeUser(user)}/tracks/${track.id}/cover.png`, cover, { httpMetadata: { contentType: "image/png" } });
      track.cover_url = `/api/files/tracks/${track.id}/cover.png?v=${Date.now()}`; track.cover_prompt = prompt; track.cover_error = null;
      await saveTrack(user, track);
      return Response.json({ id: uid(), kind: "cover", params: { track_id: track.id, title: track.title }, state: "done", step: "Done", track_id: track.id, created: Date.now() });
    }
    if (route[0] === "dj") {
      const payload = await request.json() as { track_id?: string; previous_id?: string };
      const track = payload.track_id ? await trackFor(user, payload.track_id) : null;
      const previous = payload.previous_id ? await trackFor(user, payload.previous_id) : null;
      if (!track) return errorResponse(new Error("Unknown track"), 404);
      const text = await writeDj(track, previous || undefined);
      const voice = await db.prepare("SELECT value FROM settings WHERE user_id = ? AND key = 'voice'").bind(user).first<{ value: string }>();
      let reference: Uint8Array | undefined;
      if (voice) { const object = await bucket.get(`${safeUser(user)}/voice/reference`); if (object) reference = new Uint8Array(await object.arrayBuffer()); }
      const audio = await speak(text, reference); const id = uid();
      await bucket.put(`${safeUser(user)}/dj/${id}.mp3`, audio, { httpMetadata: { contentType: "audio/mpeg" } });
      return Response.json({ text, audio_url: `/api/files/dj/${id}.mp3`, duration: mp3Duration(audio) });
    }
    if (route[0] === "voice") {
      const form = await request.formData(); const file = form.get("file");
      if (!(file instanceof File)) return errorResponse(new Error("Please choose an MP3 or WAV file."), 400);
      if (!/\.(mp3|wav)$/i.test(file.name) || file.size < 2000 || file.size > 10_000_000) return errorResponse(new Error("Upload a valid MP3 or WAV between 2 KB and 10 MB."), 400);
      const bytes = new Uint8Array(await file.arrayBuffer()); const id = uid();
      await bucket.put(`${safeUser(user)}/voice/reference`, bytes, { httpMetadata: { contentType: file.type || "application/octet-stream" } });
      const value = { id, name: file.name };
      await db.prepare("INSERT OR REPLACE INTO settings (user_id, key, value) VALUES (?, 'voice', ?)").bind(user, JSON.stringify(value)).run();
      return Response.json(value);
    }
    return Response.json({ detail: "Unknown endpoint" }, { status: 404 });
  } catch (error) { return errorResponse(error); }
}

export async function DELETE(request: Request, context: Context) {
  try {
    const route = (await context.params).route || [];
    if (route[0] !== "voice") return Response.json({ detail: "Unknown endpoint" }, { status: 404 });
    const user = userId(request); const { bucket, db } = bindings();
    await bucket.delete(`${safeUser(user)}/voice/reference`);
    await db.prepare("DELETE FROM settings WHERE user_id = ? AND key = 'voice'").bind(user).run();
    return Response.json({ id: null });
  } catch (error) { return errorResponse(error); }
}
