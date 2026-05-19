/* ============================================================
   JAM'BOUYO ACADEMY — app.js — Version Finale Fusionnée
   Supabase Auth + Dashboard Étudiant + Admin + Jitsi + UI
   ============================================================ */

const SUPABASE_URL = 'https://rubjacjxgrnqfiijshcq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_5xN_ecJ-hRpUhEBjBeCcQQ_R1DbfDYL';
const sb = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const courses = [
  ['ia',              'Intelligence Artificielle',  "Maîtrisez les outils d'IA générative pour gagner en productivité.", 'Populaire'],
  ['prompt',          'Prompt Engineering',          'Pilotez ChatGPT, Claude et Gemini avec des prompts professionnels.', 'Premium'],
  ['canva',           'Canva',                       'Créez des visuels et contenus marketing modernes et percutants.', 'Créatif'],
  ['excel',           'Excel',                       'Formules, tableaux, analyse de données et reporting professionnel.', 'Essentiel'],
  ['vba',             'VBA Excel',                   'Automatisez vos tâches et créez des outils performants avec les macros.', 'Avancé'],
  ['compta',          'Comptabilité',                'Bases, logique comptable et pratique professionnelle pour entreprises.', 'Business'],
  ['anglais',         'Anglais',                     'Renforcez votre communication orale et écrite en anglais.', 'Langue'],
  ['business-english','Business English',            'Anglais professionnel pour réunions, emails et carrière internationale.', 'Carrière'],
  ['entreprise',      "Création d'entreprise",       "Structurez une idée, un business model et un lancement crédible.", 'Entrepreneuriat'],
  ['banque',          'Banque & Assurance',          'Produits financiers, relation client et découverte du secteur.', 'Finance'],
];

let currentUser = null;
let currentProfile = null;
let allAdmissions = [];
let allStudents = [];

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

/* ===== HELPERS ===== */
function msg(elId, text, type = 'success') {
  const el = typeof elId === 'string' ? $(elId) : elId;
  if (!el) return;
  el.textContent = text;
  el.className = `form-msg ${type}`;
  el.classList.remove('hidden');
  if (type === 'success') setTimeout(() => el.classList.add('hidden'), 5000);
}
function safe(v) {
  return (v || '').toString().replace(/[<>&"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));
}
function statusLabel(s) {
  return {pending:'En attente', approved:'Accepté', rejected:'Refusé'}[s] || 'En attente';
}
function statusClass(s) {
  return {pending:'pending', approved:'approved', rejected:'rejected'}[s] || 'pending';
}
function openModal(id) { const m = $('#' + id); if (m) m.classList.add('active'); }
function closeModal(el) { const m = el.closest ? el.closest('.modal') : el; if (m) m.classList.remove('active'); }
function scrollTo(sel) { const el = $(sel); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }

/* ===== RENDER FORMATIONS ===== */
function renderCourses() {
  const grid = $('#formationsGrid');
  const select = $('#admFormation');
  if (grid) {
    grid.innerHTML = courses.map((c, i) => `
      <article class="formation-card reveal">
        <div class="formation-num">${String(i+1).padStart(2,'0')}</div>
        <span class="formation-badge">${safe(c[3])}</span>
        <h3>${safe(c[1])}</h3>
        <p>${safe(c[2])}</p>
        <div class="formation-actions">
          <button class="btn btn-outline" data-course="${c[0]}">Demander admission</button>
          <button class="btn btn-ghost" data-live="${c[0]}">▶ Live</button>
        </div>
      </article>`).join('');
  }
  if (select) {
    select.innerHTML = '<option value="">-- Sélectionner --</option>' +
      courses.map(c => `<option value="${safe(c[1])}">${safe(c[1])}</option>`).join('');
  }
}

/* ===== RENDER LIVE GRID ===== */
function renderLiveGrid() {
  const grid = $('#liveGrid');
  if (!grid) return;
  grid.innerHTML = courses.map(c => {
    const locked = !currentUser;
    return `
      <div class="live-card">
        <div class="live-dot">Disponible en direct</div>
        <h3>${safe(c[1])}</h3>
        <p>Session live avec nos experts. Questions en temps réel.</p>
        <button class="${locked ? 'btn-join locked' : 'btn-join'}" data-live="${c[0]}" data-formation="${safe(c[1])}">
          ${locked ? '🔒 Connexion requise' : '▶ Rejoindre'}
        </button>
      </div>`;
  }).join('');
}

/* ===== AUTH ===== */
async function loadProfile() {
  if (!sb || !currentUser) return;
  const { data } = await sb.from('profiles').select('*').eq('id', currentUser.id).maybeSingle();
  currentProfile = data || {
    id: currentUser.id,
    email: currentUser.email,
    prenom: currentUser.user_metadata?.prenom,
    nom: currentUser.user_metadata?.nom,
    role: 'etudiant'
  };
}

async function refreshAuth() {
  if (!sb) return;
  const { data: { session } } = await sb.auth.getSession();
  currentUser = session?.user || null;
  if (currentUser) await loadProfile();
  updateUI();
  renderLiveGrid();
}

function updateUI() {
  const logged = !!currentUser;
  $('#guestActions')?.classList.toggle('hidden', logged);
  $('#userActions')?.classList.toggle('hidden', !logged);
  if (logged) {
    const prenom = currentProfile?.prenom || currentUser.user_metadata?.prenom || currentUser.email?.split('@')[0] || 'Étudiant';
    const navWelcome = $('#navWelcome');
    if (navWelcome) navWelcome.textContent = `Bienvenue ${prenom} 👋`;
    const dashPrenom = $('#dashPrenom');
    if (dashPrenom) dashPrenom.textContent = prenom;
    const isAdmin = ['admin', 'formateur'].includes(currentProfile?.role);
    $('#adminTabBtn')?.classList.toggle('hidden', !isAdmin);
    loadStudent();
    if (isAdmin) loadAdmin();
  }
}

async function register(e) {
  e.preventDefault();
  const prenom = $('#regPrenom').value.trim();
  const nom    = $('#regNom').value.trim();
  const email  = $('#regEmail').value.trim();
  const pass   = $('#regPassword').value;
  if (!prenom || !nom || !email || !pass) { msg('#registerMsg', 'Remplissez tous les champs.', 'error'); return; }
  msg('#registerMsg', 'Création du compte...', 'info');
  const { data, error } = await sb.auth.signUp({
    email, password: pass,
    options: { data: { prenom, nom, role: 'etudiant' }, emailRedirectTo: location.origin }
  });
  if (error) { msg('#registerMsg', error.message, 'error'); return; }
  msg('#registerMsg', '✓ Compte créé ! Vérifiez votre email si requis.', 'success');
  currentUser = data.user;
  await refreshAuth();
  setTimeout(() => closeModal($('#registerModal')), 1500);
}

async function login(e) {
  e.preventDefault();
  const email = $('#loginEmail').value.trim();
  const pass  = $('#loginPassword').value;
  if (!email || !pass) { msg('#loginMsg', 'Remplissez tous les champs.', 'error'); return; }
  msg('#loginMsg', 'Connexion...', 'info');
  const { error } = await sb.auth.signInWithPassword({ email, password: pass });
  if (error) { msg('#loginMsg', error.message, 'error'); return; }
  msg('#loginMsg', '✓ Connecté !', 'success');
  await refreshAuth();
  setTimeout(() => {
    closeModal($('#loginModal'));
    $('#dashboard')?.classList.remove('hidden');
    scrollTo('#dashboard');
  }, 800);
}

async function forgotPassword(e) {
  e.preventDefault();
  const email = $('#forgotEmail').value.trim();
  if (!email) { msg('#forgotMsg', 'Entrez votre email.', 'error'); return; }
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin });
  if (error) { msg('#forgotMsg', error.message, 'error'); return; }
  msg('#forgotMsg', '✓ Lien envoyé ! Vérifiez votre boîte mail.', 'success');
}

async function logout() {
  if (sb) await sb.auth.signOut();
  currentUser = null; currentProfile = null;
  updateUI(); renderLiveGrid();
  $('#dashboard')?.classList.add('hidden');
}

/* ===== ADMISSION ===== */
async function submitAdmission(e) {
  e.preventDefault();
  const row = {
    user_id:   currentUser?.id || null,
    prenom:    $('#admPrenom').value.trim(),
    nom:       $('#admNom').value.trim(),
    email:     $('#admEmail').value.trim(),
    telephone: $('#admTel').value.trim(),
    formation: $('#admFormation').value,
    message:   $('#admMessage').value.trim(),
    status:    'pending'
  };
  if (!row.prenom || !row.nom || !row.email || !row.telephone || !row.formation) {
    msg('#admissionMsg', 'Veuillez remplir tous les champs obligatoires.', 'error'); return;
  }
  if (!sb) { msg('#admissionMsg', 'Erreur de connexion.', 'error'); return; }
  msg('#admissionMsg', 'Envoi en cours...', 'info');
  const { error } = await sb.from('admissions').insert(row);
  if (error) { msg('#admissionMsg', error.message, 'error'); return; }
  msg('#admissionMsg', '✓ Demande envoyée ! Notre service admission vous contactera rapidement.', 'success');
  e.target.reset();
  if (currentUser) loadStudent();
}

async function submitContact(e) {
  e.preventDefault();
  const nom     = $('#contactName').value.trim();
  const email   = $('#contactEmail').value.trim();
  const message = $('#contactMessage').value.trim();
  if (!nom || !email || !message) { msg('#contactMsg', 'Remplissez tous les champs.', 'error'); return; }
  msg('#contactMsg', 'Envoi...', 'info');
  const { error } = await sb?.from('admissions').insert({
    prenom: nom.split(' ')[0], nom: nom.split(' ').slice(1).join(' ') || '—',
    email, telephone: '—', formation: 'Message de contact', message, status: 'pending'
  });
  if (error) { msg('#contactMsg', 'Erreur. Contactez-nous via WhatsApp.', 'error'); return; }
  msg('#contactMsg', '✓ Message envoyé ! Nous vous répondrons rapidement.', 'success');
  e.target.reset();
}

/* ===== DASHBOARD ÉTUDIANT ===== */
async function loadStudent() {
  if (!sb || !currentUser) return;
  const { data, error } = await sb.from('admissions')
    .select('*')
    .or(`user_id.eq.${currentUser.id},email.eq.${currentUser.email}`)
    .order('created_at', { ascending: false });

  allAdmissions = data || [];

  // Profile card
  const p = currentProfile || {};
  const profileEl = $('#profileInfo');
  if (profileEl) {
    profileEl.innerHTML = `
      <div style="display:grid;gap:8px">
        <div><small style="color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.1em">Nom</small>
          <div>${safe(p.prenom || '')} ${safe(p.nom || '')}</div></div>
        <div><small style="color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.1em">Email</small>
          <div>${safe(currentUser.email)}</div></div>
        <div><small style="color:var(--muted);font-size:11px;text-transform:uppercase;letter-spacing:.1em">Rôle</small>
          <div style="color:var(--gold)">${safe(p.role || 'étudiant')}</div></div>
      </div>`;
  }

  // Admissions
  const box = $('#myAdmissions');
  if (box) {
    if (error || !allAdmissions.length) {
      box.innerHTML = '<p style="color:var(--muted);font-size:13px">Aucune demande pour le moment.</p>';
    } else {
      box.innerHTML = allAdmissions.map(a => `
        <div class="admission-line">
          <strong>${safe(a.formation)}</strong>
          <small style="color:var(--muted)">${new Date(a.created_at).toLocaleDateString('fr-FR')}</small>
          <span class="status ${statusClass(a.status)}">${statusLabel(a.status)}</span>
        </div>`).join('');
    }
  }

  // Accès cours
  const access = $('#courseAccess');
  if (access) {
    const approved = allAdmissions.find(a => a.status === 'approved');
    if (approved) {
      const slug = courses.find(c => c[1] === approved.formation)?.[0] || 'general';
      access.innerHTML = `
        <p style="font-size:13px;color:var(--muted);margin-bottom:14px">
          Admission acceptée pour <strong style="color:var(--white)">${safe(approved.formation)}</strong>
        </p>
        <a class="btn-join" target="_blank" href="https://meet.jit.si/jambouyo-${slug}">▶ Rejoindre le cours</a>`;
    } else {
      access.innerHTML = '<p style="color:var(--muted);font-size:13px">Votre accès cours sera activé après validation de votre admission.</p>';
    }
  }
}

/* ===== ADMIN ===== */
async function loadAdmin() {
  if (!sb) return;
  const [admRes, studRes] = await Promise.all([
    sb.from('admissions').select('*').order('created_at', { ascending: false }),
    sb.from('profiles').select('*').order('created_at', { ascending: false })
  ]);
  allAdmissions = admRes.data || [];
  allStudents   = studRes.data || [];
  renderAdminStats();
  renderAdminAdmissions(allAdmissions);
  renderAdminStudents(allStudents);
}

function renderAdminStats() {
  const el = $('#adminStats');
  if (!el) return;
  const total    = allStudents.length;
  const pending  = allAdmissions.filter(a => a.status === 'pending').length;
  const approved = allAdmissions.filter(a => a.status === 'approved').length;
  const popular  = allAdmissions.reduce((acc, a) => { acc[a.formation] = (acc[a.formation]||0)+1; return acc; }, {});
  const top      = Object.entries(popular).sort((a,b) => b[1]-a[1])[0]?.[0] || '—';
  el.innerHTML = `
    <div class="admin-stat"><strong>${total}</strong><span>Étudiants</span></div>
    <div class="admin-stat"><strong>${pending}</strong><span>En attente</span></div>
    <div class="admin-stat"><strong>${approved}</strong><span>Acceptés</span></div>
    <div class="admin-stat" style="overflow:hidden"><strong style="font-size:18px;margin-top:4px">${safe(top)}</strong><span>Formation populaire</span></div>`;
}

function renderAdminAdmissions(data) {
  const el = $('#adminAdmissions');
  if (!el) return;
  if (!data?.length) { el.innerHTML = '<div class="empty-state">Aucune demande d\'admission.</div>'; return; }
  el.innerHTML = data.map(a => `
    <div class="admission-row" id="adm-${a.id}">
      <div><strong>${safe(a.prenom)} ${safe(a.nom)}</strong><small>${safe(a.email)} · ${safe(a.telephone||'')}</small></div>
      <div><strong>${safe(a.formation)}</strong><small>${new Date(a.created_at).toLocaleDateString('fr-FR')}</small></div>
      <span class="status ${statusClass(a.status)}">${statusLabel(a.status)}</span>
      <div class="admin-btns">
        <button class="btn-admin btn-accept" onclick="updateAdmission('${a.id}','approved')">✓ Accepter</button>
        <button class="btn-admin btn-refuse" onclick="updateAdmission('${a.id}','rejected')">✗ Refuser</button>
        <button class="btn-admin btn-toggle" onclick="updateAdmission('${a.id}','pending')">⏳ Attente</button>
      </div>
    </div>`).join('');
}

function renderAdminStudents(data) {
  const el = $('#adminStudents');
  if (!el) return;
  if (!data?.length) { el.innerHTML = '<div class="empty-state">Aucun étudiant.</div>'; return; }
  el.innerHTML = data.map(s => `
    <div class="admission-row" id="stud-${s.id}">
      <div><strong>${safe(s.prenom||'—')} ${safe(s.nom||'')}</strong><small>${safe(s.email)}</small></div>
      <div><small>${safe(s.role)} · ${new Date(s.created_at).toLocaleDateString('fr-FR')}</small></div>
      <span class="status ${s.is_active ? 'approved' : 'rejected'}">${s.is_active ? 'Actif' : 'Désactivé'}</span>
      <div class="admin-btns">
        <button class="btn-admin btn-toggle" onclick="toggleStudent('${s.id}',${!s.is_active})">
          ${s.is_active ? '⏸ Désactiver' : '▶ Activer'}
        </button>
      </div>
    </div>`).join('');
}

async function updateAdmission(id, status) {
  const { error } = await sb.from('admissions').update({ status, updated_at: new Date().toISOString() }).eq('id', id);
  if (error) { alert(error.message); return; }
  allAdmissions = allAdmissions.map(a => a.id === id ? {...a, status} : a);
  renderAdminStats();
  renderAdminAdmissions(allAdmissions);
}

async function toggleStudent(id, newState) {
  const { error } = await sb.from('profiles').update({ is_active: newState }).eq('id', id);
  if (error) { alert(error.message); return; }
  allStudents = allStudents.map(s => s.id === id ? {...s, is_active: newState} : s);
  renderAdminStudents(allStudents);
}

function filterAdminRows() {
  const q = $('#adminSearch')?.value.toLowerCase() || '';
  const filtered = allStudents.filter(s =>
    `${s.prenom} ${s.nom} ${s.email}`.toLowerCase().includes(q)
  );
  renderAdminStudents(filtered);
}

/* ===== JITSI ===== */
async function joinLive(slug, formation) {
  if (!currentUser) { openModal('loginModal'); return; }
  if (!sb) { window.open(`https://meet.jit.si/jambouyo-${slug}`, '_blank'); return; }
  const { data } = await sb.from('admissions')
    .select('status')
    .or(`user_id.eq.${currentUser.id},email.eq.${currentUser.email}`)
    .eq('formation', formation)
    .eq('status', 'approved')
    .limit(1);
  if (data?.length) {
    window.open(`https://meet.jit.si/jambouyo-${slug}`, '_blank');
  } else {
    alert(`⚠️ Accès réservé aux étudiants avec admission acceptée pour "${formation}".\n\nFaites une demande d'admission ou contactez-nous sur WhatsApp.`);
  }
}

/* ===== INIT ===== */
function init() {
  renderCourses();
  renderLiveGrid();
  refreshAuth();

  // Nav scroll
  window.addEventListener('scroll', () => $('#navbar')?.classList.toggle('scrolled', scrollY > 40));

  // Mobile menu
  $('#mobileMenu')?.addEventListener('click', () => $('#mobileOverlay')?.classList.add('open'));
  $('#mobileClose')?.addEventListener('click', () => $('#mobileOverlay')?.classList.remove('open'));
  $$('.mob-link').forEach(a => a.addEventListener('click', () => $('#mobileOverlay')?.classList.remove('open')));

  // Modal triggers
  $$('[data-open]').forEach(b => b.addEventListener('click', () => openModal(b.dataset.open)));
  $$('[data-close]').forEach(b => b.addEventListener('click', () => closeModal(b)));
  $$('[data-switch]').forEach(b => b.addEventListener('click', () => { b.closest('.modal').classList.remove('active'); openModal(b.dataset.switch); }));
  $$('.modal').forEach(m => m.addEventListener('click', e => { if (e.target === m) m.classList.remove('active'); }));

  // Scroll links
  $$('[data-scroll]').forEach(b => b.addEventListener('click', () => { scrollTo(b.dataset.scroll); b.closest('.modal')?.classList.remove('active'); }));

  // Forms
  $('#admissionForm')?.addEventListener('submit', submitAdmission);
  $('#registerForm')?.addEventListener('submit', register);
  $('#loginForm')?.addEventListener('submit', login);
  $('#forgotForm')?.addEventListener('submit', forgotPassword);
  $('#contactForm')?.addEventListener('submit', submitContact);
  $('#logoutBtn')?.addEventListener('click', logout);
  $('#forgotBtn')?.addEventListener('click', () => { closeModal($('#loginModal')); openModal('forgotModal'); });

  // Dashboard btn
  $('#dashboardBtn')?.addEventListener('click', () => {
    $('#dashboard')?.classList.remove('hidden');
    scrollTo('#dashboard');
  });

  // Formation cards → admission or live
  $('#formationsGrid')?.addEventListener('click', e => {
    const enroll = e.target.closest('[data-course]');
    const live   = e.target.closest('[data-live]');
    if (enroll) {
      const formation = courses.find(c => c[0] === enroll.dataset.course)?.[1] || '';
      const sel = $('#admFormation');
      if (sel) { for (let i=0; i<sel.options.length; i++) if (sel.options[i].value === formation) { sel.selectedIndex = i; break; } }
      scrollTo('#admission');
    }
    if (live) {
      const c = courses.find(x => x[0] === live.dataset.live);
      if (c) joinLive(c[0], c[1]);
    }
  });

  // Live grid → join
  $('#liveGrid')?.addEventListener('click', e => {
    const btn = e.target.closest('[data-live]');
    if (!btn || btn.classList.contains('locked')) { if (btn) openModal('loginModal'); return; }
    joinLive(btn.dataset.live, btn.dataset.formation);
  });

  // Admin admissions delegated (dynamic)
  document.addEventListener('click', e => {
    if (e.target.matches('[data-live]') && e.target.closest('#liveGrid')) return; // handled above
  });

  // Dashboard tabs
  $$('.dashboard-tabs button').forEach(btn => {
    btn.addEventListener('click', () => {
      const container = btn.closest('section') || document;
      container.querySelectorAll('.dashboard-tabs button').forEach(x => x.classList.remove('active'));
      container.querySelectorAll('.dashboard-panel').forEach(x => x.classList.remove('active'));
      btn.classList.add('active');
      const panel = $('#' + btn.dataset.tab);
      if (panel) panel.classList.add('active');
    });
  });

  // Reveal on scroll
  const obs = new IntersectionObserver(es => {
    es.forEach(e => { if (e.isIntersecting) e.target.classList.add('visible'); });
  }, { threshold: .1 });
  $$('.reveal').forEach(el => obs.observe(el));

  // Cursor
  const cursor = $('#cursor'), ring = $('#cursorRing');
  let mx=0, my=0, rx=0, ry=0;
  document.addEventListener('mousemove', e => {
    mx = e.clientX; my = e.clientY;
    if (cursor) { cursor.style.left = mx+'px'; cursor.style.top = my+'px'; }
  });
  const interactEls = 'button, a, input, select, textarea, .formation-card, .live-card, .dash-card';
  document.addEventListener('mouseover', e => {
    if (e.target.closest(interactEls)) {
      if (cursor) cursor.style.transform = 'translate(-50%,-50%) scale(2)';
      if (ring) { ring.style.width='52px'; ring.style.height='52px'; ring.style.borderColor='rgba(201,150,42,.7)'; }
    }
  });
  document.addEventListener('mouseout', e => {
    if (e.target.closest(interactEls)) {
      if (cursor) cursor.style.transform = 'translate(-50%,-50%) scale(1)';
      if (ring) { ring.style.width='34px'; ring.style.height='34px'; ring.style.borderColor='rgba(201,150,42,.4)'; }
    }
  });
  function animRing() {
    rx += (mx-rx)*.12; ry += (my-ry)*.12;
    if (ring) { ring.style.left=rx+'px'; ring.style.top=ry+'px'; }
    requestAnimationFrame(animRing);
  }
  animRing();

  // Supabase auth state
  if (sb) {
    sb.auth.onAuthStateChange((_event, session) => {
      currentUser = session?.user || null;
      refreshAuth();
    });
  }
}

document.addEventListener('DOMContentLoaded', init);
