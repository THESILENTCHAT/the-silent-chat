import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, updatePassword, deleteUser } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, updateDoc, deleteDoc, addDoc, collection, query, where, getDocs, serverTimestamp, orderBy, increment, arrayUnion } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = { apiKey: "AIzaSyA24goApnS9GR3PnhKnJXqRqJN05DTG6cc", authDomain: "tsc-universe.firebaseapp.com", projectId: "tsc-universe", storageBucket: "tsc-universe.firebasestorage.app", messagingSenderId: "537337043396", appId: "1:537337043396:web:b86e9a24928eee9a0a6c91" };
const app = initializeApp(firebaseConfig); const auth = getAuth(app); const db = getFirestore(app);

window.currentUserData = null; window.allDossiers = []; window.allTeamMembers = []; window.isAdmin = false; window.currentDossierFilter = 'all'; window.myApplications = { blogger: null, obt: null, tester: null };

const escapeHtml = (str) => !str ? '' : String(str).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const formatDateTime = (ts) => { if(!ts) return ''; let d = ts.toDate ? ts.toDate() : new Date(ts); return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; };
const showToast = (type, title, msg) => { const c = document.getElementById('toast-container'); if(!c) return; const t = document.createElement('div'); t.className = `toast ${type}`; t.innerHTML = `<div class="toast-title">${title}</div><div>${msg}</div>`; c.appendChild(t); setTimeout(()=>{ t.style.opacity='0'; setTimeout(()=>t.remove(),300); }, 6000); };

// ЯЗЫКИ
window.changeLang = function(lang) {
    document.querySelectorAll('.lang-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`lang-${lang}`).classList.add('active');
    if(lang === 'ru') {
        document.querySelectorAll('.nav-links a').forEach((a, i) => {
            const texts = ['О игре', 'Версия', 'Трекер', 'Особенности', 'Досье', 'Блогеры', 'Отзывы', 'Арт', 'Заявки', 'Магазин'];
            if(texts[i]) a.textContent = texts[i];
        });
        return;
    }
    const dict = { en: ['About', 'Version', 'Tracker', 'Features', 'Dossiers', 'Bloggers', 'Reviews', 'Art', 'Applications', 'Shop'] };
    document.querySelectorAll('.nav-links a').forEach((a, i) => { if(dict[lang] && dict[lang][i]) a.textContent = dict[lang][i]; });
};

// АВТОРИЗАЦИЯ
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
function startBreach() { document.getElementById('auth-overlay').classList.add('hidden'); document.getElementById('main-content').classList.remove('hidden'); updateProfileUI(); launchSiteReveal(); }

window.addEventListener('load', () => {
    onAuthStateChanged(auth, async (user) => {
        if(user) {
            const snap = await getDoc(doc(db, "users", user.uid));
            if(snap.exists()) { window.currentUserData = snap.data(); window.isAdmin = window.currentUserData.role === 'admin'; startBreach(); }
        }
    });
});

function launchSiteReveal() {
    loadDossiers(); loadTeam(); loadReviews(); loadGallery(); loadApplicationStatus();
    if(window.currentUserData) {
        document.getElementById('my-token-display').textContent = window.currentUserData.tscToken;
        document.getElementById('token-box').classList.remove('hidden');
        ['blogger', 'obt', 'tester'].forEach(type => {
            const nameInp = document.getElementById(`${type}-realname`); const ageInp = document.getElementById(`${type}-age`);
            if(nameInp) nameInp.value = window.currentUserData.name || ''; if(ageInp) ageInp.value = window.currentUserData.age || '';
        });
    }
}

// ПРОФИЛЬ
function updateProfileUI() {
    if(!window.currentUserData) return;
    document.getElementById('prof-name').textContent = window.currentUserData?.name || 'Неизвестно';
    document.getElementById('prof-age').textContent = window.currentUserData?.age || '0';
    document.getElementById('prof-user').textContent = window.currentUserData?.username || '@...';
    document.getElementById('prof-gender').textContent = window.currentUserData?.gender || 'Неизвестно';
    const avatar = localStorage.getItem('tsc_avatar');
    if(avatar) {
        document.getElementById('profile-avatar-large').style.backgroundImage = `url(${avatar})`; document.getElementById('profile-avatar-large').textContent = '';
        document.getElementById('nav-avatar-container').style.backgroundImage = `url(${avatar})`; document.getElementById('nav-avatar-container').textContent = '';
    } else {
        document.getElementById('profile-avatar-large').style.backgroundImage = 'none'; document.getElementById('profile-avatar-large').textContent = (window.currentUserData?.name || '?').charAt(0);
        document.getElementById('nav-avatar-container').style.backgroundImage = 'none'; document.getElementById('nav-avatar-container').textContent = (window.currentUserData?.name || '?').charAt(0);
    }
    document.getElementById('set-name').value = window.currentUserData?.name || ''; document.getElementById('set-age').value = window.currentUserData?.age || ''; document.getElementById('set-username').value = window.currentUserData?.username || '';
    document.getElementById('admin-panel-btn')?.classList.toggle('hidden', !window.isAdmin); renderHistory();
}
window.openProfileModal = function() { document.getElementById('profile-modal').classList.remove('hidden'); updateProfileUI(); };
window.closeProfileModal = function(e) { if(e) e.stopPropagation(); document.getElementById('profile-modal').classList.add('hidden'); };
window.switchProfileTab = function(tab) {
    ['info', 'history', 'settings'].forEach(t => document.getElementById(`prof-tab-${t}`).classList.add('hidden'));
    document.getElementById(`prof-tab-${tab}`).classList.remove('hidden');
    document.querySelectorAll('.profile-tab').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.profile-tab[onclick="switchProfileTab('${tab}')"]`).classList.add('active');
};
window.uploadAvatar = function(e) { const reader = new FileReader(); reader.onload = (re) => { localStorage.setItem('tsc_avatar', re.target.result); updateProfileUI(); }; reader.readAsDataURL(e.target.files[0]); };
window.saveSettings = async function() {
    const name = document.getElementById('set-name').value; const age = document.getElementById('set-age').value; const username = document.getElementById('set-username').value;
    await updateDoc(doc(db, "users", auth.currentUser.uid), { name, age, username });
    window.currentUserData.name = name; window.currentUserData.age = age; window.currentUserData.username = username;
    updateProfileUI(); showToast('approved', 'Сохранено', 'Данные обновлены.');
};
window.changePassword = async function() { const p = prompt('Новый пароль:'); if(p && p.length >= 6) await updatePassword(auth.currentUser, p); };
window.changeToken = async function() { const newToken = `TSC-${Math.random().toString(36).substr(2,4).toUpperCase()}-${Math.random().toString(36).substr(2,4).toUpperCase()}`; await updateDoc(doc(db, "users", auth.currentUser.uid), { tscToken: newToken }); alert("Новый токен: " + newToken); };
window.addAccount = function() { signOut(auth).then(() => location.reload()); };
window.deleteAccount = async function() { if(confirm("Удалить навсегда?")) { await deleteDoc(doc(db, "users", auth.currentUser.uid)); await deleteUser(auth.currentUser); location.reload(); } };
window.logoutUser = function() { signOut(auth).then(() => { localStorage.clear(); location.reload(); }); };
function renderHistory() {
    const history = window.currentUserData?.history || [];
    document.getElementById('profile-history-list').innerHTML = history.length ? history.map(h => `<div class="profile-app-item approved" style="border-color:var(--neon-cyan);"><span style="color:var(--neon-cyan);">${h.text}</span><div class="profile-app-expires">${formatDateTime(h.date)}</div></div>`).join('') : '<p class="profile-empty">Пусто.</p>';
}

// ДОСЬЕ
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

// ОТЗЫВЫ, АРТ
window.openReviewModal = () => document.getElementById('review-modal').classList.remove('hidden');
window.closeReviewModal = (e) => { if(e) e.stopPropagation(); document.getElementById('review-modal').classList.add('hidden'); };
window.submitReview = async function() {
    const text = document.getElementById('review-text').value; if(!text) return;
    try { await addDoc(collection(db, "reviews"), { uid: auth.currentUser.uid, username: window.currentUserData.username, text, createdAt: serverTimestamp() }); closeReviewModal(); loadReviews(); showToast('approved', 'Успех', 'Отзыв добавлен!'); } catch(e) { alert(e.message); }
};
async function loadReviews() {
    const snap = await getDocs(query(collection(db, "reviews"), orderBy("createdAt", "desc")));
    document.getElementById('reviews-list').innerHTML = snap.docs.map(d => `<div class="review-card"><div class="review-header"><div class="review-avatar">${d.data().username.charAt(1).toUpperCase()}</div><div><div class="review-name">${d.data().username}</div><div class="review-date">${formatDateTime(d.data().createdAt)}</div></div></div><p>${d.data().text}</p></div>`).join('');
}
window.openGalleryUpload = () => document.getElementById('gallery-modal').classList.remove('hidden');
window.closeGalleryModal = (e) => { if(e) e.stopPropagation(); document.getElementById('gallery-modal').classList.add('hidden'); };
window.submitGallery = async function() {
    const url = document.getElementById('gallery-url').value; if(!url) return;
    try { await addDoc(collection(db, "gallery"), { url, author: window.currentUserData.username, createdAt: serverTimestamp() }); closeGalleryModal(); loadGallery(); showToast('approved', 'Успех', 'Арт добавлен!'); } catch(e) { alert(e.message); }
};
async function loadGallery() {
    const snap = await getDocs(collection(db, "gallery"));
    document.getElementById('gallery-grid').innerHTML = snap.docs.map(d => `<div class="gallery-item" style="background-image:url(${d.data().url})"></div>`).join('');
}

// КОМАНДА
async function loadTeam() {
    try {
        const snap = await getDocs(query(collection(db, "applications"), where("status", "==", "approved")));
        const b = [], o = [], t = []; window.allTeamMembers = [];
        snap.forEach(d => { const data = { id: d.id, ...d.data() }; window.allTeamMembers.push(data); if(data.type === 'blogger') b.push(data); else if(data.type === 'obt') o.push(data); else if(data.type === 'tester') t.push(data); });
        const render = (id, arr) => document.getElementById(id).innerHTML = arr.map(m => `<div class="blogger-card" onclick="openTeamProfile('${m.id}')"><div class="blogger-avatar">${(m.hideRealName ? m.username : m.realName).charAt(0)}</div><h3 class="blogger-name">${m.hideRealName ? m.username : m.realName}</h3><div class="verify-badge">✅ Подтвержден</div></div>`).join('');
        render('bloggers-grid', b); render('obt-grid', o); render('testers-grid', t);
    } catch(e) { console.error(e); document.getElementById('bloggers-grid').innerHTML = '<p class="profile-empty">Ошибка загрузки.</p>'; }
}
window.openTeamProfile = function(id) {
    const m = window.allTeamMembers.find(x => x.id === id); const name = m.hideRealName ? m.username : m.realName;
    const modal = document.createElement('div'); modal.className = 'modal-overlay';
    modal.innerHTML = `<div class="modal-content glass" style="text-align:left;"><button class="modal-close" onclick="this.parentElement.parentElement.remove()">✕</button><h3 style="color:var(--neon-cyan); text-align:center;">${name}</h3><div class="profile-info" style="margin-top:1rem;"><p>Юзер: ${m.username}</p><p>Возраст: ${m.realAge || 'Не указан'}</p><p>Контакт: ${m.contactValue || 'Не указан'}</p></div><p style="color:#27c93f; margin-top:1rem; text-align:center;">✅ Аккаунт подтвержден владельцем сайта</p></div>`;
    document.body.appendChild(modal);
};

// ЗАЯВКИ
window.switchAppTab = function(t) { ['blogger','obt','tester'].forEach(x => document.getElementById(`app-${x}`).classList.toggle('hidden', x !== t)); };
window.addBloggerSocial = function() { document.getElementById('blogger-socials-list').innerHTML += `<div class="social-row" style="margin-top:5px;"><input type="text" class="social-url" placeholder="Ссылка"><button onclick="this.parentElement.remove()" class="btn-small">X</button></div>`; };
window.submitBloggerApplication = async function() { await submitApp('blogger'); };
window.submitOBTApplication = async function() { await submitApp('obt'); };
window.submitTesterApplication = async function() { await submitApp('tester'); };
async function submitApp(type) {
    const realName = document.getElementById(`${type}-realname`).value; const age = document.getElementById(`${type}-age`).value;
    const hide = document.getElementById(`${type}-hide-name`).checked; const contact = document.getElementById(`${type}-contact-value`).value;
    try { await addDoc(collection(db, "applications"), { uid: auth.currentUser.uid, type, username: window.currentUserData.username, realName, realAge: age, hideRealName: hide, contactValue: contact, status: 'pending', createdAt: serverTimestamp() }); alert("Отправлено!"); loadApplicationStatus(); } catch(e) { alert(e.message); }
}
async function loadApplicationStatus() {
    if(!auth.currentUser) return;
    const snap = await getDocs(query(collection(db, "applications"), where("uid", "==", auth.currentUser.uid)));
    snap.forEach(d => {
        const data = d.data(); document.getElementById(`app-${data.type}`).classList.add('hidden');
        document.getElementById(`app-status-${data.type}`).classList.remove('hidden');
        document.getElementById(`app-status-${data.type}`).innerHTML = `<div class="app-status-box ${data.status}">Статус: ${data.status} ${data.adminComment ? '<br>Причина: ' + data.adminComment : ''}</div>`;
    });
}

// АДМИНКА
window.openAdminPanel = function() { document.getElementById('admin-modal').classList.remove('hidden'); loadAdminApps(); };
window.closeAdminPanel = function(e) { if(e) e.stopPropagation(); document.getElementById('admin-modal').classList.add('hidden'); };
window.switchAdminTab = function(t) { ['apps','promo','content'].forEach(x => document.getElementById(`admin-${x}`).classList.toggle('hidden', x !== t)); };
async function loadAdminApps() {
    const snap = await getDocs(query(collection(db, "applications"), where("status", "==", "pending")));
    document.getElementById('admin-app-list').innerHTML = snap.docs.map(d => `<div class="admin-app-item pending"><b>${d.data().type}</b> - ${d.data().username} <br><button class="btn-small" style="margin-top:5px;" onclick="appAction('${d.id}', 'approved')">Одобрить</button></div>`).join('');
}
window.appAction = async function(id, status) { await updateDoc(doc(db, "applications", id), { status }); loadAdminApps(); loadTeam(); };
window.generatePromocode = async function() { const code = `TSC-${Math.random().toString(36).substr(2,4).toUpperCase()}`; await setDoc(doc(db, "promocodes", code), { type: document.getElementById('promo-type').value, value: parseInt(document.getElementById('promo-value').value), usedCount: 0, active: true }); document.getElementById('promo-result').textContent = "Код: " + code; };
window.createPoll = async function() { const q = document.getElementById('poll-q').value; const opts = document.getElementById('poll-opts').value.split(','); await addDoc(collection(db, "polls"), { question: q, options: opts, votes: {} }); alert("Опрос добавлен!"); };

window.copyToken = function(id) { const el = document.getElementById(id); if(el) navigator.clipboard.writeText(el.textContent); };
window.redeemPromo = async function() { const code = document.getElementById('promo-input').value.toUpperCase(); const snap = await getDoc(doc(db, "promocodes", code)); if(snap.exists()) { alert("Промокод активирован!"); } else { alert("Неверный код"); } };
window.openNotifPanel = () => document.getElementById('notif-panel').classList.remove('hidden');
window.closeNotifPanel = () => document.getElementById('notif-panel').classList.add('hidden');
window.openDownloadModal = () => document.getElementById('download-modal')?.classList.remove('hidden');
window.closeDownloadModal = () => document.getElementById('download-modal')?.classList.add('hidden');
