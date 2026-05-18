/* JAM'BOUYO Academy — Supabase + Premium UI */
const SUPABASE_URL = 'https://rubjacjxgrnqfiijshcq.supabase.co';
const SUPABASE_KEY = 'sb_publishable_5xN_ecJ-hRpUhEBjBeCcQQ_R1DbfDYL';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const FORMATIONS = [
  ['ia','Intelligence Artificielle','Maîtrisez les outils d’IA générative et transformez vos méthodes de travail.','Populaire','12 semaines','jambouyo-ia'],
  ['prompt','Prompt Engineering','Créez des prompts efficaces pour ChatGPT, Claude, Gemini et les outils IA.','Nouveau','6 semaines','jambouyo-prompt'],
  ['canva','Canva','Design de visuels professionnels, présentations et contenus réseaux sociaux.','Créatif','4 semaines','jambouyo-canva'],
  ['excel','Excel','Formules, tableaux croisés dynamiques, analyse et productivité avancée.','Essentiel','8 semaines','jambouyo-excel'],
  ['vba','VBA Excel','Automatisez Excel avec macros et outils de gestion personnalisés.','Expert','6 semaines','jambouyo-vba'],
  ['compta','Comptabilité','Bases comptables, états financiers et pratique professionnelle.','Pro','10 semaines','jambouyo-compta'],
  ['anglais','Anglais','Communication orale et écrite pour progresser rapidement.','Langue','12 semaines','jambouyo-anglais'],
  ['business-english','Business English','Emails, réunions, présentations et négociation en anglais professionnel.','Business','8 semaines','jambouyo-business-english'],
  ['entreprise','Création d’entreprise','Business plan, stratégie, lancement et structuration d’un projet.','Business','8 semaines','jambouyo-entreprise'],
  ['banque','Banque & Assurance','Produits bancaires, assurance, réglementation et relation client.','Finance','10 semaines','jambouyo-banque']
];

let currentUser = null;
let currentProfile = null;
let allAdmissions = [];
let allProfiles = [];

window.addEventListener('DOMContentLoaded', init);

async function init(){
  initCursor();
  initReveal();
  renderFormations();
  renderFormationOptions();
  bindForms();
  window.addEventListener('scroll',()=>document.getElementById('topNav').classList.toggle('scrolled', window.scrollY>30));
  const { data:{session} } = await sb.auth.getSession();
  if(session) await hydrateSession(session.user);
  sb.auth.onAuthStateChange(async(_event, session)=>{
    if(session?.user) await hydrateSession(session.user); else setLoggedOut();
  });
  await refreshPublicStats();
}

function bindForms(){
  document.getElementById('loginForm')?.addEventListener('submit', login);
  document.getElementById('registerForm')?.addEventListener('submit', register);
  document.getElementById('admissionForm')?.addEventListener('submit', submitAdmission);
}

function renderFormations(){
  const grid=document.getElementById('formationsGrid');
  grid.innerHTML = FORMATIONS.map((f,i)=>`
    <article class="formation-card reveal">
      <div class="formation-num">${String(i+1).padStart(2,'0')}</div>
      <div class="formation-badge">${f[3]}</div>
      <h3 class="formation-title">${f[1]}</h3>
      <p class="formation-desc">${f[2]}</p>
      <div class="formation-meta"><span>⟡ ${f[4]}</span><span>◈ Live</span><span>◆ Admission</span></div>
      <div class="formation-actions">
        <button class="btn-outline" onclick="openAdmission('${f[1]}')">Demander l'admission</button>
        <button class="btn-gold" onclick="joinLive('${f[5]}','${f[1]}')">Rejoindre</button>
      </div>
    </article>`).join('');
}
function renderFormationOptions(){
  const selects=[document.getElementById('admFormation')].filter(Boolean);
  selects.forEach(sel=>{
    sel.innerHTML='<option value="">-- Sélectionner une formation --</option>'+FORMATIONS.map(f=>`<option value="${f[1]}">${f[1]}</option>`).join('');
  });
}

async function hydrateSession(user){
  currentUser=user;
  currentProfile=await getProfile(user);
  setLoggedIn();
}
async function getProfile(user){
  let {data,error}=await sb.from('profiles').select('*').eq('id',user.id).maybeSingle();
  if(data) return data;
  const meta=user.user_metadata||{};
  const fallback={id:user.id,email:user.email,prenom:meta.prenom||'',nom:meta.nom||'',role:meta.role||'etudiant',is_active:true};
  await sb.from('profiles').upsert(fallback);
  return fallback;
}
function setLoggedIn(){
  document.getElementById('navGuest').classList.add('hidden');
  document.getElementById('navUser').classList.remove('hidden');
  document.getElementById('navWelcome').textContent=`Bienvenue ${currentProfile?.prenom || currentUser?.email} 👋`;
  prefillAdmission();
}
function setLoggedOut(){
  currentUser=null; currentProfile=null;
  document.getElementById('navGuest').classList.remove('hidden');
  document.getElementById('navUser').classList.add('hidden');
  closeDashboard();
}
async function login(e){
  e.preventDefault();
  const btn=document.getElementById('loginBtn'); btn.disabled=true; btn.textContent='Connexion...';
  const email=document.getElementById('loginEmail').value.trim();
  const password=document.getElementById('loginPassword').value;
  const {error}=await sb.auth.signInWithPassword({email,password});
  btn.disabled=false; btn.textContent='Se connecter';
  if(error) return toast('Email ou mot de passe incorrect.','error');
  closeModal('loginModal'); toast('Connexion réussie.','success');
  setTimeout(openDashboard,300);
}
async function register(e){
  e.preventDefault();
  const btn=document.getElementById('registerBtn'); btn.disabled=true; btn.textContent='Création...';
  const prenom=document.getElementById('regPrenom').value.trim();
  const nom=document.getElementById('regNom').value.trim();
  const email=document.getElementById('regEmail').value.trim();
  const password=document.getElementById('regPassword').value;
  const role=document.getElementById('regRole').value;
  const {data,error}=await sb.auth.signUp({email,password,options:{data:{prenom,nom,role}}});
  if(!error && data.user){ await sb.from('profiles').upsert({id:data.user.id,email,prenom,nom,role,is_active:true}); }
  btn.disabled=false; btn.textContent='Créer mon compte';
  if(error) return toast(error.message,'error');
  toast('Compte créé. Vérifiez votre email si une confirmation est demandée.','success');
  closeModal('registerModal');
}
async function logout(){ await sb.auth.signOut(); setLoggedOut(); toast('Déconnexion effectuée.','success'); }
async function resetPasswordPrompt(){
  const email=prompt('Entrez votre email pour recevoir le lien de réinitialisation :');
  if(!email) return;
  const {error}=await sb.auth.resetPasswordForEmail(email,{redirectTo:location.origin});
  toast(error?error.message:'Email de réinitialisation envoyé.','success');
}

function prefillAdmission(){
  if(!currentProfile) return;
  const map={admPrenom:currentProfile.prenom||'',admNom:currentProfile.nom||'',admEmail:currentProfile.email||currentUser.email||''};
  for(const [id,val] of Object.entries(map)){const el=document.getElementById(id); if(el&&!el.value) el.value=val;}
}
function openAdmission(formation=''){
  scrollToSection('admission');
  setTimeout(()=>{ if(formation) document.getElementById('admFormation').value=formation; prefillAdmission(); },250);
}
async function submitAdmission(e){
  e.preventDefault();
  const btn=document.getElementById('admSubmitBtn'); btn.disabled=true; btn.textContent='Envoi...';
  const payload={
    user_id: currentUser?.id || null,
    prenom:document.getElementById('admPrenom').value.trim(),
    nom:document.getElementById('admNom').value.trim(),
    email:document.getElementById('admEmail').value.trim(),
    telephone:document.getElementById('admTel').value.trim(),
    formation:document.getElementById('admFormation').value,
    message:document.getElementById('admMessage').value.trim(),
    status:'pending'
  };
  const {error}=await sb.from('admissions').insert(payload);
  btn.disabled=false; btn.textContent='Envoyer ma demande';
  if(error) return toast('Erreur Supabase : '+error.message,'error');
  e.target.reset(); toast('Demande envoyée. Notre service admission vous contactera rapidement.','success');
  await refreshPublicStats();
}

function openDashboard(){
  if(!currentUser){openModal('loginModal');return;}
  if(['admin','formateur'].includes(currentProfile?.role)) openAdminDashboard(); else openStudentDashboard();
}
async function openStudentDashboard(){
  document.getElementById('studentDashboard').classList.remove('hidden');
  document.getElementById('studentWelcome').textContent=`Bienvenue ${currentProfile?.prenom || currentUser.email} 👋`;
  document.body.style.overflow='hidden';
  await loadMyAdmissions();
  renderStudentStats(); renderStudentCourses(); renderStudentProfile();
}
function renderStudentProfile(){
  document.getElementById('studentProfileCard').innerHTML=`
    <p><strong>Nom :</strong> ${currentProfile?.prenom||''} ${currentProfile?.nom||''}</p>
    <p><strong>Email :</strong> ${currentProfile?.email||currentUser.email}</p>
    <p><strong>Rôle :</strong> ${currentProfile?.role||'etudiant'}</p>
    <p><strong>Statut :</strong> ${currentProfile?.is_active===false?'Désactivé':'Actif'}</p>`;
}
async function loadMyAdmissions(){
  const {data,error}=await sb.from('admissions').select('*').or(`user_id.eq.${currentUser.id},email.eq.${currentUser.email}`).order('created_at',{ascending:false});
  const list=document.getElementById('myAdmissionsList');
  if(error){list.innerHTML='<p>Impossible de charger vos admissions.</p>'; return;}
  allAdmissions=data||[];
  list.innerHTML = allAdmissions.length ? allAdmissions.map(admissionRow).join('') : '<p class="empty">Aucune demande pour le moment.</p>';
}
function renderStudentStats(){
  const approved=allAdmissions.filter(a=>a.status==='approved').length;
  const pending=allAdmissions.filter(a=>a.status==='pending').length;
  document.getElementById('studentStats').innerHTML=`
    <div class="dash-stat"><strong>${allAdmissions.length}</strong><span>Demandes</span></div>
    <div class="dash-stat"><strong>${pending}</strong><span>En attente</span></div>
    <div class="dash-stat"><strong>${approved}</strong><span>Acceptées</span></div>`;
}
function renderStudentCourses(){
  const accepted = new Set(allAdmissions.filter(a=>a.status==='approved').map(a=>a.formation));
  document.getElementById('studentCoursesGrid').innerHTML=FORMATIONS.map(f=>`
    <div class="dash-course"><h4>${f[1]}</h4><p>${f[2]}</p>
    ${accepted.has(f[1])?`<button class="btn-gold" onclick="joinLive('${f[5]}','${f[1]}',true)">Rejoindre le cours</button>`:`<button class="btn-outline" onclick="openAdmission('${f[1]}')">Demander admission</button>`}</div>`).join('');
}
async function openAdminDashboard(){
  document.getElementById('adminDashboard').classList.remove('hidden');
  document.getElementById('adminWelcome').textContent=`Dashboard Admin — ${currentProfile?.prenom || currentUser.email}`;
  document.body.style.overflow='hidden';
  await loadAdminData(); renderAdminStats(); renderAdminAdmissions(); renderAdminStudents(); renderAdminCourses();
}
async function loadAdminData(){
  const [profiles, admissions]=await Promise.all([
    sb.from('profiles').select('*').order('created_at',{ascending:false}),
    sb.from('admissions').select('*').order('created_at',{ascending:false})
  ]);
  allProfiles=profiles.data||[]; allAdmissions=admissions.data||[];
  if(profiles.error) toast('Accès profils refusé : vérifiez le rôle admin/RLS.','error');
}
function renderAdminStats(){
  document.getElementById('adminStats').innerHTML=`
    <div class="dash-stat"><strong>${allProfiles.length}</strong><span>Utilisateurs</span></div>
    <div class="dash-stat"><strong>${allAdmissions.filter(a=>a.status==='pending').length}</strong><span>En attente</span></div>
    <div class="dash-stat"><strong>${allAdmissions.filter(a=>a.status==='approved').length}</strong><span>Acceptées</span></div>`;
}
function renderAdminAdmissions(){
  const el=document.getElementById('adminAdmissionsList');
  el.innerHTML=allAdmissions.length?allAdmissions.map(a=>admissionRow(a,true)).join(''):'<p>Aucune admission.</p>';
}
function renderAdminStudents(){
  const q=(document.getElementById('studentSearch')?.value||'').toLowerCase();
  const students=allProfiles.filter(p=>(p.role==='etudiant')&&(`${p.prenom} ${p.nom} ${p.email}`.toLowerCase().includes(q)));
  document.getElementById('adminStudentsList').innerHTML=students.length?students.map(p=>`
    <div class="data-row"><div><strong>${p.prenom||''} ${p.nom||''}</strong><small>${p.email}</small></div><div>${p.role}</div><div>${p.is_active===false?'Désactivé':'Actif'}</div><div class="row-actions"><button onclick="toggleUser('${p.id}',${p.is_active===false})">${p.is_active===false?'Activer':'Désactiver'}</button></div></div>`).join(''):'<p>Aucun étudiant.</p>';
}
function renderAdminCourses(){
  document.getElementById('adminCoursesGrid').innerHTML=FORMATIONS.map(f=>`<div class="dash-course"><h4>${f[1]}</h4><p>${f[2]}</p><button class="btn-gold" onclick="joinLive('${f[5]}','${f[1]}',true)">Démarrer live</button></div>`).join('');
}
function admissionRow(a,admin=false){
  return `<div class="data-row"><div><strong>${a.prenom||''} ${a.nom||''}</strong><small>${a.email} · ${a.telephone||''}</small></div><div>${a.formation||'-'}</div><div><span class="status ${a.status||'pending'}">${statusLabel(a.status)}</span></div><div class="row-actions">${admin?`<button class="success" onclick="setAdmissionStatus('${a.id}','approved')">Accepter</button><button onclick="setAdmissionStatus('${a.id}','pending')">Attente</button><button class="danger" onclick="setAdmissionStatus('${a.id}','rejected')">Refuser</button>`:''}</div></div>`;
}
function statusLabel(s){return {pending:'En attente',approved:'Accepté',rejected:'Refusé'}[s]||'En attente';}
async function setAdmissionStatus(id,status){
  const {error}=await sb.from('admissions').update({status,updated_at:new Date().toISOString()}).eq('id',id);
  if(error) return toast(error.message,'error');
  toast('Admission mise à jour.','success'); await loadAdminData(); renderAdminStats(); renderAdminAdmissions();
}
async function toggleUser(id,activate){
  const {error}=await sb.from('profiles').update({is_active:activate}).eq('id',id);
  if(error) return toast(error.message,'error');
  toast('Utilisateur mis à jour.','success'); await loadAdminData(); renderAdminStudents();
}
function closeDashboard(){
  document.getElementById('studentDashboard').classList.add('hidden');
  document.getElementById('adminDashboard').classList.add('hidden');
  document.body.style.overflow='';
}
function showStudentTab(id,btn){showTab('#studentDashboard',id,btn)}
function showAdminTab(id,btn){showTab('#adminDashboard',id,btn)}
function showTab(scope,id,btn){document.querySelectorAll(`${scope} .dash-tab`).forEach(t=>t.classList.add('hidden'));document.getElementById(id).classList.remove('hidden');document.querySelectorAll(`${scope} .dash-link`).forEach(b=>b.classList.remove('active'));btn.classList.add('active')}

function joinLive(room,title,force=false){
  if(!currentUser){openModal('loginModal'); return toast('Connectez-vous pour accéder au cours.','error');}
  if(!force && currentProfile?.role==='etudiant'){
    const ok=allAdmissions.some(a=>a.formation===title && a.status==='approved');
    if(!ok) return toast('Accès réservé aux étudiants acceptés pour cette formation.','error');
  }
  document.getElementById('liveModalTitle').textContent=`Cours en direct — ${title}`; openModal('liveModal');
  const container=document.getElementById('jitsiContainer'); container.innerHTML='<p style="color:#C9962A">Chargement de la salle...</p>';
  const load=()=>{container.innerHTML=''; new JitsiMeetExternalAPI('meet.jit.si',{roomName:`JamBouyo-${room}`,width:'100%',height:520,parentNode:container,userInfo:{displayName:`${currentProfile?.prenom||''} ${currentProfile?.nom||''}`.trim()||currentUser.email},interfaceConfigOverwrite:{APP_NAME:"JAM'BOUYO Academy",SHOW_JITSI_WATERMARK:false}})};
  if(window.JitsiMeetExternalAPI) load(); else {const s=document.createElement('script');s.src='https://meet.jit.si/external_api.js';s.onload=load;s.onerror=()=>container.innerHTML=`<div style="text-align:center"><p>Ouvrez la salle directement :</p><a class="btn-gold" target="_blank" href="https://meet.jit.si/JamBouyo-${room}">Ouvrir Jitsi</a></div>`;document.head.appendChild(s)}
}
function closeLiveModal(){closeModal('liveModal');document.getElementById('jitsiContainer').innerHTML='';}

async function refreshPublicStats(){
  const [profiles, admissions]=await Promise.all([sb.from('profiles').select('id',{count:'exact',head:true}), sb.from('admissions').select('id',{count:'exact',head:true})]);
  const users=profiles.count||0, ads=admissions.count||0;
  document.getElementById('heroStudents').textContent='+'+users;
  document.getElementById('statUsers').textContent=users;
  document.getElementById('statAdmissions').textContent=ads;
}
function initCursor(){
  const cursor=document.getElementById('cursor'), ring=document.getElementById('cursorRing'); let mx=0,my=0,rx=0,ry=0;
  document.addEventListener('mousemove',e=>{mx=e.clientX;my=e.clientY;cursor.style.left=mx+'px';cursor.style.top=my+'px'});
  (function anim(){rx+=(mx-rx)*.12;ry+=(my-ry)*.12;ring.style.left=rx+'px';ring.style.top=ry+'px';requestAnimationFrame(anim)})();
  document.querySelectorAll('button,a,.formation-card,.t-stat').forEach(el=>{el.addEventListener('mouseenter',()=>{cursor.style.transform='translate(-50%,-50%) scale(2.4)';ring.style.width='60px';ring.style.height='60px';ring.style.borderColor='rgba(201,150,42,.7)'});el.addEventListener('mouseleave',()=>{cursor.style.transform='translate(-50%,-50%) scale(1)';ring.style.width='36px';ring.style.height='36px';ring.style.borderColor='rgba(201,150,42,.4)'})});
}
function initReveal(){const obs=new IntersectionObserver(es=>es.forEach((e,i)=>{if(e.isIntersecting)setTimeout(()=>e.target.classList.add('visible'),i*70)}),{threshold:.1});setTimeout(()=>document.querySelectorAll('.reveal').forEach(el=>obs.observe(el)),50)}
function openModal(id){document.getElementById(id).classList.add('active')}
function closeModal(id){document.getElementById(id).classList.remove('active')}
function closeModalOutside(e,id){if(e.target.id===id)closeModal(id)}
function switchModal(a,b){closeModal(a);setTimeout(()=>openModal(b),150)}
function toggleMobileMenu(){document.getElementById('navLinks').classList.toggle('open');(currentUser?document.getElementById('navUser'):document.getElementById('navGuest')).classList.toggle('open')}
function scrollToSection(id){document.getElementById(id)?.scrollIntoView({behavior:'smooth'})}
function toast(msg,type='success'){const t=document.getElementById('toast');t.textContent=msg;t.className=`toast ${type}`;setTimeout(()=>t.classList.add('hidden'),4500)}
