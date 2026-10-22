import { env } from "cloudflare:workers";

type Track = Record<string, unknown>;

function required(name: keyof Cloudflare.Env): string {
  const value = env[name];
  if (typeof value !== "string" || !value.trim()) throw new Error(`${name} is not configured`);
  return value.replace(/\/$/, "");
}

function headers() {
  return { Authorization: `Bearer ${required("CLASS_API_KEY")}`, "Content-Type": "application/json" };
}

async function checked(url: string, init: RequestInit, label: string) {
  const response = await fetch(url, init);
  if (!response.ok) {
    const text = (await response.text()).slice(0, 240);
    if (response.status === 401 || response.status === 403) throw new Error(`${label} rejected the configured credentials.`);
    if (response.status === 429) throw new Error(`${label} is busy. Please try again shortly.`);
    throw new Error(`${label} returned ${response.status}${text ? `: ${text}` : ""}`);
  }
  return response;
}

function clean(text: string) {
  return text.replace(/<think>[\s\S]*?<\/think>/g, "").split("</think>").pop()?.trim() || "";
}

function jsonFromText(text: string) {
  const cleaned = clean(text).replace(/^```(?:json)?|```$/gm, "").trim();
  try { return JSON.parse(cleaned); } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("The text service returned an unusable answer.");
    return JSON.parse(match[0]);
  }
}

async function qwen(system: string, user: string, maxTokens = 900) {
  const payload = {
    model: required("QWEN_MODEL"),
    messages: [{ role: "system", content: `${system}\nRespond with a single JSON object only.` }, { role: "user", content: user }],
    max_tokens: maxTokens,
    temperature: 0.8,
    chat_template_kwargs: { enable_thinking: false },
  };
  const response = await checked(`${required("QWEN_BASE_URL")}/chat/completions`, { method: "POST", headers: headers(), body: JSON.stringify(payload) }, "Qwen text service");
  const body = await response.json() as { choices: Array<{ message: { content: string } }> };
  return jsonFromText(body.choices[0]?.message?.content || "");
}

export async function writeSong(params: { style: string; mood: string; duration: number; vocal: boolean; artist?: string; theme?: string; title?: string }) {
  const influence = params.artist ? `\nArtist inspiration: ${params.artist}. Describe the reference using concrete, broad musical traits: drum character, instrumentation, harmony, arrangement, texture, dynamics, and production era. Do not copy any existing melody, lyric, recording, signature phrase, or distinctive voice.` : "";
  const brief = `Style: ${params.style}\nMood: ${params.mood}\nDuration: ${params.duration} seconds${influence}\nTheme: ${params.theme || "choose an original one"}\nRequested title: ${params.title || "invent one"}`;
  const data = params.vocal
    ? await qwen("Write wholly original song lyrics and, when an artist is supplied, a concise production profile based only on broad musical traits. Use [verse], [chorus], and optionally [bridge]. Keep lines short. Never quote, closely paraphrase, or continue an existing song, and never imitate a real singer's voice.", `${brief}\nReturn JSON: {"title":str,"theme":str,"lyrics":str,"production_profile":str}`, 1400)
    : await qwen("Name and describe a wholly original instrumental track and, when an artist is supplied, a concise production profile based only on broad musical traits. Never reproduce an existing melody or recording.", `${brief}\nReturn JSON: {"title":str,"theme":str,"production_profile":str}`, 500);
  const productionProfile = params.artist ? String(data.production_profile || "").replace(/\s+/g, " ").slice(0, 600) : "";
  return { title: String(params.title || data.title).slice(0, 80), theme: String(data.theme || params.theme || ""), lyrics: params.vocal ? String(data.lyrics || "") : "", productionProfile };
}

export async function writeCoverPrompt(track: Track) {
  const data = await qwen("Write a 40-70 word album-cover image prompt. Describe one striking scene, palette, lighting and art style. No text, logos, or real people.", `Title: ${track.title}\nStyle: ${track.style}\nMood: ${track.mood}\nTheme: ${track.theme}\nLyrics excerpt: ${String(track.lyrics || "").slice(0, 400)}\nReturn JSON: {"prompt":str}`, 300);
  return `${String(data.prompt)} Square album cover art, no text, no typography.`;
}

export async function generateCover(prompt: string) {
  const response = await checked(`${required("FLUX_BASE_URL")}/images/generations`, {
    method: "POST", headers: headers(), body: JSON.stringify({ model: required("FLUX_MODEL"), prompt, n: 1, size: "1024x1024", response_format: "b64_json", num_inference_steps: 8 }),
  }, "FLUX cover service");
  const body = await response.json() as { data: Array<{ b64_json?: string; url?: string }> };
  const item = body.data?.[0];
  if (item?.b64_json) return Uint8Array.from(atob(item.b64_json), c => c.charCodeAt(0));
  if (item?.url) return new Uint8Array(await (await checked(item.url, { headers: { Authorization: headers().Authorization } }, "FLUX image download")).arrayBuffer());
  throw new Error("FLUX cover service returned no image.");
}

export async function generateMusic(caption: string, lyrics: string, duration: number, referenceAudio?: File) {
  const base = required("ACESTEP_BASE_URL");
  const values = { prompt: caption, lyrics: lyrics.trim() || "[Instrumental]", audio_duration: duration, batch_size: 1, audio_format: "mp3", vocal_language: "en", thinking: false };
  let releaseInit: RequestInit;
  if (referenceAudio) {
    const form = new FormData();
    Object.entries(values).forEach(([key, value]) => form.append(key, String(value)));
    form.append("task_type", "text2music");
    form.append("audio_cover_strength", "0.25");
    form.append("reference_audio", referenceAudio, referenceAudio.name);
    releaseInit = { method: "POST", headers: { Authorization: headers().Authorization }, body: form };
  } else {
    releaseInit = { method: "POST", headers: headers(), body: JSON.stringify(values) };
  }
  const release = await checked(`${base}/release_task`, releaseInit, "ACE-Step music service");
  const released = await release.json() as Record<string, unknown>;
  const releaseData = (released.data || released) as Record<string, unknown>;
  const taskId = String(releaseData.task_id || "");
  if (!taskId) throw new Error("ACE-Step did not return a task id.");
  for (let waited = 0; waited < 900; waited += 3) {
    await new Promise(resolve => setTimeout(resolve, 3000));
    const query = await checked(`${base}/query_result`, { method: "POST", headers: headers(), body: JSON.stringify({ task_id_list: [taskId] }) }, "ACE-Step music service");
    const queried = await query.json() as Record<string, unknown>;
    const list = (queried.data || queried) as Array<Record<string, unknown>>;
    const item = list?.[0] || {};
    if (Number(item.status) === 0) continue;
    if (Number(item.status) === 2) throw new Error("ACE-Step reported that generation failed.");
    const result = typeof item.result === "string" ? JSON.parse(item.result) : item.result;
    const first = (result as Array<Record<string, unknown>>)?.[0];
    if (!first?.file) throw new Error("ACE-Step finished without an audio file.");
    const url = new URL(String(first.file), `${base}/`).toString();
    const audio = await checked(url, { headers: { Authorization: headers().Authorization } }, "ACE-Step audio download");
    return { bytes: new Uint8Array(await audio.arrayBuffer()), meta: first };
  }
  throw new Error("Music generation did not finish within 15 minutes.");
}

export async function writeDj(track: Track, previous?: Track) {
  const previousLine = previous ? `The previous song was ${previous.title} (${previous.style}).` : "This is the first song; welcome the listener.";
  const data = await qwen("You are a warm, upbeat radio DJ. Write plain spoken sentences with no stage directions. Never claim a real artist made the song.", `${previousLine}\nIntroduce ${track.title} in 2-3 sentences under 60 words. Style: ${track.style}. Mood: ${track.mood}. Theme: ${track.theme}.\nReturn JSON: {"script":str}`, 300);
  return String(data.script || "").replace(/[\*[\]#_]/g, "").slice(0, 600);
}

export async function speak(text: string, refAudio?: Uint8Array) {
  const payload: Record<string, unknown> = { model: required("CHATTERBOX_MODEL"), input: text, language_id: "en", response_format: "mp3" };
  if (refAudio) {
    let binary = "";
    for (const byte of refAudio) binary += String.fromCharCode(byte);
    payload.ref_audio = btoa(binary);
  }
  const response = await checked(`${required("CHATTERBOX_BASE_URL")}/v1/audio/speech`, { method: "POST", headers: headers(), body: JSON.stringify(payload) }, "Chatterbox voice service");
  return new Uint8Array(await response.arrayBuffer());
}
