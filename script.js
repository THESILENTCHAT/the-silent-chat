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
    addDoc, collection, query, where, getDocs, serverTimestamp, orderBy, increment 
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
window.lastKnownStatuses = {};
window.notifPollInterval = null;
window.isAdmin = false;
window.currentDossierFilter = 'all';
window.allTeamMembers = []; // Сюда собираем всех блогеров, тестеров и ОБТ

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
window.openDownloadModal = function() {
    document.getElementById('download-modal').classList.remove('hidden');
};
window.closeDownloadModal = function() {
    document.getElementById('download-modal').classList.add('hidden');
};

// ============================================================
// ОПТИМИЗИРОВАННАЯ МАТРИЦА
// ============================================================
const canvas = document.getElementById('matrix');
if (canvas && window.innerWidth > 768) {
    const ctx = canvas.getContext('2d');
    let width, height, columns, drops;
    const fontSize = 16;
    const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ@#$%&*+=<>/\\';
    let lastTime = 0;
    const fps = 30; 

    function initMatrix() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
        columns = Math.floor(width / fontSize);
        drops = new Array(columns).fill(1);
    }

    function drawMatrix(time) {
        requestAnimationFrame(drawMatrix);
        if (time - lastTime < 1000 / fps) return;
        lastTime = time;

        ctx.fillStyle = 'rgba(10,10,15,0.08)';
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
    requestAnimationFrame(drawMatrix);
} else if (canvas) {
    canvas.style.display = 'none';
}

// ============================================================
// ПОЯВЛЕНИЕ СЕКЦИЙ И АНИМАЦИИ
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

document.querySelectorAll('.tilt').forEach(el => {
    el.addEventListener('mousemove', e => {
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const cx = rect.width / 2, cy = rect.height / 2;
        el.style.transform = `perspective(900px) rotateX(${(y-cy)/cy*8}deg) rotateY(${(cx-x)/cx*8}deg) translateZ(8px)`;
    });
    el.addEventListener('mouseleave', () => el.style.transform = '');
});

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
            span.className = log.c; span.textContent = log.t;
            p.appendChild(span); term.appendChild(p);
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
        fill.style.width = progress + '%'; txt.textContent = Math.floor(progress) + '%';
        if (progress >= 100) {
            clearInterval(progInterval);
            setTimeout(() => { if (!introDone) finishIntro(); }, 500);
        }
    }, 130);
    introTimers.push(progInterval);
}

function finishIntro() {
    introDone = true;
    document.getElementById('intro-overlay').classList.add('fade-out');
    setTimeout(() => {
        document.getElementById('intro-overlay').classList.add('hidden');
        document.getElementById('auth-overlay').classList.remove('hidden');
    }, 700);
}

window.skipIntro = function() {
    introTimers.forEach(t => { clearTimeout(t); clearInterval(t); });
    finishIntro();
};

// ============================================================
// АВТОРИЗАЦИЯ И АККАУНТ
// ============================================================
window.switchAuthTab = function(tab) {
    document.getElementById('tab-login')?.classList.toggle('active', tab === 'login');
    document.getElementById('tab-register')?.classList.toggle('active', tab === 'register');
    ['login', 'register', 'token'].forEach(p => document.getElementById(`auth-${p}`)?.classList.add('hidden'));
    document.getElementById(`auth-${tab}`)?.classList.remove('hidden');
};

function showError(el, box, msg) {
    if (!el) return;
    el.textContent = msg;
    if (box) { box.classList.remove('shake'); void box.offsetWidth; box.classList.add('shake'); }
    setTimeout(() => el.textContent = '', 3200);
}

window.copyToken = function(elementId) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const token = el.textContent.trim();
    if (!token || token === 'TSC-XXXX-XXXX') return;
    navigator.clipboard.writeText(token).then(() => {
        showToast('approved', 'Скопировано', 'Токен в буфере обмена. Никому не передавайте!');
    }).catch(() => alert('Не удалось скопировать. Ваш токен: ' + token));
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
    const btn = document.getElementById('reg-submit-btn');

    if (btn.disabled) return;
    if (!email) return showError(err, box, "Введите Email.");
    if (!user.startsWith('@') || user.length < 3) return showError(err, box, "Юзернейм должен начинаться с @.");
    if (pass.length < 6) return showError(err, box, "Пароль должен быть не менее 6 символов.");
    if (pass !== confirmPass) return showError(err, box, "Пароли не совпадают.");

    btn.disabled = true; btn.textContent = 'ЗАГРУЗКА...';

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        const firebaseUser = userCredential.user;
        
        const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
        let t1 = '', t2 = '';
        for (let i = 0; i < 4; i++) t1 += chars.charAt(Math.floor(Math.random() * chars.length));
        for (let i = 0; i < 4; i++) t2 += chars.charAt(Math.floor(Math.random() * chars.length));
        const token = `TSC-${t1}-${t2}`;

        await setDoc(doc(db, "users", firebaseUser.uid), {
            email, username: user, name, age, gender, tscToken: token,
            role: "player", isBlogger: false, isOBT: false, isTester: false,
            applicationsBlocked: false, blockReason: "", roleFrozen: false, roleFrozenReason: "",
            unlockedDossiers: ["player"], dossierStatuses: {}, crystals: 0, coins: 0,
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
        
        const tokenPanel = document.getElementById('auth-token');
        tokenPanel.classList.remove('hidden');
        
        if (document.activeElement) document.activeElement.blur();
        setTimeout(() => { tokenPanel.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 300);

    } catch (error) {
        if (error.code === 'auth/email-already-in-use') showError(err, box, "Этот Email уже зарегистрирован.");
        else showError(err, box, "Ошибка: " + error.message);
    } finally {
        btn.disabled = false; btn.textContent = 'ПРОДОЛЖИТЬ';
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
        const docSnap = await getDoc(doc(db, "users", userCredential.user.uid));

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
        if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') showError(err, box, "Неверный Email или пароль.");
        else showError(err, box, "Ошибка: " + error.message);
    }
};

window.logoutUser = async function() {
    try {
        if (window.notifPollInterval) { clearInterval(window.notifPollInterval); window.notifPollInterval = null; }
        await signOut(auth);
        localStorage.clear();
        location.reload();
    } catch (e) { console.error(e); }
};

window.deleteAccount = async function() {
    if (!confirm("Ты уверен, что хочешь УДАЛИТЬ аккаунт? Это действие нельзя отменить. Твой токен, заявки и прогресс сгорят.")) return;
    if (!confirm("Точно-точно? Лучше подумай еще раз.")) return;
    
    try {
        const user = auth.currentUser;
        if (!user) return;
        await deleteDoc(doc(db, "users", user.uid));
        await deleteUser(user);
        localStorage.clear();
        alert("Аккаунт успешно удален. Прощай, оператор.");
        location.reload();
    } catch (e) {
        if (e.code === 'auth/requires-recent-login') alert("Для удаления аккаунта нужно заново войти в систему (в целях безопасности). Выйди и зайди снова, а потом жми удалить.");
        else alert("Ошибка при удалении: " + e.message);
    }
};

window.changePassword = async function() {
    const newPass = prompt("Введи новый пароль (не менее 6 символов):");
    if (!newPass) return;
    if (newPass.length < 6) return alert("Пароль слишком короткий!");
    try {
        await updatePassword(auth.currentUser, newPass);
        alert("✅ Пароль успешно изменен!");
    } catch (e) {
        if (e.code === 'auth/requires-recent-login') alert("Для смены пароля нужно заново войти в систему. Выйди и зайди, потом поменяй.");
        else alert("Ошибка: " + e.message);
    }
};

window.changeToken = async function() {
    if (!confirm("Сменить токен? Старый токен перестанет работать, и игра потребует новый.")) return;
    try {
        const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let t1 = '', t2 = '';
        for (let i = 0; i < 4; i++) t1 += chars.charAt(Math.floor(Math.random() * chars.length));
        for (let i = 0; i < 4; i++) t2 += chars.charAt(Math.floor(Math.random() * chars.length));
        const newToken = `TSC-${t1}-${t2}`;
        
        await updateDoc(doc(db, "users", auth.currentUser.uid), { tscToken: newToken });
        localStorage.setItem('tsc_token', newToken);
        if (window.currentUserData) window.currentUserData.tscToken = newToken;
        
        renderTokenSection();
        alert("✅ Токен изменен!\n\nТвой новый токен: " + newToken);
    } catch(e) { alert("Ошибка: " + e.message); }
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
    for (let i = 0; i < numMain; i++) cracks.push(makeCrack(cx, cy, (Math.PI * 2 / numMain) * i + Math.random() * 0.3, 0));

    function makeCrack(x, y, angle, depth) {
        const points = [{x, y}]; let px = x, py = y, a = angle;
        const segs = 5 + Math.floor(Math.random() * 4);
        for (let i = 0; i < segs; i++) {
            a += (Math.random() - 0.5) * 0.6;
            const len = 40 + Math.random() * 80;
            px += Math.cos(a) * len; py += Math.sin(a) * len;
            points.push({x: px, y: py});
            if (depth < 1 && Math.random() < 0.35) cracks.push(makeCrack(px, py, a + (Math.random() - 0.5) * 1.2, depth + 1));
        }
        return { points };
    }

    let start = performance.now();
    function draw(now) {
        const t = Math.min(1, (now - start) / 1100);
        ctx.clearRect(0, 0, W, H);
        ctx.strokeStyle = 'rgba(0,240,255,0.95)'; ctx.lineWidth = 2;
        ctx.shadowBlur = 12; ctx.shadowColor = '#00f0ff';
        cracks.forEach(c => {
            const total = c.points.length - 1;
            const drawUpTo = Math.floor(total * t);
            ctx.beginPath();
            c.points.forEach((p, i) => {
                if (i > drawUpTo) return;
                if (i === 0) ctx.moveTo(p.x, p.y); else ctx.lineTo(p.x, p.y);
            });
            ctx.stroke();
        });
        if (t < 1) requestAnimationFrame(draw);
        else {
            flash.classList.add('on'); btext.classList.add('on');
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
    renderTokenSection();
    loadDossiers();
    loadTeam(); // <--- Загружаем команду (блогеры, ОБТ, тестеры)
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

async function loadUserData() {
    const user = auth.currentUser;
    if (!user) return null;
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists()) {
        window.currentUserData = snap.data();
        window.isAdmin = window.currentUserData.role === 'admin';
        return window.currentUserData;
    }
}

// ============================================================
// СЕКЦИЯ С ТОКЕНОМ И ПРОМОКОДОМ
// ============================================================
window.renderTokenSection = function() {
    const box = document.getElementById('token-box');
    const err = document.getElementById('token-error');
    const display = document.getElementById('my-token-display');
    if (!box || !err || !display) return;

    const token = window.currentUserData?.tscToken;
    if (token) {
        display.textContent = token;
        box.classList.remove('hidden'); err.classList.add('hidden');
    } else {
        box.classList.add('hidden'); err.classList.remove('hidden');
    }
};

window.redeemPromo = async function() {
    const input = document.getElementById('promo-input');
    const status = document.getElementById('promo-status');
    const code = input.value.trim().toUpperCase();
    
    if (!code) return alert("Введи промокод!");
    if (!auth.currentUser) return alert("Сначала авторизуйся!");
    
    status.style.color = "var(--neon-yellow)";
    status.textContent = "Проверка...";
    
    try {
        const promoRef = doc(db, "promocodes", code);
        const promoSnap = await getDoc(promoRef);
        
        if (!promoSnap.exists()) {
            status.style.color = "var(--neon-red)";
            status.textContent = "❌ Такого промокода не существует.";
            return;
        }
        
        const promo = promoSnap.data();
        
        if (!promo.active) {
            status.style.color = "var(--neon-red)"; status.textContent = "❌ Промокод деактивирован."; return;
        }
        if (promo.maxUses > 0 && promo.usedCount >= promo.maxUses) {
            status.style.color = "var(--neon-red)"; status.textContent = "❌ Лимит активаций исчерпан."; return;
        }
        if (promo.expiresAt && new Date() > new Date(promo.expiresAt)) {
            status.style.color = "var(--neon-red)"; status.textContent = "❌ Срок действия истек."; return;
        }
        
        if (promo.usedBy && promo.usedBy.includes(auth.currentUser.uid)) {
            status.style.color = "var(--neon-red)"; status.textContent = "❌ Ты уже активировал этот промокод."; return;
        }
        
        const userRef = doc(db, "users", auth.currentUser.uid);
        const rewardField = promo.type === 'crystals' ? 'crystals' : 'coins';
        
        await updateDoc(userRef, { [rewardField]: increment(promo.value) });
        await updateDoc(promoRef, { usedCount: increment(1), usedBy: [...(promo.usedBy || []), auth.currentUser.uid] });
        
        status.style.color = "var(--neon-green)";
        status.textContent = `✅ Успешно! Получено ${promo.value} ${promo.type === 'crystals' ? '💎 кристаллов' : '🪙 монет'}.`;
        input.value = '';
        
    } catch(e) {
        console.error(e);
        status.style.color = "var(--neon-red)";
        status.textContent = "❌ Ошибка: " + e.message;
    }
};

// ============================================================
// КОМАНДА: БЛОГЕРЫ, ОБТ, ТЕСТЕРЫ
// ============================================================
async function loadTeam() {
    try {
        // Загружаем всех одобренных
        const q = query(collection(db, "applications"), where("status", "==", "approved"));
        const snap = await getDocs(q);
        
        window.allTeamMembers = []; // Сбрасываем кэш
        
        const bloggers = [];
        const obt = [];
        const testers = [];
        
        snap.forEach(doc => {
            const data = { id: doc.id, ...doc.data() };
            window.allTeamMembers.push(data); // Сохраняем всех в массив для модалки
            
            if (data.type === 'blogger') bloggers.push(data);
            else if (data.type === 'obt') obt.push(data);
            else if (data.type === 'tester') testers.push(data);
        });
        
        renderTeamGrid('bloggers-grid', bloggers, 'blogger');
        renderTeamGrid('obt-grid', obt, 'obt');
        renderTeamGrid('testers-grid', testers, 'tester');
        
    } catch(e) {
        console.error("Ошибка загрузки команды:", e);
    }
}

function renderTeamGrid(gridId, members, type) {
    const grid = document.getElementById(gridId);
    if (!grid) return;
    
    if (!members.length) {
        grid.innerHTML = `<p class="profile-empty">Пока никого нет. Стань первым!</p>`;
        return;
    }
    
    grid.innerHTML = members.map(m => {
        const initial = (m.realName || '?').trim().charAt(0).toUpperCase();
        const tgRaw = (m.tgUsername || '').replace('@', '').trim();
        
        // Собираем соцсети (если есть)
        let socialsHtml = '';
        if (m.socials && m.socials.length > 0) {
            socialsHtml = m.socials.map(s => {
                if (!s.url) return '';
                return `<a href="${escapeHtml(s.url)}" target="_blank" rel="noopener" class="blogger-social-btn" onclick="event.stopPropagation();">${escapeHtml(s.platform)}</a>`;
            }).join('');
        }
        
        const tgLink = tgRaw ? `<a href="https://t.me/${escapeHtml(tgRaw)}" target="_blank" rel="noopener" class="blogger-social-btn" onclick="event.stopPropagation();">✈️ TG</a>` : '';
        
        return `
            <div class="blogger-card" onclick="openTeamProfile('${m.id}')">
                <div class="blogger-avatar">${initial}</div>
                <h3 class="blogger-name">${escapeHtml(m.realName || 'Неизвестный')}</h3>
                <p class="blogger-tg">${tgRaw ? '@' + escapeHtml(tgRaw) : 'TSC Creator'}</p>
                <div class="blogger-socials">${socialsHtml}${tgLink}</div>
            </div>
        `;
    }).join('');
}

// ============================================================
// МОДАЛКА ПРОФИЛЯ УЧАСТНИКА КОМАНДЫ
// ============================================================
window.openTeamProfile = function(appId) {
    const member = window.allTeamMembers.find(m => m.id === appId);
    if (!member) return;

    // Определяем бейдж роли
    let roleBadge = '';
    let roleText = '';
    if (member.type === 'blogger') { roleBadge = '⭐ БЛОГЕР'; roleText = 'blogger'; }
    else if (member.type === 'obt') { roleBadge = '🟢 ОБТ ТЕСТЕР'; roleText = 'obt'; }
    else if (member.type === 'tester') { roleBadge = '🧪 ТЕСТЕР'; roleText = 'tester'; }

    // Собираем соцсети
    let socialsHtml = '';
    if (member.socials && member.socials.length > 0) {
        socialsHtml = member.socials.map(s => {
            if (!s.url) return '';
            return `<a href="${escapeHtml(s.url)}" target="_blank" rel="noopener" style="color: var(--neon-cyan); display: block; margin-bottom: 0.5rem;">🔗 ${escapeHtml(s.platform)}: ${escapeHtml(s.url)}</a>`;
        }).join('');
    }

    const body = document.getElementById('tester-profile-body');
    body.innerHTML = `
        <div style="text-align: center; margin-bottom: 1.5rem;">
            <div class="blogger-avatar" style="margin: 0 auto 1rem auto; width: 100px; height: 100px; font-size: 2.5rem;">${(member.realName || '?').charAt(0).toUpperCase()}</div>
            <h3 style="color: var(--neon-cyan); font-size: 1.5rem; margin-bottom: 0.5rem;">${escapeHtml(member.realName || 'Неизвестный')}</h3>
            <div class="team-badge ${roleText}">${roleBadge}</div>
        </div>
        
        <div class="team-profile-info">
            ${member.username ? `<p><strong>Юзернейм:</strong> ${escapeHtml(member.username)}</p>` : ''}
            ${member.realAge ? `<p><strong>Возраст:</strong> ${escapeHtml(member.realAge)}</p>` : ''}
            ${member.contactValue ? `<p><strong>Контакт (${escapeHtml(member.contactPlatform || 'Связь')}):</strong> ${escapeHtml(member.contactValue)}</p>` : ''}
            ${member.tgUsername ? `<p><strong>Telegram:</strong> <a href="https://t.me/${escapeHtml(member.tgUsername.replace('@', ''))}" target="_blank" style="color: var(--neon-cyan);">@${escapeHtml(member.tgUsername.replace('@', ''))}</a></p>` : ''}
            
            <!-- Информация специфичная для тестеров -->
            ${member.platform ? `<p><strong>Платформа:</strong> ${escapeHtml(member.platform)}</p>` : ''}
            ${member.testTarget ? `<p><strong>Что тестирует:</strong> ${member.testTarget === 'episode' ? 'Эпизоды' : 'Ивенты'} (${(member.testScope || []).join(', ')})</p>` : ''}
        </div>

        ${socialsHtml ? `<div class="team-profile-info"><p><strong>Соцсети:</strong></p>${socialsHtml}</div>` : ''}
    `;

    document.getElementById('tester-profile-modal').classList.remove('hidden');
};

window.closeTesterProfileModal = function(e) {
    if (e) e.stopPropagation();
    document.getElementById('tester-profile-modal').classList.add('hidden');
};

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
    document.getElementById('bell-dot')?.classList.add('hidden');
};
window.closeProfileModal = function(e) { if (e) e.stopPropagation(); document.getElementById('profile-modal').classList.add('hidden'); };

window.uploadAvatar = function(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async e => {
        const img = new Image(); img.src = e.target.result;
        img.onload = () => {
            const c = document.createElement('canvas');
            let w = img.width, h = img.height;
            if (w > h) { if (w > 250) { h *= 250 / w; w = 250; } } else { if (h > 250) { w *= 250 / h; h = 250; } }
            c.width = w; c.height = h;
            c.getContext('2d').drawImage(img, 0, 0, w, h);
            localStorage.setItem('tsc_avatar', c.toDataURL('image/jpeg', 0.8));
            updateProfileUI();
        };
    };
    reader.readAsDataURL(file);
};

window.showImagePreview = function() {
    const avatar = localStorage.getItem('tsc_avatar');
    if (avatar) { document.getElementById('preview-img').src = avatar; document.getElementById('image-preview-modal').classList.remove('hidden'); }
};
window.closeImagePreview = function() { document.getElementById('image-preview-modal').classList.add('hidden'); };

// ============================================================
// ДОСЬЕ
// ============================================================
async function loadDossiers() {
    try {
        let snap = await getDocs(query(collection(db, "dossiers"), orderBy("order", "asc")));
        window.allDossiers = [];
        snap.forEach(d => window.allDossiers.push({ id: d.id, ...d.data() }));
        renderDossiers();
    } catch(e) {
        const snap = await getDocs(collection(db, "dossiers"));
        window.allDossiers = [];
        snap.forEach(d => window.allDossiers.push({ id: d.id, ...d.data() }));
        window.allDossiers.sort((a, b) => (a.order || 99) - (b.order || 99));
        renderDossiers();
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
    const lockedToShow = locked.slice(0, 2);

    const filteredOpened = opened.filter(d => {
        if (window.currentDossierFilter === 'all') return true;
        const status = personalStatuses[d.id] || d.status || 'unknown';
        return status === window.currentDossierFilter;
    });

    const toShow = [...filteredOpened, ...lockedToShow];

    if (progressEl) progressEl.textContent = `Открыто ${opened.length} из ${window.allDossiers.length}`;

    grid.innerHTML = toShow.map(d => {
        const isLocked = !unlocked.includes(d.id);
        const status = personalStatuses[d.id] || d.status || 'unknown';
        
        if (isLocked) {
            const episodeNum = (d.unlockAfter || 'episode_1').replace('episode_', '');
            return `<div class="dossier-card locked" onclick="shakeLocked(this)">
                        <div class="dossier-photo silhouette">?</div>
                        <div class="dossier-info"><div class="dossier-name">???</div><div class="dossier-locked-hint">Узнаете в Эп. ${episodeNum}</div></div>
                    </div>`;
        }
        
        const hasPhoto = d.photo && d.photo.trim() !== '';
        const photoHtml = hasPhoto ? `<div class="dossier-photo" style="background-image:url('${escapeHtml(d.photo)}');"></div>` : `<div class="dossier-photo silhouette">👤</div>`;
        
        const isFemale = d.gender === 'female';
        let statusLabel = 'Неизвестно';
        if (status === 'alive') statusLabel = isFemale ? 'Жива' : 'Жив';
        else if (status === 'missing') statusLabel = isFemale ? 'Пропала' : 'Пропал';
        else if (status === 'dead') statusLabel = isFemale ? 'Мертва' : 'Мёртв';
        
        return `<div class="dossier-card" onclick="openDossierModal('${d.id}')">
                    ${photoHtml}
                    <div class="dossier-info">
                        <div class="dossier-name">${escapeHtml(d.name || '???')}</div>
                        <div class="dossier-status-dot ${status}"></div>
                        <span style="font-size:0.75rem;color:var(--text-dim);">${statusLabel}</span>
                    </div>
                </div>`;
    }).join('');
}

window.filterDossiers = function(filter) {
    window.currentDossierFilter = filter;
    ['all', 'alive', 'missing', 'dead'].forEach(f => {
        document.getElementById(`tab-dossier-${f}`)?.classList.toggle('active', f === filter);
    });
    renderDossiers();
};

window.shakeLocked = function(el) { el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); };

window.openDossierModal = function(id) {
    const d = window.allDossiers.find(x => x.id === id);
    if (!d) return;
    const personalStatuses = window.currentUserData?.dossierStatuses || {};
    const status = personalStatuses[id] || d.status || 'unknown';
    
    const isFemale = d.gender === 'female';
    let statusLabel = '⚪ Неизвестно';
    if (status === 'alive') statusLabel = isFemale ? '🟢 Жива' : '🟢 Жив';
    else if (status === 'missing') statusLabel = isFemale ? '🟡 Пропала' : '🟡 Пропал';
    else if (status === 'dead') statusLabel = isFemale ? '🔴 Мертва' : '🔴 Мёртв';
    
    document.getElementById('dossier-detail-body').innerHTML = `
        ${d.photo ? `<div class="dossier-detail-photo" style="background-image:url('${escapeHtml(d.photo)}');"></div>` : ''}
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
        
        ${d.fullBioUrl ? `<div class="dossier-bio-container"><a href="${escapeHtml(d.fullBioUrl)}" target="_blank" rel="noopener" class="btn-bio">📖 ПРОЧИТАТЬ ПОЛНУЮ БИОГРАФИЮ</a></div>` : ''}
    `;
    document.getElementById('dossier-modal').classList.remove('hidden');
};
window.closeDossierModal = function(e) { if (e) e.stopPropagation(); document.getElementById('dossier-modal').classList.add('hidden'); };

// ============================================================
// ЗАЯВКИ
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
    label.textContent = `Контакт (${platform})`;
    input.placeholder = platform === 'Telegram' ? '@nickname' : platform === 'Discord' ? 'username#0000' : 'Ваш контакт';
};

window.addBloggerSocial = function() {
    const list = document.getElementById('blogger-socials-list');
    if (!list || list.children.length >= 30) return;
    const div = document.createElement('div');
    div.className = 'social-row';
    div.innerHTML = `<select class="social-platform"><option value="YouTube">YouTube</option><option value="TikTok">TikTok</option><option value="Telegram">Telegram</option><option value="Twitch">Twitch</option><option value="VK">VK</option></select><input type="text" class="social-url" placeholder="Ссылка"><input type="text" class="social-audience" placeholder="Аудитория"><button type="button" class="social-remove" onclick="this.parentElement.remove()">✕</button>`;
    list.appendChild(div);
};

window.toggleObtScope = function() {
    const target = document.querySelector('input[name="obt-target"]:checked')?.value;
    document.getElementById('obt-scope-episode')?.classList.toggle('hidden', target !== 'episode');
    document.getElementById('obt-scope-event')?.classList.toggle('hidden', target !== 'event');
    if (target === 'episode') document.getElementById('obt-scope-event')?.querySelectorAll('input').forEach(cb => cb.checked = false);
    if (target === 'event') document.getElementById('obt-scope-episode')?.querySelectorAll('input').forEach(cb => cb.checked = false);
};

async function sendNotificationToBot(type, data) {
    try {
        await fetch('https://silent-bot-es3x.onrender.com/api/notify', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                type: type,
                username: localStorage.getItem('tsc_user') || '',
                tscToken: localStorage.getItem('tsc_token') || '',
                ...data
            })
        });
    } catch (e) { console.error('Ошибка при отправке в Telegram:', e); }
}

async function checkCanSubmit(type) {
    const user = auth.currentUser;
    if (!user) { showToast('rejected', 'Ошибка', 'Сначала войдите в аккаунт.'); return null; }
    if (window.currentUserData?.applicationsBlocked) { showToast('rejected', 'Заблокировано', window.currentUserData.blockReason || 'Обратитесь к админу.'); return null; }
    const pending = window.myApplications[type];
    if (pending && pending.status === 'pending') { showToast('pending', 'Уже подана', 'Заявка уже на рассмотрении.'); return null; }
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
    const subscribed = document.getElementById('blogger-subscribed').checked;
    
    const socials = [];
    document.querySelectorAll('#blogger-socials-list .social-row').forEach(row => {
        const url = row.querySelector('.social-url').value.trim();
        if (url) socials.push({ platform: row.querySelector('.social-platform').value, url, audience: row.querySelector('.social-audience').value.trim() });
    });

    if (realName.length < 3) { err.textContent = 'Введите ФИО.'; return; }
    if (!contactValue) { err.textContent = 'Введите контакт.'; return; }
    if (socials.length === 0) { err.textContent = 'Добавьте соцсеть.'; return; }
    if (!subscribed) { err.textContent = 'Подтвердите подписку.'; return; }

    err.textContent = '';
    try {
        await addDoc(collection(db, "applications"), {
            uid: user.uid, type: 'blogger', email: user.email, username: localStorage.getItem('tsc_user') || '',
            realName, realAge: age, contactPlatform, contactValue, socials,
            tgUsername: document.getElementById('blogger-tg').value.trim(),
            ttUsername: document.getElementById('blogger-tt').value.trim(),
            subscribedConfirmed: true, status: 'pending', adminComment: '', createdAt: serverTimestamp()
        });
        await loadApplicationStatus();
        
        sendNotificationToBot('blogger', { 
            realName, realAge: age, contactPlatform, contactValue, socials,
            tgUsername: document.getElementById('blogger-tg').value.trim(),
            ttUsername: document.getElementById('blogger-tt').value.trim(),
            message: document.getElementById('blogger-message').value.trim()
        });

        showToast('pending', 'Заявка отправлена', 'Ожидайте решения.');
    } catch(e) { err.textContent = 'Ошибка: ' + e.message; }
};

window.submitOBTApplication = async function() {
    const user = await checkCanSubmit('obt');
    if (!user) return;
    const err = document.getElementById('obt-error');
    const realName = document.getElementById('obt-realname').value.trim();
    const age = document.getElementById('obt-age').value.trim();
    const contactPlatform = document.getElementById('obt-contact-platform').value;
    const contactValue = document.getElementById('obt-contact-value').value.trim();
    const subscribed = document.getElementById('obt-subscribed').checked;
    const testTarget = document.querySelector('input[name="obt-target"]:checked')?.value;
    const testScope = [];
    document.querySelectorAll('.obt-scope-cb:checked').forEach(cb => testScope.push(cb.value));

    if (realName.length < 3) { err.textContent = 'Введите ФИО.'; return; }
    if (!testTarget || testScope.length === 0) { err.textContent = 'Выберите объекты теста.'; return; }
    if (!contactValue) { err.textContent = 'Введите контакт.'; return; }
    if (!subscribed) { err.textContent = 'Подтвердите подписку.'; return; }

    err.textContent = '';
    try {
        const platform = document.getElementById('obt-platform').value;
        const tgUsername = document.getElementById('obt-tg').value.trim();
        const ttUsername = document.getElementById('obt-tt').value.trim();

        await addDoc(collection(db, "applications"), {
            uid: user.uid, type: 'obt', email: user.email, username: localStorage.getItem('tsc_user') || '',
            realName, realAge: age, contactPlatform, contactValue,
            platform, testTarget, testScope,
            tgUsername, ttUsername,
            subscribedConfirmed: true, status: 'pending', adminComment: '', createdAt: serverTimestamp()
        });
        await loadApplicationStatus();
        
        sendNotificationToBot('obt', { 
            realName, realAge: age, contactPlatform, contactValue,
            platform, testTarget, testScope, tgUsername, ttUsername 
        });

        showToast('pending', 'Заявка отправлена', 'Ожидайте решения.');
    } catch(e) { err.textContent = 'Ошибка: ' + e.message; }
};

window.submitTesterApplication = async function() {
    const user = await checkCanSubmit('tester');
    if (!user) return;
    const err = document.getElementById('tester-error');
    const realName = document.getElementById('tester-realname').value.trim();
    const age = document.getElementById('tester-age').value.trim();
    const contactPlatform = document.getElementById('tester-contact-platform').value;
    const contactValue = document.getElementById('tester-contact-value').value.trim();
    const subscribed = document.getElementById('tester-subscribed').checked;

    if (realName.length < 3) { err.textContent = 'Введите ФИО.'; return; }
    if (!contactValue) { err.textContent = 'Введите контакт.'; return; }
    if (!subscribed) { err.textContent = 'Подтвердите подписку.'; return; }

    err.textContent = '';
    try {
        const platform = document.getElementById('tester-platform').value;
        const tgUsername = document.getElementById('tester-tg').value.trim();
        const ttUsername = document.getElementById('tester-tt').value.trim();

        await addDoc(collection(db, "applications"), {
            uid: user.uid, type: 'tester', email: user.email, username: localStorage.getItem('tsc_user') || '',
            realName, realAge: age, contactPlatform, contactValue,
            platform, tgUsername, ttUsername,
            subscribedConfirmed: true, status: 'pending', adminComment: '', createdAt: serverTimestamp()
        });
        await loadApplicationStatus();
        
        sendNotificationToBot('tester', { 
            realName, realAge: age, contactPlatform, contactValue,
            platform, tgUsername, ttUsername 
        });

        showToast('pending', 'Заявка отправлена', 'Ожидайте решения.');
    } catch(e) { err.textContent = 'Ошибка: ' + e.message; }
};

async function loadApplicationStatus() {
    const user = auth.currentUser;
    if (!user) return;
    const snap = await getDocs(query(collection(db, "applications"), where("uid", "==", user.uid)));
    window.myApplications = { blogger: null, obt: null, tester: null };
    snap.forEach(docSnap => {
        const data = docSnap.data();
        const existing = window.myApplications[data.type];
        if (!existing || (data.createdAt?.toMillis?.() || 0) > (existing.createdAt?.toMillis?.() || 0)) {
            window.myApplications[data.type] = { id: docSnap.id, ...data };
        }
    });
    renderApplicationStatus('blogger'); renderApplicationStatus('obt'); renderApplicationStatus('tester');
    renderProfileApps();
}

function renderApplicationStatus(type) {
    const app = window.myApplications[type];
    const formEl = document.getElementById(`app-${type}`);
    const statusEl = document.getElementById(`app-status-${type}`);
    if (!formEl || !statusEl) return;

    if (window.currentUserData?.applicationsBlocked) {
        formEl.classList.add('hidden'); statusEl.classList.remove('hidden');
        statusEl.innerHTML = `<div class="app-status-box rejected">🚫 Подача заблокирована. Причина: ${escapeHtml(window.currentUserData.blockReason)}</div>`;
        return;
    }
    
    if (!app || app.status === 'rejected' || app.status === 'revoked') {
        formEl.classList.remove('hidden');
        if (app) {
            const label = app.status === 'rejected' ? 'отклонена' : 'отозвана';
            statusEl.innerHTML = `<div class="app-status-box rejected">Заявка ${label}.${app.adminComment ? ' Причина: ' + escapeHtml(app.adminComment) : ''}</div>`;
            statusEl.classList.remove('hidden');
        } else { statusEl.classList.add('hidden'); }
        return;
    }
    
    formEl.classList.add('hidden'); statusEl.classList.remove('hidden');
    if (app.status === 'pending') {
        statusEl.innerHTML = `<div class="app-status-box pending">⏳ Заявка на рассмотрении.</div>`;
    } else if (app.status === 'approved') {
        if (type === 'blogger') statusEl.innerHTML = `<div class="app-status-box approved">✅ Одобрено! Роль БЛОГЕРА (бессрочно).</div>`;
        else {
            const t = getTimeLeft(app.expiresAt);
            statusEl.innerHTML = `<div class="app-status-box approved">✅ Одобрено! ${t?.expired ? 'Срок истёк.' : 'Активно до ' + formatDateTime(t?.date)}</div>`;
        }
    }
}

function renderProfileApps() {
    const activeC = document.getElementById('profile-apps-active');
    const historyC = document.getElementById('profile-apps-history');
    if (!activeC || !historyC) return;
    const apps = window.myApplications || {};
    const active = [], history = [];

    ['blogger', 'obt', 'tester'].forEach(type => {
        const app = apps[type]; if (!app) return;
        const typeLabel = type === 'blogger' ? 'БЛОГЕР' : type === 'obt' ? 'ОБТ' : 'ТЕСТЕР';
        const isActive = app.status === 'pending' || (app.status === 'approved' && (type === 'blogger' || !getTimeLeft(app.expiresAt)?.expired));
        if (isActive) active.push({ ...app, typeLabel }); else history.push({ ...app, typeLabel });
    });

    active.sort((a, b) => a.status === 'pending' && b.status !== 'pending' ? -1 : 1);
    activeC.innerHTML = active.length ? active.map(app => renderAppItem(app)).join('') : '<p class="profile-empty">Нет активных заявок.</p>';
    historyC.innerHTML = history.length ? history.slice(0, 20).map(app => renderAppItem(app)).join('') : '<p class="profile-empty">Пока пусто.</p>';
    document.getElementById('history-count').textContent = history.length ? `(${history.length})` : '';
}

function renderAppItem(app) {
    let badge = '', extra = '';
    if (app.status === 'pending') badge = '<span class="profile-app-status-badge pending">⏳ НА РАССМОТРЕНИИ</span>';
    else if (app.status === 'approved') {
        if (app.typeLabel === 'БЛОГЕР') { badge = '<span class="profile-app-status-badge approved">✅ ОДОБРЕНО</span>'; extra = '<div class="profile-app-expires">⚪ бессрочно</div>'; }
        else {
            const t = getTimeLeft(app.expiresAt);
            badge = t?.expired ? '<span class="profile-app-status-badge rejected">⌛ ИСТЁК</span>' : '<span class="profile-app-status-badge approved">✅ АКТИВНО</span>';
            extra = `<div class="profile-app-expires">${t?.expired ? '🔴 истёк' : (t?.color === 'yellow' ? '🟡' : '🟢') + ' до ' + formatDateTime(t?.date)}</div>`;
        }
    }
    else { badge = '<span class="profile-app-status-badge rejected">❌ ОТКЛОНЕНО</span>'; extra = app.adminComment ? `<div class="profile-app-comment">Причина: ${escapeHtml(app.adminComment)}</div>` : ''; }
    return `<div class="profile-app-item ${app.status}"><div class="profile-app-header"><span class="profile-app-type">${app.typeLabel}</span>${badge}</div>${extra}</div>`;
}

// ============================================================
// АДМИН-ПАНЕЛЬ
// ============================================================
window.openAdminPanel = function() {
    if (!window.isAdmin) return;
    document.getElementById('admin-modal').classList.remove('hidden');
    loadAdminApplications(); loadPromocodes(); loadShopStatus();
};
window.closeAdminPanel = function(e) { if (e) e.stopPropagation(); document.getElementById('admin-modal').classList.add('hidden'); };
window.switchAdminTab = function(tab) {
    ['apps', 'promo', 'notif', 'settings'].forEach(t => document.getElementById(`admin-${t}`)?.classList.toggle('hidden', t !== tab));
    document.querySelectorAll('.admin-tab').forEach((btn, i) => btn.classList.toggle('active', ['apps','promo','notif','settings'][i] === tab));
};

async function loadAdminApplications() {
    const filter = document.getElementById('admin-app-filter')?.value || 'pending';
    const list = document.getElementById('admin-app-list');
    if (!list) return;
    list.innerHTML = '<p class="profile-empty">Загрузка...</p>';
    
    try {
        let q = collection(db, "applications");
        if (filter !== 'all') {
            q = query(q, where("status", "==", filter));
        }
        
        const snap = await getDocs(q);
        const apps = [];
        snap.forEach(d => apps.push({ id: d.id, ...d.data() }));
        apps.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
        list.innerHTML = apps.length ? apps.map(renderAdminApp).join('') : '<p class="profile-empty">Заявок нет.</p>';
    } catch(e) {
        console.error("Ошибка загрузки заявок:", e);
        list.innerHTML = `<p class="profile-empty">Ошибка: ${e.message}</p>`;
    }
}

function renderAdminApp(app) {
    const typeLabel = app.type === 'blogger' ? 'БЛОГЕР' : app.type === 'obt' ? 'ОБТ' : 'ТЕСТЕР';
    let details = `<dt>ФИО</dt><dd>${escapeHtml(app.realName)}</dd><dt>Контакт</dt><dd>${escapeHtml(app.contactPlatform)}: ${escapeHtml(app.contactValue)}</dd><dt>Юзер</dt><dd>${escapeHtml(app.username)}</dd>`;
    if (app.type === 'blogger' && app.socials) details += `<dt>Соцсети</dt><dd>${app.socials.map(s => `${escapeHtml(s.platform)}: ${escapeHtml(s.url)}`).join('<br>')}</dd>`;
    if (app.adminComment) details += `<dt>Ответ</dt><dd>${escapeHtml(app.adminComment)}</dd>`;
    let actions = '';
    if (app.status === 'pending') actions = `<button class="btn-small" onclick="approveApplication('${app.id}', '${app.type}', '${app.uid}')" style="border-color:var(--neon-green);color:#6effa0;">✅ Одобрить</button><button class="btn-small" onclick="rejectApplication('${app.id}')" style="border-color:var(--neon-red);color:var(--neon-red);">❌ Отклонить</button>`;
    else if (app.status === 'approved') actions = `<button class="btn-small" onclick="revokeApplication('${app.id}', '${app.type}', '${app.uid}')" style="border-color:var(--neon-red);color:var(--neon-red);">🚫 Отозвать</button>`;
    return `<div class="admin-app-item ${app.status}"><div class="admin-app-head"><span class="admin-app-type">${typeLabel}</span></div><dl class="admin-app-details">${details}</dl><div class="admin-app-actions">${actions}</div></div>`;
}

window.approveApplication = async function(appId, type, uid) {
    let expiresAt = null;
    if (type === 'obt' || type === 'tester') {
        const dateStr = prompt('Дата окончания (ГГГГ-ММ-ДД ЧЧ:ММ):', '2026-12-31 23:59');
        if (!dateStr) return;
        expiresAt = new Date(dateStr.replace(' ', 'T')).toISOString();
    }
    const comment = prompt('Комментарий (опционально):', '') || '';
    try {
        await updateDoc(doc(db, "applications", appId), { status: 'approved', adminComment: comment, reviewedAt: serverTimestamp(), expiresAt });
        const upd = {};
        if (type === 'blogger') upd.isBlogger = true;
        else if (type === 'obt') { upd.isOBT = true; upd.obtExpiresAt = expiresAt; }
        else if (type === 'tester') { upd.isTester = true; upd.testerExpiresAt = expiresAt; }
        await updateDoc(doc(db, "users", uid), upd);
        
        await addDoc(collection(db, "notifications"), { uid, type: 'app_approved', title: '✅ Заявка одобрена', text: 'Проверьте профиль.', read: false, createdAt: serverTimestamp() });
        
        const appSnap = await getDoc(doc(db, "applications", appId));
        if (appSnap.exists() && appSnap.data().tgUsername) {
            fetch('https://silent-bot-es3x.onrender.com/api/notify_user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: appSnap.data().tgUsername, status: 'approved' })
            }).catch(e => console.log('TG user notify error:', e));
        }
        
        showToast('approved', 'Одобрено', 'Роль выдана.'); loadAdminApplications(); loadTeam();
    } catch(e) { alert(e.message); }
};

window.rejectApplication = async function(appId) {
    const comment = prompt('Причина отклонения (обязательно):', '');
    if (!comment || comment.length < 3) return alert('Причина обязательна.');
    
    const snap = await getDoc(doc(db, "applications", appId));
    await updateDoc(doc(db, "applications", appId), { status: 'rejected', adminComment: comment, reviewedAt: serverTimestamp() });
    await addDoc(collection(db, "notifications"), { uid: snap.data().uid, type: 'app_rejected', title: '❌ Заявка отклонена', text: `Причина: ${comment}`, read: false, createdAt: serverTimestamp() });
    
    if (snap.data().tgUsername) {
        fetch('https://silent-bot-es3x.onrender.com/api/notify_user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: snap.data().tgUsername, status: 'rejected', reason: comment })
        }).catch(e => console.log('TG user notify error:', e));
    }
    
    showToast('rejected', 'Отклонено', 'Заявка отклонена.'); loadAdminApplications();
};

window.revokeApplication = async function(appId, type, uid) {
    const comment = prompt('Причина отзыва (обязательно):', '');
    if (!comment || comment.length < 3) return alert('Причина обязательна.');
    await updateDoc(doc(db, "applications", appId), { status: 'revoked', adminComment: comment, revokedAt: serverTimestamp() });
    const upd = {};
    if (type === 'blogger') upd.isBlogger = false;
    else if (type === 'obt') upd.isOBT = false;
    else if (type === 'tester') upd.isTester = false;
    await updateDoc(doc(db, "users", uid), upd);
    await addDoc(collection(db, "notifications"), { uid, type: 'app_revoked', title: '🚫 Доступ отозван', text: `Причина: ${comment}`, read: false, createdAt: serverTimestamp() });
    showToast('rejected', 'Отозвано', 'Доступ забран.'); loadAdminApplications(); loadTeam();
};

window.togglePromoScope = function() { document.getElementById('promo-token-field')?.classList.toggle('hidden', document.getElementById('promo-scope').value !== 'user'); };

async function generatePromoCodeString() {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let code = 'TSC-';
    for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    code += '-';
    for (let i = 0; i < 4; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
}

window.generatePromocode = async function() {
    const type = document.getElementById('promo-type').value;
    const value = parseInt(document.getElementById('promo-value').value);
    const scope = document.getElementById('promo-scope').value;
    const maxUses = parseInt(document.getElementById('promo-maxuses').value) || 0;
    const expiresInput = document.getElementById('promo-expires').value;
    const comment = document.getElementById('promo-comment').value.trim();
    const resultEl = document.getElementById('promo-result');
    const count = parseInt(prompt('Сколько кодов сгенерировать? (1-50)', '1')) || 1;
    
    if (!value) return alert('Введите количество наград.');
    let boundUid = '', boundToken = '';
    if (scope === 'user') {
        boundToken = document.getElementById('promo-token-input').value.trim();
        const snap = await getDocs(query(collection(db, "users"), where("tscToken", "==", boundToken)));
        if (snap.empty) return alert('Юзер с таким токеном не найден.');
        boundUid = snap.docs[0].id;
    } else if (scope === 'admin') {
        boundUid = auth.currentUser.uid; boundToken = localStorage.getItem('tsc_token');
    }
    const expiresAt = expiresInput ? new Date(expiresInput).toISOString() : null;
    resultEl.innerHTML = '<p style="color:var(--neon-cyan);">Генерация...</p>';
    const generated = [];

    for (let i = 0; i < count; i++) {
        let code = '', attempts = 0;
        while (attempts < 5) { code = await generatePromoCodeString(); if (!(await getDoc(doc(db, "promocodes", code))).exists()) break; attempts++; }
        await setDoc(doc(db, "promocodes", code), { code, type, value, scope, boundToUid: boundUid, boundToToken: boundToken, maxUses, usedCount: 0, expiresAt, active: true, usedBy: [], createdBy: auth.currentUser.uid, createdAt: serverTimestamp(), comment });
        generated.push(code);
    }
    resultEl.innerHTML = `<div class="promo-result-box"><p>✅ Сгенерировано:</p>${generated.map(c => `<div class="promo-result-code">${c}</div>`).join('')}<button class="btn-small" onclick="copyText('${generated.join(',')}')">📋 Копировать все</button></div>`;
    loadPromocodes();
};

window.copyText = function(text) { navigator.clipboard.writeText(text).then(() => showToast('approved', 'Скопировано', 'В буфере обмена.')); };

async function loadPromocodes() {
    const list = document.getElementById('promo-list'); if (!list) return;
    const snap = await getDocs(collection(db, "promocodes"));
    const codes = []; snap.forEach(d => codes.push({ id: d.id, ...d.data() }));
    codes.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
    list.innerHTML = codes.length ? codes.slice(0, 50).map(p => `
        <div class="promo-item"><div class="promo-code">${escapeHtml(p.code)}</div>
        <div class="promo-meta"><span>${p.type === 'crystals' ? '💎' : '🪙'} ${p.value}</span><span>${p.scope === 'global' ? '🌍' : p.scope === 'user' ? '👤' : '👑'}</span><span>${p.usedCount}/${p.maxUses === 0 ? '∞' : p.maxUses}</span></div>
        <div class="promo-actions"><button class="btn-small" onclick="copyText('${p.code}')">📋 Копировать</button></div></div>
    `).join('') : '<p class="profile-empty">Пусто.</p>';
}

window.sendMassNotification = async function() {
    const title = document.getElementById('notif-title-input').value.trim();
    const text = document.getElementById('notif-text-input').value.trim();
    const resultEl = document.getElementById('notif-send-result');
    if (!title || !text) return alert('Заполните поля.');
    await addDoc(collection(db, "announcements"), { title, text, active: true, dismissedBy: [], createdAt: serverTimestamp() });
    const usersSnap = await getDocs(collection(db, "users"));
    for (const u of usersSnap.docs) await addDoc(collection(db, "notifications"), { uid: u.id, type: 'announcement', title, text, read: false, createdAt: serverTimestamp() });
    resultEl.innerHTML = `<div class="promo-result-box" style="border-color:var(--neon-magenta);color:var(--neon-magenta);">✅ Отправлено ${usersSnap.size} пользователям.</div>`;
    document.getElementById('notif-title-input').value = ''; document.getElementById('notif-text-input').value = '';
};

async function loadShopStatus() {
    const snap = await getDoc(doc(db, "settings", "global"));
    if (snap.exists()) {
        const frozen = snap.data().purchasesFrozen;
        document.getElementById('shop-frozen-notice')?.classList.toggle('hidden', !frozen);
        const btn = document.getElementById('shop-btn'); if (btn) btn.style.opacity = frozen ? '0.5' : '1', btn.style.pointerEvents = frozen ? 'none' : 'auto';
        document.getElementById('frozen-purchases-toggle').checked = frozen;
    }
}
window.togglePurchasesFrozen = async function() {
    const checked = document.getElementById('frozen-purchases-toggle').checked;
    await setDoc(doc(db, "settings", "global"), { purchasesFrozen: checked }, { merge: true });
    loadShopStatus();
};

// ============================================================
// КОЛОКОЛЬЧИК / УВЕДОМЛЕНИЯ
// ============================================================
window.openNotifPanel = async function() { document.getElementById('notif-panel').classList.remove('hidden'); await loadNotifications(); renderNotifications(); document.getElementById('bell-dot')?.classList.add('hidden'); };
window.closeNotifPanel = function() { document.getElementById('notif-panel').classList.add('hidden'); };
async function loadNotifications() {
    const user = auth.currentUser; if (!user) return;
    const snap = await getDocs(query(collection(db, "notifications"), where("uid", "==", user.uid)));
    window.myNotifications = []; snap.forEach(d => window.myNotifications.push({ id: d.id, ...d.data() }));
    window.myNotifications.sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0));
}
function renderNotifications() {
    const list = document.getElementById('notif-list'); if (!list) return;
    list.innerHTML = window.myNotifications.length ? window.myNotifications.map(n => `
        <div class="notif-item ${n.read ? '' : 'unread'}" onclick="markNotifRead('${n.id}')">
            <div class="notif-item-title">${escapeHtml(n.title)}</div><div>${escapeHtml(n.text)}</div><div class="notif-item-time">${formatDateTime(n.createdAt)}</div>
        </div>`).join('') : '<p class="profile-empty">Пока тихо.</p>';
}
window.markNotifRead = async function(id) { await updateDoc(doc(db, "notifications", id), { read: true }); await loadNotifications(); renderNotifications(); };
window.markAllNotifRead = async function() { for (const n of window.myNotifications) if (!n.read) await updateDoc(doc(db, "notifications", n.id), { read: true }); await loadNotifications(); renderNotifications(); };

// ============================================================
// TOAST И ОПРОС СТАТУСОВ
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
    try { window.lastKnownStatuses = JSON.parse(localStorage.getItem('tsc_last_statuses') || '{}'); } catch(e) {}
    setInterval(async () => {
        const user = auth.currentUser; if (!user) return;
        const snap = await getDocs(query(collection(db, "applications"), where("uid", "==", user.uid)));
        snap.forEach(d => {
            const data = d.data(); const last = window.lastKnownStatuses[d.id];
            if (last && last !== data.status) {
                if (data.status === 'approved') showToast('approved', 'Заявка одобрена!', 'Роль выдана.');
                else if (data.status === 'rejected' || data.status === 'revoked') showToast('rejected', 'Заявка отклонена', data.adminComment || '');
            }
            window.lastKnownStatuses[d.id] = data.status;
        });
        localStorage.setItem('tsc_last_statuses', JSON.stringify(window.lastKnownStatuses));
        await loadUserData(); renderProfileRoles();
    }, 15000);
}

// ============================================================
// АВТОЗАПОЛНЕНИЕ ДОСЬЕ
// ============================================================
window.autoFillDossiers = async function() {
    if (!window.isAdmin) return alert("Только для админа!");
    const characters = [
        { id: "player", name: "Данил", order: 1, status: "alive", unlockAfter: "episode_1" },
        { id: "dima", name: "Дима", order: 2, status: "dead", unlockAfter: "episode_1" },
        { id: "mark", name: "Марк", order: 3, status: "alive", unlockAfter: "episode_1" },
        { id: "denis", name: "Денис", order: 4, status: "alive", unlockAfter: "episode_1" },
        { id: "vlad", name: "Влад", order: 5, status: "alive", unlockAfter: "episode_1" },
        { id: "petrovich", name: "Александр Петрович", order: 6, status: "alive", unlockAfter: "episode_1" },
        { id: "vika", name: "Вика", order: 7, status: "missing", unlockAfter: "episode_1", gender: "female" },
        { id: "doctor", name: "Доктор Кувалдович", order: 8, status: "alive", unlockAfter: "episode_1" },
        { id: "boris", name: "Следователь Борис", order: 9, status: "alive", unlockAfter: "episode_1" },
        { id: "anonym", name: "Аноним", order: 10, status: "alive", unlockAfter: "episode_1" },
        { id: "eva", name: "Ева", order: 11, status: "alive", unlockAfter: "episode_1", gender: "female" },
        { id: "innostranets", name: "Иностранец", order: 12, status: "alive", unlockAfter: "episode_1" },
        { id: "varya", name: "Варя", order: 13, status: "missing", unlockAfter: "episode_1", gender: "female" },
        { id: "mama", name: "Мама (Елена)", order: 14, status: "dead", unlockAfter: "episode_1", gender: "female" },
        { id: "gretman", name: "Gretman", order: 15, status: "alive", unlockAfter: "episode_1" },
        { id: "kukolnik", name: "Кукольник", order: 16, status: "dead", unlockAfter: "episode_2" },
        { id: "hirurg", name: "Хирург", order: 17, status: "dead", unlockAfter: "episode_2" },
        { id: "forest_man", name: "Человек из леса", order: 18, status: "dead", unlockAfter: "episode_2" }
    ];
    let count = 0;
    for (const char of characters) {
        await setDoc(doc(db, "dossiers", char.id), { 
            id: char.id, 
            name: char.name, 
            order: char.order, 
            status: char.status, 
            gender: char.gender || "male", 
            unlockAfter: char.unlockAfter, 
            photo: "", bio: "", quote: "", fullBioUrl: "" 
        }, { merge: true });
        count++;
    }
    alert(`Успешно добавлено/обновлено ${count} персонажей!`);
};
