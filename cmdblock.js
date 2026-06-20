/* ── CMDBLOCK REDESIGN — Core App ─────────────────────────
 * Replaces the old app.js. Adds:
 *   · v1→v2 localStorage migration (carries existing users over)
 *   · Old role system (NOOBIE→OWNER, multi-role support, auto-promotion)
 *   · Smoother auth flow (inline validation, loading, success transition, welcome-back)
 *   · Confetti on signup success
 *   · Modal focus-trap + animated open/close
 * ────────────────────────────────────────────────────────── */
(function () {
  'use strict';

  // ── Maintenance mode ───────────────────────────────────
  // Set MAINTENANCE_UNTIL to an ISO timestamp to lock the site behind a
  // countdown overlay until that time. Set to '' to disable.
  //   '2026-05-19T17:00:00-07:00'  ← 5:00 PM Pacific (PDT, summer)
  //   '2026-12-01T17:00:00-08:00'  ← 5:00 PM Pacific (PST, winter)
  //   ''                           ← maintenance off
  const MAINTENANCE_UNTIL = '2026-05-19T17:00:00-07:00';
  const MAINTENANCE_LABEL = '// SCHEDULED MAINTENANCE';
  const MAINTENANCE_RETURN_TEXT = '5:00 PM PST';

  (function initMaintenance() {
    if (!MAINTENANCE_UNTIL) return;
    const until = new Date(MAINTENANCE_UNTIL);
    if (isNaN(+until) || until <= new Date()) return;

    // Derive current page label from the URL.
    const pageNames = {
      '': 'Home', 'index': 'Home',
      'learn': 'Learn', 'lesson': 'Lesson',
      'projects': 'Projects', 'projects-easy': 'Projects · Easy',
      'projects-medium': 'Projects · Medium', 'projects-hard': 'Projects · Hard',
      'resources': 'Resources', 'tools': 'Tools',
      'connect': 'Connect', 'profile': 'Profile',
      'iron-course': 'Iron Course', 'emerald-course': 'Emerald Course',
      'diamond-course': 'Diamond Course',
      'java-iron-course': 'Java · Iron', 'java-emerald-course': 'Java · Emerald',
      'java-diamond-course': 'Java · Diamond', 'java-netherite-course': 'Java · Netherite',
    };
    const slug = (location.pathname.split('/').pop() || 'index').replace(/\.html$/i, '');
    const pageLabel = pageNames[slug] || slug.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    const css = `
      html.cb-maint-on, html.cb-maint-on body { overflow: hidden !important; }
      #cmdblock-update-overlay { position: fixed; inset: 0; z-index: 2147483647; background: #0D0D12;
        display: flex; align-items: center; justify-content: center;
        font-family: "DM Sans", -apple-system, BlinkMacSystemFont, sans-serif;
        color: #E8E6E3; padding: 24px; overflow: auto; }
      #cmdblock-update-overlay::before { content: ""; position: absolute; inset: 0;
        background: radial-gradient(ellipse 60% 50% at 50% 35%, rgba(85,255,85,0.06), transparent 70%);
        pointer-events: none; }
      #cmdblock-update-overlay * { box-sizing: border-box; }
      #cmdblock-update-overlay .cmu-card { position: relative; max-width: 560px; width: 100%; text-align: center; padding: 56px 40px; }
      #cmdblock-update-overlay .cmu-logo { margin-bottom: 28px; display: flex; align-items: center; justify-content: center; position: relative; z-index: 2; }
      #cmdblock-update-overlay .cmu-logo img { height: 104px; width: auto; image-rendering: pixelated; object-fit: contain; display: block;
        filter: drop-shadow(0 0 24px rgba(85,255,85,0.25)) drop-shadow(0 4px 12px rgba(0,0,0,0.5)); }
      #cmdblock-update-overlay .cmu-icons { position: absolute; inset: 0; pointer-events: none; overflow: hidden; }
      #cmdblock-update-overlay .cmu-icons img { position: absolute; image-rendering: pixelated; object-fit: contain; opacity: 0.16; filter: drop-shadow(0 6px 14px rgba(0,0,0,0.6)); }
      #cmdblock-update-overlay .cmu-i1 { top: 8%; left: 6%; width: 88px; height: 88px; transform: rotate(-12deg); }
      #cmdblock-update-overlay .cmu-i2 { top: 12%; right: 7%; width: 78px; height: 78px; transform: rotate(15deg); }
      #cmdblock-update-overlay .cmu-i3 { top: 42%; left: 4%; width: 104px; height: 104px; transform: rotate(-6deg); opacity: 0.12; }
      #cmdblock-update-overlay .cmu-i4 { top: 46%; right: 5%; width: 96px; height: 96px; transform: rotate(8deg); opacity: 0.13; }
      #cmdblock-update-overlay .cmu-i5 { bottom: 10%; left: 14%; width: 72px; height: 72px; transform: rotate(20deg); }
      #cmdblock-update-overlay .cmu-i6 { bottom: 14%; right: 13%; width: 80px; height: 80px; transform: rotate(-18deg); }
      #cmdblock-update-overlay .cmu-i7 { top: 24%; left: 22%; width: 60px; height: 60px; transform: rotate(28deg); opacity: 0.1; }
      #cmdblock-update-overlay .cmu-i8 { bottom: 30%; right: 24%; width: 56px; height: 56px; transform: rotate(-22deg); opacity: 0.1; }
      @media (max-width: 760px) {
        #cmdblock-update-overlay .cmu-i7, #cmdblock-update-overlay .cmu-i8 { display: none; }
        #cmdblock-update-overlay .cmu-icons img { opacity: 0.1; }
        #cmdblock-update-overlay .cmu-i1, #cmdblock-update-overlay .cmu-i2, #cmdblock-update-overlay .cmu-i5, #cmdblock-update-overlay .cmu-i6 { width: 56px; height: 56px; }
        #cmdblock-update-overlay .cmu-i3, #cmdblock-update-overlay .cmu-i4 { width: 64px; height: 64px; }
      }
      #cmdblock-update-overlay .cmu-tag { font-family: "Silkscreen", monospace; font-size: 0.55rem; color: #FCDB05;
        letter-spacing: 3.5px; margin-bottom: 18px; text-transform: uppercase; }
      #cmdblock-update-overlay .cmu-page { font-family: "Silkscreen", monospace; font-size: 0.5rem; color: #55FF55;
        letter-spacing: 3px; margin-bottom: 22px; text-transform: uppercase; opacity: 0.85; }
      #cmdblock-update-overlay .cmu-page .arrow { color: #5A5A60; margin: 0 8px; }
      #cmdblock-update-overlay h1 { font-family: "Silkscreen", monospace; font-size: clamp(2rem, 5vw, 3rem);
        line-height: 1.1; margin: 0 0 20px; color: #E8E6E3; letter-spacing: 1px; font-weight: 400; }
      #cmdblock-update-overlay h1 .g { color: #55FF55; }
      #cmdblock-update-overlay .cmu-msg { font-size: 0.98rem; color: #9A9790; margin: 0 0 44px;
        line-height: 1.6; max-width: 380px; margin-left: auto; margin-right: auto; }
      #cmdblock-update-overlay .cmu-msg strong { color: #E8E6E3; font-weight: 600; }
      #cmdblock-update-overlay .cmu-countdown { display: flex; justify-content: center; align-items: center;
        gap: 10px; margin: 0 0 8px; font-family: "JetBrains Mono", monospace; }
      #cmdblock-update-overlay .cmu-unit { display: flex; flex-direction: column; align-items: center; min-width: 78px; }
      #cmdblock-update-overlay .cmu-num { font-family: "Silkscreen", monospace; font-size: 2.4rem; color: #55FF55;
        display: block; line-height: 1; letter-spacing: 1px; font-weight: 400; }
      #cmdblock-update-overlay .cmu-label { font-family: "Silkscreen", monospace; font-size: 0.5rem; color: #5A5A60;
        letter-spacing: 2px; margin-top: 14px; text-transform: uppercase; }
      #cmdblock-update-overlay .cmu-sep { font-family: "Silkscreen", monospace; font-size: 2.4rem; color: #2A2A30; line-height: 1; margin-top: -14px; }
      #cmdblock-update-overlay .cmu-foot { font-family: "Silkscreen", monospace; font-size: 0.5rem; color: #5A5A60;
        letter-spacing: 2.5px; margin-top: 48px; }
      @media (max-width: 480px) {
        #cmdblock-update-overlay .cmu-card { padding: 40px 22px; }
        #cmdblock-update-overlay .cmu-unit { min-width: 60px; }
        #cmdblock-update-overlay .cmu-num { font-size: 1.8rem; }
        #cmdblock-update-overlay .cmu-sep { font-size: 1.8rem; }
        #cmdblock-update-overlay .cmu-logo { margin-bottom: 22px; }
        #cmdblock-update-overlay .cmu-msg { margin-bottom: 32px; }
      }
    `;

    const html = `
      <div id="cmdblock-update-overlay">
        <div class="cmu-card" role="dialog" aria-live="polite" aria-label="Site under maintenance">
          <div class="cmu-icons" aria-hidden="true">
            <img class="cmu-i1" src="assets/icons/bedrock.png" alt="">
            <img class="cmu-i2" src="assets/icons/Grass_Block.png" alt="">
            <img class="cmu-i3" src="assets/icons/diamond-removebg-preview.png" alt="">
            <img class="cmu-i4" src="assets/icons/netherite_icon.png" alt="">
            <img class="cmu-i5" src="assets/icons/emerald-removebg-preview.png" alt="">
            <img class="cmu-i6" src="assets/icons/iron-removebg-preview.png" alt="">
            <img class="cmu-i7" src="assets/icons/Golden_Apple.png" alt="">
            <img class="cmu-i8" src="assets/icons/commandblock.png" alt="">
          </div>
          <div class="cmu-logo">
            <img src="assets/icons/cmdblock_icon-no-bg.png" alt="CMDBLOCK">
          </div>
          <div class="cmu-tag">Redesign Update</div>
          <div class="cmu-page">You were on<span class="arrow">›</span>${pageLabel}</div>
          <h1>HANG ON <span class="g">TIGHT!</span></h1>
          <p class="cmu-msg">CMDBLOCK is updating. Come back at <strong>${MAINTENANCE_RETURN_TEXT}</strong>.</p>
          <div class="cmu-countdown" id="cmu-countdown">
            <div class="cmu-unit"><span class="cmu-num" data-k="d">00</span><div class="cmu-label">Days</div></div>
            <div class="cmu-sep">:</div>
            <div class="cmu-unit"><span class="cmu-num" data-k="h">00</span><div class="cmu-label">Hours</div></div>
            <div class="cmu-sep">:</div>
            <div class="cmu-unit"><span class="cmu-num" data-k="m">00</span><div class="cmu-label">Minutes</div></div>
            <div class="cmu-sep">:</div>
            <div class="cmu-unit"><span class="cmu-num" data-k="s">00</span><div class="cmu-label">Seconds</div></div>
          </div>
          <div class="cmu-foot">${MAINTENANCE_LABEL}</div>
        </div>
      </div>
    `;

    let timerId = 0;
    function pad(n) { n = String(n); return n.length < 2 ? '0' + n : n; }
    function tick() {
      const ms = +until - Date.now();
      if (ms <= 0) {
        document.getElementById('cmdblock-update-overlay')?.remove();
        document.getElementById('cmdblock-update-overlay-style')?.remove();
        document.documentElement.classList.remove('cb-maint-on');
        if (timerId) clearInterval(timerId);
        return;
      }
      const totalSec = Math.floor(ms / 1000);
      const d = Math.floor(totalSec / 86400);
      const h = Math.floor((totalSec % 86400) / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;
      const root = document.getElementById('cmu-countdown');
      if (!root) return;
      const setN = (k, v) => { const el = root.querySelector(`[data-k="${k}"]`); if (el) el.textContent = pad(v); };
      setN('d', d); setN('h', h); setN('m', m); setN('s', s);
    }
    function injectFonts() {
      if (document.getElementById('cmu-font-link')) return;
      const l = document.createElement('link');
      l.id = 'cmu-font-link'; l.rel = 'stylesheet';
      l.href = 'https://fonts.googleapis.com/css2?family=Silkscreen:wght@400;700&family=DM+Sans:wght@400;500;600&family=JetBrains+Mono:wght@500&display=swap';
      document.head.appendChild(l);
    }
    function ensureStyle() {
      if (document.getElementById('cmdblock-update-overlay-style')) return;
      const s = document.createElement('style');
      s.id = 'cmdblock-update-overlay-style';
      s.textContent = css;
      document.head.appendChild(s);
    }
    function buildOverlayNode() {
      const wrap = document.createElement('div');
      wrap.innerHTML = html;
      return wrap.firstElementChild;
    }
    // Wipe body so removing the overlay reveals nothing.
    function lockBody() {
      if (!document.body) return;
      if (document.body.children.length === 1 && document.body.firstElementChild.id === 'cmdblock-update-overlay') return;
      while (document.body.firstChild) document.body.removeChild(document.body.firstChild);
      document.body.appendChild(buildOverlayNode());
    }
    let bodyObs = null, headObs = null;
    function teardown() {
      window.__cb_maint__ = false;
      if (timerId) { clearInterval(timerId); timerId = 0; }
      if (bodyObs) { bodyObs.disconnect(); bodyObs = null; }
      if (headObs) { headObs.disconnect(); headObs = null; }
      document.getElementById('cmdblock-update-overlay')?.remove();
      document.getElementById('cmdblock-update-overlay-style')?.remove();
      document.documentElement.classList.remove('cb-maint-on');
    }
    function show() {
      window.__cb_maint__ = true;
      injectFonts();
      ensureStyle();
      lockBody();
      document.documentElement.classList.add('cb-maint-on');
      tick();
      timerId = setInterval(tick, 1000);
      // Guard: re-inject overlay if anything tries to remove or replace it.
      bodyObs = new MutationObserver(() => {
        if (+until <= Date.now()) { teardown(); return; }
        const c = document.body ? document.body.children : null;
        if (!c) return;
        if (c.length !== 1 || c[0].id !== 'cmdblock-update-overlay') lockBody();
        if (!document.documentElement.classList.contains('cb-maint-on')) {
          document.documentElement.classList.add('cb-maint-on');
        }
      });
      bodyObs.observe(document.body, { childList: true });
      headObs = new MutationObserver(() => {
        if (+until <= Date.now()) { teardown(); return; }
        ensureStyle(); injectFonts();
      });
      headObs.observe(document.head, { childList: true });
    }
    if (document.body) show();
    else document.addEventListener('DOMContentLoaded', show);
  })();

  // ── Config ─────────────────────────────────────────────
  // Google Sheets signup logging. Prefer setting `window.SHEETS_URL` in
  // scripts/sheets-config.js so this file stays user-edit-free; falling back
  // to the const here is fine for quick edits.
  // Setup: deploy scripts/google-sheets-template.gs as a Web App
  // (Execute as: Me · Who has access: Anyone) and paste the URL into
  // sheets-config.js (or below).
  const SHEETS_URL = (typeof window !== 'undefined' && window.SHEETS_URL) || '';  // e.g. 'https://script.google.com/macros/s/AKfycby.../exec'

  // ── Storage keys ───────────────────────────────────────
  const ACCOUNT_KEY = 'cmdblock-account-v2';
  const PROGRESS_KEY = 'cmdblock-progress-v2';
  const PREFS_KEY = 'cmdblock-prefs-v2';
  const KNOWN_USER_KEY = 'cmdblock-known-user-v2';
  const MIGRATED_FLAG = 'cmdblock-migrated-v1-v2';
  const SHEETS_SENT_KEY = 'cmdblock-sheets-sent-v2';

  // ── Google Sheets push (fire-and-forget) ───────────────
  function pushToSheet(payload) {
    if (!SHEETS_URL) return;
    try {
      // Send once per email
      const sent = JSON.parse(localStorage.getItem(SHEETS_SENT_KEY) || '[]');
      if (payload.email && sent.includes(payload.email)) return;
      // no-cors so Apps Script accepts the request without CORS preflight
      fetch(SHEETS_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          name: payload.name || '',
          email: payload.email || '',
          source: location.host || 'cmdblock',
          ts: new Date().toISOString(),
          ua: navigator.userAgent.slice(0, 200),
        }),
      }).catch(() => {});
      if (payload.email) {
        sent.push(payload.email);
        localStorage.setItem(SHEETS_SENT_KEY, JSON.stringify(sent.slice(-50)));
      }
    } catch (e) { /* best-effort */ }
  }

  // ── Firebase cloud (optional — activates if firebase-config.js is filled in)
  // Local-first: localStorage is always the source of truth in the page.
  // When Firebase is configured + signed in, every write also mirrors to Firestore
  // and a real-time listener mirrors cloud changes back into localStorage.
  let cloud = null;        // namespace with imported SDK fns + { auth, db }
  let cloudUser = null;    // current Firebase auth user
  let cloudUnsub = null;   // Firestore onSnapshot unsubscriber

  function cloudReady() { return !!(cloud && cloudUser); }

  function humanizeAuthError(err) {
    const code = err?.code || '';
    const map = {
      'auth/email-already-in-use': 'That email is already registered. Try signing in.',
      'auth/invalid-email': 'Please enter a valid email address.',
      'auth/weak-password': 'Password is too weak — pick something at least 6 characters.',
      'auth/user-not-found': 'No account with that email — create one instead?',
      'auth/wrong-password': 'Incorrect password.',
      'auth/invalid-credential': 'Email or password is incorrect.',
      'auth/too-many-requests': 'Too many tries. Wait a minute and retry.',
      'auth/popup-closed-by-user': 'Sign-in window closed.',
      'auth/popup-blocked': 'Pop-up was blocked. Allow pop-ups and try again.',
      'auth/network-request-failed': 'Network error. Check your connection.',
    };
    return map[code] || err?.message || 'Something went wrong';
  }

  async function initCloud() {
    const cfg = window.FIREBASE_CONFIG;
    if (!cfg?.apiKey) return;  // not configured → stay local-only
    try {
      const FB_VER = '10.13.0';
      const base = `https://www.gstatic.com/firebasejs/${FB_VER}`;
      const [appMod, authMod, fsMod] = await Promise.all([
        import(`${base}/firebase-app.js`),
        import(`${base}/firebase-auth.js`),
        import(`${base}/firebase-firestore.js`),
      ]);

      const app = appMod.initializeApp(cfg);
      const auth = authMod.getAuth(app);
      const db = fsMod.getFirestore(app);
      cloud = { app, auth, db, ...appMod, ...authMod, ...fsMod };

      authMod.onAuthStateChanged(auth, async (user) => {
        if (cloudUnsub) { try { cloudUnsub(); } catch {} cloudUnsub = null; }
        cloudUser = user || null;
        if (!user) {
          // Signed out — keep whatever's in localStorage as-is
          updateAccountCtaUI();
          window.dispatchEvent(new CustomEvent('cmdblock:account', { detail: { account: getAccount() } }));
          return;
        }

        // Signed in: hydrate from cloud, creating the doc on first sign-in
        const ref = fsMod.doc(db, 'users', user.uid);
        let snap;
        try { snap = await fsMod.getDoc(ref); } catch (e) { console.warn(e); return; }
        let data = snap.exists() ? snap.data() : null;
        if (!data) {
          // First time — seed from any existing local data
          const localProgress = getProgress();
          const localAcc = getAccount();
          data = {
            name: localAcc?.name || user.displayName || (user.email || '').split('@')[0] || 'Player',
            email: user.email || localAcc?.email || '',
            since: localAcc?.since || new Date().toISOString(),
            roles: localAcc?.roles || ['NOOBIE'],
            progress: localProgress,
          };
          try { await fsMod.setDoc(ref, data); } catch (e) { console.warn(e); }
        }

        // Mirror to localStorage and notify the UI
        applyCloudData(data);

        // Real-time sync: any cloud change → localStorage + event
        cloudUnsub = fsMod.onSnapshot(ref, (s) => {
          const d = s.data();
          if (d) applyCloudData(d);
        });
      });
    } catch (e) {
      console.warn('[cmdblock] cloud init failed, staying local-only:', e);
      cloud = null;
    }
  }

  function applyCloudData(d) {
    const acc = { name: d.name, email: d.email, since: d.since, roles: d.roles };
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(acc));
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(d.progress || {}));
    if (acc.email) localStorage.setItem(KNOWN_USER_KEY, JSON.stringify({ name: acc.name, email: acc.email }));
    updateAccountCtaUI();
    window.dispatchEvent(new CustomEvent('cmdblock:account', { detail: { account: acc } }));
  }

  async function cloudWrite(patch) {
    if (!cloudReady()) return;
    try {
      const ref = cloud.doc(cloud.db, 'users', cloudUser.uid);
      await cloud.setDoc(ref, patch, { merge: true });
    } catch (e) { console.warn('[cmdblock] cloud write failed:', e); }
  }

  // ── Reviews ───────────────────────────────────────────
  // Public read, auth-gated write, 1200-char max. Each review:
  //   { id, uid, name, text, createdAt }
  // Cloud (Firestore /reviews/{auto-id}) when available; localStorage fallback otherwise.
  const REVIEWS_KEY = 'cmdblock-reviews-v2';
  const REVIEW_MAX = 1200;
  function getLocalReviews() {
    try { return JSON.parse(localStorage.getItem(REVIEWS_KEY)) || []; } catch { return []; }
  }
  function saveLocalReviews(arr) {
    try { localStorage.setItem(REVIEWS_KEY, JSON.stringify(arr.slice(-500))); } catch {}
  }
  async function listReviews({ limit = 50 } = {}) {
    if (cloudReady() || (cloud && !cloudUser)) {
      // Cloud path — works whether signed in or not (reads are public).
      try {
        const col = cloud.collection(cloud.db, 'reviews');
        const q = cloud.query(col, cloud.orderBy('createdAt', 'desc'), cloud.limit(limit));
        const snap = await cloud.getDocs(q);
        const out = [];
        snap.forEach(d => { const v = d.data(); out.push({ id: d.id, uid: v.uid, name: v.name, text: v.text, rating: v.rating ?? 5, createdAt: v.createdAt?.toMillis?.() || v.createdAt || Date.now() }); });
        return out;
      } catch (e) { console.warn('[cmdblock] cloud listReviews failed, falling back to local:', e); }
    }
    return getLocalReviews().slice().reverse().slice(0, limit).map(r => ({ rating: 5, ...r }));
  }
  async function submitReview(text, rating) {
    const acc = getAccount();
    if (!acc) throw new Error('Sign in to leave a review.');
    const trimmed = String(text || '').trim();
    if (!trimmed) throw new Error('Write something first.');
    if (trimmed.length > REVIEW_MAX) throw new Error(`Reviews are limited to ${REVIEW_MAX} characters.`);
    const stars = Math.max(1, Math.min(5, parseInt(rating, 10) || 5));
    const name = acc.name || (acc.email ? acc.email.split('@')[0] : 'Player');
    // All reviews publish immediately to /reviews regardless of rating.
    if (cloudReady()) {
      try {
        const col = cloud.collection(cloud.db, 'reviews');
        const doc = await cloud.addDoc(col, {
          uid: cloudUser.uid, name, text: trimmed, rating: stars,
          createdAt: cloud.serverTimestamp(),
        });
        return { id: doc.id, uid: cloudUser.uid, name, text: trimmed, rating: stars, createdAt: Date.now() };
      } catch (e) { console.warn('[cmdblock] cloud submitReview failed, saving locally:', e); }
    }
    // Local fallback (no cloud or write failed) — no moderation in local mode (only you see your reviews anyway).
    const entry = { id: 'local-' + Date.now(), uid: 'local:' + (acc.email || acc.name), name, text: trimmed, rating: stars, createdAt: Date.now() };
    const all = getLocalReviews();
    all.push(entry);
    saveLocalReviews(all);
    return entry;
  }

  // ── Search ────────────────────────────────────────────
  // Flat index of searchable stuff across the site. Categorized so results can
  // be grouped. Edition-tagged items only show when matching the active edition
  // (or when explicitly searched for the other edition).
  const SEARCH_INDEX = [
    // Pages
    { type: 'page',   title: 'Learn',     desc: '46 lessons across Iron → Netherite', href: 'learn.html',     keywords: 'courses tutorials' },
    { type: 'page',   title: 'Projects',  desc: '23 builds, Easy to Hard',             href: 'projects.html',  keywords: 'mini games systems builds' },
    { type: 'page',   title: 'Resources', desc: 'Command library + reference',         href: 'resources.html', keywords: 'library docs cheatsheet reference' },
    { type: 'page',   title: 'Tools',     desc: 'In-browser command generators',       href: 'tools.html',     keywords: 'generator checker sandbox selector' },
    { type: 'page',   title: 'Reviews',   desc: 'What other builders are saying',      href: 'reviews.html',   keywords: 'feedback testimonials community' },
    { type: 'page',   title: 'Connect',   desc: 'Discord, GitHub, newsletter',         href: 'connect.html',   keywords: 'discord github social' },
    { type: 'page',   title: 'Profile',   desc: 'Your account, settings, progress',    href: 'profile.html',   keywords: 'account settings theme edition' },

    // Courses — Bedrock
    { type: 'course', title: 'Iron Course',     desc: 'Basics: targets, items, blocks',           href: 'iron-course.html',     edition: 'bedrock', keywords: 'beginner basic' },
    { type: 'course', title: 'Emerald Course',  desc: 'Coins, zones, timers, game loops',         href: 'emerald-course.html',  edition: 'bedrock', keywords: 'intermediate systems' },
    { type: 'course', title: 'Diamond Course',  desc: 'Titles, sound, camera, polish',            href: 'diamond-course.html',  edition: 'bedrock', keywords: 'expert advanced' },
    // Courses — Java
    { type: 'course', title: 'Iron Course (Java)',     desc: 'Basics for Java edition',           href: 'java-iron-course.html',     edition: 'java', keywords: 'beginner basic' },
    { type: 'course', title: 'Emerald Course (Java)',  desc: 'Intermediate systems',              href: 'java-emerald-course.html',  edition: 'java', keywords: 'intermediate' },
    { type: 'course', title: 'Diamond Course (Java)',  desc: 'Expert techniques',                 href: 'java-diamond-course.html',  edition: 'java', keywords: 'expert' },
    { type: 'course', title: 'Netherite Course (Java)', desc: 'Debug, F3, world inspection',     href: 'java-netherite-course.html', edition: 'java', keywords: 'debug bonus' },

    // Project tiers
    { type: 'project', title: 'Easy Projects',   desc: 'Quick wins, ~2 hours',  href: 'projects-easy.html',   keywords: 'easy beginner' },
    { type: 'project', title: 'Medium Projects', desc: 'Real systems, ~3 hrs', href: 'projects-medium.html', keywords: 'medium intermediate' },
    { type: 'project', title: 'Hard Projects',   desc: 'PvP arenas, RPGs, full kits',  href: 'projects-hard.html',   keywords: 'hard advanced expert' },

    // Tools (deep links)
    { type: 'tool', title: 'Command generator',       desc: 'Build /give, /tp, /effect, /summon…', href: 'tools.html#features',         keywords: 'build syntax' },
    { type: 'tool', title: 'Target selector builder', desc: '@p / @a / @e with type, name, tag…',  href: 'tools.html#features',         keywords: 'selector' },
    { type: 'tool', title: 'Syntax checker',          desc: 'Validate a command string',          href: 'tools.html#features',         keywords: 'validate lint' },
    { type: 'tool', title: 'Command sandbox',         desc: 'Dry-run commands in browser',        href: 'tools.html#features',         keywords: 'sandbox simulate' },

    // Commands (starter set — proper full library refactor pending #19)
    { type: 'command', title: '/execute', desc: 'Run a command as another entity / context', href: 'resources.html#commands', edition: 'both', keywords: 'as at if unless run store anchored facing rotated align in positioned' },
    { type: 'command', title: '/give',    desc: 'Give an item to a player',                  href: 'resources.html#commands', edition: 'both', keywords: 'item inventory' },
    { type: 'command', title: '/tp',      desc: 'Teleport entities to a location',           href: 'resources.html#commands', edition: 'both', keywords: 'teleport move' },
    { type: 'command', title: '/summon',  desc: 'Spawn an entity at a position',             href: 'resources.html#commands', edition: 'both', keywords: 'spawn mob entity' },
    { type: 'command', title: '/setblock',desc: 'Place a block at a coordinate',             href: 'resources.html#commands', edition: 'both', keywords: 'block place' },
    { type: 'command', title: '/fill',    desc: 'Fill a region with a block',                href: 'resources.html#commands', edition: 'both', keywords: 'cuboid region' },
    { type: 'command', title: '/clone',   desc: 'Copy blocks from one region to another',    href: 'resources.html#commands', edition: 'both', keywords: 'copy paste' },
    { type: 'command', title: '/effect',  desc: 'Apply / clear status effects',              href: 'resources.html#commands', edition: 'both', keywords: 'potion status' },
    { type: 'command', title: '/scoreboard', desc: 'Objectives, scores, teams, tags',        href: 'resources.html#commands', edition: 'both', keywords: 'objective score team' },
    { type: 'command', title: '/tag',     desc: 'Add / remove / list entity tags',           href: 'resources.html#commands', edition: 'both', keywords: 'label group' },
    { type: 'command', title: '/title',   desc: 'Show a title to players',                   href: 'resources.html#commands', edition: 'both', keywords: 'text display' },
    { type: 'command', title: '/playsound', desc: 'Play a sound effect to a player',         href: 'resources.html#commands', edition: 'both', keywords: 'audio music' },
    { type: 'command', title: '/particle',desc: 'Spawn a particle effect',                   href: 'resources.html#commands', edition: 'both', keywords: 'visual effect' },
    { type: 'command', title: '/gamerule',desc: 'Toggle a world gamerule',                   href: 'resources.html#commands', edition: 'both', keywords: 'keepInventory mobGriefing doDaylightCycle' },
    { type: 'command', title: '/gamemode',desc: 'Change a player\'s gamemode',               href: 'resources.html#commands', edition: 'both', keywords: 'survival creative spectator adventure' },
    { type: 'command', title: '/time',    desc: 'Set or query the world time',               href: 'resources.html#commands', edition: 'both', keywords: 'day night' },
    { type: 'command', title: '/weather', desc: 'Change the weather',                        href: 'resources.html#commands', edition: 'both', keywords: 'rain thunder clear' },
    { type: 'command', title: '/function',desc: 'Run a .mcfunction file',                    href: 'resources.html#commands', edition: 'both', keywords: 'mcfunction script' },
    { type: 'command', title: '/schedule',desc: 'Schedule a function to run later',          href: 'resources.html#commands', edition: 'both', keywords: 'delay timer' },
    { type: 'command', title: '/tellraw', desc: 'Send a JSON message to chat',               href: 'resources.html#commands', edition: 'both', keywords: 'chat json text' },

    // Bedrock-only
    { type: 'command', title: '/camera',          desc: 'Cinematic camera control',              href: 'resources.html#commands', edition: 'bedrock', keywords: 'cinematic view' },
    { type: 'command', title: '/dialogue',        desc: 'NPC dialogue scenes',                   href: 'resources.html#commands', edition: 'bedrock', keywords: 'npc text' },
    { type: 'command', title: '/inputpermission', desc: 'Restrict a player\'s inputs',           href: 'resources.html#commands', edition: 'bedrock', keywords: 'lock control' },
    { type: 'command', title: '/tickingarea',     desc: 'Force-load a chunk area',               href: 'resources.html#commands', edition: 'bedrock', keywords: 'chunk loaded' },
    { type: 'command', title: '/mobevent',        desc: 'Toggle mob event spawning',             href: 'resources.html#commands', edition: 'bedrock', keywords: 'spawn event' },
    { type: 'command', title: '/playanimation',   desc: 'Play an entity animation',              href: 'resources.html#commands', edition: 'bedrock', keywords: 'animation visual' },

    // Java-only
    { type: 'command', title: '/advancement', desc: 'Grant or revoke advancements',              href: 'resources.html#commands', edition: 'java', keywords: 'achievement grant revoke' },
    { type: 'command', title: '/bossbar',     desc: 'Custom boss bars at the top of the screen', href: 'resources.html#commands', edition: 'java', keywords: 'boss bar progress' },
    { type: 'command', title: '/datapack',    desc: 'Load / list / disable datapacks',           href: 'resources.html#commands', edition: 'java', keywords: 'pack data' },
    { type: 'command', title: '/forceload',   desc: 'Force a chunk to stay loaded',              href: 'resources.html#commands', edition: 'java', keywords: 'chunk load' },
    { type: 'command', title: '/recipe',      desc: 'Grant / revoke crafting recipes',           href: 'resources.html#commands', edition: 'java', keywords: 'craft recipe unlock' },
    { type: 'command', title: '/team',        desc: 'Create and manage teams',                   href: 'resources.html#commands', edition: 'java', keywords: 'team color friendly' },
    { type: 'command', title: '/trigger',     desc: 'Trigger a scoreboard objective',            href: 'resources.html#commands', edition: 'java', keywords: 'trigger score' },
    { type: 'command', title: '/attribute',   desc: 'Query / modify entity attributes',          href: 'resources.html#commands', edition: 'java', keywords: 'attribute modifier base' },
  ];

  function search(query, { limit = 20 } = {}) {
    const q = String(query || '').trim().toLowerCase();
    if (!q) return [];
    const tokens = q.split(/\s+/).filter(Boolean);
    const currentEd = getEdition();
    const scored = [];
    for (const item of SEARCH_INDEX) {
      // Edition filter: skip items tagged for the other edition unless the
      // query mentions that edition by name.
      if (item.edition && item.edition !== 'both' && item.edition !== currentEd) {
        if (!q.includes(item.edition)) continue;
      }
      const hay = (item.title + ' ' + (item.desc || '') + ' ' + (item.keywords || '')).toLowerCase();
      let score = 0;
      for (const tk of tokens) {
        if (!hay.includes(tk)) { score = 0; break; }
        const titleLc = item.title.toLowerCase();
        if (titleLc.startsWith(tk)) score += 12;
        else if (titleLc.includes(tk)) score += 6;
        if ((item.desc || '').toLowerCase().includes(tk)) score += 2;
        if ((item.keywords || '').toLowerCase().includes(tk)) score += 3;
      }
      if (score > 0) {
        // For command items, rewrite href to the specific row anchor so clicking
        // jumps + highlights that command in resources.html.
        let href = item.href;
        if (item.type === 'command') {
          const slug = item.title.replace(/^\//, '').toLowerCase();
          href = `resources.html#cmd-${slug}`;
        }
        scored.push({ ...item, href, _score: score });
      }
    }
    scored.sort((a, b) => b._score - a._score);
    return scored.slice(0, limit);
  }

  function openSearch() {
    let m = document.getElementById('searchModal');
    if (!m) { m = buildSearchModal(); document.body.appendChild(m); }
    m.classList.add('open');
    document.body.style.overflow = 'hidden';
    const input = m.querySelector('.search-modal-input');
    input.value = '';
    renderSearchResults('', m);
    requestAnimationFrame(() => input.focus());
  }
  function closeSearch() {
    const m = document.getElementById('searchModal');
    if (!m) return;
    m.classList.remove('open');
    document.body.style.overflow = '';
  }
  function buildSearchModal() {
    const m = document.createElement('div');
    m.id = 'searchModal';
    m.className = 'modal search-modal';
    m.innerHTML = `
      <div class="search-modal-card">
        <div class="search-modal-input-row">
          <svg class="search-modal-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
          <input class="search-modal-input" type="text" placeholder="Search commands, lessons, projects, pages…" autocomplete="off" spellcheck="false">
          <kbd class="search-modal-kbd">esc</kbd>
        </div>
        <div class="search-modal-results" id="searchResults">
          <div class="search-empty">Start typing to search across the whole site.</div>
        </div>
        <div class="search-modal-foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> navigate</span>
          <span><kbd>↵</kbd> open</span>
          <span><kbd>esc</kbd> close</span>
        </div>
      </div>`;
    m.addEventListener('click', (e) => {
      if (e.target === m) { closeSearch(); return; }
      // Clicking any result: close the modal so it doesn't sit on top of the
      // destination — the <a href> handles navigation (including hash-only,
      // which won't reload the page).
      if (e.target.closest('.search-result-item')) closeSearch();
    });
    m.querySelector('.search-modal-input').addEventListener('input', (e) => renderSearchResults(e.target.value, m));
    m.querySelector('.search-modal-input').addEventListener('keydown', (e) => onSearchKey(e, m));
    return m;
  }
  function renderSearchResults(query, m) {
    const list = m.querySelector('#searchResults');
    const results = search(query);
    if (!query.trim()) {
      list.innerHTML = '<div class="search-empty">Start typing to search across the whole site.</div>';
      return;
    }
    if (!results.length) {
      list.innerHTML = `<div class="search-empty">No matches for "${escapeHtml(query)}".</div>`;
      return;
    }
    // Group by type for display
    const groups = {};
    for (const r of results) (groups[r.type] = groups[r.type] || []).push(r);
    const order = ['page', 'course', 'project', 'tool', 'command'];
    const typeLabel = { page: 'Pages', course: 'Courses', project: 'Projects', tool: 'Tools', command: 'Commands' };
    const html = order.filter(t => groups[t]).map(t => `
      <div class="search-group-label">${typeLabel[t]}</div>
      ${groups[t].map((r, i) => `
        <a href="${r.href}" class="search-result-item" data-idx="${i}" data-href="${r.href}">
          <div class="search-result-icon">${searchIconFor(r.type)}</div>
          <div class="search-result-body">
            <div class="search-result-title">${escapeHtml(r.title)}${r.edition && r.edition !== 'both' ? `<span class="edition-tag ${r.edition}">${r.edition}</span>` : ''}</div>
            <div class="search-result-desc">${escapeHtml(r.desc || '')}</div>
          </div>
          <svg class="search-result-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </a>`).join('')}
    `).join('');
    list.innerHTML = html;
    // First item highlighted by default
    const first = list.querySelector('.search-result-item');
    if (first) first.classList.add('active');
  }
  function searchIconFor(type) {
    const icons = {
      page:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>',
      course:  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
      project: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6v6H9z"/></svg>',
      tool:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
      command: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>',
    };
    return icons[type] || icons.page;
  }
  function escapeHtml(s) { return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]); }
  function onSearchKey(e, m) {
    const items = [...m.querySelectorAll('.search-result-item')];
    const active = m.querySelector('.search-result-item.active');
    const i = items.indexOf(active);
    if (e.key === 'Escape') { e.preventDefault(); closeSearch(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); if (items.length) { active?.classList.remove('active'); (items[i + 1] || items[0]).classList.add('active'); (items[i + 1] || items[0]).scrollIntoView({ block: 'nearest' }); } }
    else if (e.key === 'ArrowUp')   { e.preventDefault(); if (items.length) { active?.classList.remove('active'); (items[i - 1] || items[items.length - 1]).classList.add('active'); (items[i - 1] || items[items.length - 1]).scrollIntoView({ block: 'nearest' }); } }
    else if (e.key === 'Enter')     { e.preventDefault(); const target = active || items[0]; if (target) { closeSearch(); location.href = target.dataset.href; } }
  }
  function bindSearch() {
    // Click any element with data-search-trigger (or id="searchBtn" for legacy)
    document.addEventListener('click', (e) => {
      const trig = e.target.closest('[data-search-trigger], #searchBtn');
      if (!trig) return;
      e.preventDefault();
      openSearch();
    });
    // Global ⌘K / Ctrl+K shortcut
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        openSearch();
      }
    });
  }

  // ── Staff (moderation + accounts) ─────────────────────
  // Lightweight role check — true if the signed-in user's Firestore doc has 'STAFF' in roles.
  async function isStaff() {
    const acc = getAccount();
    if (!acc) return false;
    // Local-only mode: STAFF role can be set on the local account for testing
    if (Array.isArray(acc.roles) && acc.roles.includes('STAFF')) return true;
    if (!cloudReady()) return false;
    try {
      const ref = cloud.doc(cloud.db, 'users', cloudUser.uid);
      const snap = await cloud.getDoc(ref);
      const data = snap.exists() ? snap.data() : null;
      return Array.isArray(data?.roles) && data.roles.includes('STAFF');
    } catch (e) { console.warn('[cmdblock] isStaff check failed:', e); return false; }
  }
  async function listPendingReviews({ limit = 100 } = {}) {
    if (!cloudReady()) return [];
    try {
      const col = cloud.collection(cloud.db, 'reviews-pending');
      const q = cloud.query(col, cloud.orderBy('createdAt', 'desc'), cloud.limit(limit));
      const snap = await cloud.getDocs(q);
      const out = [];
      snap.forEach(d => { const v = d.data(); out.push({ id: d.id, uid: v.uid, name: v.name, text: v.text, rating: v.rating, createdAt: v.createdAt?.toMillis?.() || Date.now() }); });
      return out;
    } catch (e) { console.warn('[cmdblock] listPendingReviews failed:', e); return []; }
  }
  async function approveReview(id) {
    if (!cloudReady()) throw new Error('Cloud not available.');
    const pendingRef = cloud.doc(cloud.db, 'reviews-pending', id);
    const snap = await cloud.getDoc(pendingRef);
    if (!snap.exists()) throw new Error('Review not found.');
    const data = snap.data();
    // Move to /reviews then delete from /reviews-pending.
    const target = cloud.collection(cloud.db, 'reviews');
    await cloud.addDoc(target, { ...data, approvedBy: cloudUser.uid, approvedAt: cloud.serverTimestamp() });
    await cloud.deleteDoc(pendingRef);
  }
  async function rejectReview(id) {
    if (!cloudReady()) throw new Error('Cloud not available.');
    await cloud.deleteDoc(cloud.doc(cloud.db, 'reviews-pending', id));
  }
  async function listUsers({ limit = 200 } = {}) {
    if (!cloudReady()) return [];
    try {
      const col = cloud.collection(cloud.db, 'users');
      const q = cloud.query(col, cloud.limit(limit));
      const snap = await cloud.getDocs(q);
      const out = [];
      snap.forEach(d => { const v = d.data(); out.push({ uid: d.id, name: v.name, email: v.email, roles: v.roles || [], since: v.since }); });
      return out;
    } catch (e) { console.warn('[cmdblock] listUsers failed:', e); return []; }
  }
  async function updateUser(uid, patch) {
    if (!cloudReady()) throw new Error('Cloud not available.');
    const ref = cloud.doc(cloud.db, 'users', uid);
    await cloud.setDoc(ref, patch, { merge: true });
  }

  // ── One-shot v1 migration ──────────────────────────────
  (function migrate() {
    try {
      if (localStorage.getItem(MIGRATED_FLAG)) return;
      const oldAcc = localStorage.getItem('cmdblock-account');
      if (oldAcc && !localStorage.getItem(ACCOUNT_KEY)) {
        const parsed = JSON.parse(oldAcc);
        if (parsed && (parsed.email || parsed.name)) {
          localStorage.setItem(ACCOUNT_KEY, JSON.stringify({
            name: parsed.name || (parsed.email ? parsed.email.split('@')[0] : 'Player'),
            email: parsed.email || '',
            since: parsed.since || parsed.created || new Date().toISOString(),
            roles: Array.isArray(parsed.roles) ? parsed.roles : (parsed.role ? [parsed.role] : ['NOOBIE']),
          }));
        }
      }
      const oldProg = localStorage.getItem('cmdblock-progress');
      if (oldProg && !localStorage.getItem(PROGRESS_KEY)) {
        const parsed = JSON.parse(oldProg);
        if (parsed && typeof parsed === 'object') {
          localStorage.setItem(PROGRESS_KEY, JSON.stringify(parsed));
        }
      }
      localStorage.setItem(MIGRATED_FLAG, '1');
    } catch (e) { /* best-effort */ }
  })();

  // ── Storage helpers ────────────────────────────────────
  function getAccount() { try { return JSON.parse(localStorage.getItem(ACCOUNT_KEY)) || null; } catch { return null; } }
  function setAccount(a) {
    localStorage.setItem(ACCOUNT_KEY, JSON.stringify(a));
    if (a?.email) localStorage.setItem(KNOWN_USER_KEY, JSON.stringify({ name: a.name, email: a.email }));
    updateAccountCtaUI();
    window.dispatchEvent(new CustomEvent('cmdblock:account', { detail: { account: a } }));
    // Mirror to cloud
    cloudWrite({ name: a?.name, roles: a?.roles, since: a?.since });
  }
  function clearAccount() {
    localStorage.removeItem(ACCOUNT_KEY);
    localStorage.removeItem(PROGRESS_KEY);
    updateAccountCtaUI();
    window.dispatchEvent(new CustomEvent('cmdblock:account', { detail: { account: null } }));
    // Sign out of Firebase too if signed in
    if (cloudReady()) { try { cloud.signOut(cloud.auth); } catch {} }
  }
  function getKnownUser() { try { return JSON.parse(localStorage.getItem(KNOWN_USER_KEY)) || null; } catch { return null; } }
  function getProgress() { try { return JSON.parse(localStorage.getItem(PROGRESS_KEY)) || {}; } catch { return {}; } }
  function setProgress(p) {
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(p));
    cloudWrite({ progress: p });
  }
  function getPrefs() { try { return JSON.parse(localStorage.getItem(PREFS_KEY)) || { edition: 'bedrock' }; } catch { return { edition: 'bedrock' }; } }
  function setPrefs(p) { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); }

  // ── Role system (matches old site) ─────────────────────
  // NOOBIE → FRESHMAN → JUNIOR → SENIOR · TINKERER (project earner) · OWNER (admin)
  const ROLES = {
    NOOBIE:   { color: '#8B5E3C', label: 'Noobie',   weight: 0 },
    FRESHMAN: { color: '#5D9B3C', label: 'Freshman', weight: 1 },
    JUNIOR:   { color: '#2EAAA0', label: 'Junior',   weight: 2 },
    SENIOR:   { color: '#9B59B6', label: 'Senior',   weight: 3 },
    TINKERER: { color: '#E67E22', label: 'Tinkerer', weight: 4 },
    OWNER:    { color: '#E74C3C', label: 'Owner',    weight: 5 },
    MEMBER:   { color: '#55FF55', label: 'Member',   weight: 0 },
  };

  // Auto-promote based on lesson completion (does NOT remove explicit roles like OWNER, TINKERER)
  function computeRoles(account, progress) {
    const explicit = (account?.roles || []).filter(r => typeof r === 'string').map(r => r.toUpperCase());
    const total = Object.values(progress || {}).reduce((s, p) => s + (p?.completed || 0), 0);
    const projTotal = ['projects-easy', 'projects-medium', 'projects-hard'].reduce((s, k) => s + (progress?.[k]?.completed || 0), 0);

    // Auto-leveled role from total lessons
    let level = 'NOOBIE';
    if (total >= 26) level = 'SENIOR';
    else if (total >= 11) level = 'JUNIOR';
    else if (total >= 1)  level = 'FRESHMAN';

    // Tinkerer if they've shipped any project
    const out = new Set(explicit.length ? explicit : []);
    out.add(level);
    if (projTotal >= 4) out.add('TINKERER');

    // Sort by weight desc so primary role is the highest
    return [...out].sort((a, b) => (ROLES[b]?.weight || 0) - (ROLES[a]?.weight || 0));
  }

  function roleBadgeHTML(role, opts = {}) {
    const r = ROLES[role] || ROLES.MEMBER;
    const sz = opts.size === 'sm'
      ? 'font-size:0.55rem;padding:2px 7px;'
      : 'font-size:0.62rem;padding:3px 10px;';
    return `<span class="role-badge" style="background:${r.color};color:#fff;font-family:'Silkscreen',monospace;letter-spacing:1px;border-radius:999px;${sz};text-transform:uppercase;display:inline-block;">${r.label.toUpperCase()}</span>`;
  }

  // ── Active nav highlight ───────────────────────────────
  function highlightActiveNav() {
    const path = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    document.querySelectorAll('.nav-links a, .mobile-nav a').forEach(a => {
      const href = (a.getAttribute('href') || '').toLowerCase().split('?')[0];
      if (href && (href === path || (path === '' && href === 'index.html'))) a.classList.add('active');
    });
  }

  // ── Mobile nav ────────────────────────────────────────
  function bindMobileNav() {
    const btn = document.getElementById('menuBtn');
    const nav = document.getElementById('mobileNav');
    if (!btn || !nav) return;
    btn.addEventListener('click', () => nav.classList.toggle('open'));
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));
  }

  // ── Reveal ────────────────────────────────────────────
  // No-op. .reveal items are visible by default via CSS (opacity:1). Earlier we tried
  // a fade-up via .reveal-pending → .visible, but it caused a brief flash on first
  // paint (default opacity:1 → JS sets 0 → animates back to 1) and the timing was
  // fragile across browsers. Content-first wins; the animation wasn't load-bearing.
  function bindReveal() { /* intentionally empty */ }

  // ── Edition (Bedrock / Java) ──────────────────────────
  // Global preference: setting on one page persists to all pages via prefs.
  // Pages that care (learn, tools, lesson) listen for 'cmdblock:edition' events.
  function getEdition() { return getPrefs().edition === 'java' ? 'java' : 'bedrock'; }
  function setEdition(ed) {
    const e = ed === 'java' ? 'java' : 'bedrock';
    if (getEdition() === e) return;
    setPrefs({ ...getPrefs(), edition: e });
    document.documentElement.setAttribute('data-edition', e);
    window.dispatchEvent(new CustomEvent('cmdblock:edition', { detail: { edition: e } }));
  }
  function applyEditionToDocument() {
    document.documentElement.setAttribute('data-edition', getEdition());
  }

  // ── Theme (dark / light) ──────────────────────────────
  // Global preference saved in prefs.theme. Light mode is opt-in — site stays
  // dark by default to match the existing Minecraft-y aesthetic.
  function getTheme() { return getPrefs().theme === 'light' ? 'light' : 'dark'; }
  function setTheme(t) {
    const next = t === 'light' ? 'light' : 'dark';
    if (getTheme() === next) return;
    setPrefs({ ...getPrefs(), theme: next });
    document.documentElement.setAttribute('data-theme', next);
    window.dispatchEvent(new CustomEvent('cmdblock:theme', { detail: { theme: next } }));
  }
  function applyThemeToDocument() {
    document.documentElement.setAttribute('data-theme', getTheme());
  }
  // ── Membership gating ─────────────────────────────────
  // Free for everyone: Iron + Emerald courses, command generator, Easy + Medium projects.
  // Members-only (any signed-in account): Diamond + Netherite courses, tools 2/3/4, Hard projects.
  // Progress tracking stays available to everyone (works on localStorage even without account).
  const LOCKED = {
    course: new Set(['diamond', 'netherite', 'bedrock-diamond', 'bedrock-netherite', 'java-diamond', 'java-netherite']),
    project: new Set(['hard']),
    tool: new Set(['target-selector', 'syntax-checker', 'command-sandbox']),
  };
  function isLocked(tierStr) {
    if (getAccount()) return false; // signed in → nothing locked
    if (!tierStr) return false;
    const [type, id] = String(tierStr).split(':');
    return LOCKED[type]?.has(id) || false;
  }
  function refreshLocks() {
    document.querySelectorAll('[data-lock-tier]').forEach(el => {
      const locked = isLocked(el.dataset.lockTier);
      el.classList.toggle('locked', locked);
      const wantsBigCta = el.classList.contains('tool-card');
      if (locked) {
        if (!el.querySelector(':scope > .lock-badge')) {
          const badge = document.createElement('div');
          badge.className = 'lock-badge';
          badge.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg><span>Members</span>';
          el.appendChild(badge);
        }
        if (wantsBigCta && !el.querySelector(':scope > .lock-cta')) {
          const cta = document.createElement('div');
          cta.className = 'lock-cta';
          cta.innerHTML = '<div class="lock-cta-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div><div class="lock-cta-title">MEMBERS ONLY</div><div class="lock-cta-sub">Sign up free to unlock this tool.</div><button class="btn btn-primary btn-sm" type="button">Create account</button>';
          el.appendChild(cta);
        }
      } else {
        el.querySelector(':scope > .lock-badge')?.remove();
        el.querySelector(':scope > .lock-cta')?.remove();
      }
    });
  }
  function bindLockedCards() {
    // Intercept clicks on locked elements (capture phase to beat in-card link handlers).
    document.addEventListener('click', (e) => {
      const el = e.target.closest('[data-lock-tier]');
      if (!el || !isLocked(el.dataset.lockTier)) return;
      e.preventDefault();
      e.stopPropagation();
      openModal('signupModal');
    }, true);
    window.addEventListener('cmdblock:account', refreshLocks);
    refreshLocks();
  }

  // ── Expandable tabs ───────────────────────────────────
  // Wires any [data-extabs] group: click a tab to "select" (expand its label).
  // Click outside the group collapses everything. Group emits an `extab:change`
  // event with { index, key } so callers can react.
  function bindExpandableTabs() {
    const groups = document.querySelectorAll('[data-extabs]');
    if (!groups.length) return;
    groups.forEach(group => {
      if (group.dataset.extabBound) return;
      group.dataset.extabBound = '1';
      group.addEventListener('click', (e) => {
        const tab = e.target.closest('.extab');
        if (!tab || !group.contains(tab)) return;
        const tabs = [...group.querySelectorAll('.extab')];
        const idx = tabs.indexOf(tab);
        const wasSelected = tab.classList.contains('selected');
        tabs.forEach(t => t.classList.remove('selected'));
        if (!wasSelected) tab.classList.add('selected');
        group.dispatchEvent(new CustomEvent('extab:change', {
          detail: { index: wasSelected ? -1 : idx, key: wasSelected ? null : tab.dataset.key, tab: wasSelected ? null : tab },
        }));
      });
    });
    // Click-outside collapses any open extab group (capture so it beats other handlers).
    if (!document.__extabOutsideBound) {
      document.__extabOutsideBound = true;
      document.addEventListener('click', (e) => {
        document.querySelectorAll('[data-extabs]').forEach(group => {
          if (group.contains(e.target)) return;
          const active = group.querySelectorAll('.extab.selected');
          if (!active.length) return;
          active.forEach(t => t.classList.remove('selected'));
          group.dispatchEvent(new CustomEvent('extab:change', { detail: { index: -1, key: null, tab: null } }));
        });
      }, true);
    }
  }

  function bindEditionSwitcher() {
    const btns = document.querySelectorAll('[data-edition-switcher]');
    if (!btns.length) return;
    function paint() {
      const ed = getEdition();
      btns.forEach(btn => {
        btn.dataset.edition = ed;
        const img = btn.querySelector('img');
        if (img) img.src = 'assets/icons/' + (ed === 'java' ? 'Grass_Block.png' : 'bedrock.png');
        btn.title = 'Edition: ' + ed.toUpperCase() + ' — click to switch';
        btn.setAttribute('aria-label', 'Switch edition (currently ' + ed + ')');
      });
    }
    btns.forEach(btn => btn.addEventListener('click', () => setEdition(getEdition() === 'bedrock' ? 'java' : 'bedrock')));
    window.addEventListener('cmdblock:edition', paint);
    paint();
  }

  // ── Modals (smooth) ───────────────────────────────────
  let lastFocus = null;
  function openModal(id) {
    const m = document.getElementById(id);
    if (!m) return;
    lastFocus = document.activeElement;
    m.classList.add('open');
    document.body.style.overflow = 'hidden';
    // Focus first input for smooth keyboard flow
    requestAnimationFrame(() => {
      const inp = m.querySelector('input:not([type=hidden]), button.modal-submit, button.btn-primary');
      inp?.focus({ preventScroll: true });
    });
  }
  function closeModal(id) {
    const m = document.getElementById(id);
    if (!m) return;
    m.classList.add('closing');
    setTimeout(() => {
      m.classList.remove('open', 'closing');
      document.body.style.overflow = '';
      if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
    }, 180);
  }
  function bindModals() {
    document.querySelectorAll('.modal').forEach(m => {
      m.addEventListener('click', (e) => { if (e.target === m) closeModal(m.id); });
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') document.querySelectorAll('.modal.open').forEach(m => closeModal(m.id));
    });
  }

  // ── Confetti ──────────────────────────────────────────
  function confetti(origin) {
    if (getPrefs().reduceMotion) return;
    const c = document.createElement('div');
    c.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden;';
    document.body.appendChild(c);
    const colors = ['#55FF55','#FFE94A','#4AEDD9','#B266FF','#FF5C5C','#77FF77'];
    const N = 60;
    for (let i = 0; i < N; i++) {
      const p = document.createElement('span');
      const sz = 6 + Math.random() * 6;
      const ang = Math.random() * Math.PI * 2;
      const vel = 140 + Math.random() * 180;
      const dx = Math.cos(ang) * vel;
      const dy = Math.sin(ang) * vel - 80;
      p.style.cssText = `position:absolute;left:${origin.x}px;top:${origin.y}px;width:${sz}px;height:${sz}px;background:${colors[i%colors.length]};border-radius:${Math.random()<0.4?'50%':'2px'};transform:translate(-50%,-50%);transition:transform 900ms cubic-bezier(0.18,0.8,0.32,1),opacity 900ms ease-out;`;
      c.appendChild(p);
      requestAnimationFrame(() => {
        p.style.transform = `translate(calc(-50% + ${dx}px),calc(-50% + ${dy + 200}px)) rotate(${Math.random()*720}deg)`;
        p.style.opacity = '0';
      });
    }
    setTimeout(() => c.remove(), 1100);
  }

  // ── Toast system (replaces alert()) ───────────────────
  function ensureToastHost() {
    let host = document.getElementById('toastHost');
    if (!host) {
      host = document.createElement('div');
      host.id = 'toastHost';
      host.className = 'toast-host';
      document.body.appendChild(host);
    }
    return host;
  }
  function toast(message, opts = {}) {
    const host = ensureToastHost();
    const variant = opts.variant || 'info';
    const t = document.createElement('div');
    t.className = `toast toast-${variant}`;
    const ICONS = {
      info:    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>',
      success: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>',
      error:   '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>',
      warning: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
    };
    t.innerHTML = `<span class="toast-icon">${ICONS[variant] || ICONS.info}</span><span class="toast-msg">${message}</span><button class="toast-close" aria-label="Dismiss"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>`;
    host.appendChild(t);
    requestAnimationFrame(() => t.classList.add('in'));
    function dismiss() {
      t.classList.remove('in');
      t.classList.add('out');
      setTimeout(() => t.remove(), 240);
    }
    t.querySelector('.toast-close').addEventListener('click', dismiss);
    if (opts.duration !== 0) setTimeout(dismiss, opts.duration || 3600);
    return { dismiss };
  }

  // ── Custom confirm (replaces window.confirm) ──────────
  function confirmDialog(message, opts = {}) {
    return new Promise((resolve) => {
      const m = document.createElement('div');
      m.className = 'modal open';
      m.id = 'confirmDialog_' + Math.random().toString(36).slice(2, 8);
      const isDanger = !!opts.danger;
      m.innerHTML = `
        <div class="modal-card" style="max-width:420px;">
          <h2 style="font-size:0.95rem;">${opts.title || 'CONFIRM'}</h2>
          <p class="modal-sub" style="margin-bottom:22px;">${message}</p>
          <div style="display:flex;gap:10px;">
            <button class="btn btn-ghost" data-act="cancel" style="flex:1;justify-content:center;padding:12px;">${opts.cancelLabel || 'Cancel'}</button>
            <button class="btn ${isDanger ? 'btn-danger' : 'btn-primary'}" data-act="ok" style="flex:1;justify-content:center;padding:12px;">${opts.okLabel || (isDanger ? 'Delete' : 'Confirm')}</button>
          </div>
        </div>`;
      document.body.appendChild(m);
      document.body.style.overflow = 'hidden';
      function finish(result) {
        m.classList.add('closing');
        setTimeout(() => { m.remove(); document.body.style.overflow = ''; resolve(result); }, 180);
      }
      m.addEventListener('click', (e) => {
        if (e.target === m) finish(false);
        const b = e.target.closest('[data-act]');
        if (b) finish(b.dataset.act === 'ok');
      });
      const onKey = (e) => {
        if (e.key === 'Escape') { document.removeEventListener('keydown', onKey); finish(false); }
        if (e.key === 'Enter') { document.removeEventListener('keydown', onKey); finish(true); }
      };
      document.addEventListener('keydown', onKey);
      requestAnimationFrame(() => m.querySelector('[data-act=ok]').focus());
    });
  }

  // ── Custom prompt (replaces window.prompt) ────────────
  function promptDialog(message, defaultValue = '', opts = {}) {
    return new Promise((resolve) => {
      const m = document.createElement('div');
      m.className = 'modal open';
      m.innerHTML = `
        <div class="modal-card" style="max-width:420px;">
          <h2 style="font-size:0.95rem;">${opts.title || 'INPUT'}</h2>
          <p class="modal-sub">${message}</p>
          <input class="input" type="text" value="${(defaultValue || '').replace(/"/g, '&quot;')}" maxlength="${opts.maxlength || 64}" data-prompt-input style="margin:8px 0 18px;">
          <div style="display:flex;gap:10px;">
            <button class="btn btn-ghost" data-act="cancel" style="flex:1;justify-content:center;padding:12px;">Cancel</button>
            <button class="btn btn-primary" data-act="ok" style="flex:1;justify-content:center;padding:12px;">${opts.okLabel || 'Save'}</button>
          </div>
        </div>`;
      document.body.appendChild(m);
      document.body.style.overflow = 'hidden';
      const input = m.querySelector('[data-prompt-input]');
      function finish(result) {
        m.classList.add('closing');
        setTimeout(() => { m.remove(); document.body.style.overflow = ''; resolve(result); }, 180);
      }
      m.addEventListener('click', (e) => {
        if (e.target === m) finish(null);
        const b = e.target.closest('[data-act]');
        if (b) finish(b.dataset.act === 'ok' ? input.value : null);
      });
      const onKey = (e) => {
        if (e.key === 'Escape') { document.removeEventListener('keydown', onKey); finish(null); }
        if (e.key === 'Enter') { document.removeEventListener('keydown', onKey); finish(input.value); }
      };
      document.addEventListener('keydown', onKey);
      requestAnimationFrame(() => { input.focus(); input.select(); });
    });
  }

  // ── Password reveal toggles (auto-wired) ──────────────
  function bindPasswordReveal() {
    document.querySelectorAll('input[type=password]').forEach(input => {
      if (input.dataset.revealBound) return;
      input.dataset.revealBound = '1';
      // Wrap in a div so the eye button can sit absolutely positioned
      const wrap = document.createElement('div');
      wrap.className = 'password-wrap';
      // Preserve flex/grid layout: copy the input's flex class context by giving the wrap flex:1
      input.parentNode.insertBefore(wrap, input);
      wrap.appendChild(input);
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'password-reveal';
      btn.setAttribute('aria-label', 'Show password');
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>';
      wrap.appendChild(btn);
      btn.addEventListener('click', () => {
        const showing = input.type === 'text';
        input.type = showing ? 'password' : 'text';
        btn.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
        btn.innerHTML = showing
          ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z"/><circle cx="12" cy="12" r="3"/></svg>'
          : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-10-7-10-7a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 10 7 10 7a18.5 18.5 0 0 1-2.16 3.19"/><path d="m1 1 22 22"/><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24"/></svg>';
      });
    });
  }

  // ── Inline validation helpers ──────────────────────────
  function setFieldError(input, msg) {
    const wrap = input.closest('.field') || input.parentElement;
    let err = wrap?.querySelector('.field-error');
    if (!err) {
      err = document.createElement('div');
      err.className = 'field-error';
      input.insertAdjacentElement('afterend', err);
    }
    err.textContent = msg || '';
    input.classList.toggle('error', !!msg);
  }
  function clearFieldError(input) { setFieldError(input, ''); }

  // ── Smooth form submit (loading → success) ─────────────
  function smoothSubmit(form, handler) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = form.querySelector('button[type=submit]');
      const errEl = form.querySelector('.modal-error');
      if (errEl) errEl.textContent = '';
      const originalHTML = btn ? btn.innerHTML : '';
      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="btn-spinner"></span> Please wait…';
      }
      try {
        const res = await Promise.resolve(handler(form));
        if (res?.ok) {
          if (btn) btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" width="16" height="16"><polyline points="20 6 9 17 4 12"/></svg> ' + (res.label || 'Done');
          if (res.confetti) {
            const r = btn?.getBoundingClientRect();
            if (r) confetti({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
          }
          setTimeout(() => res.after?.(), 600);
        } else {
          if (btn) { btn.disabled = false; btn.innerHTML = originalHTML; }
          if (errEl) errEl.textContent = res?.error || 'Something went wrong';
        }
      } catch (err) {
        if (btn) { btn.disabled = false; btn.innerHTML = originalHTML; }
        if (errEl) errEl.textContent = err?.message || 'Something went wrong';
      }
    });
  }

  // ── Auth flow ─────────────────────────────────────────
  function bindAuthForms() {
    // Signup
    const signupForm = document.getElementById('signupForm');
    if (signupForm) {
      signupForm.querySelectorAll('input').forEach(i => i.addEventListener('input', () => clearFieldError(i)));
      smoothSubmit(signupForm, async (f) => {
        const name = f.querySelector('[name=name]')?.value.trim();
        const email = f.querySelector('[name=email]')?.value.trim();
        const pass = f.querySelector('[name=password]')?.value;
        const confirm = f.querySelector('[name=confirm]')?.value;
        if (!name) return { error: 'Name is required' };
        if (!/^\S+@\S+\.\S+$/.test(email)) return { error: 'Please enter a valid email' };
        if (!pass || pass.length < 6) return { error: 'Password must be at least 6 characters' };
        if (pass !== confirm) return { error: 'Passwords don\'t match' };

        // If Firebase is configured, use real auth
        if (cloud) {
          try {
            const cred = await cloud.createUserWithEmailAndPassword(cloud.auth, email, pass);
            await cloud.updateProfile(cred.user, { displayName: name });
            // onAuthStateChanged will create/sync the user doc
          } catch (err) {
            return { error: humanizeAuthError(err) };
          }
        } else {
          setAccount({ name, email, since: new Date().toISOString(), roles: ['NOOBIE'] });
        }
        pushToSheet({ name, email });
        return {
          ok: true,
          label: 'Welcome!',
          confetti: true,
          after: () => {
            closeModal('signupModal');
            f.reset();
            toast(`Welcome to cmdblock, ${name}! Your progress is saved${cloud ? ' to the cloud and syncs across devices.' : ' automatically.'}`, { variant: 'success', duration: 5000 });
          },
        };
      });
    }

    // Signin
    const signinForm = document.getElementById('signinForm');
    if (signinForm) {
      signinForm.querySelectorAll('input').forEach(i => i.addEventListener('input', () => clearFieldError(i)));
      smoothSubmit(signinForm, async (f) => {
        const email = f.querySelector('[name=email]')?.value.trim();
        const pass = f.querySelector('[name=password]')?.value || '';
        if (!/^\S+@\S+\.\S+$/.test(email)) return { error: 'Please enter a valid email' };

        if (cloud) {
          try {
            await cloud.signInWithEmailAndPassword(cloud.auth, email, pass);
          } catch (err) {
            return { error: humanizeAuthError(err) };
          }
        } else {
          const known = getKnownUser();
          const name = known?.email === email ? known.name : email.split('@')[0];
          const existing = getAccount();
          setAccount({ name, email, since: existing?.since || new Date().toISOString(), roles: existing?.roles || ['NOOBIE'] });
        }
        return {
          ok: true,
          label: 'Signed in',
          after: () => {
            closeModal('signinModal');
            f.reset();
            const name = getAccount()?.name || email.split('@')[0];
            toast(`Welcome back, ${name}!`, { variant: 'success' });
          },
        };
      });
    }

    injectGoogleSignIn();
  }

  // Inject "Continue with Google" button into both auth modals when cloud is ready
  function injectGoogleSignIn() {
    const tryInject = () => {
      if (!cloud) return;
      ['signupForm', 'signinForm'].forEach(formId => {
        const form = document.getElementById(formId);
        if (!form || form.dataset.googleInjected) return;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'btn btn-ghost google-btn';
        btn.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
          Continue with Google
        `;
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          const orig = btn.innerHTML;
          btn.innerHTML = '<span class="btn-spinner"></span> Opening Google…';
          try {
            const provider = new cloud.GoogleAuthProvider();
            await cloud.signInWithPopup(cloud.auth, provider);
            closeModal(formId === 'signupForm' ? 'signupModal' : 'signinModal');
            toast('Signed in with Google', { variant: 'success' });
          } catch (err) {
            const errEl = form.querySelector('.modal-error');
            if (errEl) errEl.textContent = humanizeAuthError(err);
            btn.disabled = false;
            btn.innerHTML = orig;
          }
        });
        // Build a small "or" divider
        const divider = document.createElement('div');
        divider.className = 'auth-divider';
        divider.innerHTML = '<span>or</span>';
        // Insert at the top of the form (before first input)
        form.insertBefore(divider, form.firstChild);
        form.insertBefore(btn, form.firstChild);
        form.dataset.googleInjected = '1';
      });
    };
    // Cloud loads asynchronously — retry shortly after page load
    tryInject();
    let tries = 0;
    const iv = setInterval(() => {
      tryInject();
      tries++;
      if (cloud || tries > 20) clearInterval(iv);
    }, 250);
  }

  // ── Welcome-back modal ────────────────────────────────
  function maybeShowWelcomeBack() {
    if (getAccount()) return; // already signed in
    const known = getKnownUser();
    if (!known?.email) return;
    if (sessionStorage.getItem('cmdblock-wb-shown')) return; // once per session
    sessionStorage.setItem('cmdblock-wb-shown', '1');
    // Build welcome-back modal if missing
    let m = document.getElementById('welcomeBackModal');
    if (!m) {
      m = document.createElement('div');
      m.id = 'welcomeBackModal';
      m.className = 'modal';
      m.innerHTML = `
        <div class="modal-card" style="text-align:center;">
          <button class="modal-close" onclick="cmdblock.closeModal('welcomeBackModal')" aria-label="Close">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
          <div style="width:56px;height:56px;border-radius:14px;background:rgba(85,255,85,0.08);border:1px solid rgba(85,255,85,0.18);display:inline-flex;align-items:center;justify-content:center;color:var(--cmd-green);margin-bottom:14px;">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          </div>
          <h2>WELCOME BACK</h2>
          <p class="modal-sub">Sign in as <strong style="color:var(--cmd-green);">${known.name || known.email}</strong>?</p>
          <button class="btn btn-primary" style="width:100%;justify-content:center;padding:13px;margin-bottom:8px;" onclick="cmdblock.quickSignIn()">Yes, sign in</button>
          <button class="btn btn-ghost" style="width:100%;justify-content:center;padding:12px;" onclick="cmdblock.closeModal('welcomeBackModal')">Not now</button>
        </div>`;
      document.body.appendChild(m);
      m.addEventListener('click', (e) => { if (e.target === m) closeModal('welcomeBackModal'); });
    }
    setTimeout(() => openModal('welcomeBackModal'), 700);
  }

  function quickSignIn() {
    const known = getKnownUser();
    if (!known?.email) { closeModal('welcomeBackModal'); return; }
    const existing = getAccount();
    setAccount({ name: known.name, email: known.email, since: existing?.since || new Date().toISOString(), roles: existing?.roles || ['NOOBIE'] });
    closeModal('welcomeBackModal');
  }

  // ── Account CTA ───────────────────────────────────────
  function updateAccountCtaUI() {
    const account = getAccount();
    document.querySelectorAll('[data-account-cta]').forEach(el => {
      if (account?.email) {
        el.innerHTML = '';
        el.textContent = account.name || 'Profile';
        el.href = 'profile.html';
        el.classList.add('signed-in');
        el.onclick = null;
      } else {
        el.textContent = 'Sign Up';
        el.href = '#';
        el.classList.remove('signed-in');
        el.onclick = (e) => { e.preventDefault(); openModal('signupModal'); };
      }
    });
  }

  // ── Marquee duplication ───────────────────────────────
  function bindMarquee() {
    const m = document.getElementById('marquee');
    if (m && !m.dataset.dupe) { m.innerHTML = m.innerHTML + m.innerHTML; m.dataset.dupe = '1'; }
  }

  // ── Bento spotlight ───────────────────────────────────
  function bindBentoSpotlight() {
    document.querySelectorAll('.bento-card').forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const r = card.getBoundingClientRect();
        card.style.setProperty('--mx', ((e.clientX - r.left) / r.width) * 100 + '%');
        card.style.setProperty('--my', ((e.clientY - r.top) / r.height) * 100 + '%');
      });
    });
  }

  // ── Animated counters ─────────────────────────────────
  function bindCounters() {
    const els = document.querySelectorAll('.stat-num[data-count], .stat-num[data-text]');
    if (!els.length) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          if (el.dataset.text) { el.textContent = el.dataset.text; io.unobserve(el); return; }
          const target = parseFloat(el.dataset.count);
          const suffix = el.dataset.suffix || '';
          const dur = 1400;
          const start = performance.now();
          (function tick(now) {
            const t = Math.min((now - start) / dur, 1);
            const v = Math.round(target * (1 - Math.pow(1 - t, 3)));
            el.textContent = v + suffix;
            if (t < 1) requestAnimationFrame(tick);
          })(start);
          io.unobserve(el);
        }
      });
    }, { threshold: 0.5 });
    els.forEach(el => io.observe(el));
  }

  // ── Public API ─────────────────────────────────────────
  window.cmdblock = {
    getAccount, setAccount, clearAccount,
    getProgress, setProgress,
    getPrefs, setPrefs,
    getEdition, setEdition,
    getTheme, setTheme,
    isLocked, refreshLocks,
    bindExpandableTabs,
    search, openSearch, closeSearch,
    listReviews, submitReview, REVIEW_MAX,
    isStaff, listPendingReviews, approveReview, rejectReview, listUsers, updateUser,
    getKnownUser,
    computeRoles, roleBadgeHTML, ROLES,
    openModal, closeModal, quickSignIn,
    confetti,
    toast,
    confirm: confirmDialog,
    prompt: promptDialog,
    pushToSheet,
    isCloudReady: () => !!cloud,
  };
  window.openModal = openModal;
  window.closeModal = closeModal;

  // ── Init ───────────────────────────────────────────────
  function init() {
    // Skip everything if maintenance overlay is active — body is wiped, no
    // elements to bind, no Firebase activity, no surface for tampering.
    if (window.__cb_maint__) return;
    applyEditionToDocument();
    applyThemeToDocument();
    bindMobileNav();
    bindReveal();
    bindEditionSwitcher();
    bindLockedCards();
    bindSearch();
    bindExpandableTabs();
    bindModals();
    bindAuthForms();
    bindMarquee();
    bindBentoSpotlight();
    bindCounters();
    bindPasswordReveal();
    highlightActiveNav();
    updateAccountCtaUI();
    maybeShowWelcomeBack();
    // Kick off Firebase init in the background (no await — UI doesn't block)
    initCloud().catch(() => {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
