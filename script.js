// ===== МАТРИЦА =====
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

// ===== ПАРАЛЛАКС =====
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

// ===== ПОЯВЛЕНИЕ СЕКЦИЙ =====
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

// ===== СБОРКА ПО БУКВАМ =====
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

// ===== ПЕРЕВОД =====
let currentLang = 'ru';
function changeLang(lang) {
    currentLang = lang;
    document.getElementById('btn-ru').classList.remove('active');
    document.getElementById('btn-en').classList.remove('active');
    document.getElementById(`btn-${lang}`).classList.add('active');
    document.querySelectorAll('[data-ru][data-en]').forEach(el => {
        el.innerHTML = el.getAttribute(lang === 'en' ? 'data-en' : 'data-ru');
    });
    document.documentElement.lang = lang;
    document.querySelectorAll('.split-title').forEach(h2 => {
        h2.dataset.animated = '';
        splitLetters(h2, 0.03);
    });
}

// ===== RIPPLE НА КНОПКАХ =====
document.querySelectorAll('.btn, .btn-download, .shop-btn, .auth-btn').forEach(btn => {
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

// ===== 3D ТИЛТ =====
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
    el.addEventListener('mouseleave', () => {
        el.style.transform = '';
    });
});

// ===== ПЛАВНЫЙ СКРОЛЛ =====
document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
        const target = document.querySelector(link.getAttribute('href'));
        if (target) {
            e.preventDefault();
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

// ===== ИНТРО: ВЗЛОМ =====
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

function skipIntro() {
    introTimers.forEach(t => { clearTimeout(t); clearInterval(t); });
    finishIntro();
}

// ===== АВТОРИЗАЦИЯ =====
function switchAuthTab(tab) {
    document.getElementById('tab-login').classList.toggle('active', tab === 'login');
    document.getElementById('tab-register').classList.toggle('active', tab === 'register');
    ['login', 'register', 'token'].forEach(p => {
        const el = document.getElementById(`auth-${p}`);
        if (el) el.classList.add('hidden');
    });
    const target = document.getElementById(`auth-${tab}`);
    if (target) { target.classList.remove('hidden'); }
}

function generateToken() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let t1 = '', t2 = '';
    for (let i = 0; i < 4; i++) t1 += chars.charAt(Math.floor(Math.random() * chars.length));
    for (let i = 0; i < 4; i++) t2 += chars.charAt(Math.floor(Math.random() * chars.length));
    return `TSC-${t1}-${t2}`;
}

function showError(el, box, msg) {
    el.textContent = msg;
    box.classList.remove('shake');
    void box.offsetWidth;
    box.classList.add('shake');
    setTimeout(() => el.textContent = '', 3200);
}

function registerUser() {
    const user = document.getElementById('reg-username').value.trim();
    const name = document.getElementById('reg-name').value.trim();
    const age = document.getElementById('reg-age').value.trim();
    const gender = document.getElementById('reg-gender').value;
    const pass = document.getElementById('reg-password').value;
    const confirmPass = document.getElementById('reg-password-confirm').value;
    const err = document.getElementById('reg-error');
    const box = document.querySelector('.auth-box');

    if (!user.startsWith('@') || user.length < 3) return showError(err, box, "Юзернейм должен начинаться с @ и быть длиннее 2 символов.");
    if (!name) return showError(err, box, "Введите ваше имя.");
    if (!age || isNaN(age) || age < 1) return showError(err, box, "Введите корректный возраст.");
    if (!gender) return showError(err, box, "Выберите пол.");
    if (pass.length < 4) return showError(err, box, "Пароль должен быть не менее 4 символов.");
    if (pass !== confirmPass) return showError(err, box, "Пароли не совпадают.");

    const token = generateToken();
    localStorage.setItem('tsc_user', user);
    localStorage.setItem('tsc_name', name);
    localStorage.setItem('tsc_age', age);
    localStorage.setItem('tsc_gender', gender);
    localStorage.setItem('tsc_pass', pass);
    localStorage.setItem('tsc_token', token);

    document.getElementById('generated-token').textContent = token;
    ['login','register'].forEach(p => document.getElementById(`auth-${p}`).classList.add('hidden'));
    document.getElementById('auth-token').classList.remove('hidden');
}

function loginUser() {
    const user = document.getElementById('login-username').value.trim();
    const pass = document.getElementById('login-password').value;
    const token = document.getElementById('login-token').value.trim().toUpperCase();
    const err = document.getElementById('login-error');
    const box = document.querySelector('.auth-box');

    const savedUser = localStorage.getItem('tsc_user');
    const savedPass = localStorage.getItem('tsc_pass');
    const savedToken = localStorage.getItem('tsc_token');

    if (user === savedUser && pass === savedPass && token === savedToken) {
        err.textContent = '';
        startBreach();
    } else {
        showError(err, box, "Неверный юзернейм, пароль или TSC-Token.");
    }
}

// ===== РАЗРЫВ ЭКРАНА =====
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
        return { points, progress: 0 };
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
            setTimeout(() => {
                flash.classList.remove('on');
            }, 120);
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

// ===== СБОРКА САЙТА ПО БУКВАМ =====
function launchSiteReveal() {
    const title = document.getElementById('hero-title');
    if (title) splitLetters(title, 0.06);
    setTimeout(() => document.getElementById('hero-tagline').classList.add('in'), 400);
    setTimeout(() => document.querySelector('.hero .btn.pulse-btn').classList.add('in'), 800);
    document.querySelectorAll('.section').forEach(s => observer.observe(s));
}

// ===== СТАРТ =====
window.addEventListener('load', () => {
    const savedUser = localStorage.getItem('tsc_user');
    if (savedUser) {
        document.getElementById('intro-overlay').classList.add('hidden');
        document.getElementById('auth-overlay').classList.add('hidden');
        document.getElementById('main-content').classList.remove('hidden');
        updateProfileUI();
        launchSiteReveal();
    } else {
        runIntro();
    }
});

// ===== ПРОФИЛЬ =====
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
}

function openProfileModal() {
    updateProfileUI();
    document.getElementById('profile-modal').classList.remove('hidden');
}
function closeProfileModal(e) {
    if (e) e.stopPropagation();
    document.getElementById('profile-modal').classList.add('hidden');
}

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

function uploadAvatar(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async e => {
        const compressed = await resizeImage(e.target.result);
        localStorage.setItem('tsc_avatar', compressed);
        updateProfileUI();
    };
    reader.readAsDataURL(file);
}

function showImagePreview() {
    const avatar = localStorage.getItem('tsc_avatar');
    if (avatar) {
        document.getElementById('preview-img').src = avatar;
        document.getElementById('image-preview-modal').classList.remove('hidden');
    }
}
function closeImagePreview() {
    document.getElementById('image-preview-modal').classList.add('hidden');
}

function changePassword() {
    const newPass = prompt("Введите новый пароль (минимум 4 символа):");
    if (newPass && newPass.length >= 4) {
        localStorage.setItem('tsc_pass', newPass);
        alert("Пароль успешно изменен!");
    } else if (newPass) alert("Пароль слишком короткий!");
}
function changeToken() {
    if (confirm("Сгенерировать новый TSC-Token? Вам придется использовать его при следующем входе.")) {
        const newToken = generateToken();
        localStorage.setItem('tsc_token', newToken);
        alert("Ваш новый токен: " + newToken + "\n\nОбязательно сохраните его!");
    }
}
function deleteAccount() {
    if (confirm("ВЫ УВЕРЕНЫ? Это навсегда удалит ваш аккаунт, прогресс и аватарку.")) {
        localStorage.clear();
        location.reload();
    }
}
window.resetTSC = function() { localStorage.clear(); location.reload(); };

// ===== МОДАЛКА СКАЧИВАНИЯ =====
const downloadModal = document.getElementById('download-modal');
function openDownloadModal() { downloadModal.classList.remove('hidden'); }
function closeDownloadModal() {
    downloadModal.classList.add('hidden');
    setTimeout(() => {
        document.getElementById('dl-step-1').classList.remove('hidden');
        document.getElementById('dl-step-2').classList.add('hidden');
    }, 300);
}
if (downloadModal) downloadModal.addEventListener('click', e => { if (e.target === downloadModal) closeDownloadModal(); });

function startLoading(btn) {
    const original = btn.textContent;
    btn.textContent = 'Загрузка... 0%';
    btn.style.pointerEvents = 'none';
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 25;
        if (progress >= 100) {
            clearInterval(interval);
            btn.textContent = 'Готово!';
            setTimeout(() => {
                document.getElementById('dl-step-1').classList.add('hidden');
                document.getElementById('dl-step-2').classList.remove('hidden');
                btn.textContent = original;
                btn.style.pointerEvents = 'auto';
            }, 500);
        } else btn.textContent = `Загрузка... ${Math.floor(progress)}%`;
    }, 150);
}

// ===== ТЕРМИНАЛ =====
const terminal = document.getElementById('terminal');
const termInput = document.getElementById('terminal-input');
const termOutput = document.getElementById('terminal-output');
const termClose = document.getElementById('terminal-close');
let commandHistory = [], historyIndex = -1;

function isTerminalOpen() { return terminal && !terminal.classList.contains('hidden'); }
function openTerminal() { if (terminal) { terminal.classList.remove('hidden'); setTimeout(() => termInput.focus(), 50); } }
function closeTerminal() { if (terminal) terminal.classList.add('hidden'); }

document.addEventListener('keydown', e => {
    if ((e.key === '~' || e.key === '`') && !isTerminalOpen()) { e.preventDefault(); openTerminal(); }
    if (e.key === 'Escape') {
        if (isTerminalOpen()) closeTerminal();
        if (downloadModal && !downloadModal.classList.contains('hidden')) closeDownloadModal();
        const pm = document.getElementById('profile-modal');
        if (pm && !pm.classList.contains('hidden')) closeProfileModal();
        const ip = document.getElementById('image-preview-modal');
        if (ip && !ip.classList.contains('hidden')) closeImagePreview();
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
function escapeHtml(str) {
    return str.replace(/[&<>"']/g, ch => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[ch]));
}

const commands = {
    help: () => {
        printLine('<span class="term-dim">Доступные команды:</span>');
        printLine('  <span class="term-cmd">about</span> — об игре');
        printLine('  <span class="term-cmd">status</span> — статус проекта');
        printLine('  <span class="term-cmd">shop</span> — цены магазина');
        printLine('  <span class="term-cmd">clear</span> — очистить экран');
        printLine('  <span class="term-cmd">exit</span> — закрыть терминал');
    },
    about: () => { printLine('THE SILENT CHAT'); printLine('Хакерский триллер в неоновом нуаре.'); },
    status: () => {
        printLine('<span class="term-dim">Проверка систем...</span>');
        setTimeout(() => printLine('  [OK] Движок: <span class="term-success">Godot 4.7.2</span>'), 200);
        setTimeout(() => printLine('  [OK] Платформа: <span class="term-success">Android</span>'), 400);
        setTimeout(() => printLine('  [..] Релиз: <span class="term-cmd">в разработке</span>'), 600);
    },
    shop: () => {
        printLine('<span class="term-dim">Пакеты кристаллов:</span>');
        printLine('  💎10 → 🪙+20 — 99₽');
        printLine('  💎20 → 🪙+40 — 199₽');
        printLine('  💎60 → 🪙+100 — 499₽');
        printLine('  💎120 → 🪙+250 — 899₽');
        printLine('  💎250 → 🪙+600 — 1699₽');
        printLine('  💎500 → 🪙+1500 — 2999₽');
        printLine('  💎1000 → 🪙+3500 — 4999₽');
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

// Восстановление покупки
const restoreBtn = document.getElementById('restore-btn');
if (restoreBtn) {
    restoreBtn.addEventListener('click', function() {
        const original = this.textContent;
        this.textContent = 'Ищем покупки...';
        setTimeout(() => {
            this.textContent = 'Покупок не найдено';
            setTimeout(() => { this.textContent = original; }, 1500);
        }, 1200);
    });
}
