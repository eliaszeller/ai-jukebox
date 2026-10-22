"use strict";
// AI Jukebox front end. All class-service calls go through our own server (/api/...).

const $ = (id) => document.getElementById(id);
const audio = $("audio");
const PLACEHOLDER = "/static/default-cover.svg";

let tracks = [];                 // library
let libraryFilter = "";
const byId = () => Object.fromEntries(tracks.map((t) => [t.id, t]));
let voiceId = "default";
const PLAY_COUNTS_KEY = "ai-jukebox-play-counts";
let playCounts = {};
try { playCounts = JSON.parse(localStorage.getItem(PLAY_COUNTS_KEY) || "{}"); } catch (_) {}

const comboGroups = {
  style: {
    "Pop": ["Dance Pop", "Indie Pop", "Synth-Pop", "Electropop", "Dream Pop", "Bedroom Pop", "Art Pop", "Hyperpop"],
    "Hip-Hop / Rap": ["Trap", "Boom Bap", "Drill", "Cloud Rap", "Lo-Fi Hip-Hop", "Conscious Hip-Hop", "Melodic Rap", "Alternative Hip-Hop"],
    "R&B / Soul": ["Contemporary R&B", "Alternative R&B", "Neo-Soul", "Soul", "Funk", "Quiet Storm", "New Jack Swing"],
    "Rock": ["Alternative Rock", "Indie Rock", "Classic Rock", "Hard Rock", "Soft Rock", "Psychedelic Rock", "Garage Rock"],
    "Electronic / EDM": ["House", "Deep House", "Tech House", "Progressive House", "Techno", "Trance", "Dubstep", "Drum and Bass", "Future Bass", "Melodic Techno"],
    "Country": ["Contemporary Country", "Country Pop", "Outlaw Country", "Americana", "Bluegrass", "Country Rock", "Alt-Country"],
    "Jazz": ["Smooth Jazz", "Bebop", "Cool Jazz", "Jazz Fusion", "Swing", "Vocal Jazz", "Acid Jazz"],
    "Blues": ["Delta Blues", "Chicago Blues", "Electric Blues", "Blues Rock", "Soul Blues"],
    "Folk / Acoustic": ["Indie Folk", "Contemporary Folk", "Singer-Songwriter", "Acoustic Pop", "Folk Rock"],
    "Latin": ["Reggaeton", "Latin Pop", "Bachata", "Salsa", "Merengue", "Cumbia", "Latin Trap", "Regional Mexican"],
    "Reggae / Caribbean": ["Roots Reggae", "Dancehall", "Dub", "Ska", "Soca", "Reggae Fusion"],
    "Metal": ["Heavy Metal", "Metalcore", "Death Metal", "Black Metal", "Progressive Metal", "Nu Metal"],
    "Punk / Alternative": ["Pop Punk", "Emo", "Post-Punk", "Hardcore Punk", "Grunge", "Shoegaze"],
    "Classical / Instrumental": ["Baroque", "Romantic Classical", "Contemporary Classical", "Minimalism", "Orchestral", "Cinematic Orchestral", "Solo Piano"],
    "Ambient / Experimental": ["Ambient", "Dark Ambient", "Drone", "Downtempo", "Trip-Hop", "Experimental Electronic"],
    "Global": ["Afrobeats", "Amapiano", "Afro House", "K-Pop", "J-Pop", "Highlife", "Bossa Nova"],
  },
  mood: {
    "Happy / Positive": ["Joyful", "Cheerful", "Uplifting", "Optimistic", "Playful", "Feel-Good", "Bright"],
    "Sad / Emotional": ["Melancholic", "Heartbroken", "Sorrowful", "Somber", "Bittersweet", "Tearful", "Reflective"],
    "Relaxed / Calm": ["Peaceful", "Mellow", "Chill", "Soothing", "Serene", "Tranquil", "Laid-Back"],
    "Energetic / Intense": ["High-Energy", "Powerful", "Explosive", "Aggressive", "Driving", "Adrenaline-Fueled", "Intense"],
    "Romantic / Intimate": ["Romantic", "Sensual", "Passionate", "Tender", "Intimate", "Warm", "Seductive"],
    "Dark / Mysterious": ["Dark", "Ominous", "Haunting", "Sinister", "Eerie", "Suspenseful", "Brooding", "Mysterious"],
    "Dreamy / Atmospheric": ["Ethereal", "Dreamy", "Hypnotic", "Floating", "Spacey", "Surreal", "Atmospheric"],
    "Confident / Empowering": ["Confident", "Bold", "Triumphant", "Empowering", "Defiant", "Motivational", "Victorious"],
    "Nostalgic / Sentimental": ["Nostalgic", "Wistful", "Sentimental", "Yearning", "Reflective", "Bittersweet"],
    "Party / Dance": ["Euphoric", "Festive", "Groovy", "Bouncy", "Upbeat", "Celebratory", "Carefree"],
    "Focus / Background": ["Minimal", "Unobtrusive", "Meditative", "Repetitive", "Gentle", "Contemplative"],
    "Epic / Cinematic": ["Epic", "Dramatic", "Heroic", "Grand", "Majestic", "Tense", "Inspirational", "Adventurous", "Emotional"],
    "Angry / Rebellious": ["Furious", "Hostile", "Rebellious", "Frustrated", "Raw", "Confrontational"],
    "Cool / Stylish": ["Smooth", "Suave", "Slick", "Sophisticated", "Sultry", "Effortless", "Soulful"],
    "Hopeful / Spiritual": ["Hopeful", "Reverent", "Spiritual", "Transcendent", "Healing", "Inspirational"],
  },
};

const recommendedMoods = {
  "deep house": ["Euphoric", "Hypnotic", "Groovy"], "alternative r&b": ["Sensual", "Dark", "Atmospheric"],
  "indie folk": ["Nostalgic", "Warm", "Reflective"], "trap": ["Aggressive", "Confident", "Dark"],
  "dream pop": ["Ethereal", "Dreamy", "Melancholic"], "country pop": ["Uplifting", "Romantic", "Carefree"],
  "lo-fi hip-hop": ["Mellow", "Nostalgic", "Peaceful"], "melodic techno": ["Hypnotic", "Dramatic", "Euphoric"],
  "neo-soul": ["Smooth", "Intimate", "Soulful"], "shoegaze": ["Dreamy", "Intense", "Wistful"],
  "afro house": ["Groovy", "Hypnotic", "Uplifting"], "cinematic orchestral": ["Epic", "Heroic", "Emotional"],
};

function setupCombobox(kind) {
  const root = document.querySelector(`[data-combo="${kind}"]`);
  const input = root.querySelector("input");
  const menu = root.querySelector(".combo-menu");
  const toggle = root.querySelector(".combo-toggle");
  let active = -1;

  function groups() {
    const query = input.value.trim().toLowerCase();
    const base = Object.entries(comboGroups[kind]).map(([label, values]) => [label, values.filter((value) => !query || value.toLowerCase().includes(query))]).filter(([, values]) => values.length);
    if (kind === "mood" && !query) {
      const matches = recommendedMoods[$("f-style").value.trim().toLowerCase()] || [];
      if (matches.length) return [["Recommended for this style", matches], ...base];
    }
    return base;
  }
  function options() {
    return groups().flatMap(([, values]) => values);
  }
  function render() {
    const visible = options();
    active = Math.min(active, visible.length - 1);
    let flatIndex = 0;
    menu.innerHTML = visible.length ? groups().map(([label, values]) => `<div class="combo-group"><div class="combo-group-label">${esc(label)}</div>${values.map((value) => { const index = flatIndex++; const selected = value.toLowerCase() === input.value.toLowerCase(); return `<button type="button" class="combo-option${index === active ? " active" : ""}${selected ? " selected" : ""}" role="option" aria-selected="${selected}" data-value="${esc(value)}">${esc(value)}</button>`; }).join("")}</div>`).join("") : '<div class="combo-empty">No matches — keep typing to use your own.</div>';
  }
  function open() { render(); root.classList.add("open"); input.setAttribute("aria-expanded", "true"); }
  function close() { root.classList.remove("open"); input.setAttribute("aria-expanded", "false"); active = -1; }
  function choose(value) { input.value = value; input.dispatchEvent(new Event("change", { bubbles: true })); close(); input.focus(); }

  toggle.addEventListener("click", () => root.classList.contains("open") ? close() : (input.focus(), open()));
  input.addEventListener("focus", open);
  input.addEventListener("input", () => { active = -1; open(); });
  input.addEventListener("keydown", (event) => {
    const visible = options();
    if (event.key === "ArrowDown") { event.preventDefault(); active = Math.min(active + 1, visible.length - 1); open(); }
    else if (event.key === "ArrowUp") { event.preventDefault(); active = Math.max(active - 1, 0); open(); }
    else if (event.key === "Enter" && active >= 0) { event.preventDefault(); choose(visible[active]); }
    else if (event.key === "Escape") close();
  });
  menu.addEventListener("mousedown", (event) => {
    const option = event.target.closest(".combo-option");
    if (option) { event.preventDefault(); choose(option.dataset.value); }
  });
  document.addEventListener("mousedown", (event) => { if (!root.contains(event.target)) close(); });
}

// ---------------------------------------------------------------- helpers
function toast(msg, isError = false) {
  const el = $("toast");
  el.textContent = msg;
  el.className = "toast show" + (isError ? " error" : "");
  clearTimeout(el._t);
  el._t = setTimeout(() => (el.className = "toast"), isError ? 7000 : 3500);
}
async function api(path, opts = {}) {
  let res;
  try {
    res = await fetch(path, opts);
  } catch (e) {
    throw new Error("Can't reach the Jukebox server. Is it still running?");
  }
  let body = null;
  try { body = await res.json(); } catch (_) {}
  if (!res.ok) {
    let msg = body && (body.error || body.detail);
    if (Array.isArray(msg)) msg = msg.map((d) => d.msg).join("; ");
    const err = new Error(msg || `Request failed (${res.status})`);
    err.body = body;
    throw err;
  }
  return body;
}
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const fmtDur = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;

// ---------------------------------------------------------------- library
async function loadLibrary() {
  const data = await api("/api/library");
  tracks = data.tracks;
  renderLibrary();
  renderQueue();
}

function renderLibrary() {
  $("lib-count").textContent = `(${tracks.length})`;
  const lib = $("library");
  if (!tracks.length) { lib.innerHTML = '<p class="muted">No songs yet.</p>'; return; }
  const current = player.queue[player.index];
  const shown = tracks.filter((t) => `${t.title} ${t.style} ${t.mood}`.toLowerCase().includes(libraryFilter));
  if (!shown.length) { lib.innerHTML = '<p class="muted">No matching songs.</p>'; return; }
  lib.innerHTML = shown.map((t) => `
    <article class="card ${t.id === current ? "playing" : ""}" data-id="${t.id}">
      <img src="${esc(t.cover_url || PLACEHOLDER)}" alt="Cover art for ${esc(t.title)}" loading="lazy">
      <div class="body">
        <div class="t">${esc(t.title)}</div>
        <div class="meta">${esc(t.style)} · ${esc(t.mood)} · ${fmtDur(t.duration)}</div>
        <div class="badges">
          <span class="badge">${t.vocal ? "Vocal" : "Instrumental"}</span>
          ${t.sample ? '<span class="badge sample">Sample</span>' : ""}
        </div>
        ${t.cover_error ? `<div class="err">Cover failed: ${esc(t.cover_error)}</div>` : ""}
        <div class="actions">
          <button data-act="play">Play now</button>
          <button data-act="queue">+ Queue</button>
          ${t.lyrics ? '<button data-act="lyrics">Lyrics</button>' : ""}
          ${!t.sample ? '<button data-act="cover">New cover</button>' : ""}
        </div>
      </div>
    </article>`).join("");
  renderHomeCards();
}

function renderHomeCards() {
  const top = $("home-top-tracks");
  const queue = $("home-queue");
  if (!top || !queue) return;
  const ranked = tracks.map((track, order) => ({ track, order, plays: Number(playCounts[track.id] || 0) }))
    .sort((a, b) => b.plays - a.plays || a.order - b.order).slice(0, 3);
  top.innerHTML = ranked.length ? ranked.map(({ track, plays }, index) => `
    <button class="home-track" data-home-play="${esc(track.id)}">
      <img src="${esc(track.cover_url || PLACEHOLDER)}" alt="" loading="lazy">
      <span class="home-track-copy"><strong>${index + 1}. ${esc(track.title)}</strong><span>${esc(track.style)}</span></span>
      <span class="home-track-stat">${plays ? `${plays} play${plays === 1 ? "" : "s"}` : "New"}</span>
    </button>`).join("") : '<p class="muted">Your top tracks will appear here.</p>';
  const start = Math.max(0, player.index);
  const upcoming = player.queue.slice(start, start + 3).map((id) => byId()[id]).filter(Boolean);
  queue.innerHTML = upcoming.length ? upcoming.map((track, index) => `
    <div class="home-track">
      <img src="${esc(track.cover_url || PLACEHOLDER)}" alt="" loading="lazy">
      <span class="home-track-copy"><strong>${esc(track.title)}</strong><span>${esc(track.mood)}</span></span>
      <span class="home-track-stat">${index === 0 && player.index >= 0 ? "Now" : `#${start + index + 1}`}</span>
    </div>`).join("") : '<p class="muted">Nothing queued yet. Press play to start your library.</p>';
}

$("home-top-tracks").addEventListener("click", (event) => {
  const track = event.target.closest("[data-home-play]");
  if (track) player.playNow(track.dataset.homePlay);
});

$("library").addEventListener("click", async (e) => {
  const btn = e.target.closest("button[data-act]");
  if (!btn) return;
  const id = btn.closest(".card").dataset.id;
  const t = byId()[id];
  const act = btn.dataset.act;
  if (act === "play") player.playNow(id);
  if (act === "queue") { player.enqueue(id); toast(`Queued “${t.title}”`); }
  if (act === "lyrics") {
    $("lyrics-title").textContent = t.title;
    $("lyrics-body").textContent = t.lyrics;
    $("lyrics-dialog").showModal();
  }
  if (act === "cover") {
    try {
      const job = await api(`/api/tracks/${id}/cover`, { method: "POST" });
      jobs.track(job);
      await loadLibrary();
    } catch (err) { toast(err.message, true); }
  }
});

// ---------------------------------------------------------------- player
// One <audio> element plays everything, strictly in sequence:
//   DJ intro for track i  ->  track i  ->  DJ intro for track i+1  ->  track i+1 ...
// `token` invalidates stale async work (e.g. a DJ clip that finishes loading after Skip).
const player = {
  queue: [], index: -1, phase: "idle", token: 0, paused: false, expectedDuration: 0, djCache: new Map(),

  key(i) { return `${this.queue[i]}|${this.queue[i - 1] || ""}|${voiceId}`; },

  fetchDJ(i) {
    const k = this.key(i);
    if (!this.djCache.has(k)) {
      const p = api("/api/dj", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ track_id: this.queue[i], previous_id: this.queue[i - 1] || null }),
      }).catch((err) => { this.djCache.delete(k); return { error: err.message, text: err.body && err.body.text }; });
      this.djCache.set(k, p);
    }
    return this.djCache.get(k);
  },

  async startAt(i) {
    const token = ++this.token;
    audio.pause();
    this.index = i;
    const t = byId()[this.queue[i]];
    if (!t) return this.next();
    this.setPhase("dj-loading", t);
    $("np-dj").textContent = "The DJ is writing an intro…";
    renderQueue(); renderLibrary();
    const dj = await this.fetchDJ(i);
    if (token !== this.token) return;          // user skipped / restarted meanwhile
    if (dj && dj.audio_url) {
      $("np-dj").textContent = `DJ: “${dj.text}”`;
      this.setPhase("dj", t);
      this.load(dj.audio_url, dj.duration);
    } else {
      $("np-dj").textContent = dj && dj.text ? `DJ (text only): “${dj.text}”` : "";
      toast(`DJ commentary unavailable, playing the song. ${dj && dj.error ? dj.error : ""}`, true);
      this.playSong(token);
    }
  },

  playSong(token = ++this.token) {
    this.token = token;
    const t = byId()[this.queue[this.index]];
    this.setPhase("song", t);
    playCounts[t.id] = Number(playCounts[t.id] || 0) + 1;
    localStorage.setItem(PLAY_COUNTS_KEY, JSON.stringify(playCounts));
    renderHomeCards();
    this.load(t.audio_url, t.duration);
    if (this.index + 1 < this.queue.length) this.fetchDJ(this.index + 1);   // prefetch next intro
  },

  load(src, expectedDuration = 0) {
    this.expectedDuration = Number(expectedDuration) > 0 ? Number(expectedDuration) : 0;
    updateProgress(0);
    audio.src = src;
    if (!this.paused) audio.play().catch((e) => {
      if (e.name === "NotAllowedError") { this.paused = true; updatePlayButton(); toast("Press play to start audio."); }
    });
  },

  next() {
    if (this.index + 1 < this.queue.length) return this.startAt(this.index + 1);
    ++this.token;
    audio.pause(); audio.removeAttribute("src"); this.expectedDuration = 0; updateProgress(0);
    this.index = this.queue.length;
    this.setPhase("ended");
    renderQueue(); renderLibrary();
  },

  skip() {
    if (this.phase === "dj" || this.phase === "dj-loading") return this.playSong();
    if (this.phase === "song") return this.next();
  },

  toggle() {
    if (this.phase === "idle" || this.phase === "ended") {
      if (this.index >= this.queue.length || !this.queue.length) { this.queue = tracks.map((t) => t.id); this.index = -1; }
      if (!this.queue.length) return toast("The library is empty.", true);
      this.paused = false;
      updatePlayButton();
      return this.startAt(0);
    }
    this.paused = !this.paused;
    if (this.paused) audio.pause();
    else if (audio.getAttribute("src")) audio.play().catch(() => {});
    updatePlayButton();
  },

  enqueue(id) {
    if (this.index >= this.queue.length) { this.queue = []; this.index = -1; }
    this.queue.push(id);
    renderQueue();
  },

  playNow(id) {
    if (this.index >= this.queue.length) { this.queue = []; this.index = -1; }
    this.queue.splice(this.index + 1, 0, id);
    this.paused = false;
    updatePlayButton();
    this.startAt(this.index + 1);
  },

  remove(pos) {
    if (pos === this.index) return this.skipToNextAfterRemove(pos);
    this.queue.splice(pos, 1);
    if (pos < this.index) this.index--;
    renderQueue();
  },

  skipToNextAfterRemove(pos) {
    this.queue.splice(pos, 1);
    this.index--;
    this.next();
  },

  setPhase(phase, t) {
    this.phase = phase;
    const playerBar = document.querySelector(".player-bar");
    const label = { idle: "Off air", "dj-loading": "DJ warming up", dj: "On air · DJ", song: "On air · Now playing", ended: "End of queue" }[phase];
    $("np-phase").textContent = label;
    $("np-phase").className = "phase" + (phase === "dj" || phase === "song" ? " onair" : "");
    if (t) {
      $("np-title").textContent = t.title;
      $("np-sub").textContent = `${t.style} · ${t.mood} · ${t.vocal ? "vocal" : "instrumental"}`;
      $("np-cover").src = t.cover_url || PLACEHOLDER;
      if (phase === "dj" || phase === "dj-loading") {
        $("player-cover").src = PLACEHOLDER;
        $("player-title").textContent = "AI Jukebox";
        $("player-sub").textContent = "DJ Radio";
        playerBar.setAttribute("aria-label", "DJ Radio playback controls");
        if (phase === "dj-loading") updateProgress(0);
      } else {
        $("player-cover").src = t.cover_url || PLACEHOLDER;
        $("player-title").textContent = t.title;
        $("player-sub").textContent = `${t.style} · ${t.mood}`;
        playerBar.setAttribute("aria-label", "Song playback controls");
      }
    }
    if (phase === "ended") {
      $("np-dj").textContent = "Queue a song or press play to start again.";
      $("player-cover").src = PLACEHOLDER;
      $("player-title").textContent = "AI Jukebox";
      $("player-sub").textContent = "Ready to play";
      playerBar.setAttribute("aria-label", "Playback controls");
    }
    if (phase === "song") $("np-dj").textContent = $("np-dj").textContent;  // keep DJ line visible
    $("btn-skip").disabled = !(phase === "dj" || phase === "dj-loading" || phase === "song");
  },
};

audio.addEventListener("ended", () => {
  if (player.phase === "dj") player.playSong();
  else if (player.phase === "song") player.next();
});
audio.addEventListener("error", () => {
  if (!audio.getAttribute("src")) return;
  if (player.phase === "dj") { toast("The DJ clip could not be played; going to the song.", true); player.playSong(); }
  else if (player.phase === "song") { toast("That song file could not be played; skipping.", true); player.next(); }
});
function updateProgress(percent) {
  const safe = Math.max(0, Math.min(100, Number.isFinite(percent) ? percent : 0));
  $("np-bar").style.width = `${safe}%`;
  $("player-progress").setAttribute("aria-valuenow", String(Math.round(safe)));
  const current = Number.isFinite(audio.currentTime) ? fmtDur(audio.currentTime) : "0:00";
  const durationValue = effectiveDuration();
  const duration = durationValue > 0 ? fmtDur(durationValue) : "0:00";
  $("player-progress").setAttribute("aria-valuetext", `${current} of ${duration}`);
}
function effectiveDuration() {
  if (Number.isFinite(audio.duration) && audio.duration > 0) return audio.duration;
  if (audio.seekable && audio.seekable.length) {
    const end = audio.seekable.end(audio.seekable.length - 1);
    if (Number.isFinite(end) && end > 0) return end;
  }
  return player.expectedDuration || 0;
}
function syncProgress() {
  const duration = effectiveDuration();
  updateProgress(duration > 0 ? (audio.currentTime / duration) * 100 : 0);
}
audio.addEventListener("timeupdate", syncProgress);
audio.addEventListener("durationchange", syncProgress);
audio.addEventListener("loadedmetadata", syncProgress);
let progressFrame = 0;
function animateProgress() {
  cancelAnimationFrame(progressFrame);
  if (!audio.paused && !audio.ended) {
    syncProgress();
    progressFrame = requestAnimationFrame(animateProgress);
  }
}
audio.addEventListener("play", animateProgress);
audio.addEventListener("pause", () => { cancelAnimationFrame(progressFrame); syncProgress(); });
audio.addEventListener("ended", () => { cancelAnimationFrame(progressFrame); syncProgress(); });

function seekToFraction(fraction) {
  const duration = effectiveDuration();
  if (duration <= 0 || !audio.getAttribute("src")) return;
  audio.currentTime = Math.max(0, Math.min(1, fraction)) * duration;
  syncProgress();
}
$("player-progress").addEventListener("click", (event) => {
  const rect = event.currentTarget.getBoundingClientRect();
  seekToFraction((event.clientX - rect.left) / rect.width);
});
$("player-progress").addEventListener("keydown", (event) => {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  if (event.key === "Home") return seekToFraction(0);
  if (event.key === "End") return seekToFraction(1);
  const duration = effectiveDuration();
  if (duration <= 0) return;
  audio.currentTime = Math.max(0, Math.min(duration, audio.currentTime + (event.key === "ArrowRight" ? 5 : -5)));
  syncProgress();
});

function updatePlayButton() {
  const playing = !player.paused && player.phase !== "idle" && player.phase !== "ended";
  $("btn-play").innerHTML = playing ? "&#10074;&#10074;" : "&#9654;";
  $("btn-play").setAttribute("aria-label", playing ? "Pause" : "Play");
  $("hero-play").textContent = playing ? "Ⅱ Pause" : "▶ Play";
}
$("btn-play").addEventListener("click", () => player.toggle());
$("hero-play").addEventListener("click", () => player.toggle());
$("btn-skip").addEventListener("click", () => player.skip());
$("btn-skip").disabled = true;

function renderQueue() {
  const map = byId();
  const q = $("queue");
  if (!player.queue.length) { q.innerHTML = '<li class="muted">Empty. Press play to queue the whole library.</li>'; renderHomeCards(); return; }
  q.innerHTML = player.queue.map((id, i) => {
    const cls = i === player.index ? "current" : i < player.index ? "done" : "";
    const t = map[id];
    return `<li class="${cls}"><span>${esc(t ? t.title : "(missing)")}</span>${i >= player.index ? `<button data-pos="${i}" aria-label="Remove">✕</button>` : ""}</li>`;
  }).join("");
  renderHomeCards();
}
$("queue").addEventListener("click", (e) => {
  const b = e.target.closest("button[data-pos]");
  if (b) player.remove(Number(b.dataset.pos));
});
$("queue-all").addEventListener("click", () => {
  if (player.index >= player.queue.length) { player.queue = []; player.index = -1; }
  tracks.forEach((t) => player.queue.push(t.id));
  renderQueue();
});
$("queue-clear").addEventListener("click", () => {
  player.queue = player.index >= 0 && player.index < player.queue.length ? [player.queue[player.index]] : [];
  player.index = player.queue.length ? 0 : -1;
  renderQueue();
});

$("library-search").addEventListener("input", (e) => {
  libraryFilter = e.target.value.trim().toLowerCase();
  showPage("library");
  renderLibrary();
});

// The sidebar switches between app pages rather than scrolling through one long document.
const navLinks = [...document.querySelectorAll(".sidebar a[data-page-target]")];
const pageViews = [...document.querySelectorAll(".page-view[data-page]")];
let currentPage = "home";
function markNav(page, preferredLink) {
  const active = preferredLink || navLinks.find((link) => link.dataset.pageTarget === page && link.hasAttribute("data-nav-primary"));
  navLinks.forEach((item) => item.classList.toggle("active", item === active));
}
function showPage(page, preferredLink, focusId, updateHash = true) {
  if (page === "queue") {
    const queue = $("queue-panel");
    markNav(page, preferredLink);
    if (window.innerWidth <= 1120) queue.scrollIntoView({ behavior: "smooth", block: "start" });
    queue.classList.remove("nav-arrival");
    requestAnimationFrame(() => queue.classList.add("nav-arrival"));
    setTimeout(() => queue.classList.remove("nav-arrival"), 950);
    if (updateHash) history.replaceState(null, "", "#queue");
    return;
  }
  if (!pageViews.some((view) => view.dataset.page === page)) page = "home";
  currentPage = page;
  pageViews.forEach((view) => { view.hidden = view.dataset.page !== page; });
  markNav(page, preferredLink);
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (focusId) {
    requestAnimationFrame(() => document.getElementById(focusId)?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }
  if (updateHash) history.replaceState(null, "", focusId ? `#${page}/voice` : `#${page}`);
}
navLinks.forEach((link) => link.addEventListener("click", (event) => {
  event.preventDefault();
  showPage(link.dataset.pageTarget, link, link.dataset.focusTarget);
}));
$("home-library").addEventListener("click", () => showPage("library"));
$("home-create").addEventListener("click", () => showPage("create"));
$("home-queue-open").addEventListener("click", () => showPage("queue"));
window.addEventListener("hashchange", () => {
  const [page, detail] = location.hash.slice(1).split("/");
  showPage(page || "home", undefined, detail === "voice" ? "voice-studio" : undefined, false);
});

// ---------------------------------------------------------------- generation jobs
const jobs = {
  list: [], timer: null,
  track(job) { this.list.unshift(job); this.render(); this.poll(); },
  async poll() {
    clearTimeout(this.timer);
    const active = this.list.filter((j) => j.state === "queued" || j.state === "running");
    for (const j of active) {
      try {
        const fresh = await api(`/api/jobs/${j.id}`);
        if (fresh.state !== j.state && !["queued", "running"].includes(fresh.state)) this.finished(fresh);
        Object.assign(j, fresh);
      } catch (e) { /* transient; keep polling */ }
    }
    this.render();
    if (this.list.some((j) => j.state === "queued" || j.state === "running")) this.timer = setTimeout(() => this.poll(), 2000);
  },
  async finished(job) {
    await loadLibrary();
    if (job.kind === "song" && job.track_id) {
      const t = byId()[job.track_id];
      toast(job.state === "failed" ? "Song generation failed." : `“${t ? t.title : "New song"}” is in the library.`, job.state === "failed");
      if (t && job.state !== "failed" && $("f-autoqueue").checked) player.enqueue(t.id);
    } else if (job.kind === "song") toast("Song generation failed. See status for details.", true);
  },
  render() {
    const ul = $("jobs");
    if (!this.list.length) { ul.innerHTML = '<li class="muted">No songs generating.</li>'; return; }
    ul.innerHTML = this.list.slice(0, 8).map((j) => {
      const p = j.params || {};
      const name = (j.preview && j.preview.title) || p.title || (j.kind === "cover" ? `Cover for “${p.title}”` : `${p.style} / ${p.mood}`);
      const running = j.state === "queued" || j.state === "running";
      const wait = j.queue_position ? ` (waiting: #${j.queue_position} in line)` : "";
      let status = "";
      if (running) status = `<div class="step"><span class="spinner"></span>${esc(j.step)}${wait}</div>`;
      else if (j.state === "done") status = '<div class="ok">✓ Ready in library</div>';
      else if (j.state === "done_with_warning") status = `<div class="ok">✓ Song ready</div><div class="err">${esc(j.error)}</div><button data-cover="${j.track_id}">Retry cover</button>`;
      else status = `<div class="err">${esc(j.error)}</div>${j.retryable !== false ? `<button data-retry="${j.id}">Retry</button>` : ""} <button data-dismiss="${j.id}" class="link">Dismiss</button>`;
      return `<li><div class="job-title">${esc(name)}</div>${status}</li>`;
    }).join("");
  },
};
$("jobs").addEventListener("click", async (e) => {
  const b = e.target.closest("button");
  if (!b) return;
  if (b.dataset.dismiss) { jobs.list = jobs.list.filter((j) => j.id !== b.dataset.dismiss); jobs.render(); }
  if (b.dataset.retry) {
    const old = jobs.list.find((j) => j.id === b.dataset.retry);
    jobs.list = jobs.list.filter((j) => j !== old);
    submitSong(old.params);
  }
  if (b.dataset.cover) {
    try { jobs.track(await api(`/api/tracks/${b.dataset.cover}/cover`, { method: "POST" })); await loadLibrary(); }
    catch (err) { toast(err.message, true); }
  }
});

async function submitSong(params) {
  const pending = { id: `pending-${Date.now()}`, kind: "song", params, state: "running", step: "Generating lyrics, music, and cover art" };
  jobs.list.unshift(pending);
  jobs.render();
  try {
    let body;
    let requestHeaders;
    if (params.reference) {
      const form = new FormData();
      Object.entries(params).forEach(([key, value]) => { if (key !== "reference" && value !== undefined && value !== null) form.append(key, String(value)); });
      form.append("reference_audio", params.reference, params.reference.name);
      body = form;
    } else {
      requestHeaders = { "Content-Type": "application/json" };
      body = JSON.stringify(params);
    }
    const job = await api("/api/songs", {
      method: "POST", headers: requestHeaders, body,
    });
    Object.assign(pending, job);
    jobs.render();
    await jobs.finished(job);
  } catch (err) {
    Object.assign(pending, { state: "failed", error: err.message, retryable: true });
    jobs.render();
    toast(err.message, true);
  }
}

$("f-duration").addEventListener("input", (e) => ($("f-dur-out").value = e.target.value));
$("f-reference").addEventListener("change", (e) => {
  const file = e.target.files[0];
  const note = $("reference-name");
  if (!file) { note.textContent = "Upload an MP3 or WAV you own or have permission to use (maximum 10 MB). The clip guides timbre, mixing, and performance feel and is not saved."; return; }
  if (!/\.(mp3|wav)$/i.test(file.name) || file.size < 2000 || file.size > 10 * 1024 * 1024) {
    e.target.value = "";
    note.textContent = "Choose a valid MP3 or WAV between 2 KB and 10 MB.";
    return;
  }
  note.textContent = `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB · used once and not saved`;
});
$("song-form").addEventListener("submit", (e) => {
  e.preventDefault();
  submitSong({
    style: $("f-style").value.trim(), mood: $("f-mood").value.trim(),
    artist: $("f-artist").value.trim(),
    reference: $("f-reference").files[0] || null,
    duration: Number($("f-duration").value),
    vocal: document.querySelector('input[name="vocal"]:checked').value === "1",
    theme: $("f-theme").value.trim(), title: $("f-title").value.trim(),
  });
});

// ---------------------------------------------------------------- DJ voice
function showVoice(v) {
  voiceId = v.id || "default";
  $("voice-name").textContent = v.id ? `Custom: ${v.name}` : "Default voice";
  $("voice-reset").classList.toggle("hidden", !v.id);
}
$("voice-file").addEventListener("change", async (e) => {
  const file = e.target.files[0];
  e.target.value = "";
  if (!file) return;
  const msg = $("voice-msg");
  if (!/\.(mp3|wav)$/i.test(file.name)) { msg.textContent = "Please choose an MP3 or WAV file."; msg.className = "msg error"; return; }
  if (file.size > 10 * 1024 * 1024) { msg.textContent = "That file is larger than 10 MB."; msg.className = "msg error"; return; }
  msg.textContent = "Uploading…"; msg.className = "msg";
  const fd = new FormData();
  fd.append("file", file);
  try {
    showVoice(await api("/api/voice", { method: "POST", body: fd }));
    msg.textContent = "Custom voice set. Upcoming DJ intros will use it.";
  } catch (err) { msg.textContent = err.message; msg.className = "msg error"; }
});
$("voice-reset").addEventListener("click", async () => {
  try { showVoice(await api("/api/voice", { method: "DELETE" })); $("voice-msg").textContent = "Back to the default voice."; }
  catch (err) { toast(err.message, true); }
});

// ---------------------------------------------------------------- boot
setupCombobox("style");
setupCombobox("mood");
const [initialPage, initialDetail] = location.hash.slice(1).split("/");
showPage(initialPage || "home", undefined, initialDetail === "voice" ? "voice-studio" : undefined, false);

(async function boot() {
  try {
    const st = await api("/api/status");
    if (st.problems.length) {
      const b = $("config-banner");
      b.innerHTML = "<strong>Setup needed:</strong> " + st.problems.map(esc).join("; ") + ". See README → Setup.";
      b.classList.remove("hidden");
    }
    $("f-duration").min = st.min_duration; $("f-duration").max = st.max_duration;
    showVoice(await api("/api/voice"));
    await loadLibrary();
    jobs.render();
  } catch (err) { toast(err.message, true); }
})();
