// ============================================================
// THE SILENT CHAT — script.js (Часть 1)
// ============================================================

// ===== FIREBASE ИМПОРТЫ =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    signOut,
    setPersistence,
    browserLocalPersistence,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getFirestore, doc, setDoc, getDoc, updateDoc, deleteDoc,
    addDoc, collection, query, where, getDocs, serverTimestamp, orderBy, limit 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// ===== КОНФИГ FIREBASE =====
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

// ===== ГЛОБАЛЬНОЕ СОСТОЯНИЕ =====
window.currentUserData = null;
window.myApplications = { blogger: null, obt: null, tester: null };
window.myNotifications = [];
window.allDossiers = [];
window.lastKnownStatuses = {};
window.notifPollInterval = null;
window.isAdmin = false;

// ============================================================
// УТИЛИТЫ
// ============================================================

function escapeHtml(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/[&<>"']/g, ch => ({
        '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[ch]));
}

function formatDateTime(ts) {
    if (!ts) return '';
    let d;
    if (ts.toDate) d = ts.toDate(); // Firestore Timestamp
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
// МАТРИЦА
// ============================================================
const canvas = document.getElementById('matrix');
if (canvas) {
    const ctx = canvas.getContext('2d');
    let width, height, columns, drops;
    const fontSize = 16;
    const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%&*+=<>/\\';
    function initMatrix() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        columns = Math.floor(width / fontSize);
        drops = new Array(columns).fill(1);
    }
    function drawMatrix() {
        ctx.fillStyle = 'rgba(10,10,15,0.06)';
        ctx.fillRect(0, 0, width, height);
        ctx.font = fontSize + 'px monospace';
        for (let i = 0; i < drops.length; i++) {
            const char = chars.charAt(Math.floor(Math.random() * chars.length));
            ctx.fillStyle = i % 8 === 0 ? '#ff00aa' : '#00f0ff';
            ctx.fillText(char, i * fontSize, drops[i] * fontSize);
            if (drops[i] * fontSize > height && Math.random() > 0.975) drops[i] = 0;
            drops[i]++;
        }
    }
    initMatrix();
    window.addEventListener('resize', initMatrix);
    setInterval(drawMatrix, 55);
}

// ============================================================
// ПАРАЛЛАКС
// ============================================================
const hero = document.getElementById('hero');
if (hero) {
    document.addEventListener('mousemove', e => {
        if (!document.getElementById('main-content').classList.contains('hidden')) {
            const x = (e.clientX / window.innerWidth - 0.5) * 20;
            const y = (e.clientY / window.innerHeight - 0.5) * 20;
            const title = document.getElementById('hero-title');
            if (title) title.style.transform = `translate(${x}px, ${y}px)`;
        }
    });
}

// ============================================================
// ПОЯВЛЕНИЕ СЕКЦИЙ
// ============================================================
const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('in');
            const h2 = entry.target.querySelector('.split-title');
            if (h2 && !h2.dataset.animated) {
                h2.dataset.animated = '1';
                splitLetters(h2, 0.035);
            }
        }
    });
}, { threshold: 0.12 });

function splitLetters(el, delayStep = 0.05) {
    const text = el.textContent.trim();
    if (!text) return;
    el.innerHTML = '';
    el.style.opacity = '1';
    [...text].forEach((ch, i) => {
        const span = document.createElement('span');
        span.className = 'letter';
        span.textContent = ch === ' ' ? '\u00A0' : ch;
        span.style.transitionDelay = (i * delayStep) + 's';
        el.appendChild(span);
        setTimeout(() => span.classList.add('in'), 30);
    });
}

// ============================================================
// RIPPLE / ТИЛТ / СКРОЛЛ
// ============================================================
document.querySelectorAll('.btn, .btn-download, .shop-btn, .auth-btn, .platform-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
        const rect = this.getBoundingClientRect();
        const ripple = document.createElement('span');
        ripple.className = 'ripple';
        const size = Math.max(rect.width, rect.height);
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = (e.clientX - rect.left - size/2) + 'px';
        ripple.style.top = (e.clientY - rect.top - size/2) + 'px';
        this.appendChild(ripple);
        setTimeout(() => ripple.remove(), 600);
    });
});

document.querySelectorAll('.tilt').forEach(el => {
    el.addEventListener('mousemove', e => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const cx = rect.width / 2;
        const cy = rect.height / 2;
        const rx = (y - cy) / cy * 8;
        const ry = (cx - x) / cx * 8;
        el.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(8px)`;
    });
    el.addEventListener('mouseleave', () => el.style.transform = '');
});

document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
        const target = document.querySelector(link.getAttribute('href'));
        if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth' }); }
    });
});

// ============================================================
// ПЕРЕВОД (упрощён — только RU/EN для основных элементов)
// ============================================================
let currentLang = 'ru';
window.changeLang = function(lang) {
    currentLang = lang;
    document.getElementById('btn-ru')?.classList.toggle('active', lang === 'ru');
    document.getElementById('btn-en')?.classList.toggle('active', lang === 'en');
    document.querySelectorAll('[data-ru][data-en]').forEach(el => {
        el.innerHTML = el.getAttribute(lang === 'en' ? 'data-en' : 'data-ru');
    });
    document.documentElement.lang = lang;
};

// ============================================================
// ИНТРО
// ============================================================
const introLogs = [
    { t: '> INITIALIZING BREACH PROTOCOL...', c: '' },
    { t: '> TARGET: blackwood.city/mainframe', c: '' },
    { t: '> BYPASSING FIREWALL...', c: 'ok' },
    { t: '> INJECTING PAYLOAD...', c: 'ok' },
    { t: '> DECRYPTING KERNEL...', c: 'ok' },
    { t: '> SCANNING FOR TRACES...', c: 'warn' },
    { t: '> TRACE DETECTED. ACCELERATING.', c: 'warn' },
    { t: '> ESTABLISHING SECURE TUNNEL...', c: 'ok' },
    { t: '> ACCESS GRANTED', c: 'ok' }
];
let introDone = false;
let introTimers = [];

function runIntro() {
    const term = document.getElementById('intro-terminal');
    const fill = document.getElementById('intro-progress-fill');
    const txt = document.getElementById('intro-progress-text');
    if (!term || !fill || !txt) return;

    introLogs.forEach((log, i) => {
        const t = setTimeout(() => {
            if (introDone) return;
            const p = document.createElement('div');
            p.className = 'log';
            const span = document.createElement('span');
            span.className = log.c;
            span.textContent = log.t;
            p.appendChild(span);
            term.appendChild(p);
            requestAnimationFrame(() => p.classList.add('in'));
            term.scrollTop = term.scrollHeight;
        }, i * 320);
        introTimers.push(t);
    });

    let progress = 0;
    const progInterval = setInterval(() => {
        if (introDone) { clearInterval(progInterval); return; }
        progress += Math.random() * 9;
        if (progress >= 100) progress = 100;
        fill.style.width = progress + '%';
        txt.textContent = Math.floor(progress) + '%';
        if (progress >= 100) {
            clearInterval(progInterval);
            setTimeout(() => { if (!introDone) finishIntro(); }, 500);
        }
    }, 130);
    introTimers.push(progInterval);
}

function finishIntro() {
    introDone = true;
    const overlay = document.getElementById('intro-overlay');
    overlay.classList.add('fade-out');
    setTimeout(() => {
        overlay.classList.add('hidden');
        document.getElementById('auth-overlay').classList.remove('hidden');
    }, 700);
}

window.skipIntro = function() {
    introTimers.forEach(t => { clearTimeout(t); clearInterval(t); });
    finishIntro();
};

// ============================================================
// АВТОРИЗАЦИЯ
// ============================================================
window.switchAuthTab = function(tab) {
    document.getElementById('tab-login')?.classList.toggle('active', tab === 'login');
    document.getElementById('tab-register')?.classList.toggle('active', tab === 'register');
    ['login', 'register', 'token'].forEach(p => {
        document.getElementById(`auth-${p}`)?.classList.add('hidden');
    });
    document.getElementById(`auth-${tab}`)?.classList.remove('hidden');
};

function showError(el, box, msg) {
    if (!el) return;
    el.textContent = msg;
    if (box) {
        box.classList.remove('shake');
        void box.offsetWidth;
        box.classList.add('shake');
    }
    setTimeout(() => el.textContent = '', 3200);
}

// Копирование токена
window.copyToken = function() {
    const token = document.getElementById('generated-token')?.textContent;
    if (!token) return;
    navigator.clipboard.writeText(token).then(() => {
        showToast('approved', 'Токен скопирован', 'TSC-Token в буфере обмена. Никому не передавайте!');
    }).catch(() => {
        alert('Не удалось скопировать. Выделите вручную: ' + token);
    });
};

window.registerUser = async function() {
    const email = document.getElementById('reg-email').value.trim();
    const user = document.getElementById('reg-username').value.trim();
    const name = document.getElementById('reg-name').value.trim();
    const age = document.getElementById('reg-age').value.trim();
    const gender = document.getElementById('reg-gender').value;
    const pass = document.getElementById('reg-password').value;
    const confirmPass = document.getElementById('reg-password-confirm').value;
    const err = document.getElementById('reg-error');
    const box = document.querySelector('.auth-box');

    if (!email) return showError(err, box, "Введите Email.");
    if (!user.startsWith('@') || user.length < 3) return showError(err, box, "Юзернейм должен начинаться с @ и быть длиннее 2 символов.");
    if (pass.length < 6) return showError(err, box, "Пароль должен быть не менее 6 символов.");
    if (pass !== confirmPass) return showError(err, box, "Пароли не совпадают.");

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        const firebaseUser = userCredential.user;
        
        const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
        let t1 = '', t2 = '';
        for (let i = 0; i < 4; i++) t1 += chars.charAt(Math.floor(Math.random() * chars.length));
        for (let i = 0; i < 4; i++) t2 += chars.charAt(Math.floor(Math.random() * chars.length));
        const token = `TSC-${t1}-${t2}`;

        await setDoc(doc(db, "users", firebaseUser.uid), {
            email: email,
            username: user,
            name: name,
            age: age,
            gender: gender,
            tscToken: token,
            role: "player",
            isBlogger: false,
            isOBT: false,
            isTester: false,
            applicationsBlocked: false,
            blockReason: "",
            roleFrozen: false,
            roleFrozenReason: "",
            unlockedDossiers: ["player"],
            dossierStatuses: {},
            createdAt: new Date().toISOString()
        });

        localStorage.setItem('tsc_user', user);
        localStorage.setItem('tsc_name', name);
        localStorage.setItem('tsc_age', age);
        localStorage.setItem('tsc_gender', gender);
        localStorage.setItem('tsc_token', token);
        localStorage.setItem('tsc_email', email);

        document.getElementById('generated-token').textContent = token;
        ['login','register'].forEach(p => document.getElementById(`auth-${p}`)?.classList.add('hidden'));
        document.getElementById('auth-token').classList.remove('hidden');

    } catch (error) {
        if (error.code === 'auth/email-already-in-use') return showError(err, box, "Этот Email уже зарегистрирован.");
        showError(err, box, "Ошибка: " + error.message);
    }
};

window.loginUser = async function() {
    const email = document.getElementById('login-email').value.trim();
    const pass = document.getElementById('login-password').value;
    const err = document.getElementById('login-error');
    const box = document.querySelector('.auth-box');

    if (!email || !pass) return showError(err, box, "Введите Email и пароль.");

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, pass);
        const firebaseUser = userCredential.user;
        const docSnap = await getDoc(doc(db, "users", firebaseUser.uid));

        if (docSnap.exists()) {
            const data = docSnap.data();
            window.currentUserData = data;
            localStorage.setItem('tsc_user', data.username);
            localStorage.setItem('tsc_name', data.name || 'Неизвестно');
            localStorage.setItem('tsc_age', data.age || '0');
            localStorage.setItem('tsc_gender', data.gender || 'Неизвестно');
            localStorage.setItem('tsc_token', data.tscToken);
            localStorage.setItem('tsc_email', data.email);
            err.textContent = '';
            startBreach();
        } else {
            showError(err, box, "Профиль не найден в базе.");
        }
    } catch (error) {
        if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
            return showError(err, box, "Неверный Email или пароль.");
        }
        showError(err, box, "Ошибка: " + error.message);
    }
};

window.logoutUser = async function() {
    try {
        if (window.notifPollInterval) { clearInterval(window.notifPollInterval); window.notifPollInterval = null; }
        await signOut(auth);
        localStorage.removeItem('tsc_token');
        localStorage.removeItem('tsc_user');
        location.reload();
    } catch (error) { console.error("Ошибка выхода:", error); }
};

// ============================================================
// РАЗРЫВ ЭКРАНА
// ============================================================
function startBreach() {
    const overlay = document.getElementById('breach-overlay');
    const canvas = document.getElementById('breach-canvas');
    const flash = document.getElementById('breach-flash');
    const btext = document.querySelector('.breach-text');
    overlay.classList.remove('hidden');

    const ctx = canvas.getContext('2d');
    let W = canvas.width = window.innerWidth;
    let H = canvas.height = window.innerHeight;
    const cx = W / 2, cy = H / 2;

    const cracks = [];
    const numMain = 9;
    for (let i = 0; i < numMain; i++) {
        const angle = (Math.PI * 2 / numMain) * i + Math.random() * 0.3;
        cracks.push(makeCrack(cx, cy, angle, 0));
    }
    function makeCrack(x, y, angle, depth) {
        const points = [{x, y}];
        let px = x, py = y, a = angle;
        const segs = 5 + Math.floor(Math.random() * 4);
        for (let i = 0; i < segs; i++) {
            a += (Math.random() - 0.5) * 0.6;
            const len = 40 + Math.random() * 80;
            px += Math.cos(a) * len;
            py += Math.sin(a) * len;
            points.push({x: px, y: py});
            if (depth < 1 && Math.random() < 0.35) {
                cracks.push(makeCrack(px, py, a + (Math.random() - 0.5) * 1.2, depth + 1));
            }
        }
        return { points };
    }

    let start = performance.now();
    const duration = 1100;
    function draw(now) {
        const t = Math.min(1, (now - start) / duration);
        ctx.clearRect(0, 0, W, H);
        ctx.strokeStyle = 'rgba(0,240,255,0.95)';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 12;
        ctx.shadowColor = '#00f0ff';
        cracks.forEach(c => {
            const total = c.points.length - 1;
            const drawUpTo = Math.floor(total * t);
            ctx.beginPath();
            c.points.forEach((p, i) => {
                if (i > drawUpTo) return;
                if (i === 0) ctx.moveTo(p.x, p.y);
                else ctx.lineTo(p.x, p.y);
            });
            ctx.stroke();
        });
        if (t < 1) requestAnimationFrame(draw);
        else {
            flash.classList.add('on');
            btext.classList.add('on');
            setTimeout(() => flash.classList.remove('on'), 120);
            setTimeout(() => {
                overlay.classList.add('hidden');
                document.getElementById('auth-overlay').classList.add('hidden');
                document.getElementById('main-content').classList.remove('hidden');
                updateProfileUI();
                launchSiteReveal();
            }, 650);
        }
    }
    requestAnimationFrame(draw);
}

function launchSiteReveal() {
    const title = document.getElementById('hero-title');
    if (title) splitLetters(title, 0.06);
    setTimeout(() => document.getElementById('hero-tagline')?.classList.add('in'), 400);
    setTimeout(() => document.querySelector('.hero .btn.pulse-btn')?.classList.add('in'), 800);
    document.querySelectorAll('.section').forEach(s => observer.observe(s));
    loadDossiers();
    loadApplicationStatus();
    loadNotifications();
    loadShopStatus();
    startNotificationPolling();
}

// ============================================================
// СТАРТ
// ============================================================
window.addEventListener('load', () => {
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            await loadUserData();
            document.getElementById('intro-overlay').classList.add('hidden');
            document.getElementById('auth-overlay').classList.add('hidden');
            document.getElementById('main-content').classList.remove('hidden');
            updateProfileUI();
            launchSiteReveal();
        } else {
            document.getElementById('main-content').classList.add('hidden');
            document.getElementById('auth-overlay').classList.add('hidden');
            document.getElementById('intro-overlay').classList.remove('hidden');
            runIntro();
        }
    });
});

// ============================================================
// ЗАГРУЗКА ДАННЫХ ПОЛЬЗОВАТЕЛЯ
// ============================================================
async function loadUserData() {
    const user = auth.currentUser;
    if (!user) return null;
    try {
        const snap = await getDoc(doc(db, "users", user.uid));
        if (snap.exists()) {
            window.currentUserData = snap.data();
            window.isAdmin = window.currentUserData.role === 'admin';
            return window.currentUserData;
        }
    } catch (e) { console.error('loadUserData:', e); }
    return null;
}

// ============================================================
// ПРОФИЛЬ
// ============================================================
function updateProfileUI() {
    const user = localStorage.getItem('tsc_user') || '@...';
    const name = localStorage.getItem('tsc_name') || 'Неизвестно';
    const age = localStorage.getItem('tsc_age') || '0';
    const gender = localStorage.getItem('tsc_gender') || 'Неизвестно';
    const avatar = localStorage.getItem('tsc_avatar');

    if (document.getElementById('prof-user')) {
        document.getElementById('prof-user').textContent = user;
        document.getElementById('prof-name').textContent = name;
        document.getElementById('prof-age').textContent = age;
        document.getElementById('prof-gender').textContent = gender;
    }
    const navAvatar = document.getElementById('nav-avatar-container');
    const profAvatar = document.getElementById('profile-avatar-large');
    if (avatar) {
        if (navAvatar) { navAvatar.style.backgroundImage = `url(${avatar})`; navAvatar.textContent = ''; }
        if (profAvatar) { profAvatar.style.backgroundImage = `url(${avatar})`; profAvatar.textContent = ''; }
    } else {
        const initial = name.charAt(0).toUpperCase() || user.replace('@','').charAt(0).toUpperCase() || '?';
        if (navAvatar) { navAvatar.style.backgroundImage = 'none'; navAvatar.textContent = initial; }
        if (profAvatar) { profAvatar.style.backgroundImage = 'none'; profAvatar.textContent = initial; }
    }
    renderProfileRoles();
    document.getElementById('admin-panel-btn')?.classList.toggle('hidden', !window.isAdmin);
}

function renderProfileRoles() {
    const container = document.getElementById('profile-roles');
    if (!container) return;
    const data = window.currentUserData || {};
    let html = '';
    
    if (data.role === 'admin') html += '<span class="role-badge admin">👑 ADMIN</span>';
    if (data.isBlogger) html += '<span class="role-badge blogger">⭐ БЛОГЕР</span>';
    if (data.isOBT) html += '<span class="role-badge obt">🟢 ОБТ</span>';
    if (data.isTester) html += '<span class="role-badge tester">🧪 ТЕСТЕР</span>';
    if (!html) html = '<span class="role-badge player">🎮 ИГРОК</span>';
    
    container.innerHTML = html;
}

window.openProfileModal = async function() {
    document.getElementById('profile-modal').classList.remove('hidden');
    await loadUserData();
    updateProfileUI();
    await loadApplicationStatus();
    await loadNotifications();
    
    const dot = document.getElementById('bell-dot');
    if (dot) dot.classList.add('hidden');
};

window.closeProfileModal = function(e) {
    if (e) e.stopPropagation();
    document.getElementById('profile-modal').classList.add('hidden');
};

function resizeImage(base64Str, maxWidth = 250, maxHeight = 250) {
    return new Promise(resolve => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const c = document.createElement('canvas');
            let w = img.width, h = img.height;
            if (w > h) { if (w > maxWidth) { h *= maxWidth / w; w = maxWidth; } }
            else { if (h > maxHeight) { w *= maxHeight / h; h = maxHeight; } }
            c.width = w; c.height = h;
            c.getContext('2d').drawImage(img, 0, 0, w, h);
            resolve(c.toDataURL('image/jpeg', 0.8));
        };
    });
}

window.uploadAvatar = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async e => {
        const compressed = await resizeImage(e.target.result);
        localStorage.setItem('tsc_avatar', compressed);
        updateProfileUI();
    };
    reader.readAsDataURL(file);
};

window.showImagePreview = function() {
    const avatar = localStorage.getItem('tsc_avatar');
    if (avatar) {
        document.getElementById('preview-img').src = avatar;
        document.getElementById('image-preview-modal').classList.remove('hidden');
    }
};
window.closeImagePreview = function() {
    document.getElementById('image-preview-modal').classList.add('hidden');
};

window.changePassword = () => alert("Смена пароля будет доступна в следующем обновлении.");
window.changeToken = () => alert("Смена токена будет доступна в следующем обновлении.");

// ============================================================
// МОДАЛКА СКАЧИВАНИЯ (ПЛАТФОРМЫ)
// ============================================================
const downloadModal = document.getElementById('download-modal');
window.openDownloadModal = function() { downloadModal?.classList.remove('hidden'); };
window.closeDownloadModal = function() { downloadModal?.classList.add('hidden'); };
if (downloadModal) downloadModal.addEventListener('click', e => { if (e.target === downloadModal) closeDownloadModal(); });

// ============================================================
// TOAST УВЕДОМЛЕНИЯ
// ============================================================
window.showToast = function(type, title, message) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-title">${escapeHtml(title)}</div>
        <div>${escapeHtml(message)}</div>
    `;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.transition = 'all 0.3s';
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(40px)';
        setTimeout(() => toast.remove(), 300);
    }, 6000);

    if ('Notification' in window && Notification.permission === 'granted') {
        try { new Notification(title, { body: message }); } catch(e) {}
    }
};

function playNotifSound() {
    try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.08, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        osc.start();
        osc.stop(ctx.currentTime + 0.4);
    } catch(e) {}
}

// ============================================================
// КОЛОКОЛЬЧИК / ПАНЕЛЬ УВЕДОМЛЕНИЙ
// ============================================================
window.openNotifPanel = async function() {
    document.getElementById('notif-panel').classList.remove('hidden');
    await loadNotifications();
    renderNotifications();
    document.getElementById('bell-dot')?.classList.add('hidden');
};

window.closeNotifPanel = function() {
    document.getElementById('notif-panel').classList.add('hidden');
};

async function loadNotifications() {
    const user = auth.currentUser;
    if (!user) return;
    try {
        const q = query(
            collection(db, "notifications"),
            where("uid", "==", user.uid)
        );
        const snap = await getDocs(q);
        window.myNotifications = [];
        snap.forEach(d => {
            window.myNotifications.push({ id: d.id, ...d.data() });
        });
        window.myNotifications.sort((a, b) => {
            const ta = a.createdAt?.toMillis?.() || 0;
            const tb = b.createdAt?.toMillis?.() || 0;
            return tb - ta;
        });
    } catch(e) { console.error('loadNotifications:', e); }
}

function renderNotifications() {
    const list = document.getElementById('notif-list');
    if (!list) return;
    if (!window.myNotifications.length) {
        list.innerHTML = '<p class="profile-empty">Пока тихо. Система молчит.</p>';
        return;
    }
    list.innerHTML = window.myNotifications.map(n => `
        <div class="notif-item ${n.read ? '' : 'unread'}" onclick="markNotifRead('${n.id}')">
            <div class="notif-item-title">${escapeHtml(n.title || 'Уведомление')}</div>
            <div>${escapeHtml(n.text || '')}</div>
            <div class="notif-item-time">${formatDateTime(n.createdAt)}</div>
        </div>
    `).join('');
}

window.markNotifRead = async function(id) {
    try {
        await updateDoc(doc(db, "notifications", id), { read: true });
        await loadNotifications();
        renderNotifications();
    } catch(e) { console.error(e); }
};

window.markAllNotifRead = async function() {
    const user = auth.currentUser;
    if (!user) return;
    for (const n of window.myNotifications) {
        if (!n.read) {
            try { await updateDoc(doc(db, "notifications", n.id), { read: true }); } catch(e){}
        }
    }
    await loadNotifications();
    renderNotifications();
};

// ============================================================
// ОПРОС УВЕДОМЛЕНИЙ И СТАТУСОВ
// ============================================================
function startNotificationPolling() {
    if (window.notifPollInterval) return;
    try {
        window.lastKnownStatuses = JSON.parse(localStorage.getItem('tsc_last_statuses') || '{}');
    } catch(e) { window.lastKnownStatuses = {}; }
    checkNotifications();
    window.notifPollInterval = setInterval(checkNotifications, 15000);
}

async function checkNotifications() {
    const user = auth.currentUser;
    if (!user) return;

    try {
        // Проверка заявок
        const snap = await getDocs(query(
            collection(db, "applications"),
            where("uid", "==", user.uid)
        ));

        let hasNew = false;
        let hasPending = false;

        snap.forEach(docSnap => {
            const data = docSnap.data();
            const id = docSnap.id;
            if (data.status === 'pending') hasPending = true;

            const last = window.lastKnownStatuses[id];
            if (last !== data.status) {
                if (last !== undefined) {
                    if (data.status === 'approved') {
                        showToast('approved', 'Заявка одобрена!', 
                            data.type === 'blogger' ? 'Вам выдана роль БЛОГЕРА!' :
                            data.type === 'obt' ? 'Вы приняты в ОБТ!' :
                            'Вы приняты в тестеры!');
                        playNotifSound();
                    } else if (data.status === 'rejected') {
                        showToast('rejected', 'Заявка отклонена', data.adminComment || 'Причина не указана.');
                        playNotifSound();
                    } else if (data.status === 'revoked') {
                        showToast('rejected', 'Доступ отозван', data.adminComment || 'Причина не указана.');
                        playNotifSound();
                    }
                    hasNew = true;
                }
                window.lastKnownStatuses[id] = data.status;
            }
        });

        localStorage.setItem('tsc_last_statuses', JSON.stringify(window.lastKnownStatuses));

        // Проверка объявлений
        const annSnap = await getDocs(query(collection(db, "announcements"), where("active", "==", true)));
        annSnap.forEach(d => {
            const data = d.data();
            const dismissed = data.dismissedBy || [];
            if (!dismissed.includes(user.uid)) {
                const key = 'tsc_ann_' + d.id;
                if (!localStorage.getItem(key)) {
                    showToast('announcement', data.title || 'Объявление', data.text || '');
                    localStorage.setItem(key, '1');
                }
            }
        });

        await loadUserData();
        renderProfileRoles();

        const dot = document.getElementById('bell-dot');
        if (dot) {
            if (hasNew || hasPending) dot.classList.remove('hidden');
        }
    } catch(e) { console.error('checkNotifications:', e); }
}
// ============================================================
// ДОСЬЕ
// ============================================================
async function loadDossiers() {
    try {
        const q = query(collection(db, "dossiers"), orderBy("order", "asc"));
        const snap = await getDocs(q);
        window.allDossiers = [];
        snap.forEach(d => {
            window.allDossiers.push({ id: d.id, ...d.data() });
        });
        renderDossiers();
    } catch(e) {
        console.error('loadDossiers:', e);
        // Fallback если orderBy не сработает (нет индекса)
        try {
            const snap = await getDocs(collection(db, "dossiers"));
            window.allDossiers = [];
            snap.forEach(d => {
                window.allDossiers.push({ id: d.id, ...d.data() });
            });
            window.allDossiers.sort((a, b) => (a.order || 99) - (b.order || 99));
            renderDossiers();
        } catch(e2) { console.error(e2); }
    }
}

function renderDossiers() {
    const grid = document.getElementById('dossier-grid');
    const progressEl = document.getElementById('dossier-progress');
    if (!grid) return;

    const unlocked = (window.currentUserData?.unlockedDossiers) || ["player"];
    const personalStatuses = window.currentUserData?.dossierStatuses || {};

    const opened = window.allDossiers.filter(d => unlocked.includes(d.id));
    const locked = window.allDossiers.filter(d => !unlocked.includes(d.id));
    
    // Показываем все открытые + 2 ближайших закрытых
    const toShow = [...opened, ...locked.slice(0, 2)];

    if (progressEl) {
        progressEl.textContent = `Открыто ${opened.length} из ${window.allDossiers.length}`;
    }

    grid.innerHTML = toShow.map(d => {
        const isLocked = !unlocked.includes(d.id);
        const status = personalStatuses[d.id] || d.status || 'unknown';
        
        if (isLocked) {
            const episodeNum = (d.unlockAfter || 'episode_1').replace('episode_', '');
            return `
                <div class="dossier-card locked" onclick="shakeLocked(this)">
                    <div class="dossier-photo silhouette">?</div>
                    <div class="dossier-info">
                        <div class="dossier-name">???</div>
                        <div class="dossier-locked-hint">Узнаете в Эпизоде ${episodeNum}</div>
                    </div>
                </div>
            `;
        }
        
        const hasPhoto = d.photo && d.photo.trim() !== '';
        const photoHtml = hasPhoto
            ? `<div class="dossier-photo" style="background-image:url('${escapeHtml(d.photo)}');"></div>`
            : `<div class="dossier-photo silhouette">👤</div>`;
        
        const statusLabel = status === 'alive' ? 'Жив' : status === 'missing' ? 'Пропал' : status === 'dead' ? 'Мёртв' : 'Неизвестно';
        
        return `
            <div class="dossier-card" onclick="openDossierModal('${d.id}')">
                ${photoHtml}
                <div class="dossier-info">
                    <div class="dossier-name">${escapeHtml(d.name || '???')}</div>
                    <div class="dossier-status-dot ${status}"></div>
                    <span style="font-size:0.75rem;color:var(--text-dim);">${statusLabel}</span>
                </div>
            </div>
        `;
    }).join('');
}

window.shakeLocked = function(el) {
    el.classList.remove('shake');
    void el.offsetWidth;
    el.classList.add('shake');
};

window.openDossierModal = function(id) {
    const d = window.allDossiers.find(x => x.id === id);
    if (!d) return;
    
    const personalStatuses = window.currentUserData?.dossierStatuses || {};
    const status = personalStatuses[id] || d.status || 'unknown';
    const statusLabel = status === 'alive' ? '🟢 Жив' : status === 'missing' ? '🟡 Пропал' : status === 'dead' ? '🔴 Мёртв' : '⚪ Неизвестно';
    
    const body = document.getElementById('dossier-detail-body');
    if (!body) return;
    
    const hasPhoto = d.photo && d.photo.trim() !== '';
    
    body.innerHTML = `
        ${hasPhoto ? `<div class="dossier-detail-photo" style="background-image:url('${escapeHtml(d.photo)}');"></div>` : ''}
        <h3 class="dossier-detail-name">${escapeHtml(d.name || '???')}</h3>
        ${d.codename ? `<div class="dossier-detail-codename">${escapeHtml(d.codename)}</div>` : ''}
        <div class="dossier-detail-meta">
            ${d.fullName ? `<div class="dossier-meta-item"><strong>Имя:</strong> ${escapeHtml(d.fullName)}</div>` : ''}
            ${d.age ? `<div class="dossier-meta-item"><strong>Возраст:</strong> ${escapeHtml(d.age)}</div>` : ''}
            ${d.occupation ? `<div class="dossier-meta-item"><strong>Занятие:</strong> ${escapeHtml(d.occupation)}</div>` : ''}
            <div class="dossier-meta-item"><strong>Статус:</strong> ${statusLabel}</div>
        </div>
        ${d.bio ? `<div class="dossier-detail-bio">${escapeHtml(d.bio)}</div>` : ''}
        ${d.quote ? `<div class="dossier-detail-quote">«${escapeHtml(d.quote)}»</div>` : ''}
    `;
    
    document.getElementById('dossier-modal').classList.remove('hidden');
};

window.closeDossierModal = function(e) {
    if (e) e.stopPropagation();
    document.getElementById('dossier-modal').classList.add('hidden');
};

// ============================================================
// ЗАЯВКИ — ВСПОМОГАТЕЛЬНЫЕ
// ============================================================
window.switchAppTab = function(tab) {
    ['blogger', 'obt', 'tester'].forEach(t => {
        document.getElementById(`app-tab-${t}`)?.classList.toggle('active', t === tab);
        document.getElementById(`app-${t}`)?.classList.toggle('hidden', t !== tab);
    });
};

window.updateContactField = function(type) {
    const platform = document.getElementById(`${type}-contact-platform`).value;
    const label = document.getElementById(`${type}-contact-label`);
    const input = document.getElementById(`${type}-contact-value`);
    if (!label || !input) return;
    
    const placeholders = {
        'Telegram': '@nickname',
        'Discord': 'username#0000',
        'VK': '@nickname или ссылка',
        'Email': 'email@example.com',
        'Телефон': '+7...',
        'Другое': 'как с вами связаться'
    };
    label.textContent = `Контакт (${platform})`;
    input.placeholder = placeholders[platform] || '';
};

// Соцсети блогера
let bloggerSocialCount = 0;
window.addBloggerSocial = function() {
    const list = document.getElementById('blogger-socials-list');
    if (!list) return;
    if (list.children.length >= 30) {
        alert('Максимум 30 соцсетей');
        return;
    }
    bloggerSocialCount++;
    const div = document.createElement('div');
    div.className = 'social-row';
    div.innerHTML = `
        <select class="social-platform">
            <option value="YouTube">YouTube</option>
            <option value="TikTok">TikTok</option>
            <option value="Telegram">Telegram</option>
            <option value="Twitch">Twitch</option>
            <option value="VK">VK</option>
            <option value="Instagram">Instagram</option>
            <option value="Другое">Другое</option>
        </select>
        <input type="text" class="social-url" placeholder="Ссылка или @username">
        <input type="text" class="social-audience" placeholder="Аудитория">
        <button type="button" class="social-remove" onclick="this.parentElement.remove()">✕</button>
    `;
    list.appendChild(div);
};

// ОБТ — выбор объектов
window.toggleObtScope = function() {
    const target = document.querySelector('input[name="obt-target"]:checked')?.value;
    const epBox = document.getElementById('obt-scope-episode');
    const evBox = document.getElementById('obt-scope-event');
    if (!epBox || !evBox) return;
    epBox.classList.toggle('hidden', target !== 'episode');
    evBox.classList.toggle('hidden', target !== 'event');
    // Снимаем чекбоксы с другого блока
    if (target === 'episode') {
        evBox.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    } else if (target === 'event') {
        epBox.querySelectorAll('input[type="checkbox"]').forEach(cb => cb.checked = false);
    }
};

// ============================================================
// ЗАЯВКИ — ОТПРАВКА
// ============================================================
async function checkCanSubmit(type) {
    const user = auth.currentUser;
    if (!user) { showToast('rejected', 'Ошибка', 'Сначала войдите в аккаунт.'); return null; }
    
    if (window.currentUserData?.applicationsBlocked) {
        showToast('rejected', 'Подача заблокирована', window.currentUserData.blockReason || 'Обратитесь к администратору.');
        return null;
    }
    
    const pending = window.myApplications[type];
    if (pending && pending.status === 'pending') {
        showToast('pending', 'Уже подана', 'У вас уже есть эта заявка на рассмотрении.');
        return null;
    }
    
    return user;
}

window.submitBloggerApplication = async function() {
    const user = await checkCanSubmit('blogger');
    if (!user) return;
    
    const err = document.getElementById('blogger-error');
    const realName = document.getElementById('blogger-realname').value.trim();
    const age = document.getElementById('blogger-age').value.trim();
    const contactPlatform = document.getElementById('blogger-contact-platform').value;
    const contactValue = document.getElementById('blogger-contact-value').value.trim();
    const message = document.getElementById('blogger-message').value.trim();
    const tgUsername = document.getElementById('blogger-tg').value.trim();
    const ttUsername = document.getElementById('blogger-tt').value.trim();
    const subscribed = document.getElementById('blogger-subscribed').checked;
    
    if (realName.length < 3) { err.textContent = 'Введите ФИО (мин. 3 символа).'; return; }
    if (!age) { err.textContent = 'Введите возраст.'; return; }
    if (!contactValue) { err.textContent = 'Введите контакт.'; return; }
    if (!tgUsername || !ttUsername) { err.textContent = 'Введите юзернеймы в TG и TikTok.'; return; }
    if (!subscribed) { err.textContent = 'Подтвердите подписку на соцсети.'; return; }
    
    // Собираем соцсети
    const socials = [];
    document.querySelectorAll('#blogger-socials-list .social-row').forEach(row => {
        const platform = row.querySelector('.social-platform').value;
        const url = row.querySelector('.social-url').value.trim();
        const audience = row.querySelector('.social-audience').value.trim();
        if (url) socials.push({ platform, url, audience });
    });
    
    if (socials.length === 0) { err.textContent = 'Добавьте хотя бы одну соцсеть.'; return; }
    
    err.textContent = '';
    try {
        await addDoc(collection(db, "applications"), {
            uid: user.uid,
            type: 'blogger',
            email: user.email,
            username: localStorage.getItem('tsc_user') || '',
            realName, realAge: age,
            contactPlatform, contactValue,
            socials,
            message,
            tgUsername, ttUsername,
            subscribedConfirmed: true,
            subscribedConfirmedAt: serverTimestamp(),
            status: 'pending',
            adminComment: '',
            createdAt: serverTimestamp()
        });
        await loadApplicationStatus();
        showToast('pending', 'Заявка отправлена', 'Ожидайте решения администратора.');
    } catch(e) {
        err.textContent = 'Ошибка: ' + e.message;
    }
};

window.submitOBTApplication = async function() {
    const user = await checkCanSubmit('obt');
    if (!user) return;
    
    const err = document.getElementById('obt-error');
    const realName = document.getElementById('obt-realname').value.trim();
    const age = document.getElementById('obt-age').value.trim();
    const contactPlatform = document.getElementById('obt-contact-platform').value;
    const contactValue = document.getElementById('obt-contact-value').value.trim();
    const platform = document.getElementById('obt-platform').value;
    const message = document.getElementById('obt-message').value.trim();
    const tgUsername = document.getElementById('obt-tg').value.trim();
    const ttUsername = document.getElementById('obt-tt').value.trim();
    const subscribed = document.getElementById('obt-subscribed').checked;
    
    const testTarget = document.querySelector('input[name="obt-target"]:checked')?.value;
    if (!testTarget) { err.textContent = 'Выберите, что хотите тестировать (Эпизод или Ивент).'; return; }
    
    const testScope = [];
    document.querySelectorAll('.obt-scope-cb:checked').forEach(cb => testScope.push(cb.value));
    if (testScope.length === 0) { err.textContent = 'Выберите хотя бы один объект тестирования.'; return; }
    
    if (realName.length < 3) { err.textContent = 'Введите ФИО (мин. 3 символа).'; return; }
    if (!age) { err.textContent = 'Введите возраст.'; return; }
    if (!contactValue) { err.textContent = 'Введите контакт.'; return; }
    if (!tgUsername || !ttUsername) { err.textContent = 'Введите юзернеймы в TG и TikTok.'; return; }
    if (!subscribed) { err.textContent = 'Подтвердите подписку на соцсети.'; return; }
    
    err.textContent = '';
    try {
        await addDoc(collection(db, "applications"), {
            uid: user.uid,
            type: 'obt',
            email: user.email,
            username: localStorage.getItem('tsc_user') || '',
            realName, realAge: age,
            contactPlatform, contactValue,
            platform,
            testTarget,
            testScope,
            message,
            tgUsername, ttUsername,
            subscribedConfirmed: true,
            subscribedConfirmedAt: serverTimestamp(),
            status: 'pending',
            adminComment: '',
            createdAt: serverTimestamp()
        });
        await loadApplicationStatus();
        showToast('pending', 'Заявка отправлена', 'Ожидайте решения администратора.');
    } catch(e) {
        err.textContent = 'Ошибка: ' + e.message;
    }
};

window.submitTesterApplication = async function() {
    const user = await checkCanSubmit('tester');
    if (!user) return;
    
    const err = document.getElementById('tester-error');
    const realName = document.getElementById('tester-realname').value.trim();
    const age = document.getElementById('tester-age').value.trim();
    const contactPlatform = document.getElementById('tester-contact-platform').value;
    const contactValue = document.getElementById('tester-contact-value').value.trim();
    const platform = document.getElementById('tester-platform').value;
    const message = document.getElementById('tester-message').value.trim();
    const tgUsername = document.getElementById('tester-tg').value.trim();
    const ttUsername = document.getElementById('tester-tt').value.trim();
    const subscribed = document.getElementById('tester-subscribed').checked;
    
    if (realName.length < 3) { err.textContent = 'Введите ФИО (мин. 3 символа).'; return; }
    if (!age) { err.textContent = 'Введите возраст.'; return; }
    if (!contactValue) { err.textContent = 'Введите контакт.'; return; }
    if (!tgUsername || !ttUsername) { err.textContent = 'Введите юзернеймы в TG и TikTok.'; return; }
    if (!subscribed) { err.textContent = 'Подтвердите подписку на соцсети.'; return; }
    
    err.textContent = '';
    try {
        await addDoc(collection(db, "applications"), {
            uid: user.uid,
            type: 'tester',
            email: user.email,
            username: localStorage.getItem('tsc_user') || '',
            realName, realAge: age,
            contactPlatform, contactValue,
            platform,
            message,
            tgUsername, ttUsername,
            subscribedConfirmed: true,
            subscribedConfirmedAt: serverTimestamp(),
            status: 'pending',
            adminComment: '',
            createdAt: serverTimestamp()
        });
        await loadApplicationStatus();
        showToast('pending', 'Заявка отправлена', 'Ожидайте решения администратора.');
    } catch(e) {
        err.textContent = 'Ошибка: ' + e.message;
    }
};

// ============================================================
// ЗАЯВКИ — ЗАГРУЗКА И РЕНДЕР
// ============================================================
async function loadApplicationStatus() {
    const user = auth.currentUser;
    if (!user) return;
    
    try {
        const snap = await getDocs(query(
            collection(db, "applications"),
            where("uid", "==", user.uid)
        ));
        
        window.myApplications = { blogger: null, obt: null, tester: null };
        snap.forEach(docSnap => {
            const data = docSnap.data();
            const existing = window.myApplications[data.type];
            const newTs = data.createdAt?.toMillis?.() || 0;
            const exTs = existing?.createdAt?.toMillis?.() || 0;
            if (!existing || newTs > exTs) {
                window.myApplications[data.type] = { id: docSnap.id, ...data };
            }
        });
        
        renderApplicationStatus('blogger');
        renderApplicationStatus('obt');
        renderApplicationStatus('tester');
        renderProfileApps();
    } catch(e) { console.error('loadApplicationStatus:', e); }
}

function renderApplicationStatus(type) {
    const app = window.myApplications[type];
    const formEl = document.getElementById(`app-${type}`);
    const statusEl = document.getElementById(`app-status-${type}`);
    if (!formEl || !statusEl) return;
    
    // Проверка блокировки
    if (window.currentUserData?.applicationsBlocked) {
        formEl.classList.add('hidden');
        statusEl.classList.remove('hidden');
        statusEl.innerHTML = `<div class="app-status-box rejected">🚫 Подача заявок заблокирована. Причина: ${escapeHtml(window.currentUserData.blockReason || 'не указана')}</div>`;
        return;
    }
    
    if (!app || app.status === 'rejected' || app.status === 'revoked') {
        formEl.classList.remove('hidden');
        if (app && (app.status === 'rejected' || app.status === 'revoked')) {
            const label = app.status === 'rejected' ? 'отклонена' : 'отозвана';
            statusEl.innerHTML = `<div class="app-status-box rejected">Заявка ${label}.${app.adminComment ? ' Причина: ' + escapeHtml(app.adminComment) : ''}</div>`;
            statusEl.classList.remove('hidden');
        } else {
            statusEl.classList.add('hidden');
        }
        return;
    }
    
    formEl.classList.add('hidden');
    statusEl.classList.remove('hidden');
    
    if (app.status === 'pending') {
        statusEl.innerHTML = `<div class="app-status-box pending">⏳ Заявка на рассмотрении. Ожидайте решения администратора.</div>`;
    } else if (app.status === 'approved') {
        if (type === 'blogger') {
            statusEl.innerHTML = `<div class="app-status-box approved">✅ Заявка одобрена! Вам выдана роль БЛОГЕРА (бессрочно).</div>`;
        } else {
            // ОБТ или Тестер — показываем срок
            const expires = app.expiresAt;
            const t = getTimeLeft(expires);
            const dateStr = t?.date ? formatDateTime(t.date) : '';
            let dotClass = 'green', statusText = 'активно';
            if (t?.expired) { dotClass = 'red'; statusText = 'истёк'; }
            else if (t?.color === 'yellow') { dotClass = 'yellow'; statusText = 'заканчивается'; }
            
            statusEl.innerHTML = `
                <div class="app-status-box approved">
                    ✅ Заявка одобрена!
                    <br><span class="profile-app-status-dot ${dotClass}"></span>
                    ${type === 'obt' ? 'ОБТ' : 'Тест'} активен ${t?.expired ? 'был ' : ''}до ${escapeHtml(dateStr)}
                    ${t?.expired ? '' : ` (${escapeHtml(t?.text || '')})`}
                </div>
            `;
        }
    }
}

function renderProfileApps() {
    const activeContainer = document.getElementById('profile-apps-active');
    const historyContainer = document.getElementById('profile-apps-history');
    const historyCount = document.getElementById('history-count');
    
    if (!activeContainer || !historyContainer) return;
    
    const apps = window.myApplications || {};
    const active = [];
    const history = [];
    
    ['blogger', 'obt', 'tester'].forEach(type => {
        const app = apps[type];
        if (!app) return;
        
        const typeLabel = type === 'blogger' ? 'БЛОГЕР' : type === 'obt' ? 'ОБТ' : 'ТЕСТЕР';
        const isActive = app.status === 'pending' || 
                        (app.status === 'approved' && (type === 'blogger' || !isExpired(app.expiresAt)));
        
        const item = { ...app, typeLabel, type };
        if (isActive) active.push(item);
        else history.push(item);
    });
    
    // Сортировка: активные (pending сверху), история (новые сверху)
    active.sort((a, b) => {
        if (a.status === 'pending' && b.status !== 'pending') return -1;
        if (a.status !== 'pending' && b.status === 'pending') return 1;
        return 0;
    });
    history.sort((a, b) => {
        const ta = a.reviewedAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0;
        const tb = b.reviewedAt?.toMillis?.() || b.createdAt?.toMillis?.() || 0;
        return tb - ta;
    });
    
    activeContainer.innerHTML = active.length
        ? active.map(app => renderAppItem(app, false)).join('')
        : '<p class="profile-empty">Нет активных заявок.</p>';
    
    historyContainer.innerHTML = history.length
        ? history.slice(0, 20).map(app => renderAppItem(app, true)).join('')
        : '<p class="profile-empty">Пока пусто.</p>';
    
    if (historyCount) {
        historyCount.textContent = history.length ? `(${history.length})` : '';
    }
}

function isExpired(expiresAt) {
    if (!expiresAt) return false;
    const t = getTimeLeft(expiresAt);
    return t?.expired || false;
}

function renderAppItem(app, isHistory) {
    let statusBadge = '';
    let statusDot = '';
    let extra = '';
    
    if (app.status === 'pending') {
        statusBadge = '<span class="profile-app-status-badge pending">⏳ НА РАССМОТРЕНИИ</span>';
        statusDot = '<span class="profile-app-status-dot yellow"></span>';
    } else if (app.status === 'approved') {
        if (app.type === 'blogger') {
            statusBadge = '<span class="profile-app-status-badge approved">✅ ОДОБРЕНО</span>';
            statusDot = '<span class="profile-app-status-dot gray"></span>';
            extra = '<div class="profile-app-expires">⚪ бессрочно</div>';
        } else {
            const t = getTimeLeft(app.expiresAt);
            if (t?.expired) {
                statusBadge = '<span class="profile-app-status-badge rejected">⌛ СРОК ИСТЁК</span>';
                statusDot = '<span class="profile-app-status-dot red"></span>';
                extra = `<div class="profile-app-expires">🔴 истёк ${formatDateTime(t.date)}</div>`;
            } else {
                statusBadge = '<span class="profile-app-status-badge approved">✅ АКТИВНО</span>';
                const dotClass = t?.color === 'yellow' ? 'yellow' : 'green';
                statusDot = `<span class="profile-app-status-dot ${dotClass}"></span>`;
                extra = `<div class="profile-app-expires">${dotClass === 'yellow' ? '🟡' : '🟢'} до ${formatDateTime(t?.date)} (${escapeHtml(t?.text || '')})</div>`;
            }
        }
    } else if (app.status === 'rejected') {
        statusBadge = '<span class="profile-app-status-badge rejected">❌ ОТКЛОНЕНО</span>';
        statusDot = '<span class="profile-app-status-dot red"></span>';
        extra = app.adminComment ? `<div class="profile-app-comment">Причина: ${escapeHtml(app.adminComment)}</div>` : '';
    } else if (app.status === 'revoked') {
        statusBadge = '<span class="profile-app-status-badge revoked">🚫 ОТОЗВАНО</span>';
        statusDot = '<span class="profile-app-status-dot red"></span>';
        extra = app.adminComment ? `<div class="profile-app-comment">Причина: ${escapeHtml(app.adminComment)}</div>` : '';
    }
    
    return `
        <div class="profile-app-item ${app.status}">
            <div class="profile-app-header">
                <span class="profile-app-type">${statusDot}${app.typeLabel}</span>
                ${statusBadge}
            </div>
            ${extra}
        </div>
    `;
}

// ============================================================
// МАГАЗИН — ЗАМОРОЗКА
// ============================================================
async function loadShopStatus() {
    try {
        const snap = await getDoc(doc(db, "settings", "global"));
        if (snap.exists()) {
            const frozen = snap.data().purchasesFrozen === true;
            document.getElementById('shop-frozen-notice')?.classList.toggle('hidden', !frozen);
            const btn = document.getElementById('shop-btn');
            if (btn) {
                if (frozen) {
                    btn.style.pointerEvents = 'none';
                    btn.style.opacity = '0.5';
                } else {
                    btn.style.pointerEvents = 'auto';
                    btn.style.opacity = '1';
                }
            }
            const toggle = document.getElementById('frozen-purchases-toggle');
            if (toggle) toggle.checked = frozen;
        }
    } catch(e) { console.error('loadShopStatus:', e); }
}

// ============================================================
// АДМИН-ПАНЕЛЬ
// ============================================================
window.openAdminPanel = function() {
    if (!window.isAdmin) return;
    document.getElementById('admin-modal').classList.remove('hidden');
    loadAdminApplications();
    loadPromocodes();
    loadShopStatus();
};

window.closeAdminPanel = function(e) {
    if (e) e.stopPropagation();
    document.getElementById('admin-modal').classList.add('hidden');
};

window.switchAdminTab = function(tab) {
    ['apps', 'promo', 'notif', 'settings'].forEach(t => {
        document.getElementById(`admin-${t}`)?.classList.toggle('hidden', t !== tab);
    });
    document.querySelectorAll('.admin-tab').forEach((btn, i) => {
        btn.classList.toggle('active', ['apps','promo','notif','settings'][i] === tab);
    });
};

// --- Заявки ---
async function loadAdminApplications() {
    const filter = document.getElementById('admin-app-filter')?.value || 'pending';
    const list = document.getElementById('admin-app-list');
    if (!list) return;
    
    list.innerHTML = '<p class="profile-empty">Загрузка...</p>';
    
    try {
        const snap = await getDocs(query(
            collection(db, "applications"),
            where("status", "==", filter)
        ));
        
        const apps = [];
        snap.forEach(d => apps.push({ id: d.id, ...d.data() }));
        apps.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        
        if (!apps.length) {
            list.innerHTML = '<p class="profile-empty">Заявок нет.</p>';
            return;
        }
        
        list.innerHTML = apps.map(app => renderAdminApp(app)).join('');
    } catch(e) {
        console.error(e);
        list.innerHTML = `<p class="profile-empty">Ошибка: ${escapeHtml(e.message)}</p>`;
    }
}

function renderAdminApp(app) {
    const typeLabel = app.type === 'blogger' ? 'БЛОГЕР' : app.type === 'obt' ? 'ОБТ' : 'ТЕСТЕР';
    const statusLabel = {
        pending: '⏳ PENDING',
        approved: '✅ APPROVED',
        rejected: '❌ REJECTED',
        revoked: '🚫 REVOKED'
    }[app.status] || app.status;
    
    let details = `
        <dt>ФИО</dt><dd>${escapeHtml(app.realName || '—')}</dd>
        <dt>Возраст</dt><dd>${escapeHtml(app.realAge || '—')}</dd>
        <dt>Контакт</dt><dd>${escapeHtml(app.contactPlatform || '')}: ${escapeHtml(app.contactValue || '')}</dd>
        <dt>Email</dt><dd>${escapeHtml(app.email || '—')}</dd>
        <dt>TG</dt><dd>${escapeHtml(app.tgUsername || '—')}</dd>
        <dt>TT</dt><dd>${escapeHtml(app.ttUsername || '—')}</dd>
    `;
    
    if (app.type === 'blogger' && app.socials?.length) {
        details += `<dt>Соцсети</dt><dd>${app.socials.map(s => `${escapeHtml(s.platform)}: ${escapeHtml(s.url)} (${escapeHtml(s.audience || '?')})`).join('<br>')}</dd>`;
    }
    if (app.type === 'obt') {
        details += `<dt>Платформа</dt><dd>${escapeHtml(app.platform || '—')}</dd>`;
        details += `<dt>Тестирует</dt><dd>${app.testTarget === 'episode' ? 'Эпизоды' : 'Ивенты'}: ${(app.testScope || []).join(', ')}</dd>`;
    }
    if (app.type === 'tester') {
        details += `<dt>Платформа</dt><dd>${escapeHtml(app.platform || '—')}</dd>`;
    }
    if (app.message) details += `<dt>Комментарий</dt><dd>${escapeHtml(app.message)}</dd>`;
    if (app.adminComment) details += `<dt>Ответ админа</dt><dd>${escapeHtml(app.adminComment)}</dd>`;
    if (app.expiresAt) details += `<dt>Срок</dt><dd>${formatDateTime(app.expiresAt)}</dd>`;
    
    let actions = '';
    if (app.status === 'pending') {
        actions = `
            <button class="btn-small" onclick="approveApplication('${app.id}', '${app.type}', '${app.uid}')" style="border-color:var(--neon-green);color:#6effa0;">✅ Одобрить</button>
            <button class="btn-small" onclick="rejectApplication('${app.id}')" style="border-color:var(--neon-red);color:var(--neon-red);">❌ Отклонить</button>
            <button class="btn-small" onclick="blockUserApplications('${app.uid}')" style="border-color:var(--neon-yellow);color:var(--neon-yellow);">🚫 Заблокировать подачу</button>
        `;
    } else if (app.status === 'approved') {
        actions = `
            <button class="btn-small" onclick="revokeApplication('${app.id}', '${app.type}', '${app.uid}')" style="border-color:var(--neon-red);color:var(--neon-red);">🚫 Отозвать</button>
        `;
    }
    
    return `
        <div class="admin-app-item ${app.status}">
            <div class="admin-app-head">
                <span class="admin-app-type">${typeLabel}</span>
                <span class="admin-app-status ${app.status}">${statusLabel}</span>
            </div>
            <dl class="admin-app-details">${details}</dl>
            <div class="admin-app-actions">${actions}</div>
        </div>
    `;
}

window.approveApplication = async function(appId, type, uid) {
    let expiresAt = null;
    let comment = '';
    
    if (type === 'obt' || type === 'tester') {
        const dateStr = prompt('Введите дату окончания (формат: ГГГГ-ММ-ДД ЧЧ:ММ)\nПример: 2026-12-31 23:59', '2026-12-31 23:59');
        if (!dateStr) return;
        const d = new Date(dateStr.replace(' ', 'T'));
        if (isNaN(d.getTime())) { alert('Неверный формат даты'); return; }
        expiresAt = d;
    }
    
    comment = prompt('Комментарий (опционально):', '') || '';
    
    try {
        // Обновляем заявку
        await updateDoc(doc(db, "applications", appId), {
            status: 'approved',
            adminComment: comment,
            reviewedAt: serverTimestamp(),
            expiresAt: expiresAt ? expiresAt.toISOString() : null
        });
        
        // Обновляем юзера
        const userUpdate = {};
        if (type === 'blogger') {
            userUpdate.isBlogger = true;
            userUpdate.bloggerApprovedAt = new Date().toISOString();
        } else if (type === 'obt') {
            userUpdate.isOBT = true;
            userUpdate.obtApprovedAt = new Date().toISOString();
            userUpdate.obtExpiresAt = expiresAt ? expiresAt.toISOString() : null;
        } else if (type === 'tester') {
            userUpdate.isTester = true;
            userUpdate.testerApprovedAt = new Date().toISOString();
            userUpdate.testerExpiresAt = expiresAt ? expiresAt.toISOString() : null;
        }
        await updateDoc(doc(db, "users", uid), userUpdate);
        
        // Уведомление юзеру
        await addDoc(collection(db, "notifications"), {
            uid: uid,
            type: 'app_approved',
            title: '✅ Заявка одобрена',
            text: type === 'blogger' ? 'Вам выдана роль БЛОГЕРА.' :
                  type === 'obt' ? `Вы приняты в ОБТ. До ${expiresAt ? formatDateTime(expiresAt) : '...'}` :
                  `Вы приняты в тестеры. До ${expiresAt ? formatDateTime(expiresAt) : '...'}`,
            read: false,
            createdAt: serverTimestamp()
        });
        
        showToast('approved', 'Одобрено', 'Заявка одобрена, роль выдана.');
        loadAdminApplications();
    } catch(e) {
        alert('Ошибка: ' + e.message);
    }
};

window.rejectApplication = async function(appId) {
    const comment = prompt('Причина отклонения (обязательно):', '');
    if (!comment || comment.trim().length < 3) {
        alert('Причина обязательна (мин. 3 символа).');
        return;
    }
    
    try {
        const appDoc = await getDoc(doc(db, "applications", appId));
        const appData = appDoc.data();
        
        await updateDoc(doc(db, "applications", appId), {
            status: 'rejected',
            adminComment: comment,
            reviewedAt: serverTimestamp()
        });
        
        await addDoc(collection(db, "notifications"), {
            uid: appData.uid,
            type: 'app_rejected',
            title: '❌ Заявка отклонена',
            text: `Причина: ${comment}`,
            read: false,
            createdAt: serverTimestamp()
        });
        
        showToast('rejected', 'Отклонено', 'Заявка отклонена.');
        loadAdminApplications();
    } catch(e) {
        alert('Ошибка: ' + e.message);
    }
};

window.revokeApplication = async function(appId, type, uid) {
    const comment = prompt('Причина отзыва доступа (обязательно):', '');
    if (!comment || comment.trim().length < 3) {
        alert('Причина обязательна (мин. 3 символа).');
        return;
    }
    
    try {
        await updateDoc(doc(db, "applications", appId), {
            status: 'revoked',
            adminComment: comment,
            revokedAt: serverTimestamp()
        });
        
        const userUpdate = {};
        if (type === 'blogger') { userUpdate.isBlogger = false; userUpdate.bloggerRevokedAt = new Date().toISOString(); }
        else if (type === 'obt') { userUpdate.isOBT = false; userUpdate.obtRevokedAt = new Date().toISOString(); }
        else if (type === 'tester') { userUpdate.isTester = false; userUpdate.testerRevokedAt = new Date().toISOString(); }
        await updateDoc(doc(db, "users", uid), userUpdate);
        
        await addDoc(collection(db, "notifications"), {
            uid: uid,
            type: 'app_revoked',
            title: '🚫 Доступ отозван',
            text: `Причина: ${comment}`,
            read: false,
            createdAt: serverTimestamp()
        });
        
        showToast('rejected', 'Отозвано', 'Доступ отозван.');
        loadAdminApplications();
    } catch(e) {
        alert('Ошибка: ' + e.message);
    }
};

window.blockUserApplications = async function(uid) {
    const reason = prompt('Причина блокировки подачи заявок:', '');
    if (!reason || reason.trim().length < 3) {
        alert('Причина обязательна (мин. 3 символа).');
        return;
    }
    
    try {
        await updateDoc(doc(db, "users", uid), {
            applicationsBlocked: true,
            blockReason: reason
        });
        showToast('rejected', 'Заблокировано', 'Пользователь не может подавать заявки.');
        loadAdminApplications();
    } catch(e) {
        alert('Ошибка: ' + e.message);
    }
};

// --- Промокоды ---
window.togglePromoScope = function() {
    const scope = document.getElementById('promo-scope').value;
    document.getElementById('promo-token-field')?.classList.toggle('hidden', scope !== 'user');
};

function generatePromoCodeString() {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let code = 'TSC-';
    for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    code += '-';
    for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
}

async function checkPromoUnique(code) {
    const snap = await getDoc(doc(db, "promocodes", code));
    return !snap.exists();
}

window.generatePromocode = async function() {
    const type = document.getElementById('promo-type').value;
    const value = parseInt(document.getElementById('promo-value').value);
    const scope = document.getElementById('promo-scope').value;
    const maxUses = parseInt(document.getElementById('promo-maxuses').value) || 0;
    const expiresInput = document.getElementById('promo-expires').value;
    const comment = document.getElementById('promo-comment').value.trim();
    const resultEl = document.getElementById('promo-result');
    
    const countStr = prompt('Сколько кодов сгенерировать? (1-50)', '1');
    const count = parseInt(countStr) || 1;
    if (count < 1 || count > 50) { alert('От 1 до 50'); return; }
    
    if (!value || value <= 0) { alert('Введите количество наград'); return; }
    
    let boundUid = '';
    let boundToken = '';
    
    if (scope === 'user') {
        boundToken = document.getElementById('promo-token-input').value.trim();
        if (!boundToken) { alert('Введите TSC-Token пользователя'); return; }
        // Ищем юзера по токену
        const q = query(collection(db, "users"), where("tscToken", "==", boundToken));
        const snap = await getDocs(q);
        if (snap.empty) { alert('Пользователь с таким токеном не найден'); return; }
        boundUid = snap.docs[0].id;
    } else if (scope === 'admin') {
        boundUid = auth.currentUser.uid;
        boundToken = localStorage.getItem('tsc_token') || '';
    }
    
    const expiresAt = expiresInput ? new Date(expiresInput).toISOString() : null;
    
    resultEl.innerHTML = '<p style="color:var(--neon-cyan);">Генерация...</p>';
    
    const generated = [];
    
    for (let i = 0; i < count; i++) {
        let code = '';
        let attempts = 0;
        while (attempts < 5) {
            code = generatePromoCodeString();
            if (await checkPromoUnique(code)) break;
            attempts++;
        }
        if (attempts >= 5) { alert('Не удалось сгенерировать уникальный код, попробуйте ещё'); break; }
        
        try {
            await setDoc(doc(db, "promocodes", code), {
                code: code,
                type: type,
                value: value,
                scope: scope,
                boundToUid: boundUid,
                boundToToken: boundToken,
                maxUses: maxUses,
                usedCount: 0,
                expiresAt: expiresAt,
                active: true,
                usedBy: [],
                createdBy: auth.currentUser.uid,
                createdAt: serverTimestamp(),
                comment: comment
            });
            generated.push(code);
        } catch(e) { console.error(e); }
    }
    
    if (generated.length > 0) {
        resultEl.innerHTML = `
            <div class="promo-result-box">
                <p style="margin-bottom:0.6rem;">✅ Сгенерировано ${generated.length} код(ов):</p>
                ${generated.map(c => `
                    <div class="promo-result-code">${c}</div>
                `).join('')}
                <button class="btn-small" onclick="copyPromoText('${generated.join(',')}')">📋 Копировать все</button>
            </div>
        `;
        loadPromocodes();
    } else {
        resultEl.innerHTML = '<p style="color:var(--neon-red);">Не удалось создать коды.</p>';
    }
};

window.copyPromoText = function(text) {
    navigator.clipboard.writeText(text).then(() => {
        showToast('approved', 'Скопировано', 'Промокоды в буфере обмена.');
    }).catch(() => alert('Не удалось скопировать: ' + text));
};

async function loadPromocodes() {
    const list = document.getElementById('promo-list');
    if (!list) return;
    
    try {
        const snap = await getDocs(collection(db, "promocodes"));
        const codes = [];
        snap.forEach(d => codes.push({ id: d.id, ...d.data() }));
        codes.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        
        if (!codes.length) {
            list.innerHTML = '<p class="profile-empty">Промокодов пока нет.</p>';
            return;
        }
        
        list.innerHTML = codes.slice(0, 50).map(p => {
            const scopeLabel = p.scope === 'global' ? '🌍 Общий' : p.scope === 'user' ? '👤 Для юзера' : '👑 Для себя';
            const typeLabel = p.type === 'crystals' ? '💎' : '🪙';
            const expiresStr = p.expiresAt ? formatDateTime(p.expiresAt) : 'бессрочно';
            return `
                <div class="promo-item">
                    <div class="promo-code">${escapeHtml(p.code)}</div>
                    <div class="promo-meta">
                        <span>${typeLabel} ${p.value}</span>
                        <span>${scopeLabel}</span>
                        <span>${p.usedCount}/${p.maxUses === 0 ? '∞' : p.maxUses}</span>
                        <span>до: ${expiresStr}</span>
                    </div>
                    <div class="promo-actions">
                        <button class="btn-small" onclick="copyPromoText('${escapeHtml(p.code)}')">📋 Копировать</button>
                        <button class="btn-small" onclick="togglePromoActive('${p.id}', ${p.active})" style="border-color:${p.active ? 'var(--neon-red)' : 'var(--neon-green)'};color:${p.active ? 'var(--neon-red)' : '#6effa0'};">
                            ${p.active ? '🛑 Деактивировать' : '✅ Активировать'}
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    } catch(e) {
        console.error(e);
        list.innerHTML = `<p class="profile-empty">Ошибка: ${escapeHtml(e.message)}</p>`;
    }
}

window.togglePromoActive = async function(id, currentActive) {
    try {
        await updateDoc(doc(db, "promocodes", id), { active: !currentActive });
        loadPromocodes();
    } catch(e) { alert('Ошибка: ' + e.message); }
};

// --- Массовые уведомления ---
window.sendMassNotification = async function() {
    const title = document.getElementById('notif-title-input').value.trim();
    const text = document.getElementById('notif-text-input').value.trim();
    const resultEl = document.getElementById('notif-send-result');
    
    if (!title || !text) { alert('Заполните заголовок и текст.'); return; }
    
    try {
        // Создаём объявление
        await addDoc(collection(db, "announcements"), {
            title: title,
            text: text,
            active: true,
            dismissedBy: [],
            createdAt: serverTimestamp()
        });
        
        // Создаём личные уведомления для всех юзеров
        const usersSnap = await getDocs(collection(db, "users"));
        let sent = 0;
        for (const userDoc of usersSnap.docs) {
            try {
                await addDoc(collection(db, "notifications"), {
                    uid: userDoc.id,
                    type: 'announcement',
                    title: title,
                    text: text,
                    read: false,
                    createdAt: serverTimestamp()
                });
                sent++;
            } catch(e) { console.error(e); }
        }
        
        resultEl.innerHTML = `<div class="promo-result-box" style="border-color:var(--neon-magenta);background:rgba(255,0,170,0.08);color:var(--neon-magenta);">✅ Отправлено ${sent} пользователям.</div>`;
        document.getElementById('notif-title-input').value = '';
        document.getElementById('notif-text-input').value = '';
    } catch(e) {
        resultEl.innerHTML = `<p style="color:var(--neon-red);">Ошибка: ${escapeHtml(e.message)}</p>`;
    }
};

// --- Настройки ---
window.togglePurchasesFrozen = async function() {
    const checked = document.getElementById('frozen-purchases-toggle').checked;
    const statusEl = document.getElementById('settings-status');
    try {
        const ref = doc(db, "settings", "global");
        const snap = await getDoc(ref);
        if (snap.exists()) {
            await updateDoc(ref, { purchasesFrozen: checked });
        } else {
            await setDoc(ref, { purchasesFrozen: checked });
        }
        if (statusEl) statusEl.textContent = checked ? '🛑 Покупки заморожены' : '✅ Покупки открыты';
        loadShopStatus();
    } catch(e) {
        alert('Ошибка: ' + e.message);
        document.getElementById('frozen-purchases-toggle').checked = !checked;
    }
};

// ============================================================
// ТЕРМИНАЛ
// ============================================================
const terminal = document.getElementById('terminal');
const termInput = document.getElementById('terminal-input');
const termOutput = document.getElementById('terminal-output');
const termClose = document.getElementById('terminal-close');
let commandHistory = [], historyIndex = -1;

function isTerminalOpen() { return terminal && !terminal.classList.contains('hidden'); }
function openTerminal() { if (terminal) { terminal.classList.remove('hidden'); setTimeout(() => termInput?.focus(), 50); } }
function closeTerminal() { if (terminal) terminal.classList.add('hidden'); }

document.addEventListener('keydown', e => {
    if ((e.key === '~' || e.key === '`') && !isTerminalOpen()) { e.preventDefault(); openTerminal(); }
    if (e.key === 'Escape') {
        if (isTerminalOpen()) closeTerminal();
        if (downloadModal && !downloadModal.classList.contains('hidden')) closeDownloadModal();
        const pm = document.getElementById('profile-modal');
        if (pm && !pm.classList.contains('hidden')) closeProfileModal();
        const am = document.getElementById('admin-modal');
        if (am && !am.classList.contains('hidden')) closeAdminPanel();
        const dm = document.getElementById('dossier-modal');
        if (dm && !dm.classList.contains('hidden')) closeDossierModal();
    }
});

if (termClose) {
    termClose.addEventListener('click', closeTerminal);
    termInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
            const cmd = termInput.value.trim();
            if (cmd) {
                commandHistory.push(cmd);
                historyIndex = commandHistory.length;
                printLine('<span class="term-prompt">&gt;</span> ' + escapeHtml(cmd));
                handleCommand(cmd);
            }
            termInput.value = '';
        }
        if (e.key === 'ArrowUp') { e.preventDefault(); if (historyIndex > 0) { historyIndex--; termInput.value = commandHistory[historyIndex]; } }
        if (e.key === 'ArrowDown') { e.preventDefault(); if (historyIndex < commandHistory.length - 1) { historyIndex++; termInput.value = commandHistory[historyIndex]; } else { historyIndex = commandHistory.length; termInput.value = ''; } }
    });
}

function printLine(html) {
    const p = document.createElement('p');
    p.className = 'term-line'; p.innerHTML = html;
    termOutput.appendChild(p);
    termOutput.scrollTop = termOutput.scrollHeight;
}

const commands = {
    help: () => {
        printLine('<span class="term-dim">Доступные команды:</span>');
        printLine('  <span class="term-cmd">about</span> — об игре');
        printLine('  <span class="term-cmd">status</span> — статус проекта');
        printLine('  <span class="term-cmd">clear</span> — очистить');
        printLine('  <span class="term-cmd">exit</span> — закрыть');
    },
    about: () => { printLine('THE SILENT CHAT'); printLine('Хакерский триллер в неоновом нуаре.'); },
    status: () => {
        printLine('<span class="term-dim">Проверка систем...</span>');
        setTimeout(() => printLine('  [OK] Движок: <span class="term-success">Godot 4</span>'), 200);
        setTimeout(() => printLine('  [OK] Платформа: <span class="term-success">Android / Web</span>'), 400);
        setTimeout(() => printLine('  [..] Релиз: <span class="term-cmd">Эпизод 1 готов</span>'), 600);
    },
    clear: () => { termOutput.innerHTML = ''; },
    exit: () => { closeTerminal(); }
};
function handleCommand(raw) {
    const cmd = raw.toLowerCase().trim();
    if (commands[cmd]) { commands[cmd](); return; }
    printLine('<span class="term-error">command not found: ' + escapeHtml(cmd) + '</span>');
}
document.addEventListener('click', () => { if (isTerminalOpen()) termInput.focus(); });

// ============================================================
// ИНИЦИАЛИЗАЦИЯ ПРИ ЗАГРУЗКЕ (доп. действия)
// ============================================================
window.addEventListener('load', () => {
    // Добавляем первую соцсеть для блогера при старте
    setTimeout(() => {
        if (document.getElementById('blogger-socials-list')?.children.length === 0) {
            addBloggerSocial();
        }
    }, 1000);
    // ============================================================
// АВТОЗАПОЛНЕНИЕ ДОСЬЕ (Запустить 1 раз)
// ============================================================
window.autoFillDossiers = async function() {
    if (!window.isAdmin) { alert("Только для админа!"); return; }
    
    const characters = [
        { id: "player", name: "Данил", order: 1, status: "alive", unlockAfter: "episode_1" },
        { id: "dima", name: "Дима", order: 2, status: "dead", unlockAfter: "episode_1" },
        { id: "mark", name: "Марк", order: 3, status: "alive", unlockAfter: "episode_1" },
        { id: "denis", name: "Денис", order: 4, status: "alive", unlockAfter: "episode_1" },
        { id: "vlad", name: "Влад", order: 5, status: "alive", unlockAfter: "episode_1" },
        { id: "petrovich", name: "Александр Петрович", order: 6, status: "alive", unlockAfter: "episode_1" },
        { id: "vika", name: "Вика", order: 7, status: "missing", unlockAfter: "episode_1" },
        { id: "doctor", name: "Доктор Кувалдович", order: 8, status: "alive", unlockAfter: "episode_1" },
        { id: "boris", name: "Следователь Борис", order: 9, status: "alive", unlockAfter: "episode_1" },
        { id: "anonym", name: "Аноним", order: 10, status: "alive", unlockAfter: "episode_1" },
        { id: "eva", name: "Ева", order: 11, status: "alive", unlockAfter: "episode_1" },
        { id: "innostranets", name: "Иностранец", order: 12, status: "alive", unlockAfter: "episode_1" },
        { id: "varya", name: "Варя", order: 13, status: "missing", unlockAfter: "episode_1" },
        { id: "mama", name: "Мама (Елена)", order: 14, status: "dead", unlockAfter: "episode_1" },
        { id: "gretman", name: "Gretman", order: 15, status: "alive", unlockAfter: "episode_1" },
        { id: "kukolnik", name: "Кукольник", order: 16, status: "dead", unlockAfter: "episode_2" },
        { id: "hirurg", name: "Хирург", order: 17, status: "dead", unlockAfter: "episode_2" },
        { id: "forest_man", name: "Человек из леса", order: 18, status: "dead", unlockAfter: "episode_2" }
    ];

    let count = 0;
    for (const char of characters) {
        try {
            await setDoc(doc(db, "dossiers", char.id), {
                id: char.id,
                name: char.name,
                order: char.order,
                status: char.status,
                unlockAfter: char.unlockAfter,
                photo: "",
                bio: "",
                quote: ""
            });
            count++;
        } catch(e) { console.error("Ошибка с " + char.id, e); }
    }
    alert(`Успешно добавлено ${count} персонажей! Обнови страницу.`);
};
});
