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
    const
