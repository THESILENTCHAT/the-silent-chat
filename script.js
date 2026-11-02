// ============================================================
// THE SILENT CHAT — script.js (ПОЛНЫЙ, ФИНАЛЬНЫЙ)
// ============================================================

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut,
    setPersistence, browserLocalPersistence, onAuthStateChanged, updatePassword, deleteUser
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getFirestore, doc, setDoc, getDoc, updateDoc, deleteDoc,
    addDoc, collection, query, where, getDocs, serverTimestamp, orderBy, increment, arrayUnion 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyA24goApnS9GR3PnhKnJXqRqJN05DTG6cc",
    authDomain: "tsc-universe.firebaseapp.com",
    projectId: "tsc-universe",
    storageBucket: "tsc-universe.firebasestorage.app",
    messagingSenderId: "537337043396",
    appId: "1:537337043396:web:b86e9a24928eee9a0a6c91"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

setPersistence(auth, browserLocalPersistence).catch(err => console.error("Persistence error:", err));

// ============================================================
// ГЛОБАЛЬНОЕ СОСТОЯНИЕ
// ============================================================
window.currentUserData = null;
window.myApplications = { blogger: null, obt: null, tester: null };
window.myNotifications = [];
window.allDossiers = [];
window.allTeamMembers = [];
window.lastKnownStatuses = {};
window.notifPollInterval = null;
window.isAdmin = false;
window.currentDossierFilter = 'all';

// ============================================================
// УТИЛИТЫ
// ============================================================
function escapeHtml(str) {
    if (!str) return '';
    return String(str).replace(/[&<>"']/g, ch => ({
        '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[ch]));
}

function formatDateTime(ts) {
    if (!ts) return '';
    let d;
    if (ts.toDate) d = ts.toDate();
    else if (typeof ts === 'string') d = new Date(ts);
    else if (ts.seconds) d = new Date(ts.seconds * 1000);
    else d = new Date(ts);
    const pad = n => String(n).padStart(2, '0');
    return `${pad(d.getDate())}.${pad(d.getMonth()+1)}.${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function getTimeLeft(expiresAt) {
    if (!expiresAt) return null;
    let d;
    if (expiresAt.toDate) d = expiresAt.toDate();
    else if (expiresAt.seconds) d = new Date(expiresAt.seconds * 1000);
    else if (typeof expiresAt === 'string') d = new Date(expiresAt);
    else d = new Date(expiresAt);
    const now = new Date();
    const diff = d - now;
    
    if (diff <= 0) return { expired: true, color: 'red', text: 'истёк' };
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    
    let color = 'green';
    if (days < 3) color = 'yellow';
    
    let text = '';
    if (days > 0) text = `осталось ${days} дн.`;
    else if (hours > 0) text = `осталось ${hours} ч.`;
    else text = `осталось ${minutes} мин.`;
    
    return { expired: false, color, text, date: d };
}

// ============================================================
// МОДАЛКА СКАЧИВАНИЯ
// ============================================================
window.openDownloadModal = function() { document.getElementById('download-modal').classList.remove('hidden'); };
window.closeDownloadModal = function() { document.getElementById('download-modal').classList.add('hidden'); };

// ============================================================
// ОПТИМИЗИРОВАННАЯ МАТРИЦА
// ============================================================
const canvas = document.getElementById('matrix');
if (canvas && window.innerWidth > 768) {
    const ctx = canvas.getContext('2d');
    let width, height, columns, drops;
    const fontSize = 16;
    const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%&*+=<>/\\';
    let lastTime = 0; const fps = 30; 
    function initMatrix() { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; columns = Math.floor(width / fontSize); drops = new Array(columns).fill(1); }
    function drawMatrix(time) {
        requestAnimationFrame(drawMatrix);
        if (time - lastTime < 1000 / fps) return; lastTime = time;
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
} else if (canvas) { canvas.style.display = 'none'; }

// ============================================================
// ПОЯВЛЕНИЕ СЕКЦИЙ
// ============================================================
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

// ============================================================
// ИНТРО
// ============================================================
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
function finishIntro() {
    introDone = true; document.getElementById('intro-overlay').classList.add('fade-out');
    setTimeout(() => { document.getElementById('intro-overlay').classList.add('hidden'); document.getElementById('auth-overlay').classList.remove('hidden'); }, 700);
}
window.skipIntro = function() { introTimers.forEach(t => { clearTimeout(t); clearInterval(t); }); finishIntro(); };

// ============================================================
// ЯЗЫКИ
// ============================================================
window.changeLang = function(lang) {
    const dict = {
        en: { 'О игре': 'About', 'Досье': 'Dossiers', 'Блогеры': 'Bloggers', 'ОБТ': 'OBT', 'Тестеры': 'Testers', 'Отзывы': 'Reviews', 'Опросы': 'Polls', 'Арт': 'Art', 'Топ': 'Top', 'Заявки': 'Applications' },
        tt: { 'О игре': 'Уен турында', 'Досье': 'Досье', 'Блогеры': 'Блогерлар', 'ОБТ': 'ОБТ', 'Тестеры': 'Тестерлар', 'Отзывы': 'Фикерләр', 'Опросы': 'Сораулар', 'Арт': 'Арт', 'Топ': 'Топ', 'Заявки': 'Гаризалар' },
        ru: { 'About': 'О игре', 'Dossiers': 'Досье', 'Bloggers': 'Блогеры', 'OBT': 'ОБТ', 'Testers': 'Тестеры', 'Reviews': 'Отзывы', 'Polls': 'Опросы', 'Art': 'Арт', 'Top': 'Топ', 'Applications': 'Заявки' }
    };
    if(lang === 'ru') {
        document.querySelectorAll('.nav-links a').forEach((a, i) => {
            const keys = ['О игре', 'Досье', 'Блогеры', 'ОБТ', 'Тестеры', 'Отзывы', 'Опросы', 'Арт', 'Топ', 'Заявки'];
            if(keys[i]) a.textContent = keys[i];
        });
        return;
    }
    document.querySelectorAll('.nav-links a').forEach(a => {
        if (dict[lang][a.textContent]) a.textContent = dict[lang][a.textContent];
    });
};

// ============================================================
// АВТОРИЗАЦИЯ И АККАУНТЫ
// ============================================================
window.switchAuthTab = function(tab) {
    document.getElementById('tab-login')?.classList.toggle('active', tab === 'login');
    document.getElementById('tab-register')?.classList.toggle('active', tab === 'register');
    ['login', 'register', 'token'].forEach(p => document.getElementById(`auth-${p}`)?.classList.add('hidden'));
    document.getElementById(`auth-${tab}`)?.classList.remove('hidden');
};

function showError(el, box, msg) {
    if (!el) return; el.textContent = msg;
    if (box) { box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake'); }
    setTimeout(() => el.textContent = '', 3200);
}

window.copyToken = function(elementId) {
    const el = document.getElementById(elementId); if (!el) return;
    const token = el.textContent.trim(); if (!token || token === 'TSC-XXXX-XXXX') return;
    navigator.clipboard.writeText(token).then(() => { showToast('approved', 'Скопировано', 'Токен в буфере обмена.'); }).catch(() => alert('Не удалось скопировать.'));
};

window.registerUser = async function() {
    const email = document.getElementById('reg-email').value.trim(); const user = document.getElementById('reg-username').value.trim();
    const name = document.getElementById('reg-name').value.trim(); const age = document.getElementById('reg-age').value.trim();
    const gender = document.getElementById('reg-gender').value; const pass = document.getElementById('reg-password').value;
    const confirmPass = document.getElementById('reg-password-confirm').value; const err = document.getElementById('reg-error');
    const box = document.querySelector('.auth-box'); const btn = document.getElementById('reg-submit-btn');
    if (btn.disabled) return;
    if (!email) return showError(err, box, "Введите Email.");
    if (!user.startsWith('@') || user.length < 3) return showError(err, box, "Юзернейм должен начинаться с @.");
    if (pass.length < 6) return showError(err, box, "Пароль должен быть не менее 6 символов.");
    if (pass !== confirmPass) return showError(err, box, "Пароли не совпадают.");
    btn.disabled = true; btn.textContent = 'ЗАГРУЗКА...';
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let t1 = '', t2 = '';
        for (let i = 0; i < 4; i++) t1 += chars.charAt(Math.floor(Math.random() * chars.length));
        for (let i = 0; i < 4; i++) t2 += chars.charAt(Math.floor(Math.random() * chars.length));
        const token = `TSC-${t1}-${t2}`;
        await setDoc(doc(db, "users", userCredential.user.uid), {
            email, username: user, name, age, gender, tscToken: token, role: "player", isBlogger: false, isOBT: false, isTester: false,
            applicationsBlocked: false, unlockedDossiers: ["player"], dossierStatuses: {}, crystals: 0, coins: 0, history: [],
            createdAt: new Date().toISOString()
        });
        localStorage.setItem('tsc_user', user); localStorage.setItem('tsc_name', name); localStorage.setItem('tsc_age', age);
        localStorage.setItem('tsc_gender', gender); localStorage.setItem('tsc_token', token); localStorage.setItem('tsc_email', email);
        saveAccountToLocal(email, pass, user, null);
        document.getElementById('generated-token').textContent = token;
        ['login','register'].forEach(p => document.getElementById(`auth-${p}`)?.classList.add('hidden'));
        const tokenPanel = document.getElementById('auth-token'); tokenPanel.classList.remove('hidden');
    } catch (error) { showError(err, box, "Ошибка: " + error.message); } finally { btn.disabled = false; btn.textContent = 'ПРОДОЛЖИТЬ'; }
};

window.loginUser = async function(emailParam, passParam) {
    const email = emailParam || document.getElementById('login-email').value.trim();
    const pass = passParam || document.getElementById('login-password').value;
    const err = document.getElementById('login-error'); const box = document.querySelector('.auth-box');
    if (!email || !pass) return showError(err, box, "Введите Email и пароль.");
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, pass);
        const docSnap = await getDoc(doc(db, "users", userCredential.user.uid));
        if (docSnap.exists()) {
            const data = docSnap.data(); window.currentUserData = data;
            localStorage.setItem('tsc_user', data.username); localStorage.setItem('tsc_name', data.name || 'Неизвестно');
            localStorage.setItem('tsc_age', data.age || '0'); localStorage.setItem('tsc_gender', data.gender || 'Неизвестно');
            localStorage.setItem('tsc_token', data.tscToken); localStorage.setItem('tsc_email', data.email);
            saveAccountToLocal(email, pass, data.username, localStorage.getItem('tsc_avatar'));
            err.textContent = ''; startBreach();
        } else { showError(err, box, "Профиль не найден."); }
    } catch (error) { showError(err, box, "Неверный Email или пароль."); }
};

// Сохранение аккаунтов для быстрого входа
function saveAccountToLocal(email, pass, username, avatar) {
    let accounts = JSON.parse(localStorage.getItem('tsc_accounts') || '[]');
    accounts = accounts.filter(a => a.email !== email);
    accounts.push({ email, pass, username, avatar });
    localStorage.setItem('tsc_accounts', JSON.stringify(accounts));
    renderSavedAccounts();
}
function renderSavedAccounts() {
    const list = document.getElementById('saved-accounts-list');
    if(!list) return;
    let accounts = JSON.parse(localStorage.getItem('tsc_accounts') || '[]');
    if(accounts.length === 0) { list.innerHTML = ''; return; }
    list.innerHTML = '<p style="color:var(--text-dim); margin-bottom:0.5rem;">Сохраненные аккаунты:</p>';
    accounts.forEach(acc => {
        list.innerHTML += `<div style="padding:0.5rem; border:1px solid #333; border-radius:10px; margin-bottom:0.5rem; cursor:pointer; display:flex; align-items:center; gap:10px;" onclick="loginUser('${acc.email}', '${acc.pass}')">
            <div style="width:30px;height:30px;border-radius:50%;background:var(--neon-cyan);color:#000;display:flex;align-items:center;justify-content:center;font-weight:bold;background-size:cover; ${acc.avatar ? `background-image:url(${acc.avatar}); color:transparent;` : ''}">${acc.username.charAt(1).toUpperCase()}</div>
            <div><div style="color:#fff; font-weight:bold;">${acc.username}</div><div style="color:var(--text-dim); font-size:0.7rem;">${acc.email}</div></div>
        </div>`;
    });
}

window.logoutUser = async function() {
    try { if (window.notifPollInterval) { clearInterval(window.notifPollInterval); window.notifPollInterval = null; }
        await signOut(auth); localStorage.clear(); location.reload();
    } catch (e) { console.error(e); }
};

window.addAccount = function() {
    alert("Вы выйдете из текущего аккаунта. Он сохранится для быстрого входа.");
    logoutUser();
};

window.deleteAccount = async function() {
    if (!confirm("Ты уверен, что хочешь УДАЛИТЬ аккаунт? Это действие нельзя отменить.")) return;
    if (!confirm("Точно-точно? Лучше подумай еще раз.")) return;
    try {
        const user = auth.currentUser; if (!user) return;
        await deleteDoc(doc(db, "users", user.uid));
        await deleteUser(user);
        let accounts = JSON.parse(localStorage.getItem('tsc_accounts') || '[]');
        accounts = accounts.filter(a => a.email !== user.email);
        localStorage.setItem('tsc_accounts', JSON.stringify(accounts));
        localStorage.clear(); alert("Аккаунт удален."); location.reload();
    } catch (e) {
        if (e.code === 'auth/requires-recent-login') alert("Выйди и зайди снова, потом жми удалить.");
        else alert("Ошибка: " + e.message);
    }
};

window.changePassword = async function() {
    const newPass = prompt("Введи новый пароль:");
    if (!newPass || newPass.length < 6) return alert("Пароль слишком короткий!");
    try { await updatePassword(auth.currentUser, newPass); alert("✅ Пароль изменен!"); }
    catch (e) { alert("Ошибка: " + e.message); }
};

// ============================================================
// НАСТРОЙКИ ПРОФИЛЯ
// ============================================================
window.saveSettings = async function() {
    const name = document.getElementById('set-name').value.trim();
    const age = document.getElementById('set-age').value.trim();
    const username = document.getElementById('set-username').value.trim();
    if(!username.startsWith('@')) return alert("Юзернейм должен начинаться с @");
    
    try {
        await updateDoc(doc(db, "users", auth.currentUser.uid), { name, age, username });
        localStorage.setItem('tsc_name', name);
        localStorage.setItem('tsc_age', age);
        localStorage.setItem('tsc_user', username);
        alert("✅ Данные сохранены!");
        window.currentUserData.name = name;
        window.currentUserData.age = age;
        window.currentUserData.username = username;
        updateProfileUI();
    } catch(e) { alert("Ошибка: " + e.message); }
};

window.switchProfileTab = function(tab) {
    ['info', 'history', 'settings'].forEach(t => document.getElementById(`prof-tab-${t}`)?.classList.add('hidden'));
    document.getElementById(`prof-tab-${tab}`)?.classList.remove('hidden');
    document.querySelectorAll('.profile-tab').forEach(btn => btn.classList.remove('active'));
    // Highlight active
    const idx = ['info', 'history', 'settings'].indexOf(tab);
    if(idx >= 0) document.querySelectorAll('.profile-tab')[idx].classList.add('active');
};

// ============================================================
// РАЗРЫВ ЭКРАНА
// ============================================================
function startBreach() {
    const overlay = document.getElementById('breach-overlay'); const canvas = document.getElementById('breach-canvas');
    const flash = document.getElementById('breach-flash'); const btext = document.querySelector('.breach-text');
    overlay.classList.remove('hidden');
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

function launchSiteReveal() {
    const title = document.getElementById('hero-title'); if (title) splitLetters(title, 0.06);
    setTimeout(() => document.getElementById('hero-tagline')?.classList.add('in'), 400);
    setTimeout(() => document.querySelector('.hero .btn.pulse-btn')?.classList.add('in'), 800);
    document.querySelectorAll('.section').forEach(s => observer.observe(s));
    renderTokenSection();
    loadDossiers();
    loadTeam();
    loadReviews();
    loadPolls();
    loadGallery();
    loadLeaderboard();
    loadApplicationStatus();
    loadNotifications();
    loadShopStatus();
    startNotificationPolling();
}

// ============================================================
// ИНИЦИАЛИЗАЦИЯ
// ============================================================
window.addEventListener('load', () => {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            await loadUserData();
            document.getElementById('intro-overlay').classList.add('hidden');
            document.getElementById('auth-overlay').classList.add('hidden');
            document.getElementById('main-content').classList.remove('hidden');
            updateProfileUI(); launchSiteReveal();
        } else {
            document.getElementById('main-content').classList.add('hidden');
            document.getElementById('auth-overlay').classList.remove('hidden');
            document.getElementById('intro-overlay').classList.add('hidden');
            renderSavedAccounts();
        }
    });
});

async function loadUserData() {
    const user = auth.currentUser; if (!user) return null;
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) {
        window.currentUserData = snap.data();
        window.isAdmin = window.currentUserData.role === 'admin';
        // Автозаполнение заявок
        ['blogger', 'obt', 'tester'].forEach(type => {
            const nameInput = document.getElementById(`${type}-realname`);
            const ageInput = document.getElementById(`${type}-age`);
            if(nameInput) nameInput.value = window.currentUserData.name || '';
            if(ageInput) ageInput.value = window.currentUserData.age || '';
        });
        return window.currentUserData;
    }
}

window.renderTokenSection = function() {
    const box = document.getElementById('token-box'); const display = document.getElementById('my-token-display');
    if (!box || !display) return;
    const token = window.currentUserData?.tscToken;
    if (token) { display.textContent = token; box.classList.remove('hidden'); }
};

// ============================================================
// ПРОМОКОДЫ И ИСТОРИЯ
// ============================================================
window.redeemPromo = async function() {
    const input = document.getElementById('promo-input'); const status = document.getElementById('promo-status');
    const code = input.value.trim().toUpperCase();
    if (!code) return alert("Введи промокод!");
    if (!auth.currentUser) return alert("Сначала авторизуйся!");
    status.style.color = "var(--neon-yellow)"; status.textContent = "Проверка...";
    try {
        const promoRef = doc(db, "promocodes", code); const promoSnap = await getDoc(promoRef);
        if (!promoSnap.exists()) { status.style.color = "var(--neon-red)"; status.textContent = "❌ Промокод не найден."; return; }
        const promo = promoSnap.data();
        if (!promo.active || (promo.maxUses > 0 && promo.usedCount >= promo.maxUses)) {
            status.style.color = "var(--neon-red)"; status.textContent = "❌ Промокод недействителен."; return;
        }
        if (promo.expiresAt && new Date() > new Date(promo.expiresAt)) {
            status.style.color = "var(--neon-red)"; status.textContent = "❌ Срок действия истек."; return;
        }
        if (promo.usedBy && promo.usedBy.includes(auth.currentUser.uid)) {
            status.style.color = "var(--neon-red)"; status.textContent = "❌ Ты уже активировал этот код."; return;
        }
        
        const userRef = doc(db, "users", auth.currentUser.uid);
        const rewardField = promo.type === 'crystals' ? 'crystals' : 'coins';
        const historyEntry = { type: 'promo', text: `Активация промокода ${code} (${promo.value} ${promo.type})`, date: new Date().toISOString() };
        
        await updateDoc(userRef, { 
            [rewardField]: increment(promo.value),
            history: arrayUnion(historyEntry)
        });
        await updateDoc(promoRef, { usedCount: increment(1), usedBy: [...(promo.usedBy || []), auth.currentUser.uid] });
        
        if(window.currentUserData.history) window.currentUserData.history.push(historyEntry);
        else window.currentUserData.history = [historyEntry];
        renderHistory();
        
        status.style.color = "var(--neon-green)"; status.textContent = `✅ Успешно! +${promo.value} валюты.`;
        input.value = '';
    } catch(e) { status.style.color = "var(--neon-red)"; status.textContent = "❌ Ошибка: " + e.message; }
};

// ============================================================
// КОМАНДА (БЛОГЕРЫ, ОБТ, ТЕСТЕРЫ)
// ============================================================
async function loadTeam() {
    try {
        const q = query(collection(db, "applications"), where("status", "==", "approved"));
        const snap = await getDocs(q);
        window.allTeamMembers = [];
        const bloggers = [], obt = [], testers = [];
        snap.forEach(doc => {
            const data = { id: doc.id, ...doc.data() };
            window.allTeamMembers.push(data);
            if (data.type === 'blogger') bloggers.push(data);
            else if (data.type === 'obt') obt.push(data);
            else if (data.type === 'tester') testers.push(data);
        });
        renderTeamGrid('bloggers-grid', bloggers, 'blogger');
        renderTeamGrid('obt-grid', obt, 'obt');
        renderTeamGrid('testers-grid', testers, 'tester');
    } catch(e) { console.error(e); }
}

function renderTeamGrid(gridId, members, type) {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    if (!members.length) { grid.innerHTML = `<p class="profile-empty">Пока никого нет.</p>`; return; }
    
    grid.innerHTML = members.map(m => {
        // Если скрыл ФИО — показываем юзернейм сайта
        const displayName = m.hideRealName ? m.username : (m.realName || m.username);
        const initial = displayName.replace('@', '').charAt(0).toUpperCase();
        const avatar = m.avatar || ''; // Если сохраняли аватар в заявке
        
        return `
            <div class="blogger-card" onclick="openTeamProfile('${m.id}')">
                <div class="blogger-avatar" style="${avatar ? `background-image:url(${avatar}); color:transparent;` : ''}">${initial}</div>
                <h3 class="blogger-name">${escapeHtml(displayName)}</h3>
                <p class="blogger-tg">${escapeHtml(m.username)}</p>
                <div class="verify-badge">✅ Подтвержден</div>
            </div>
        `;
    }).join('');
}

window.openTeamProfile = function(appId) {
    const member = window.allTeamMembers.find(m => m.id === appId);
    if (!member) return;

    let roleBadge = ''; let roleText = '';
    if (member.type === 'blogger') { roleBadge = '⭐ БЛОГЕР'; roleText = 'blogger'; }
    else if (member.type === 'obt') { roleBadge = '🟢 ОБТ ТЕСТЕР'; roleText = 'obt'; }
    else if (member.type === 'tester') { roleBadge = '🧪 ТЕСТЕР'; roleText = 'tester'; }

    const displayName = member.hideRealName ? member.username : (member.realName || member.username);
    const initial = displayName.replace('@', '').charAt(0).toUpperCase();
    const avatar = member.avatar || '';

    let infoHtml = '';
    if (!member.hideRealName && member.realName) infoHtml += `<p><strong>ФИО:</strong> ${escapeHtml(member.realName)}</p>`;
    if (member.realAge) infoHtml += `<p><strong>Возраст:</strong> ${escapeHtml(member.realAge)}</p>`;
    if (member.platform) infoHtml += `<p><strong>Платформа:</strong> ${escapeHtml(member.platform)}</p>`;
    if (member.testTarget) infoHtml += `<p><strong>Интересы:</strong> ${escapeHtml(member.testTarget)}</p>`;
    
    document.getElementById('tester-profile-body').innerHTML = `
        <div style="text-align: center; margin-bottom: 1.5rem;">
            <div class="blogger-avatar" style="margin: 0 auto 1rem auto; width: 100px; height: 100px; font-size: 2.5rem; cursor: pointer; ${avatar ? `background-image:url(${avatar}); color:transparent;` : ''}" onclick="showTeamAvatar('${avatar}')">${initial}</div>
            <h3 style="color: var(--neon-cyan); font-size: 1.5rem; margin-bottom: 0.5rem;">${escapeHtml(displayName)}</h3>
            <div class="team-badge ${roleText}">${roleBadge}</div>
            <div class="verify-badge" style="justify-content: center; margin-top: 0.5rem;">✅ Аккаунт подтвержден владельцем сайта</div>
        </div>
        <div class="team-profile-info">
            <p><strong>Юзернейм:</strong> ${escapeHtml(member.username)}</p>
            ${infoHtml}
        </div>
    `;
    document.getElementById('tester-profile-modal').classList.remove('hidden');
};
window.showTeamAvatar = function(url) { if(url) { document.getElementById('preview-img').src = url; document.getElementById('image-preview-modal').classList.remove('hidden'); } };
window.closeTesterProfileModal = function(e) { if (e) e.stopPropagation(); document.getElementById('tester-profile-modal').classList.add('hidden'); };

// ============================================================
// ОТЗЫВЫ, ГАЛЕРЕЯ, ОПРОСЫ, ТОП
// ============================================================
window.openReviewModal = function() { document.getElementById('review-modal').classList.remove('hidden'); };
window.closeReviewModal = function(e) { if (e) e.stopPropagation(); document.getElementById('review-modal').classList.add('hidden'); };
window.submitReview = async function() {
    const text = document.getElementById('review-text').value.trim();
    if(!text) return alert("Напиши что-нибудь!");
    try {
        await addDoc(collection(db, "reviews"), {
            uid: auth.currentUser.uid, username: localStorage.getItem('tsc_user'), text, avatar: localStorage.getItem('tsc_avatar') || '', createdAt: serverTimestamp()
        });
        document.getElementById('review-text').value = '';
        closeReviewModal(); loadReviews(); showToast('approved', 'Успешно', 'Отзыв добавлен!');
    } catch(e) { alert(e.message); }
};
async function loadReviews() {
    const list = document.getElementById('reviews-list'); if(!list) return;
    const snap = await getDocs(query(collection(db, "reviews"), orderBy("createdAt", "desc")));
    list.innerHTML = snap.docs.map(d => {
        const r = d.data();
        const date = r.createdAt ? formatDateTime(r.createdAt) : 'Только что';
        return `<div class="review-card">
            <div class="review-header">
                <div class="review-avatar" style="${r.avatar ? `background-image:url(${r.avatar}); color:transparent;` : ''}">${r.username.charAt(1).toUpperCase()}</div>
                <div><div class="review-name">${escapeHtml(r.username)}</div><div class="review-date">${date}</div></div>
            </div>
            <p>${escapeHtml(r.text)}</p>
        </div>`;
    }).join('');
}

window.openGalleryUpload = function() { document.getElementById('gallery-modal').classList.remove('hidden'); };
window.closeGalleryModal = function(e) { if (e) e.stopPropagation(); document.getElementById('gallery-modal').classList.add('hidden'); };
window.submitGallery = async function() {
    const url = document.getElementById('gallery-url').value.trim(); const desc = document.getElementById('gallery-desc').value.trim();
    if(!url) return alert("Нужна ссылка!");
    try {
        await addDoc(collection(db, "gallery"), { url, desc, author: localStorage.getItem('tsc_user'), createdAt: serverTimestamp(), approved: true });
        document.getElementById('gallery-url').value = ''; closeGalleryModal(); loadGallery(); showToast('approved', 'Успешно', 'Арт добавлен!');
    } catch(e) { alert(e.message); }
};
async function loadGallery() {
    const grid = document.getElementById('gallery-grid'); if(!grid) return;
    const snap = await getDocs(collection(db, "gallery"));
    grid.innerHTML = snap.docs.map(d => {
        const g = d.data();
        return `<div class="gallery-item" style="background-image:url(${g.url});" onclick="showTeamAvatar('${g.url}')"></div>`;
    }).join('');
}

async function loadPolls() {
    const list = document.getElementById('polls-list'); if(!list) return;
    // Заглушка для опросов
    list.innerHTML = `<p class="profile-empty">Опросов пока нет. Ждите обновлений!</p>`;
}

async function loadLeaderboard() {
    const list = document.getElementById('leaderboard-list'); if(!list) return;
    list.innerHTML = `<p class="profile-empty">Таблица лидеров обновляется... (Данные подтянутся из игры)</p>`;
}

// ============================================================
// ПРОФИЛЬ
// ============================================================
function updateProfileUI() {
    const name = localStorage.getItem('tsc_name') || 'Неизвестно';
    const avatar = localStorage.getItem('tsc_avatar');
    if (document.getElementById('prof-user')) {
        document.getElementById('prof-user').textContent = localStorage.getItem('tsc_user') || '@...';
        document.getElementById('prof-name').textContent = name;
        document.getElementById('prof-age').textContent = localStorage.getItem('tsc_age') || '0';
        document.getElementById('prof-gender').textContent = localStorage.getItem('tsc_gender') || 'Неизвестно';
        
        document.getElementById('set-name').value = name;
        document.getElementById('set-age').value = localStorage.getItem('tsc_age') || '';
        document.getElementById('set-username').value = localStorage.getItem('tsc_user') || '';
    }
    const navAvatar = document.getElementById('nav-avatar-container');
    const profAvatar = document.getElementById('profile-avatar-large');
    if (avatar) {
        if (navAvatar) { navAvatar.style.backgroundImage = `url(${avatar})`; navAvatar.textContent = ''; }
        if (profAvatar) { profAvatar.style.backgroundImage = `url(${avatar})`; profAvatar.textContent = ''; }
    } else {
        const initial = name.charAt(0).toUpperCase() || '?';
        if (navAvatar) { navAvatar.style.backgroundImage = 'none'; navAvatar.textContent = initial; }
        if (profAvatar) { profAvatar.style.backgroundImage = 'none'; profAvatar.textContent = initial; }
    }
    renderProfileRoles();
    renderHistory();
    document.getElementById('admin-panel-btn')?.classList.toggle('hidden', !window.isAdmin);
}

function renderHistory() {
    const list = document.getElementById('profile-history-list'); if(!list) return;
    const history = window.currentUserData?.history || [];
    if(!history.length) { list.innerHTML = '<p class="profile-empty">Пока пусто.</p>'; return; }
    list.innerHTML = history.slice().reverse().map(h => `
        <div class="profile-app-item approved" style="border-color:var(--neon-cyan);">
            <div class="profile-app-header"><span style="color:var(--neon-cyan);">${escapeHtml(h.text)}</span></div>
            <div class="profile-app-expires">${formatDateTime(h.date)}</div>
        </div>
    `).join('');
}

window.uploadAvatar = function(event) {
    const file = event.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = async e => {
        const img = new Image(); img.src = e.target.result;
        img.onload = () => {
            const c = document.createElement('canvas'); let w = img.width, h = img.height;
            if (w > h) { if (w > 250) { h *= 250 / w; w = 250; } } else { if (h > 250) { w *= 250 / h; h = 250; } }
            c.width = w; c.height = h; c.getContext('2d').drawImage(img, 0, 0, w, h);
            localStorage.setItem('tsc_avatar', c.toDataURL('image/jpeg', 0.8)); updateProfileUI();
        };
    }; reader.readAsDataURL(file);
};
window.showImagePreview = function() { const avatar = localStorage.getItem('tsc_avatar'); if (avatar) { document.getElementById('preview-img').src = avatar; document.getElementById('image-preview-modal').classList.remove('hidden'); } };
window.closeImagePreview = function() { document.getElementById('image-preview-modal').classList.add('hidden'); };
window.openProfileModal = async function() { document.getElementById('profile-modal').classList.remove('hidden'); await loadUserData(); updateProfileUI(); await loadApplicationStatus(); await loadNotifications(); document.getElementById('bell-dot')?.classList.add('hidden'); };
window.closeProfileModal = function(e) { if (e) e.stopPropagation(); document.getElementById('profile-modal').classList.add('hidden'); };

function renderProfileRoles() {
    const container = document.getElementById('profile-roles'); if (!container) return;
    const data = window.currentUserData || {}; let html = '';
    if (data.role === 'admin') html += '<span class="role-badge admin">👑 ADMIN</span>';
    if (data.isBlogger) html += '<span class="role-badge blogger">⭐ БЛОГЕР</span>';
    if (data.isOBT) html += '<span class="role-badge obt">🟢 ОБТ</span>';
    if (data.isTester) html += '<span class="role-badge tester">🧪 ТЕСТЕР</span>';
    if (!html) html = '<span class="role-badge player">🎮 ИГРОК</span>';
    container.innerHTML = html;
}

// ============================================================
// ДОСЬЕ
// ============================================================
async function loadDossiers() {
    try {
        let snap = await getDocs(query(collection(db, "dossiers"), orderBy("order", "asc")));
        window.allDossiers = []; snap.forEach(d => window.allDossiers.push({ id: d.id, ...d.data() })); renderDossiers();
    } catch(e) {
        const snap = await getDocs(collection(db, "dossiers")); window.allDossiers = [];
        snap.forEach(d => window.allDossiers.push({ id: d.id, ...d.data() }));
        window.allDossiers.sort((a, b) => (a.order || 99) - (b.order || 99)); renderDossiers();
    }
}

function renderDossiers() {
    const grid = document.getElementById('dossier-grid'); if (!grid) return;
    const unlocked = (window.currentUserData?.unlockedDossiers) || ["player"]; const personalStatuses = window.currentUserData?.dossierStatuses || {};
    const opened = window.allDossiers.filter(d => unlocked.includes(d.id)); const locked = window.allDossiers.filter(d => !unlocked.includes(d.id));
    const lockedToShow = locked.slice(0, 2);
    const filteredOpened = opened.filter(d => {
        if (window.currentDossierFilter === 'all') return true;
        const status = personalStatuses[d.id] || d.status || 'unknown'; return status === window.currentDossierFilter;
    });
    const toShow = [...filteredOpened, ...lockedToShow];
    document.getElementById('dossier-progress').textContent = `Открыто ${opened.length} из ${window.allDossiers.length}`;
    grid.innerHTML = toShow.map(d => {
        const isLocked = !unlocked.includes(d.id); const status = personalStatuses[d.id] || d.status || 'unknown';
        if (isLocked) { return `<div class="dossier-card locked" onclick="shakeLocked(this)"><div class="dossier-photo silhouette">?</div><div class="dossier-info"><div class="dossier-name">???</div></div></div>`; }
        const photoHtml = d.photo ? `<div class="dossier-photo" style="background-image:url('${escapeHtml(d.photo)}');"></div>` : `<div class="dossier-photo silhouette">👤</div>`;
        const isFemale = d.gender === 'female'; let statusLabel = 'Неизвестно';
        if (status === 'alive') statusLabel = isFemale ? 'Жива' : 'Жив';
        else if (status === 'missing') statusLabel = isFemale ? 'Пропала' : 'Пропал';
        else if (status === 'dead') statusLabel = isFemale ? 'Мертва' : 'Мёртв';
        return `<div class="dossier-card" onclick="openDossierModal('${d.id}')">${photoHtml}<div class="dossier-info"><div class="dossier-name">${escapeHtml(d.name)}</div><span style="font-size:0.75rem;color:var(--text-dim);">${statusLabel}</span></div></div>`;
    }).join('');
}
window.filterDossiers = function(filter) { window.currentDossierFilter = filter; ['all', 'alive', 'missing', 'dead'].forEach(f => document.getElementById(`tab-dossier-${f}`)?.classList.toggle('active', f === filter)); renderDossiers(); };
window.shakeLocked = function(el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); };
window.openDossierModal = function(id) {
    const d = window.allDossiers.find(x => x.id === id); if (!d) return;
    const status = window.currentUserData?.dossierStatuses?.[id] || d.status || 'unknown';
    const isFemale = d.gender === 'female'; let statusLabel = '⚪ Неизвестно';
    if (status === 'alive') statusLabel = isFemale ? '🟢 Жива' : '🟢 Жив';
    else if (status === 'missing') statusLabel = isFemale ? '🟡 Пропала' : '🟡 Пропал';
    else if (status === 'dead') statusLabel = isFemale ? '🔴 Мертва' : '🔴 Мёртв';
    document.getElementById('dossier-detail-body').innerHTML = `
        ${d.photo ? `<div class="dossier-detail-photo" style="background-image:url('${escapeHtml(d.photo)}');"></div>` : ''}
        <h3 class="dossier-detail-name">${escapeHtml(d.name || '???')}</h3>
        <div class="dossier-detail-meta"><div class="dossier-meta-item"><strong>Статус:</strong> ${statusLabel}</div></div>
        ${d.bio ? `<div class="dossier-detail-bio">${escapeHtml(d.bio)}</div>` : ''}
        ${d.quote ? `<div class="dossier-detail-quote">«${escapeHtml(d.quote)}»</div>` : ''}
        ${d.fullBioUrl ? `<div class="dossier-bio-container"><a href="${escapeHtml(d.fullBioUrl)}" target="_blank" class="btn-bio">📖 ПОЛНАЯ БИОГРАФИЯ</a></div>` : ''}
    `;
    document.getElementById('dossier-modal').classList.remove('hidden');
};
window.closeDossierModal = function(e) { if (e) e.stopPropagation(); document.getElementById('dossier-modal').classList.add('hidden'); };

// ============================================================
// ЗАЯВКИ
// ============================================================
window.switchAppTab = function(tab) { ['blogger', 'obt', 'tester'].forEach(t => { document.getElementById(`app-tab-${t}`)?.classList.toggle('active', t === tab); document.getElementById(`app-${t}`)?.classList.toggle('hidden', t !== tab); }); };
window.updateContactField = function(type) { const platform = document.getElementById(`${type}-contact-platform`).value; const label = document.getElementById(`${type}-contact-label`); if (label) { label.textContent = `Контакт (${platform})`; } };
window.addBloggerSocial = function() {
    const list = document.getElementById('blogger-socials-list'); if (!list || list.children.length >= 30) return;
    const div = document.createElement('div'); div.className = 'social-row';
    div.innerHTML = `<select class="social-platform"><option value="YouTube">YouTube</option><option value="TikTok">TikTok</option><option value="Telegram">Telegram</option><option value="Twitch">Twitch</option><option value="VK">VK</option></select><input type="text" class="social-url" placeholder="Ссылка"><button type="button" class="social-remove" onclick="this.parentElement.remove()">✕</button>`;
    list.appendChild(div);
};

window.submitBloggerApplication = async function() {
    const user = auth.currentUser; if (!user) return alert("Войди в аккаунт");
    const realName = document.getElementById('blogger-realname').value;
    const age = document.getElementById('blogger-age').value;
    const hideRealName = document.getElementById('blogger-hide-name').checked;
    const contactPlatform = document.getElementById('blogger-contact-platform').value;
    const contactValue = document.getElementById('blogger-contact-value').value.trim();
    const subscribed = document.getElementById('blogger-subscribed').checked;
    const socials = []; document.querySelectorAll('#blogger-socials-list .social-row').forEach(row => { const url = row.querySelector('.social-url').value.trim(); if (url) socials.push({ platform: row.querySelector('.social-platform').value, url }); });
    if (!contactValue || socials.length === 0 || !subscribed) return alert("Заполни контакты и подтверди подписку");
    try {
        await addDoc(collection(db, "applications"), {
            uid: user.uid, type: 'blogger', username: localStorage.getItem('tsc_user'), avatar: localStorage.getItem('tsc_avatar') || '',
            realName, realAge: age, hideRealName, contactPlatform, contactValue, socials, status: 'pending', createdAt: serverTimestamp()
        });
        alert("Заявка отправлена!"); loadApplicationStatus();
    } catch(e) { alert(e.message); }
};

window.submitOBTApplication = async function() {
    const user = auth.currentUser; if (!user) return alert("Войди в аккаунт");
    const realName = document.getElementById('obt-realname').value;
    const age = document.getElementById('obt-age').value;
    const hideRealName = document.getElementById('obt-hide-name').checked;
    const contactPlatform = document.getElementById('obt-contact-platform').value;
    const contactValue = document.getElementById('obt-contact-value').value.trim();
    const platform = document.getElementById('obt-platform').value;
    if (!contactValue) return alert("Заполни контакт");
    try {
        await addDoc(collection(db, "applications"), {
            uid: user.uid, type: 'obt', username: localStorage.getItem('tsc_user'), avatar: localStorage.getItem('tsc_avatar') || '',
            realName, realAge: age, hideRealName, contactPlatform, contactValue, platform, status: 'pending', createdAt: serverTimestamp()
        });
        alert("Заявка отправлена!"); loadApplicationStatus();
    } catch(e) { alert(e.message); }
};

window.submitTesterApplication = async function() {
    const user = auth.currentUser; if (!user) return alert("Войди в аккаунт");
    const realName = document.getElementById('tester-realname').value;
    const age = document.getElementById('tester-age').value;
    const hideRealName = document.getElementById('tester-hide-name').checked;
    const contactPlatform = document.getElementById('tester-contact-platform').value;
    const contactValue = document.getElementById('tester-contact-value').value.trim();
    const platform = document.getElementById('tester-platform').value;
    if (!contactValue) return alert("Заполни контакт");
    try {
        await addDoc(collection(db, "applications"), {
            uid: user.uid, type: 'tester', username: localStorage.getItem('tsc_user'), avatar: localStorage.getItem('tsc_avatar') || '',
            realName, realAge: age, hideRealName, contactPlatform, contactValue, platform, status: 'pending', createdAt: serverTimestamp()
        });
        alert("Заявка отправлена!"); loadApplicationStatus();
    } catch(e) { alert(e.message); }
};

async function loadApplicationStatus() {
    const user = auth.currentUser; if (!user) return;
    const snap = await getDocs(query(collection(db, "applications"), where("uid", "==", user.uid)));
    window.myApplications = { blogger: null, obt: null, tester: null };
    snap.forEach(d => { const data = d.data(); window.myApplications[data.type] = { id: d.id, ...data }; });
    ['blogger', 'obt', 'tester'].forEach(type => {
        const app = window.myApplications[type]; const formEl = document.getElementById(`app-${type}`); const statusEl = document.getElementById(`app-status-${type}`);
        if (!formEl || !statusEl) return;
        if (app) {
            formEl.classList.add('hidden'); statusEl.classList.remove('hidden');
            if (app.status === 'pending') statusEl.innerHTML = `<div class="app-status-box pending">⏳ На рассмотрении.</div>`;
            else if (app.status === 'approved') statusEl.innerHTML = `<div class="app-status-box approved">✅ Одобрено!</div>`;
            else statusEl.innerHTML = `<div class="app-status-box rejected">❌ Отклонено. ${app.adminComment || ''}</div>`;
        } else { formEl.classList.remove('hidden'); statusEl.classList.add('hidden'); }
    });
}

// ============================================================
// АДМИН-ПАНЕЛЬ (Исправленная модалка заявки)
// ============================================================
window.openAdminPanel = function() { if (!window.isAdmin) return; document.getElementById('admin-modal').classList.remove('hidden'); loadAdminApplications(); };
window.closeAdminPanel = function(e) { if (e) e.stopPropagation(); document.getElementById('admin-modal').classList.add('hidden'); };
window.switchAdminTab = function(tab) { ['apps', 'promo', 'content'].forEach(t => document.getElementById(`admin-${t}`)?.classList.toggle('hidden', t !== tab)); document.querySelectorAll('.admin-tab').forEach((btn, i) => btn.classList.toggle('active', ['apps','promo','content'][i] === tab)); };

async function loadAdminApplications() {
    const list = document.getElementById('admin-app-list'); if (!list) return;
    list.innerHTML = '<p class="profile-empty">Загрузка...</p>';
    try {
        const snap = await getDocs(query(collection(db, "applications"), where("status", "==", "pending")));
        list.innerHTML = snap.docs.length ? snap.docs.map(d => {
            const app = d.data();
            return `<div class="admin-app-item pending" onclick="openAdminAppModal('${d.id}')" style="cursor:pointer;">
                <div class="admin-app-head"><span class="admin-app-type">${app.type.toUpperCase()}</span></div>
                <dl class="admin-app-details">
                    <dt>Юзер</dt><dd>${escapeHtml(app.username)}</dd>
                    <dt>ФИО</dt><dd>${escapeHtml(app.realName)} ${app.hideRealName ? '(Скрыто)' : ''}</dd>
                </dl>
                <div style="color:var(--neon-cyan); font-size:0.8rem; text-align:right;">Нажми для подробностей →</div>
            </div>`;
        }).join('') : '<p class="profile-empty">Заявок нет.</p>';
    } catch(e) { list.innerHTML = `<p class="profile-empty">Ошибка: ${e.message}</p>`; }
}

window.openAdminAppModal = async function(appId) {
    const snap = await getDoc(doc(db, "applications", appId));
    if(!snap.exists()) return;
    const app = snap.data();
    
    let info = `<p><strong>Тип:</strong> ${app.type}</p><p><strong>Юзер:</strong> ${app.username}</p><p><strong>ФИО:</strong> ${app.realName}</p><p><strong>Возраст:</strong> ${app.realAge}</p><p><strong>Контакт:</strong> ${app.contactPlatform}: ${app.contactValue}</p>`;
    if(app.platform) info += `<p><strong>Платформа:</strong> ${app.platform}</p>`;
    if(app.socials) info += `<p><strong>Соцсети:</strong><br>${app.socials.map(s => `${s.platform}: ${s.url}`).join('<br>')}</p>`;
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.style.zIndex = '2000';
    modal.innerHTML = `<div class="modal-content glass" style="max-width:500px; text-align:left;">
        <h3 style="color:var(--neon-cyan); margin-bottom:1rem;">Заявка</h3>
        <div style="color:#fff; font-size:0.9rem; line-height:1.6;">${info}</div>
        <div style="display:flex; gap:10px; margin-top:1.5rem;">
            <button class="btn" style="flex:1; border-color:var(--neon-green); color:#6effa0;" onclick="approveApplication('${appId}', '${app.type}', '${app.uid}')">Одобрить</button>
            <button class="btn" style="flex:1; border-color:var(--neon-red); color:var(--neon-red);" onclick="rejectApplication('${appId}')">Отклонить</button>
        </div>
        <button class="btn" style="width:100%; margin-top:10px; border-color:#555; color:#888;" onclick="this.parentElement.parentElement.remove()">Закрыть</button>
    </div>`;
    document.body.appendChild(modal);
};

window.approveApplication = async function(appId, type, uid) {
    try {
        await updateDoc(doc(db, "applications", appId), { status: 'approved' });
        const upd = {}; if (type === 'blogger') upd.isBlogger = true; else if (type === 'obt') upd.isOBT = true; else if (type === 'tester') upd.isTester = true;
        await updateDoc(doc(db, "users", uid), upd);
        showToast('approved', 'Одобрено', 'Роль выдана.'); loadAdminApplications(); loadTeam();
        document.querySelectorAll('.modal-overlay').forEach(m => { if(m.style.zIndex === '2000') m.remove(); });
    } catch(e) { alert(e.message); }
};

window.rejectApplication = async function(appId) {
    const comment = prompt('Причина отклонения (обязательно):', '');
    if (!comment) return;
    await updateDoc(doc(db, "applications", appId), { status: 'rejected', adminComment: comment });
    showToast('rejected', 'Отклонено', 'Заявка отклонена.'); loadAdminApplications();
    document.querySelectorAll('.modal-overlay').forEach(m => { if(m.style.zIndex === '2000') m.remove(); });
};

// ============================================================
// УВЕДОМЛЕНИЯ (СОХРАНЕНИЕ)
// ============================================================
window.openNotifPanel = async function() { document.getElementById('notif-panel').classList.remove('hidden'); await loadNotifications(); document.getElementById('bell-dot')?.classList.add('hidden'); };
window.closeNotifPanel = function() { document.getElementById('notif-panel').classList.add('hidden'); };
async function loadNotifications() {
    const user = auth.currentUser; if (!user) return;
    const snap = await getDocs(query(collection(db, "notifications"), where("uid", "==", user.uid)));
    window.myNotifications = []; snap.forEach(d => window.myNotifications.push({ id: d.id, ...d.data() }));
    window.myNotifications.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    
    const list = document.getElementById('notif-list'); if (!list) return;
    list.innerHTML = window.myNotifications.length ? window.myNotifications.map(n => `
        <div class="notif-item ${n.read ? '' : 'unread'}" onclick="markNotifRead('${n.id}')">
            <div class="notif-item-title">${escapeHtml(n.title)}</div><div>${escapeHtml(n.text)}</div><div class="notif-item-time">${formatDateTime(n.createdAt)}</div>
        </div>`).join('') : '<p class="profile-empty">Пока тихо.</p>';
}
window.markNotifRead = async function(id) { await updateDoc(doc(db, "notifications", id), { read: true }); await loadNotifications(); };
window.markAllNotifRead = async function() { for (const n of window.myNotifications) if (!n.read) await updateDoc(doc(db, "notifications", n.id), { read: true }); await loadNotifications(); };

// ============================================================
// TOAST И СТАТУСЫ
// ============================================================
window.showToast = function(type, title, message) {
    const container = document.getElementById('toast-container'); if (!container) return;
    const toast = document.createElement('div'); toast.className = `toast ${type}`;
    toast.innerHTML = `<div class="toast-title">${escapeHtml(title)}</div><div>${escapeHtml(message)}</div>`;
    container.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 6000);
};

function startNotificationPolling() {
    if (window.notifPollInterval) return;
    setInterval(async () => {
        const user = auth.currentUser; if (!user) return;
        await loadUserData();
    }, 15000);
}

// ============================================================
// PWA (РЕГИСТРАЦИЯ)
// ============================================================
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW registration failed:', err));
    });
}
