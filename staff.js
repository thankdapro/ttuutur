/* ── CMDBLOCK STAFF PANEL ─────────────────────────────────
 * Internal, hidden page. Gated by:
 *   1) signed in (any account)
 *   2) STAFF role on the user's Firestore doc (set manually in Firebase console)
 * Loaded only on staff.html — kept out of the main cmdblock.js bundle so
 * regular visitors never download moderation code.
 * ──────────────────────────────────────────────────────── */
(function () {
  'use strict';

  const root = document.getElementById('staffRoot');

  function escape(s) {
    return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
  }
  function fmtDate(ts) {
    const d = new Date(ts);
    return isNaN(d.getTime()) ? '' : d.toLocaleString();
  }
  function starChars(n) {
    n = Math.max(1, Math.min(5, parseInt(n, 10) || 0));
    return '★'.repeat(n) + '☆'.repeat(5 - n);
  }

  function renderGate(msg, opts = {}) {
    const showSignIn = opts.showSignIn !== false;
    root.innerHTML = `
      <div class="gate">
        <h2>${escape(opts.title || 'STAFF ONLY')}</h2>
        <p>${escape(msg)}</p>
        ${showSignIn ? `
          <div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;">
            <button class="btn btn-primary" onclick="cmdblock.openModal('signinModal')">Sign in</button>
            <a href="index.html" class="btn btn-ghost">Back to site</a>
          </div>` : `<a href="index.html" class="btn btn-ghost">Back to site</a>`}
      </div>`;
  }

  function renderPanel() {
    root.innerHTML = `
      <div class="staff-tabs">
        <button class="staff-tab active" data-tab="pending">Pending reviews <span class="count" id="pendingCount">…</span></button>
        <button class="staff-tab" data-tab="users">Users <span class="count" id="userCount">…</span></button>
      </div>
      <div class="panel active" id="panelPending">
        <div class="loading">Loading pending reviews…</div>
      </div>
      <div class="panel" id="panelUsers">
        <div class="search-row">
          <input class="search-input" id="userSearch" type="text" placeholder="Search by name or email…">
        </div>
        <div id="userList"><div class="loading">Loading users…</div></div>
      </div>`;

    const tabs = root.querySelectorAll('.staff-tab');
    tabs.forEach(t => t.addEventListener('click', () => {
      tabs.forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      root.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      const target = 'panel' + t.dataset.tab.charAt(0).toUpperCase() + t.dataset.tab.slice(1);
      document.getElementById(target).classList.add('active');
    }));

    loadPending();
    loadUsers();

    document.getElementById('userSearch').addEventListener('input', filterUsers);
  }

  // ── Pending reviews ─────────────────────────────────────
  async function loadPending() {
    const panel = document.getElementById('panelPending');
    const countEl = document.getElementById('pendingCount');
    try {
      const items = await cmdblock.listPendingReviews({ limit: 100 });
      countEl.textContent = items.length;
      if (!items.length) {
        panel.innerHTML = '<div class="empty">No reviews waiting. Good day to be staff.</div>';
        return;
      }
      panel.innerHTML = items.map(r => `
        <div class="moderation-card" data-id="${escape(r.id)}">
          <div class="meta">
            <span><span class="name">${escape(r.name || 'Anonymous')}</span> <span class="stars">${starChars(r.rating)}</span> <span style="color:var(--text-faint);font-size:0.75rem;">(${r.rating}/5)</span></span>
            <span class="date">${escape(fmtDate(r.createdAt))}</span>
          </div>
          <div class="text">${escape(r.text)}</div>
          <div class="actions">
            <button class="btn btn-primary btn-sm" data-act="approve">Approve & publish</button>
            <button class="btn btn-ghost btn-sm" data-act="reject" style="color:var(--cmd-red);border-color:rgba(255,92,92,0.3);">Reject</button>
          </div>
        </div>`).join('');
      panel.addEventListener('click', onModerateClick, { once: false });
    } catch (e) {
      panel.innerHTML = `<div class="empty">Could not load pending reviews: ${escape(e.message || e)}</div>`;
    }
  }

  async function onModerateClick(e) {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const card = btn.closest('.moderation-card');
    const id = card.dataset.id;
    const act = btn.dataset.act;
    if (act === 'reject') {
      const ok = await (cmdblock.confirm?.('Reject this review? It will be deleted permanently.', { confirmText: 'Reject', confirmVariant: 'danger' }) ?? confirm('Reject this review?'));
      if (!ok) return;
    }
    btn.disabled = true;
    try {
      if (act === 'approve') await cmdblock.approveReview(id);
      else await cmdblock.rejectReview(id);
      card.remove();
      const remaining = document.querySelectorAll('#panelPending .moderation-card').length;
      document.getElementById('pendingCount').textContent = remaining;
      cmdblock.toast?.(act === 'approve' ? 'Review approved.' : 'Review rejected.', { variant: act === 'approve' ? 'success' : 'info' });
      if (remaining === 0) {
        document.getElementById('panelPending').innerHTML = '<div class="empty">No reviews waiting. Good day to be staff.</div>';
      }
    } catch (e) {
      btn.disabled = false;
      cmdblock.toast?.(`${act === 'approve' ? 'Approve' : 'Reject'} failed: ${e.message || e}`, { variant: 'error', duration: 5000 });
    }
  }

  // ── Users ───────────────────────────────────────────────
  let usersCache = [];

  async function loadUsers() {
    const list = document.getElementById('userList');
    const countEl = document.getElementById('userCount');
    try {
      usersCache = await cmdblock.listUsers({ limit: 500 });
      countEl.textContent = usersCache.length;
      renderUserList(usersCache);
    } catch (e) {
      list.innerHTML = `<div class="empty">Could not load users: ${escape(e.message || e)}</div>`;
    }
  }

  function renderUserList(users) {
    const list = document.getElementById('userList');
    if (!users.length) {
      list.innerHTML = '<div class="empty">No users match.</div>';
      return;
    }
    list.innerHTML = users.map(u => {
      const roles = (u.roles || []).map(r => `<span class="role-pill ${r.toLowerCase() === 'staff' ? 'staff' : ''}">${escape(r)}</span>`).join('');
      return `
        <div class="user-card" data-uid="${escape(u.uid)}">
          <div class="who">
            <h4>${escape(u.name || '—')} ${roles}</h4>
            <span class="email">${escape(u.email || '(no email on doc)')}</span>
            <span class="uid">uid: ${escape(u.uid)}</span>
          </div>
          <div class="actions">
            <button class="btn btn-ghost btn-sm" data-act="rename">Rename</button>
            <button class="btn btn-ghost btn-sm" data-act="toggle-staff">${(u.roles || []).includes('STAFF') ? 'Remove STAFF' : 'Make STAFF'}</button>
          </div>
        </div>`;
    }).join('');
    list.addEventListener('click', onUserClick, { once: false });
  }

  function filterUsers(e) {
    const q = e.target.value.trim().toLowerCase();
    if (!q) { renderUserList(usersCache); return; }
    const filtered = usersCache.filter(u =>
      (u.name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.uid || '').toLowerCase().includes(q)
    );
    renderUserList(filtered);
  }

  async function onUserClick(e) {
    const btn = e.target.closest('button[data-act]');
    if (!btn) return;
    const card = btn.closest('.user-card');
    const uid = card.dataset.uid;
    const user = usersCache.find(u => u.uid === uid);
    if (!user) return;
    const act = btn.dataset.act;
    if (act === 'rename') {
      const newName = await (cmdblock.prompt?.('New display name?', { defaultValue: user.name || '', maxLength: 24 }) ?? prompt('New display name?', user.name || ''));
      if (newName == null) return;
      const trimmed = String(newName).trim().slice(0, 24);
      if (!trimmed || trimmed === user.name) return;
      btn.disabled = true;
      try {
        await cmdblock.updateUser(uid, { name: trimmed });
        user.name = trimmed;
        renderUserList(usersCache);
        cmdblock.toast?.('Name updated.', { variant: 'success' });
      } catch (e) {
        btn.disabled = false;
        cmdblock.toast?.(`Rename failed: ${e.message || e}`, { variant: 'error' });
      }
    } else if (act === 'toggle-staff') {
      const has = (user.roles || []).includes('STAFF');
      const ok = await (cmdblock.confirm?.(`${has ? 'Remove' : 'Grant'} STAFF role for ${user.name || user.email || uid}?`, { confirmText: has ? 'Remove STAFF' : 'Grant STAFF', confirmVariant: has ? 'danger' : 'primary' }) ?? confirm('Toggle STAFF role?'));
      if (!ok) return;
      const newRoles = has
        ? (user.roles || []).filter(r => r !== 'STAFF')
        : [...new Set([...(user.roles || []), 'STAFF'])];
      btn.disabled = true;
      try {
        await cmdblock.updateUser(uid, { roles: newRoles });
        user.roles = newRoles;
        renderUserList(usersCache);
        cmdblock.toast?.(`STAFF role ${has ? 'removed' : 'granted'}.`, { variant: 'success' });
      } catch (e) {
        btn.disabled = false;
        cmdblock.toast?.(`Update failed: ${e.message || e}`, { variant: 'error' });
      }
    }
  }

  // ── Entry: wait for account + cloud to settle, then check role ──
  async function boot() {
    // Wait briefly for cmdblock + cloud init to settle (cmdblock.js fires cmdblock:account on auth state change).
    await new Promise(r => setTimeout(r, 600));
    const acc = cmdblock.getAccount();
    if (!acc) {
      renderGate('You need to be signed in to access the staff panel.');
      return;
    }
    let staff = false;
    try { staff = await cmdblock.isStaff(); } catch {}
    if (!staff) {
      renderGate('Your account does not have STAFF role. Ask a project owner to grant it via Firebase console.', { showSignIn: false, title: 'NOT AUTHORIZED' });
      return;
    }
    renderPanel();
  }

  // Re-check whenever the account changes (sign-in/sign-out without page reload).
  window.addEventListener('cmdblock:account', () => { boot(); });
  boot();
})();
