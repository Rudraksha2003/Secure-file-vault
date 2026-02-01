import { supabase } from './supabaseClient.js'

const loadingEl = document.getElementById('loading')
const deniedEl = document.getElementById('denied')
const dashboardEl = document.getElementById('dashboard')
const logoutBtn = document.getElementById('logoutBtn')

let authToken = ''

function show (el) { el?.classList.remove('hidden') }
function hide (el) { el?.classList.add('hidden') }

function setStat (id, value) {
  const el = document.getElementById(id)
  if (el) el.textContent = value == null ? '—' : value
}

function authHeaders () {
  return { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' }
}

async function api (path, options = {}) {
  const res = await fetch(path, { ...options, headers: { ...authHeaders(), ...options.headers } })
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data }
}

// --- Overview charts ---
let chartTotals = null
let chart24h = null

const chartColors = {
  amber: 'rgba(245, 158, 11, 0.8)',
  emerald: 'rgba(16, 185, 129, 0.8)',
  slate: 'rgba(148, 163, 184, 0.8)',
  blue: 'rgba(59, 130, 246, 0.8)'
}

function renderOverviewCharts (stats) {
  if (typeof Chart === 'undefined') return
  if (chartTotals) chartTotals.destroy()
  if (chart24h) chart24h.destroy()

  const totalsCtx = document.getElementById('chart-totals')
  const ctx24h = document.getElementById('chart-24h')
  if (!totalsCtx || !ctx24h) return

  chartTotals = new Chart(totalsCtx, {
    type: 'bar',
    data: {
      labels: ['Users', 'Notes', 'Files', 'Short links'],
      datasets: [{
        label: 'Total',
        data: [
          stats.total_users ?? 0,
          stats.notes_total ?? 0,
          stats.files_total ?? 0,
          stats.short_links_total ?? 0
        ],
        backgroundColor: [chartColors.blue, chartColors.emerald, chartColors.amber, chartColors.slate]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(148,163,184,0.2)' }, ticks: { color: '#94a3b8' } },
        x: { grid: { display: false }, ticks: { color: '#94a3b8' } }
      }
    }
  })

  chart24h = new Chart(ctx24h, {
    type: 'doughnut',
    data: {
      labels: ['Notes (24h)', 'Files (24h)', 'Active users (24h)'],
      datasets: [{
        data: [
          stats.notes_last_24h ?? 0,
          stats.files_last_24h ?? 0,
          stats.active_users_24h ?? 0
        ],
        backgroundColor: [chartColors.emerald, chartColors.amber, chartColors.blue],
        borderWidth: 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: { legend: { labels: { color: '#94a3b8' } } }
    }
  })
}

// --- Overview ---
function renderOverview (stats) {
  setStat('stat-total-users', stats.total_users)
  setStat('stat-active-users-24h', stats.active_users_24h)
  setStat('stat-notes-total', stats.notes_total)
  setStat('stat-files-total', stats.files_total)
  setStat('stat-notes-24h', stats.notes_last_24h)
  setStat('stat-files-24h', stats.files_last_24h)
  const lc = stats.last_cleanup
  setStat('stat-last-cleanup', lc
    ? `${new Date(lc.run_at).toLocaleString()} — ${lc.files_deleted} files, ${lc.notes_deleted} notes deleted`
    : 'Never')
  renderOverviewCharts(stats)
}

// --- Tabs ---
function switchTab (tabId) {
  document.querySelectorAll('.admin-tab').forEach((b) => {
    const active = b.dataset.tab === tabId
    b.classList.toggle('bg-amber-500/20', active)
    b.classList.toggle('text-amber-400', active)
    b.classList.toggle('text-slate-400', !active)
  })
  document.querySelectorAll('.admin-panel').forEach((p) => {
    p.classList.toggle('hidden', p.id !== `panel-${tabId}`)
  })
  if (tabId === 'users') loadUsers()
  else if (tabId === 'files') loadFiles()
  else if (tabId === 'notes') loadNotes()
  else if (tabId === 'audit') loadAudit()
  else if (tabId === 'settings') loadSettings()
  else if (tabId === 'cleanup') loadCleanupStatus()
}

// --- Users ---
async function loadUsers () {
  const list = document.getElementById('users-list')
  const loading = document.getElementById('users-loading')
  list.innerHTML = ''
  show(loading)
  const { ok, data } = await api('/.netlify/functions/adminUsers')
  hide(loading)
  if (!ok || !data?.users) {
    list.textContent = 'Failed to load users.'
    return
  }
  if (data.users.length === 0) {
    list.textContent = 'No users.'
    return
  }
  const table = document.createElement('table')
  table.className = 'w-full border-collapse text-sm whitespace-nowrap'
  table.style.tableLayout = 'fixed'
  table.innerHTML = `
    <colgroup>
      <col style="width: 34%">
      <col style="width: 12%">
      <col style="width: 16%">
      <col style="width: 16%">
      <col style="width: 6%">
      <col style="width: 16%">
    </colgroup>
    <thead>
      <tr class="border-b border-slate-700 text-left text-slate-400">
        <th class="py-2 pr-4">Email</th>
        <th class="py-2 pr-4">Username</th>
        <th class="py-2 pr-4">Created</th>
        <th class="py-2 pr-4">Last sign-in</th>
        <th class="py-2 pr-4">Status</th>
        <th class="py-2 pl-2">Actions</th>
      </tr>
    </thead>
    <tbody id="users-tbody"></tbody>
  `
  const tbody = table.querySelector('#users-tbody')
  data.users.forEach((u) => {
    const tr = document.createElement('tr')
    tr.className = 'border-b border-slate-800'
    const block = u.status === 'blocked'
    const email = u.email || '—'
    const usernameDisplay = (u.username && String(u.username).trim()) ? escapeHtml(u.username) : '<span class="text-slate-500 italic">Not set</span>'
    const usernameTitle = (u.username && String(u.username).trim()) ? escapeHtml(u.username) : 'Not set'
    tr.innerHTML = `
      <td class="py-2 pr-4 text-white truncate" title="${escapeHtml(email)}">${escapeHtml(email)}</td>
      <td class="py-2 pr-4 text-slate-300 truncate" title="${usernameTitle}">${usernameDisplay}</td>
      <td class="py-2 pr-4 text-slate-300">${u.created_at ? new Date(u.created_at).toLocaleString() : '—'}</td>
      <td class="py-2 pr-4 text-slate-300">${u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleString() : '—'}</td>
      <td class="py-2 pr-4"><span class="${block ? 'text-red-400' : 'text-emerald-400'}">${block ? 'Blocked' : 'Active'}</span></td>
      <td class="py-2 pl-2 space-x-2">
        <button data-user-id="${escapeHtml(u.id)}" data-block="${!block}" class="user-block-btn rounded px-2 py-1 text-xs ${block ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-red-600 hover:bg-red-500'} text-white">${block ? 'Unblock' : 'Block'}</button>
        <button data-user-id="${escapeHtml(u.id)}" data-user-email="${escapeHtml(u.email || '')}" class="user-delete-btn rounded px-2 py-1 text-xs bg-slate-600 hover:bg-slate-500 text-white">Delete</button>
      </td>
    `
    tbody.appendChild(tr)
  })
  list.appendChild(table)
  list.querySelectorAll('.user-block-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const userId = btn.dataset.userId
      const block = btn.dataset.block === 'true'
      const { ok } = await api('/.netlify/functions/adminUserBlock', { method: 'POST', body: JSON.stringify({ user_id: userId, block }) })
      if (ok) loadUsers()
      else alert('Action failed.')
    })
  })
  list.querySelectorAll('.user-delete-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const userId = btn.dataset.userId
      const email = btn.dataset.userEmail || userId
      if (!confirm(`Permanently delete user "${email}" from the database? This removes their account, files, and notes.`)) return
      const { ok, data } = await api('/.netlify/functions/adminUserDelete', { method: 'POST', body: JSON.stringify({ user_id: userId }) })
      if (ok) loadUsers()
      else alert(data?.error || 'Delete failed.')
    })
  })
}

// --- Files ---
async function loadFiles () {
  const list = document.getElementById('files-list')
  const loading = document.getElementById('files-loading')
  list.innerHTML = ''
  show(loading)
  const { ok, data } = await api('/.netlify/functions/adminFiles')
  hide(loading)
  if (!ok || !data?.files) {
    list.textContent = 'Failed to load files.'
    return
  }
  if (data.files.length === 0) {
    list.textContent = 'No files.'
    return
  }
  const table = document.createElement('table')
  table.className = 'w-full border-collapse text-sm whitespace-nowrap'
  table.style.tableLayout = 'fixed'
  table.innerHTML = `
    <colgroup>
      <col style="width: 28%">
      <col style="width: 22%">
      <col style="width: 16%">
      <col style="width: 16%">
      <col style="width: 6%">
      <col style="width: 12%">
    </colgroup>
    <thead>
      <tr class="border-b border-slate-700 text-left text-slate-400">
        <th class="py-2 pr-4">Name</th>
        <th class="py-2 pr-4">Owner ID</th>
        <th class="py-2 pr-4">Created</th>
        <th class="py-2 pr-4">Expires</th>
        <th class="py-2 pr-4">Protected</th>
        <th class="py-2 pl-2">Actions</th>
      </tr>
    </thead>
    <tbody id="files-tbody"></tbody>
  `
  const tbody = table.querySelector('#files-tbody')
  data.files.forEach((f) => {
    const tr = document.createElement('tr')
    tr.className = 'border-b border-slate-800'
    const fileName = f.name || '—'
    const ownerId = f.owner_id || ''
    tr.innerHTML = `
      <td class="py-2 pr-4 text-white truncate" title="${escapeHtml(fileName)}">${escapeHtml(fileName)}</td>
      <td class="py-2 pr-4 text-slate-400 font-mono text-xs truncate" title="${escapeHtml(ownerId)}">${escapeHtml(ownerId || '—')}</td>
      <td class="py-2 pr-4 text-slate-300">${f.created_at ? new Date(f.created_at).toLocaleString() : '—'}</td>
      <td class="py-2 pr-4 text-slate-300">${f.expires_at ? new Date(f.expires_at).toLocaleString() : '—'}</td>
      <td class="py-2 pr-4">${f.is_protected ? 'Yes' : 'No'}</td>
      <td class="py-2 pl-2 space-x-2">
        <button data-file-id="${f.id}" class="file-delete-btn rounded px-2 py-1 text-xs bg-red-600 hover:bg-red-500 text-white">Delete</button>
      </td>
    `
    tbody.appendChild(tr)
  })
  list.appendChild(table)
  list.querySelectorAll('.file-delete-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Force delete this file?')) return
      const { ok } = await api('/.netlify/functions/adminFileDelete', { method: 'POST', body: JSON.stringify({ file_id: btn.dataset.fileId }) })
      if (ok) loadFiles()
      else alert('Delete failed.')
    })
  })
}

// --- Notes ---
async function loadNotes () {
  const list = document.getElementById('notes-list')
  const loading = document.getElementById('notes-loading')
  list.innerHTML = ''
  show(loading)
  const { ok, data } = await api('/.netlify/functions/adminNotes')
  hide(loading)
  if (!ok || !data?.notes) {
    list.textContent = 'Failed to load notes.'
    return
  }
  if (data.notes.length === 0) {
    list.textContent = 'No anonymous notes.'
    return
  }
  const table = document.createElement('table')
  table.className = 'w-full border-collapse text-sm whitespace-nowrap'
  table.style.tableLayout = 'fixed'
  table.innerHTML = `
    <colgroup>
      <col style="width: 40%">
      <col style="width: 18%">
      <col style="width: 18%">
      <col style="width: 8%">
      <col style="width: 16%">
    </colgroup>
    <thead>
      <tr class="border-b border-slate-700 text-left text-slate-400">
        <th class="py-2 pr-4">ID</th>
        <th class="py-2 pr-4">Created</th>
        <th class="py-2 pr-4">Expires</th>
        <th class="py-2 pr-4">Password</th>
        <th class="py-2 pl-2">Actions</th>
      </tr>
    </thead>
    <tbody id="notes-tbody"></tbody>
  `
  const tbody = table.querySelector('#notes-tbody')
  data.notes.forEach((n) => {
    const tr = document.createElement('tr')
    tr.className = 'border-b border-slate-800'
    const noteId = String(n.id)
    tr.innerHTML = `
      <td class="py-2 pr-4 font-mono text-xs text-slate-300 truncate" title="${escapeHtml(noteId)}">${escapeHtml(noteId)}</td>
      <td class="py-2 pr-4 text-slate-300">${n.created_at ? new Date(n.created_at).toLocaleString() : '—'}</td>
      <td class="py-2 pr-4 text-slate-300">${n.expires_at ? new Date(n.expires_at).toLocaleString() : '—'}</td>
      <td class="py-2 pr-4">${n.has_password ? 'Yes' : 'No'}</td>
      <td class="py-2 pl-2 space-x-2">
        <button data-note-id="${n.id}" class="note-delete-btn rounded px-2 py-1 text-xs bg-red-600 hover:bg-red-500 text-white">Delete</button>
        <button data-note-id="${n.id}" class="note-expire-btn rounded px-2 py-1 text-xs bg-amber-600 hover:bg-amber-500 text-white">Force expire</button>
      </td>
    `
    tbody.appendChild(tr)
  })
  list.appendChild(table)
  list.querySelectorAll('.note-delete-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Delete this note?')) return
      const { ok } = await api('/.netlify/functions/adminNoteDelete', { method: 'POST', body: JSON.stringify({ note_id: btn.dataset.noteId }) })
      if (ok) loadNotes()
      else alert('Delete failed.')
    })
  })
  list.querySelectorAll('.note-expire-btn').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const { ok } = await api('/.netlify/functions/adminNoteExpire', { method: 'POST', body: JSON.stringify({ note_id: btn.dataset.noteId }) })
      if (ok) loadNotes()
      else alert('Action failed.')
    })
  })
}

// --- Audit ---
async function loadAudit () {
  const list = document.getElementById('audit-list')
  const loading = document.getElementById('audit-loading')
  list.innerHTML = ''
  show(loading)
  const { ok, data } = await api('/.netlify/functions/adminAudit')
  hide(loading)
  if (!ok || !data?.logs) {
    list.textContent = 'Failed to load audit log.'
    return
  }
  if (data.logs.length === 0) {
    list.textContent = 'No audit entries yet.'
    return
  }
  data.logs.forEach((log) => {
    const line = `${new Date(log.created_at).toLocaleString()} — ${log.action}${log.target_type ? ` (${log.target_type}: ${log.target_id || '—'})` : ''}`
    const div = document.createElement('div')
    div.className = 'rounded-lg border border-slate-700 bg-slate-800/50 p-2 text-slate-300 text-sm truncate'
    div.title = line
    div.textContent = line
    list.appendChild(div)
  })
}

// --- Settings ---
async function loadSettings () {
  const form = document.getElementById('settings-form')
  const { ok, data } = await api('/.netlify/functions/adminSettings')
  if (!ok || !data) {
    form.textContent = 'Failed to load settings.'
    return
  }
  const blockedVal = data.blocked_file_types
  const blockedStr = Array.isArray(blockedVal) ? blockedVal.join(', ') : (blockedVal ?? '')
  form.innerHTML = `
    <div>
      <label class="block text-sm text-slate-400 mb-1">Max file size (MB)</label>
      <input type="text" data-key="max_file_size_mb" value="${escapeHtml(String(data.max_file_size_mb ?? ''))}" class="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white" />
    </div>
    <div>
      <label class="block text-sm text-slate-400 mb-1">Max expiry (hours)</label>
      <input type="text" data-key="max_expiry_hours" value="${escapeHtml(String(data.max_expiry_hours ?? ''))}" class="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white" />
    </div>
    <div>
      <label class="block text-sm text-slate-400 mb-1">Blocked file types</label>
      <input type="text" data-key="blocked_file_types" value="${escapeHtml(blockedStr)}" placeholder="e.g. exe, bat, sh, js (leave empty = block none)" class="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-white placeholder-slate-500" />
      <p class="text-xs text-slate-500 mt-1">Comma-separated extensions to block (e.g. exe, bat, sh, js, vbs). Empty = allow all.</p>
    </div>
    <button id="settings-save" class="rounded-xl bg-amber-500 px-4 py-2 text-slate-900 font-medium hover:bg-amber-400">Save</button>
  `
  form.querySelector('#settings-save').addEventListener('click', async () => {
    const rawBlocked = form.querySelector('input[data-key="blocked_file_types"]').value
    const blockedArray = rawBlocked ? rawBlocked.split(',').map((s) => s.trim().replace(/^\./, '')).filter(Boolean) : []
    const settings = {
      max_file_size_mb: form.querySelector('input[data-key="max_file_size_mb"]').value,
      max_expiry_hours: form.querySelector('input[data-key="max_expiry_hours"]').value,
      blocked_file_types: blockedArray
    }
    const { ok: saveOk } = await api('/.netlify/functions/adminSettings', { method: 'PATCH', body: JSON.stringify({ settings }) })
    if (saveOk) alert('Saved.')
    else alert('Save failed.')
  })
}

// --- Cleanup ---
async function loadCleanupStatus () {
  const status = document.getElementById('cleanup-status')
  const { ok, data } = await api('/.netlify/functions/adminCleanupStatus')
  if (!ok) {
    status.textContent = 'Failed to load cleanup status.'
    return
  }
  const lr = data?.last_run
  status.textContent = lr
    ? `Last run: ${new Date(lr.run_at).toLocaleString()} — ${lr.files_deleted} files, ${lr.notes_deleted} notes deleted.`
    : 'No cleanup run recorded yet.'
}

function escapeHtml (s) {
  const div = document.createElement('div')
  div.textContent = s
  return div.innerHTML
}

// --- Init ---
async function run () {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    hide(loadingEl)
    window.location.replace('login.html?next=admin.html')
    return
  }
  authToken = session.access_token

  const res = await fetch('/.netlify/functions/adminStats', { headers: authHeaders() })

  if (res.status === 403 || !res.ok) {
    hide(loadingEl)
    window.location.replace('dashboard.html')
    return
  }

  const stats = await res.json()
  renderOverview(stats)

  hide(loadingEl)
  show(dashboardEl)

  document.querySelectorAll('.admin-tab').forEach((btn) => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab))
  })
  document.querySelector('.admin-tab[data-tab="overview"]').classList.add('bg-amber-500/20', 'text-amber-400')

  document.getElementById('cleanup-trigger').addEventListener('click', async () => {
    const btn = document.getElementById('cleanup-trigger')
    btn.disabled = true
    btn.textContent = 'Running…'
    const { ok, data } = await api('/.netlify/functions/adminCleanupTrigger', { method: 'POST' })
    btn.disabled = false
    btn.textContent = 'Run cleanup now'
    if (ok) {
      loadCleanupStatus()
      const el = document.getElementById('stat-last-cleanup')
      if (el && data) el.textContent = `Just now — ${data.files_deleted} files, ${data.notes_deleted} notes deleted`
    } else alert('Cleanup failed.')
  })
}

logoutBtn.addEventListener('click', async () => {
  await supabase.auth.signOut()
  window.location.href = 'login.html'
})

run()
