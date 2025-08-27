// Drawer + active nav
const burger = document.querySelector('.burger');
const drawer = document.querySelector('.drawer');
if (burger){
  burger.addEventListener('click', ()=> drawer.classList.add('open'));
  drawer.addEventListener('click', (e)=> { if(e.target === drawer) drawer.classList.remove('open'); });
  drawer.querySelectorAll('a').forEach(a => a.addEventListener('click', ()=> drawer.classList.remove('open')));
}

// Active link
const here = location.pathname.split('/').pop() || 'index.html';
document.querySelectorAll('.nav a, .drawer a').forEach(a => {
  const target = a.getAttribute('href');
  if((here === 'index.html' && (target === '/' || target === './' || target === 'index.html')) || here === target){
    a.classList.add('active');
  }
});

// --- Helpers ---
function getYouTubeId(u){
  if(!u) return "";
  try {
    if (/^[a-zA-Z0-9_-]{11}$/.test(u)) return u; // raw ID
    const url = new URL(u);
    const v = url.searchParams.get("v");
    if (v) return v;                      // watch?v=ID
    if (url.hostname.includes("youtu.be")) {
      const seg = url.pathname.split("/").filter(Boolean)[0];
      if (seg) return seg;                // youtu.be/ID
    }
    const parts = url.pathname.split("/").filter(Boolean);
    const embedIx = parts.indexOf("embed");
    if (embedIx !== -1 && parts[embedIx+1]) return parts[embedIx+1];   // /embed/ID
    const shortsIx = parts.indexOf("shorts");
    if (shortsIx !== -1 && parts[shortsIx+1]) return parts[shortsIx+1]; // /shorts/ID
  } catch(e){
    const m = String(u).match(/[?&]v=([^&]+)/);
    if (m) return m[1];
  }
  return "";
}

function makePoster(el, id, title){
  const thumb = `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
  const watch = `https://www.youtube.com/watch?v=${id}`;
  const wrap = document.createElement('a');
  wrap.href = watch;
  wrap.target = "_blank";
  wrap.rel = "noopener";
  wrap.style.cssText = "position:absolute;inset:0;display:flex;align-items:center;justify-content:center;text-decoration:none;color:#fff;";
  wrap.innerHTML = `
    <img src="${thumb}" alt="${title||'YouTube thumbnail'}" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;filter:brightness(0.8)"/>
    <div style="position:relative;display:flex;flex-direction:column;align-items:center;gap:8px;">
      <div style="width:68px;height:68px;border-radius:50%;background:rgba(0,0,0,.6);display:grid;place-items:center;">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>
      </div>
      <span style="background:rgba(0,0,0,.55);padding:6px 10px;border-radius:12px;font-size:13px">Watch on YouTube</span>
    </div>`;
  el.innerHTML = "";
  el.appendChild(wrap);
}

// Load YouTube Iframe API (with nocookie host)
let ytApiPromise;
function loadYouTubeAPI(){
  if (ytApiPromise) return ytApiPromise;
  ytApiPromise = new Promise((resolve) => {
    if (window.YT && window.YT.Player) return resolve(window.YT);
    const tag = document.createElement('script');
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
    window.onYouTubeIframeAPIReady = () => resolve(window.YT);
  });
  return ytApiPromise;
}

function uniqueId(prefix="ytplayer"){
  return prefix + "-" + Math.random().toString(36).slice(2,9);
}

async function embedYouTubeWithFallback(el, url, title){
  const id = getYouTubeId(url);
  if (!id) return;
  // Prepare container
  el.innerHTML = "";
  const slot = document.createElement('div');
  const playerId = uniqueId();
  slot.id = playerId;
  slot.style.cssText = "position:absolute;inset:0;";
  el.appendChild(slot);
  try{
    const YT = await loadYouTubeAPI();
    const player = new YT.Player(playerId, {
      width: "100%",
      height: "100%",
      videoId: id,
      host: "https://www.youtube-nocookie.com",
      playerVars: {
        rel: 0, modestbranding: 1, playsinline: 1, origin: location.origin
      },
      events: {
        'onError': function(){
          makePoster(el, id, title);
        }
      }
    });
    // Safety timeout: if no iframe appears after a bit, fallback
    setTimeout(()=>{
      const hasFrame = el.querySelector('iframe');
      if (!hasFrame) makePoster(el, id, title);
    }, 1200);
  }catch(e){
    makePoster(el, id, title);
  }
}

// Load art from JSON when a page has a hook
async function renderArt(hookId, category){
  const el = document.getElementById(hookId);
  if(!el) return;
  const res = await fetch('assets/artworks.json');
  const data = await res.json();
  const items = data[category] || [];
  const frag = document.createDocumentFragment();
  items.forEach(it => {
    const wrap = document.createElement('article');
    wrap.className = 'art-item';
    wrap.innerHTML = `
      <img loading="lazy" alt="${it.title || ''}" src="${it.src}"/>
      <div class="meta">
        <div class="title">${it.title || ''}</div>
        ${it.size ? `<div class="size">${it.size}</div>` : ''}
      </div>`;
    frag.appendChild(wrap);
  });
  el.appendChild(frag);
}

// Index: latest grid (mix of categories)
async function renderLatest(){
  const el = document.getElementById('latest-grid');
  if(!el) return;
  const res = await fetch('assets/artworks.json');
  const data = await res.json();
  const buckets = ['paintings','digital','threeD','prints'];
  const items = buckets.flatMap(k => (data[k]||[]).slice(0,8));
  const frag = document.createDocumentFragment();
  items.slice(0,24).forEach(it => {
    const wrap = document.createElement('article');
    wrap.className = 'art-item';
    wrap.innerHTML = `
      <img loading="lazy" alt="${it.title || ''}" src="${it.src}"/>
      <div class="meta">
        <div class="title">${it.title || ''}</div>
        ${it.size ? `<div class="size">${it.size}</div>` : ''}
      </div>`;
    frag.appendChild(wrap);
  });
  el.appendChild(frag);
}

// Music: hydrate embeds from config
async function renderMusic(){
  const album1 = document.getElementById('album1');
  const album2 = document.getElementById('album2');
  const album3 = document.getElementById('album3');
  const album4 = document.getElementById('album4');
  const ytA = document.getElementById('ytA');
  const ytB = document.getElementById('ytB');
  
  const res = await fetch('assets/config.json');
  const cfg = await res.json();

  const albums = cfg.youtube_albums || [];
  const titles = cfg.album_titles || [];
  
  // For index page - show Cycles and Off Record YouTube videos
  if (album1 && albums[0]) {
    await embedYouTubeWithFallback(album1, albums[0], titles[0] || "Cycles");
  }
  if (album2 && albums[1]) {
    await embedYouTubeWithFallback(album2, albums[1], titles[1] || "Off Record");
  }

  // For music page - show all album YouTube videos
  if (album3 && albums[1]) {
    await embedYouTubeWithFallback(album3, albums[1], titles[1] || "Off Record");
  }
  if (album4 && albums[3]) {
    await embedYouTubeWithFallback(album4, albums[3], titles[3] || "New Era Debut Album");
  }

  // If we're on music page, also set Wasteland for album2
  if (document.title.includes('Music') && album2 && albums[2]) {
    await embedYouTubeWithFallback(album2, albums[2], titles[2] || "Wasteland");
  }

  // Mixtape videos
  if (ytA && cfg.youtube_hometown_heroes) {
    await embedYouTubeWithFallback(ytA, cfg.youtube_hometown_heroes, "Hometown Heroes");
  }
  if (ytB && cfg.youtube_satchel_dave_tape) {
    await embedYouTubeWithFallback(ytB, cfg.youtube_satchel_dave_tape, "Satchel Dave Tape");
  }

  // Socials footer
  const sl = document.getElementById('socials');
  if(sl && cfg.socials){
    sl.innerHTML = `
      <a class="badge" href="${cfg.socials.instagram}" target="_blank" rel="noopener">Instagram</a>
      <a class="badge" href="${cfg.socials.tiktok}" target="_blank" rel="noopener">TikTok</a>
      <a class="badge" href="${cfg.socials.youtube}" target="_blank" rel="noopener">YouTube</a>
      <a class="badge" href="${cfg.socials.spotify}" target="_blank" rel="noopener">Spotify</a>
      <a class="badge" href="${cfg.socials.soundcloud}" target="_blank" rel="noopener">SoundCloud</a>
      <a class="badge" href="${cfg.socials.bandcamp}" target="_blank" rel="noopener">Bandcamp</a>
    `;
  }
}

// Press page
async function renderPress(){
  const el = document.getElementById('press-list');
  if(!el) return;
  const res = await fetch('assets/interviews.json');
  const items = await res.json();
  el.innerHTML = items.map(it => `
    <article class="card" style="grid-column:span 6">
      <div class="pad">
        <h3><a href="${it.url}" target="_blank" rel="noopener">${it.title}</a></h3>
        <p class="small">${it.pub || ''}</p>
      </div>
    </article>
  `).join('');
}

window.addEventListener('DOMContentLoaded', ()=>{
  renderLatest();
  renderArt('paintings-grid','paintings');
  renderArt('digital-grid','digital');
  renderArt('threeD-grid','threeD');
  renderArt('prints-grid','prints');
  renderMusic();
  renderPress();
});
