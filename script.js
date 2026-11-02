import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updatePassword, deleteUser } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, deleteDoc, addDoc, collection, query, where, getDocs, serverTimestamp, orderBy, increment } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = { apiKey: "AIzaSyA24goApnS9GR3PnhKnJXqRqJN05DTG6cc", authDomain: "tsc-universe.firebaseapp.com", projectId: "tsc-universe", storageBucket: "tsc-universe.firebasestorage.app", messagingSenderId: "537337043396", appId: "1:537337043396:web:b86e9a24928eee9a0a6c91" };
const app = initializeApp(firebaseConfig); const auth = getAuth(app); const db = getFirestore(app);

window.currentUserData = null; window.allDossiers = []; window.allTeamMembers = []; window.isAdmin = false; window.currentDossierFilter = 'all'; window.myApplications = { blogger: null, obt: null, tester: null };

const escapeHtml = (str) => !str ? '' : String(str).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const formatDateTime = (ts) => { if(!ts) return ''; let d = ts.toDate ? ts.toDate() : new Date(ts); return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; };
const showToast = (type, title, msg) => { const c = document.getElementById('toast-container'); if(!c) return; const t = document.createElement('div'); t.className = `toast ${type}`; t.innerHTML = `<div class="toast-title">${title}</div><div>${msg}</div>`; c.appendChild(t); setTimeout(()=>{ t.style.opacity='0'; setTimeout(()=>t.remove(),300); }, 6000); };

// --- ЭФФЕКТЫ ---
const canvas = document.getElementById('matrix');
if (canvas && window.innerWidth > 768) {
    const ctx = canvas.getContext('2d'); let width, height, columns, drops;
    const fontSize = 16; const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%&*+=<>/\\';
    let lastTime = 0; const fps = 30; 
    function initMatrix() { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; columns = Math.floor(width / fontSize); drops = new Array(columns).fill(1); }
    function drawMatrix(time) {
        requestAnimationFrame(drawMatrix); if (time - lastTime < 1000 / fps) return; lastTime = time;
        ctx.fillStyle = 'rgba(10,10,15,0.08)'; ctx.fillRect(0, 0, width, height); ctx.font = fontSize + 'px monospace';
        for (let i = 0; i < drops.length; i++) {
            const char = chars.charAt(Math.floor(Math.random() * chars.length));
            ctx.fillStyle = i % 8 === 0 ? '#ff00aa' : '#00f0ff';
            ctx.fillText(char, i * fontSize, drops[i] * fontSize);
            if (drops[i] * fontSize > height && Math.random() > 0.975) drops[i] = 0;
            drops[i]++;
        }
    }
    initMatrix(); window.addEventListener('resize', initMatrix); requestAnimationFrame(drawMatrix);
}

const introLogs = [
    { t: '> INITIALIZING BREACH PROTOCOL...', c: '' }, { t: '> TARGET: blackwood.city/mainframe', c: '' },
    { t: '> BYPASSING FIREWALL...', c: 'ok' }, { t: '> INJECTING PAYLOAD...', c: 'ok' },
    { t: '> DECRYPTING KERNEL...', c: 'ok' }, { t: '> SCANNING FOR TRACES...', c: 'warn' },
    { t: '> TRACE DETECTED. ACCELERATING.', c: 'warn' }, { t: '> ESTABLISHING SECURE TUNNEL...', c: 'ok' },
    { t: '> ACCESS GRANTED', c: 'ok' }
];
let introDone = false; let introTimers = [];
function runIntro() {
    const term = document.getElementById('intro-terminal'); const fill = document.getElementById('intro-progress-fill'); const txt = document.getElementById('intro-progress-text');
    if (!term || !fill || !txt) return;
    introLogs.forEach((log, i) => {
        const t = setTimeout(() => {
            if (introDone) return;
            const p = document.createElement('div'); p.className = 'log'; const span = document.createElement('span'); span.className = log.c; span.textContent = log.t;
            p.appendChild(span); term.appendChild(p); requestAnimationFrame(() => p.classList.add('in')); term.scrollTop = term.scrollHeight;
        }, i * 320); introTimers.push(t);
    });
    let progress = 0;
    const progInterval = setInterval(() => {
        if (introDone) { clearInterval(progInterval); return; }
        progress += Math.random() * 9; if (progress >= 100) progress = 100;
        fill.style.width = progress + '%'; txt.textContent = Math.floor(progress) + '%';
        if (progress >= 100) { clearInterval(progInterval); setTimeout(() => { if (!introDone) finishIntro(); }, 500); }
    }, 130); introTimers.push(progInterval);
}
function finishIntro() { introDone = true; document.getElementById('intro-overlay').classList.add('fade-out'); setTimeout(() => { document.getElementById('intro-overlay').classList.add('hidden'); document.getElementById('auth-overlay').classList.remove('hidden'); }, 700); }
window.skipIntro = function() { introTimers.forEach(t => { clearTimeout(t); clearInterval(t); }); finishIntro(); };

function startBreach() {
    const overlay = document.getElementById('breach-overlay'); const canvas = document.getElementById('breach-canvas');
    const flash = document.getElementById('breach-flash'); const btext = document.querySelector('.breach-text'); overlay.classList.remove('hidden');
    const ctx = canvas.getContext('2d'); let W = canvas.width = window.innerWidth; let H = canvas.height = window.innerHeight;
    const cx = W / 2, cy = H / 2; const cracks = []; const numMain = 9;
    for (let i = 0; i < numMain; i++) cracks.push(makeCrack(cx, cy, (Math.PI * 2 / numMain) * i + Math.random() * 0.3, 0));
    function makeCrack(x, y, angle, depth) {
        const points = [{x, y}]; let px = x, py = y, a = angle; const segs = 5 + Math.floor(Math.random() * 4);
        for (let i = 0; i < segs; i++) {
            a += (Math.random() - 0.5) * 0.6; const len = 40 + Math.random() * 80;
            px += Math.cos(a) * len; py += Math.sin(a) * len; points.push({x: px, y: py});
            if (depth < 1 && Math.random() < 0.35) cracks.push(makeCrack(px, py, a + (Math.random() - 0.5) * 1.2, depth + 1));
        } return { points };
    }
    let start = performance.now();
    function draw(now) {
        const t = Math.min(1, (now - start) / 1100);
        ctx.clearRect(0, 0, W, H); ctx.strokeStyle = 'rgba(0,240,255,0.95)'; ctx.lineWidth = 2; ctx.shadowBlur = 12; ctx.shadowColor = '#00f0ff';
        cracks.forEach(c => {
            const total = c.points.length - 1; const drawUpTo = Math.floor(total * t);
            ctx.beginPath(); c.points.forEach((p, i) => { if (i > drawUpTo) return; if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y); }); ctx.stroke();
        });
        if (t < 1) requestAnimationFrame(draw);
        else {
            flash.classList.add('on'); btext.classList.add('on'); setTimeout(() => flash.classList.remove('on'), 120);
            setTimeout(() => {
                overlay.classList.add('hidden'); document.getElementById('auth-overlay').classList.add('hidden');
                document.getElementById('main-content').classList.remove('hidden');
                updateProfileUI(); launchSiteReveal();
            }, 650);
        }
    } requestAnimationFrame(draw);
}

const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('in');
            const h2 = entry.target.querySelector('.split-title');
            if (h2 && !h2.dataset.animated) { h2.dataset.animated = '1'; splitLetters(h2, 0.035); }
        }
    });
}, { threshold: 0.12 });

function splitLetters(el, delayStep = 0.05) {
    const text = el.textContent.trim(); if (!text) return;
    el.innerHTML = ''; el.style.opacity = '1';
    [...text].forEach((ch, i) => {
        const span = document.createElement('span'); span.className = 'letter'; span.textContent = ch === ' ' ? '\u00A0' : ch;
        span.style.transitionDelay = (i * delayStep) + 's'; el.appendChild(span);
        setTimeout(() => span.classList.add('in'), 30);
    });
}

document.querySelectorAll('.tilt').forEach(el => {
    el.addEventListener('mousemove', e => {
        const rect = el.getBoundingClientRect(); const x = e.clientX - rect.left; const y = e.clientY - rect.top;
        const cx = rect.width / 2, cy = rect.height / 2;
        el.style.transform = `perspective(900px) rotateX(${(y-cy)/cy*8}deg) rotateY(${(cx-x)/cx*8}deg) translateZ(8px)`;
    });
    el.addEventListener('mouseleave', () => el.style.transform = '');
});

// --- ЛОГИКА ---
window.changeLang = function(lang) {
    document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`lang-${lang}`).classList.add('active');
    if(lang === 'ru') {
        document.querySelectorAll('.nav-links a').forEach((a, i) => {
            const texts = ['О игре', 'Версия', 'Трекер', 'Особенности', 'Досье', 'Блогеры', 'ОБТ', 'Тестеры', 'Заявки', 'Магазин'];
            if(texts[i]) a.textContent = texts[i];
        });
        return;
    }
    const dict = { en: ['About', 'Version', 'Tracker', 'Features', 'Dossiers', 'Bloggers', 'OBT', 'Testers', 'Applications', 'Shop'] };
    document.querySelectorAll('.nav-links a').forEach((a, i) => { if(dict[lang] && dict[lang][i]) a.textContent = dict[lang][i]; });
};

window.switchAuthTab = function(tab) {
    document.getElementById('tab-login').classList.toggle('active', tab === 'login');
    document.getElementById('tab-register').classList.toggle('active', tab === 'register');
    ['login', 'register', 'token'].forEach(p => document.getElementById(`auth-${p}`).classList.add('hidden'));
    document.getElementById(`auth-${tab}`).classList.remove('hidden');
};
window.loginUser = async function() {
    const email = document.getElementById('login-email').value; const pass = document.getElementById('login-password').value;
    try {
        const cred = await signInWithEmailAndPassword(auth, email, pass);
        const snap = await getDoc(doc(db, "users", cred.user.uid));
        if(snap.exists()) { window.currentUserData = snap.data(); startBreach(); }
    } catch(e) { document.getElementById('login-error').textContent = "Ошибка: " + e.message; }
};
window.registerUser = async function() {
    const email = document.getElementById('reg-email').value; const pass = document.getElementById('reg-password').value;
    try {
        const cred = await createUserWithEmailAndPassword(auth, email, pass);
        const token = `TSC-${Math.random().toString(36).substr(2,4).toUpperCase()}-${Math.random().toString(36).substr(2,4).toUpperCase()}`;
        await setDoc(doc(db, "users", cred.user.uid), {
            email, username: document.getElementById('reg-username').value, name: document.getElementById('reg-name').value,
            age: document.getElementById('reg-age').value, gender: document.getElementById('reg-gender').value,
            tscToken: token, role: "player", crystals: 0, coins: 0, history: [], unlockedDossiers: ["player"]
        });
        document.getElementById('generated-token').textContent = token; switchAuthTab('token');
    } catch(e) { document.getElementById('reg-error').textContent = "Ошибка: " + e.message; }
};

window.addEventListener('load', () => {
    onAuthStateChanged(auth, async (user) => {
        if(user) {
            const snap = await getDoc(doc(db, "users", user.uid));
            if(snap.exists()) { 
                window.currentUserData = snap.data(); 
                window.isAdmin = window.currentUserData.role === 'admin'; 
                startBreach(); 
            }
        } else {
            document.getElementById('main-content').classList.add('hidden'); 
            document.getElementById('auth-overlay').classList.add('hidden'); 
            document.getElementById('intro-overlay').classList.remove('hidden'); 
            runIntro();
        }
    });
});

function launchSiteReveal() {
    const title = document.getElementById('hero-title'); if (title) splitLetters(title, 0.06);
    document.querySelectorAll('.section').forEach(s => observer.observe(s));
    loadDossiers(); loadTeam(); loadApplicationStatus();
    if(window.currentUserData) {
        document.getElementById('my-token-display').textContent = window.currentUserData.tscToken;
        document.getElementById('token-box').classList.remove('hidden');
        ['blogger', 'obt', 'tester'].forEach(type => {
            const nameInp = document.getElementById(`${type}-realname`); const ageInp = document.getElementById(`${type}-age`);
            if(nameInp) nameInp.value = window.currentUserData.name || ''; if(ageInp) ageInp.value = window.currentUserData.age || '';
        });
    }
}

function updateProfileUI() {
    if(!window.currentUserData) return;
    document.getElementById('prof-name').textContent = window.currentUserData?.name || 'Неизвестно';
    document.getElementById('prof-age').textContent = window.currentUserData?.age || '0';
    document.getElementById('prof-user').textContent = window.currentUserData?.username || '@...';
    const avatar = localStorage.getItem('tsc_avatar');
    if(avatar) {
        document.getElementById('profile-avatar-large').style.backgroundImage = `url(${avatar})`; document.getElementById('profile-avatar-large').textContent = '';
        document.getElementById('nav-avatar-container').style.backgroundImage = `url(${avatar})`; document.getElementById('nav-avatar-container').textContent = '';
    } else {
        document.getElementById('profile-avatar-large').style.backgroundImage = 'none'; document.getElementById('profile-avatar-large').textContent = (window.currentUserData?.name || '?').charAt(0);
        document.getElementById('nav-avatar-container').style.backgroundImage = 'none'; document.getElementById('nav-avatar-container').textContent = (window.currentUserData?.name || '?').charAt(0);
    }
    document.getElementById('admin-panel-btn')?.classList.toggle('hidden', !window.isAdmin); 
    renderProfileApps();
}
window.openProfileModal = function() { document.getElementById('profile-modal').classList.remove('hidden'); updateProfileUI(); };
window.closeProfileModal = function(e) { if(e) e.stopPropagation(); document.getElementById('profile-modal').classList.add('hidden'); };
window.uploadAvatar = function(e) { const reader = new FileReader(); reader.onload = (re) => { localStorage.setItem('tsc_avatar', re.target.result); updateProfileUI(); }; reader.readAsDataURL(e.target.files[0]); };
window.showImagePreview = function() { const avatar = localStorage.getItem('tsc_avatar'); if (avatar) { document.getElementById('preview-img').src = avatar; document.getElementById('image-preview-modal').classList.remove('hidden'); } };
window.closeImagePreview = function() { document.getElementById('image-preview-modal').classList.add('hidden'); };
window.changePassword = async function() { const p = prompt('Новый пароль:'); if(p && p.length >= 6) await updatePassword(auth.currentUser, p); };
window.changeToken = async function() { const newToken = `TSC-${Math.random().toString(36).substr(2,4).toUpperCase()}-${Math.random().toString(36).substr(2,4).toUpperCase()}`; await updateDoc(doc(db, "users", auth.currentUser.uid), { tscToken: newToken }); alert("Новый токен: " + newToken); };
window.logoutUser = function() { signOut(auth).then(() => { localStorage.clear(); location.reload(); }); };

async function loadDossiers() {
    const snap = await getDocs(query(collection(db, "dossiers"), orderBy("order", "asc")));
    window.allDossiers = []; snap.forEach(d => window.allDossiers.push({ id: d.id, ...d.data() })); renderDossiers();
}
function renderDossiers() {
    const grid = document.getElementById('dossier-grid'); if(!grid) return;
    const unlocked = window.currentUserData?.unlockedDossiers || ["player"];
    const opened = window.allDossiers.filter(d => unlocked.includes(d.id));
    const locked = window.allDossiers.filter(d => !unlocked.includes(d.id));
    const filteredOpened = opened.filter(d => window.currentDossierFilter === 'all' || d.status === window.currentDossierFilter);
    document.getElementById('dossier-progress').textContent = `Открыто ${opened.length} из ${window.allDossiers.length}`;
    grid.innerHTML = [...filteredOpened, ...locked.slice(0,2)].map(d => {
        if(!unlocked.includes(d.id)) return `<div class="dossier-card locked"><div class="dossier-photo silhouette">?</div><div class="dossier-info"><div class="dossier-name">???</div></div></div>`;
        return `<div class="dossier-card" onclick="openDossierModal('${d.id}')"><div class="dossier-photo" style="background-image:url('${d.photo}')"></div><div class="dossier-info"><div class="dossier-name">${d.name}</div></div></div>`;
    }).join('');
}
window.filterDossiers = function(f) { window.currentDossierFilter = f; renderDossiers(); };
window.openDossierModal = function(id) {
    const d = window.allDossiers.find(x => x.id === id);
    let html = `<h3 class="dossier-detail-name">${d.name}</h3>`;
    if(d.bio) html += `<div class="dossier-detail-bio" style="text-align:left; margin-top:1rem;">${d.bio}</div>`;
    if(d.quote) html += `<div class="dossier-detail-quote" style="text-align:left; margin-top:1rem;">«${d.quote}»</div>`;
    if(d.fullBioUrl) html += `<div style="margin-top:1.5rem;text-align:center;"><a href="${d.fullBioUrl}" target="_blank" class="btn-small" style="padding:1rem; display:inline-block;">📖 ПРОЧИТАТЬ ПОЛНУЮ БИОГРАФИЮ</a></div>`;
    const modal = document.createElement('div'); modal.className = 'modal-overlay';
    modal.innerHTML = `<div class="modal-content glass" style="text-align:left;"><button class="modal-close" onclick="this.parentElement.parentElement.remove()">✕</button>${html}</div>`;
    document.body.appendChild(modal);
};

async function loadTeam() {
    try {
        const snap = await getDocs(query(collection(db, "applications"), where("status", "==", "approved")));
        const b = [], o = [], t = []; window.allTeamMembers = [];
        snap.forEach(d => { const data = { id: d.id, ...d.data() }; window.allTeamMembers.push(data); if(data.type === 'blogger') b.push(data); else if(data.type === 'obt') o.push(data); else if(data.type === 'tester') t.push(data); });
        const render = (id, arr) => document.getElementById(id).innerHTML = arr.map(m => `<div class="blogger-card"><div class="blogger-avatar">${(m.realName || m.username).charAt(0)}</div><h3 class="blogger-name">${m.realName || m.username}</h3><div class="verify-badge">✅ Подтвержден</div></div>`).join('');
        render('bloggers-grid', b); render('obt-grid', o); render('testers-grid', t);
    } catch(e) { console.error(e); document.getElementById('bloggers-grid').innerHTML = '<p class="profile-empty">Ошибка загрузки.</p>'; }
}

window.switchAppTab = function(t) { ['blogger','obt','tester'].forEach(x => document.getElementById(`app-${x}`).classList.toggle('hidden', x !== t)); };
window.addBloggerSocial = function() { document.getElementById('blogger-socials-list').innerHTML += `<div class="social-row" style="margin-top:5px;"><input type="text" class="social-url" placeholder="Ссылка"><button onclick="this.parentElement.remove()" class="btn-small">X</button></div>`; };
window.submitBloggerApplication = async function() { await submitApp('blogger'); };
window.submitOBTApplication = async function() { await submitApp('obt'); };
window.submitTesterApplication = async function() { await submitApp('tester'); };
async function submitApp(type) {
    const realName = document.getElementById(`${type}-realname`).value; const age = document.getElementById(`${type}-age`).value;
    const contact = document.getElementById(`${type}-contact-value`).value;
    try { await addDoc(collection(db, "applications"), { uid: auth.currentUser.uid, type, username: window.currentUserData.username, realName, realAge: age, contactValue: contact, status: 'pending', createdAt: serverTimestamp() }); alert("Отправлено!"); loadApplicationStatus(); } catch(e) { alert(e.message); }
}
async function loadApplicationStatus() {
    if(!auth.currentUser) return;
    const snap = await getDocs(query(collection(db, "applications"), where("uid", "==", auth.currentUser.uid)));
    window.myApplications = { blogger: null, obt: null, tester: null };
    snap.forEach(docSnap => {
        const data = docSnap.data();
        const existing = window.myApplications[data.type];
        if (!existing || (data.createdAt?.toMillis?.() || 0) > (existing.createdAt?.toMillis?.() || 0)) {
            window.myApplications[data.type] = { id: docSnap.id, ...data };
        }
    });
    ['blogger', 'obt', 'tester'].forEach(type => {
        const app = window.myApplications[type];
        const formEl = document.getElementById(`app-${type}`); const statusEl = document.getElementById(`app-status-${type}`);
        if (!formEl || !statusEl) return;
        if (!app || app.status === 'rejected' || app.status === 'revoked') {
            formEl.classList.remove('hidden'); statusEl.classList.add('hidden');
        } else {
            formEl.classList.add('hidden'); statusEl.classList.remove('hidden');
            if (app.status === 'pending') statusEl.innerHTML = `<div class="app-status-box pending">⏳ На рассмотрении.</div>`;
            else if (app.status === 'approved') statusEl.innerHTML = `<div class="app-status-box approved">✅ Одобрено!</div>`;
        }
    });
    renderProfileApps();
}
function renderProfileApps() {
    const activeC = document.getElementById('profile-apps-active'); if (!activeC) return;
    const apps = window.myApplications || {};
    const active = [];
    ['blogger', 'obt', 'tester'].forEach(type => {
        const app = apps[type]; if (!app) return;
        const typeLabel = type === 'blogger' ? 'БЛОГЕР' : type === 'obt' ? 'ОБТ' : 'ТЕСТЕР';
        if (app.status === 'pending' || app.status === 'approved') active.push({ ...app, typeLabel });
    });
    activeC.innerHTML = active.length ? active.map(app => `<div class="profile-app-item ${app.status}"><div class="profile-app-header"><span class="profile-app-type">${app.typeLabel}</span></div><div style="color:var(--text-dim);font-size:0.8rem;">Статус: ${app.status}</div></div>`).join('') : '<p class="profile-empty">Нет активных заявок.</p>';
}

window.openAdminPanel = function() { document.getElementById('admin-modal').classList.remove('hidden'); loadAdminApps(); };
window.closeAdminPanel = function(e) { if(e) e.stopPropagation(); document.getElementById('admin-modal').classList.add('hidden'); };
window.switchAdminTab = function(t) { ['apps','promo','notif','settings'].forEach(x => document.getElementById(`admin-${x}`).classList.toggle('hidden', x !== t)); };
async function loadAdminApps() {
    const snap = await getDocs(query(collection(db, "applications"), where("status", "==", "pending")));
    document.getElementById('admin-app-list').innerHTML = snap.docs.map(d => `<div class="admin-app-item pending"><b>${d.data().type}</b> - ${d.data().username} <br><button class="btn-small" style="margin-top:5px;" onclick="appAction('${d.id}', 'approved')">Одобрить</button></div>`).join('');
}
window.appAction = async function(id, status) { await updateDoc(doc(db, "applications", id), { status }); loadAdminApps(); loadTeam(); };
window.generatePromocode = async function() { const code = `TSC-${Math.random().toString(36).substr(2,4).toUpperCase()}`; await setDoc(doc(db, "promocodes", code), { type: document.getElementById('promo-type').value, value: parseInt(document.getElementById('promo-value').value), usedCount: 0, active: true }); document.getElementById('promo-result').textContent = "Код: " + code; };
window.sendMassNotification = async function() { alert("В разработке"); };
window.togglePurchasesFrozen = async function() { alert("В разработке"); };

window.copyToken = function(id) { const el = document.getElementById(id); if(el) navigator.clipboard.writeText(el.textContent); };
window.redeemPromo = async function() { const code = document.getElementById('promo-input').value.toUpperCase(); const snap = await getDoc(doc(db, "promocodes", code)); if(snap.exists()) { alert("Промокод активирован!"); } else { alert("Неверный код"); } };
window.openNotifPanel = () => document.getElementById('notif-panel').classList.remove('hidden');
window.closeNotifPanel = () => document.getElementById('notif-panel').classList.add('hidden');
window.openDownloadModal = () => document.getElementById('download-modal')?.classList.remove('hidden');
window.closeDownloadModal = () => document.getElementById('download-modal')?.classList.add('hidden');
