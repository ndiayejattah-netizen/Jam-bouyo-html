const SUPABASE_URL = 'https://rubjacjxgrnqfiijshcq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_5xN_ecJ-hRpUhEBjBeCcQQ_R1DbfDYL';
const sb = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const courses = [
  ['ia','Intelligence Artificielle','Maîtrisez les outils d’IA générative pour gagner en productivité et créer de nouvelles opportunités.','Populaire'],
  ['prompt','Prompt Engineering','Apprenez à piloter ChatGPT, Claude et Gemini avec des prompts professionnels.','Premium'],
  ['canva','Canva','Créez des visuels, supports de formation et contenus marketing modernes.','Créatif'],
  ['excel','Excel','Formules, tableaux, analyse, productivité et reporting professionnel.','Essentiel'],
  ['vba','VBA Excel','Automatisez vos tâches et créez des outils performants avec les macros.','Avancé'],
  ['compta','Comptabilité','Bases, logique comptable et pratique professionnelle pour entreprises.','Business'],
  ['anglais','Anglais','Renforcez votre communication orale et écrite.','Langue'],
  ['business-english','Business English','Anglais professionnel pour réunions, email et carrière internationale.','Carrière'],
  ['entreprise','Création d’entreprise','Structurez une idée, un business model et un lancement crédible.','Entrepreneuriat'],
  ['banque','Banque & Assurance','Comprendre les produits financiers, la relation client et le secteur.','Finance']
];

let currentUser = null;
let currentProfile = null;

const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);

function msg(el, text, ok=true){ if(!el) return; el.textContent=text; el.className='form-msg '+(ok?'success':'error'); el.classList.remove('hidden'); }
function safe(v){ return (v || '').toString().replace(/[<>&]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;'}[c])); }
function statusLabel(status){ return {pending:'En attente',approved:'Accepté',rejected:'Refusé'}[status] || status || 'En attente'; }
function openModal(id){ const m=$('#'+id); if(m) m.classList.add('active'); }
function closeModal(el){ const m = el.closest('.modal'); if(m) m.classList.remove('active'); }
function scrollToSel(sel){ const el=$(sel); if(el) el.scrollIntoView({behavior:'smooth',block:'start'}); }

function renderCourses(){
  const grid = $('#formationsGrid'); const select = $('#admFormation');
  if(grid){ grid.innerHTML = courses.map((c,i)=>`<article class="formation-card reveal"><div class="formation-num">${String(i+1).padStart(2,'0')}</div><span class="formation-badge">${c[3]}</span><h3>${c[1]}</h3><p>${c[2]}</p><div class="formation-actions"><button class="btn btn-outline" data-course="${c[0]}">Demander admission</button><button class="btn btn-ghost" data-live="${c[0]}">Live</button></div></article>`).join(''); }
  if(select){ select.innerHTML = '<option value="">-- Sélectionner --</option>'+courses.map(c=>`<option value="${c[1]}">${c[1]}</option>`).join(''); }
}

async function loadProfile(){
  if(!sb || !currentUser) return null;
  const {data,error} = await sb.from('profiles').select('*').eq('id', currentUser.id).maybeSingle();
  if(error) console.warn(error.message);
  currentProfile = data || {id:currentUser.id,email:currentUser.email,prenom:currentUser.user_metadata?.prenom,nom:currentUser.user_metadata?.nom,role:'etudiant'};
  return currentProfile;
}

async function refreshAuth(){
  if(!sb) return;
  const {data:{session}} = await sb.auth.getSession();
  currentUser = session?.user || null;
  if(currentUser) await loadProfile();
  updateUI();
}

function updateUI(){
  const logged = !!currentUser;
  $('#guestActions')?.classList.toggle('hidden', logged);
  $('#userActions')?.classList.toggle('hidden', !logged);
  if(logged){
    const prenom = currentProfile?.prenom || currentUser.user_metadata?.prenom || currentUser.email?.split('@')[0] || 'Étudiant';
    $('#navWelcome').textContent = `Bienvenue ${prenom} 👋`;
    $('#dashPrenom').textContent = prenom;
    $('#profileInfo').innerHTML = `<strong>${safe(prenom)} ${safe(currentProfile?.nom||'')}</strong><br>${safe(currentUser.email)}<br>Rôle : ${safe(currentProfile?.role||'etudiant')}`;
    if(currentProfile?.role === "admin"){
  $("#adminTabBtn")?.classList.remove("hidden");
  $("#teacherTabBtn")?.classList.remove("hidden");
  loadAdmin();
  loadTeacher();
}

else if(currentProfile?.role === "formateur"){
  $("#teacherTabBtn")?.classList.remove("hidden");
  $("#adminTabBtn")?.classList.add("hidden");
  loadTeacher();
}

else{
  $("#teacherTabBtn")?.classList.add("hidden");
  $("#adminTabBtn")?.classList.add("hidden");
} loadAdmin(); } else $('#adminTabBtn')?.classList.add('hidden');
    loadStudent();
  }
}

async function loadStudent(){
  if(!sb || !currentUser) return;
  const {data,error} = await sb.from('admissions').select('*').or(`user_id.eq.${currentUser.id},email.eq.${currentUser.email}`).order('created_at',{ascending:false});
  const box = $('#myAdmissions'); const access = $('#courseAccess');
  if(error){ box.innerHTML = `<p class="error">${safe(error.message)}</p>`; return; }
  if(!data?.length){ box.innerHTML = '<p>Aucune demande pour le moment.</p>'; access.textContent='Faites une demande d’admission pour débloquer vos cours.'; return; }
  box.innerHTML = data.map(a=>`<div class="admission-line"><strong>${safe(a.formation)}</strong><br><span class="status ${a.status||'pending'}">${statusLabel(a.status)}</span></div>`).join('');
  const approved = data.find(a=>a.status==='approved');
  if(approved){ const slug = courses.find(c=>c[1]===approved.formation)?.[0] || 'general'; access.innerHTML = `<p>Admission acceptée pour <strong>${safe(approved.formation)}</strong>.</p><a class="btn btn-gold" target="_blank" href="https://meet.jit.si/jambouyo-${slug}">Rejoindre le cours</a>`; }
  else access.textContent = 'Votre accès cours sera activé après validation admission.';
}

async function loadAdmin(){
  if(!sb) return;
  const {data,error} = await sb.from('admissions').select('*').order('created_at',{ascending:false});
  if(error){ $('#adminAdmissions').innerHTML = `<p class="error">${safe(error.message)}</p>`; return; }
  const total = data?.length || 0, pending = data?.filter(a=>a.status==='pending').length || 0, approved = data?.filter(a=>a.status==='approved').length || 0;
  const popular = data?.reduce((acc,a)=>{acc[a.formation]=(acc[a.formation]||0)+1;return acc;},{}); const top = Object.entries(popular||{}).sort((a,b)=>b[1]-a[1])[0]?.[0] || '—';
  $('#adminStats').innerHTML = `<div><strong>${total}</strong><span> demandes</span></div><div><strong>${pending}</strong><span> en attente</span></div><div><strong>${approved}</strong><span> acceptées</span></div><div><strong>${safe(top)}</strong><span> populaire</span></div>`;
  $('#adminAdmissions').innerHTML = data?.length ? data.map(a=>`<div class="admission-row"><div><strong>${safe(a.prenom)} ${safe(a.nom)}</strong><br><small>${safe(a.email)} · ${safe(a.telephone||'')}</small></div><div>${safe(a.formation)}</div><span class="status ${a.status||'pending'}">${statusLabel(a.status)}</span><div><button class="btn btn-outline" data-status="approved" data-id="${a.id}">Accepter</button> <button class="btn btn-ghost" data-status="rejected" data-id="${a.id}">Refuser</button></div></div>`).join('') : '<p>Aucune demande.</p>';
}

async function submitAdmission(e){
  e.preventDefault(); const m=$('#admissionMsg');
  const row = { user_id: currentUser?.id || null, prenom:$('#admPrenom').value.trim(), nom:$('#admNom').value.trim(), email:$('#admEmail').value.trim(), telephone:$('#admTel').value.trim(), formation:$('#admFormation').value, message:$('#admMessage').value.trim(), status:'pending' };
  if(!sb){ msg(m,'Supabase non chargé.',false); return; }
  const {error}= await sb.from('admissions').insert(row);
  if(error){ msg(m,error.message,false); return; }
  fetch("/api/send-admission-email", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    first_name: row.prenom,
    last_name: row.nom,
    email: row.email,
    phone: row.telephone,
    program: row.formation,
  }),
});
  msg(m,'Demande envoyée. Notre service admission vous contactera rapidement.',true); e.target.reset(); if(currentUser) loadStudent();
}

async function register(e){
  e.preventDefault(); const m=$('#registerMsg');
  const metadata = {prenom:$('#regPrenom').value.trim(),nom:$('#regNom').value.trim(),role:$('#regRole').value};
  const {data,error}= await sb.auth.signUp({email:$('#regEmail').value.trim(),password:$('#regPassword').value,emailRedirectTo:location.origin,options:{data:metadata}});
  if(error){ msg(m,error.message,false); return; }
  msg(m,'Compte créé. Vérifiez votre email si la confirmation est activée.',true); currentUser=data.user; await refreshAuth();
}
async function login(e){
  e.preventDefault(); const m=$('#loginMsg');
  const {error}= await sb.auth.signInWithPassword({email:$('#loginEmail').value.trim(),password:$('#loginPassword').value});
  if(error){ msg(m,error.message,false); return; }
  msg(m,'Connexion réussie.',true); closeModal($('#loginModal .modal-card')); await refreshAuth(); scrollToSel('#dashboard'); $('#dashboard')?.classList.remove('hidden');
}
async function logout(){ if(sb){ await sb.auth.signOut(); currentUser=null; currentProfile=null; updateUI(); $('#dashboard')?.classList.add('hidden'); } }
async function loadTeacher(){

  if(!sb || !currentUser) return;

  const {data,error} = await sb
    .from("teacher_courses")
    .select("*")
    .eq("teacher_id", currentUser.id);

  const box = $("#teacherCourses");

  if(error){
    box.innerHTML = `<p class="error">${error.message}</p>`;
    return;
  }

  if(!data?.length){
    box.innerHTML = "<p>Aucun cours assigné.</p>";
    return;
  }

  box.innerHTML = data.map(course => `
    <div class="admission-row">
      <div>
        <strong>${course.course_title}</strong><br>
        <small>${course.course_slug}</small>
      </div>

      <div>
        <a class="btn btn-gold"
           href="${course.jitsi_room}"
           target="_blank">
           Rejoindre le live
        </a>
      </div>
    </div>
  `).join("");
}
function init(){
  renderCourses(); refreshAuth();
  window.addEventListener('scroll',()=>$('#navbar')?.classList.toggle('scrolled',scrollY>30));
  $('#mobileMenu')?.addEventListener('click',()=>$('#navLinks')?.classList.toggle('open'));
  $$('[data-open]').forEach(b=>b.addEventListener('click',()=>openModal(b.dataset.open)));
  $$('[data-close]').forEach(b=>b.addEventListener('click',()=>closeModal(b)));
  $$('.modal').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('active')}));
  $$('[data-switch]').forEach(b=>b.addEventListener('click',()=>{b.closest('.modal').classList.remove('active');openModal(b.dataset.switch)}));
  $$('[data-scroll]').forEach(b=>b.addEventListener('click',()=>scrollToSel(b.dataset.scroll)));
  $('#admissionForm')?.addEventListener('submit',submitAdmission); $('#registerForm')?.addEventListener('submit',register); $('#loginForm')?.addEventListener('submit',login); $('#logoutBtn')?.addEventListener('click',logout);
  $('#dashboardBtn')?.addEventListener('click',()=>{ $('#dashboard')?.classList.remove('hidden'); scrollToSel('#dashboard'); });
  $('#previewLiveBtn')?.addEventListener('click',()=>window.open('https://meet.jit.si/jambouyo-demo','_blank'));
  $('#formationsGrid')?.addEventListener('click',e=>{ const enroll=e.target.closest('[data-course]'); const live=e.target.closest('[data-live]'); if(enroll){ $('#admFormation').value = courses.find(c=>c[0]===enroll.dataset.course)?.[1] || ''; scrollToSel('#admission'); } if(live){ window.open(`https://meet.jit.si/jambouyo-${live.dataset.live}`,'_blank'); } });
  $('#adminAdmissions')?.addEventListener('click',async e=>{ const b=e.target.closest('[data-status]'); if(!b) return; const {error}=await sb.from('admissions').update({status:b.dataset.status,updated_at:new Date().toISOString()}).eq('id',b.dataset.id); if(error) alert(error.message); else loadAdmin(); });
  $$('.dashboard-tabs button').forEach(btn=>btn.addEventListener('click',()=>{$$('.dashboard-tabs button').forEach(x=>x.classList.remove('active'));$$('.dashboard-panel').forEach(x=>x.classList.remove('active'));btn.classList.add('active');$('#'+btn.dataset.tab)?.classList.add('active')}));
  const obs=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting)e.target.classList.add('visible')}),{threshold:.12}); $$('.reveal').forEach(el=>obs.observe(el));
  const cursor=$('#cursor'),ring=$('#cursorRing'); let mx=0,my=0,rx=0,ry=0; document.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;if(cursor){cursor.style.left=mx+'px';cursor.style.top=my+'px'}}); function anim(){rx+=(mx-rx)*.12;ry+=(my-ry)*.12;if(ring){ring.style.left=rx+'px';ring.style.top=ry+'px'}requestAnimationFrame(anim)} anim();
  if(sb) sb.auth.onAuthStateChange((_event,session)=>{ currentUser=session?.user||null; refreshAuth(); });
}
document.addEventListener('DOMContentLoaded',init);
