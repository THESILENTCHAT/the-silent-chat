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
        ctx.fillStyle = 'rgba(10, 10, 15, 0.06)';
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
    setInterval(drawMatrix, 50);
}

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

// ===== ПОЯВЛЕНИЕ СЕКЦИЙ =====
const observer = new IntersectionObserver(entries => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, { threshold: 0.1 });

document.querySelectorAll('.section').forEach(section => {
    section.style.opacity = '0';
    section.style.transform = 'translateY(30px)';
    section.style.transition = 'all 0.8s ease-out';
    observer.observe(section);
});

// ===== ПЕРЕВОДЧИК (RU / EN) =====
function changeLang(lang) {
    document.getElementById('btn-ru').classList.remove('active');
    document.getElementById('btn-en').classList.remove('active');
    document.getElementById(`btn-${lang}`).classList.add('active');

    document.querySelectorAll('[data-ru][data-en]').forEach(el => {
        if (lang === 'en') {
            el.innerHTML = el.getAttribute('data-en');
        } else {
            el.innerHTML = el.getAttribute('data-ru');
        }
    });

    document.documentElement.lang = lang;
}

// ===== МОДАЛЬНОЕ ОКНО СКАЧИВАНИЯ =====
const downloadModal = document.getElementById('download-modal');
function openDownloadModal() { downloadModal.classList.remove('hidden'); }
function closeDownloadModal() { 
    downloadModal.classList.add('hidden'); 
    setTimeout(() => {
        document.getElementById('dl-step-1').classList.remove('hidden');
        document.getElementById('dl-step-2').classList.add('hidden');
        document.getElementById('dl-step-android').classList.add('hidden');
        document.getElementById('dl-step-ios').classList.add('hidden');
    }, 300);
}
if(downloadModal) {
    downloadModal.addEventListener('click', (e) => { if (e.target === downloadModal) closeDownloadModal(); });
}

// ===== ЛОГИКА СКАЧИВАНИЯ =====
function startLoading(btn) {
    const originalText = btn.textContent;
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
                btn.textContent = originalText;
                btn.style.pointerEvents = 'auto';
            }, 500);
        } else {
            btn.textContent = `Загрузка... ${Math.floor(progress)}%`;
        }
    }, 150);
}

function chooseAndroid() {
    document.getElementById('dl-step-2').classList.add('hidden');
    document.getElementById('dl-step-android').classList.remove('hidden');
}

function chooseIos() {
    document.getElementById('dl-step-2').classList.add('hidden');
    document.getElementById('dl-step-ios').classList.remove('hidden');
}

// ===== ТЕРМИНАЛ =====
const terminal = document.getElementById('terminal');
const termInput = document.getElementById('terminal-input');
const termOutput = document.getElementById('terminal-output');
const termClose = document.getElementById('terminal-close');
let commandHistory = [], historyIndex = -1;

function isTerminalOpen() { return terminal && !terminal.classList.contains('hidden'); }
function openTerminal() { if(terminal) { terminal.classList.remove('hidden'); setTimeout(() => termInput.focus(), 50); } }
function closeTerminal() { if(terminal) terminal.classList.add('hidden'); }

document.addEventListener('keydown', e => {
    if ((e.key === '~' || e.key === '`') && !isTerminalOpen()) { e.preventDefault(); openTerminal(); }
    if (e.key === 'Escape') {
        if (isTerminalOpen()) closeTerminal();
        if (downloadModal && !downloadModal.classList.contains('hidden')) closeDownloadModal();
        if (document.getElementById('profile-modal') && !document.getElementById('profile-modal').classList.contains('hidden')) closeProfileModal();
    }
});

if(termClose) {
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
function escapeHtml(str) { return str.replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch])); }

const commands = {
    help: () => { printLine('<span class="term-dim">Доступные команды:</span>'); printLine('  <span class="term-cmd">about</span> — об игре'); printLine('  <span class="term-cmd">status</span> — статус проекта'); printLine('  <span class="term-cmd">shop</span> — цены магазина'); printLine('  <span class="term-cmd">clear</span> — очистить экран'); printLine('  <span class="term-cmd">exit</span> — закрыть терминал'); },
    about: () => { printLine('THE SILENT CHAT'); printLine('Хакерский триллер в неоновом нуаре.'); },
    status: () => { printLine('<span class="term-dim">Проверка систем...</span>'); setTimeout(() => printLine('  [OK] Движок: <span class="term-success">Godot 4.7.2</span>'), 200); setTimeout(() => printLine('  [OK] Платформа: <span class="term-success">Android</span>'), 400); setTimeout(() => printLine('  [..] Релиз: <span class="term-cmd">в разработке</span>'), 600); },
    shop: () => { printLine('<span class="term-dim">Пакеты кристаллов:</span>'); printLine('  💎10 → 🪙+20 — 99₽'); printLine('  💎20 → 🪙+40 — 199₽'); printLine('  💎60 → 🪙+100 — 499₽'); },
    clear: () => { termOutput.innerHTML = ''; },
    exit: () => { closeTerminal(); }
};

function handleCommand(raw) {
    const cmd = raw.toLowerCase().trim();
    if (commands[cmd]) { commands[cmd](); return; }
    printLine('<span class="term-error">command not found: ' + escapeHtml(cmd) + '</span>');
}

document.addEventListener('click', () => { if (isTerminalOpen()) termInput.focus(); });

if(document.getElementById('restore-btn')) {
    document.getElementById('restore-btn').addEventListener('click', function () {
        const original = this.textContent;
        this.textContent = 'Ищем покупки...';
        setTimeout(() => { this.textContent = 'Покупок не найдено'; setTimeout(() => { this.textContent = original; }, 1500); }, 1200);
    });
}

// ===== СИСТЕМА АВТОРИЗАЦИИ И ПРОФИЛЯ =====

// Проверяем, заходил ли игрок ранее при загрузке страницы
window.addEventListener('load', () => {
    const savedUser = localStorage.getItem('tsc_user');
    if (savedUser) {
        // Уже зарегистрирован - пускаем сразу на сайт
        document.getElementById('auth-overlay').classList.add('hidden');
        document.getElementById('main-content').classList.remove('hidden');
        updateProfileUI();
    }
});

function switchAuthPanel(panel) {
    document.querySelectorAll('.auth-panel').forEach(p => p.classList.add('hidden'));
    document.getElementById(`auth-${panel}`).classList.remove('hidden');
}

function generateToken() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let t1 = '', t2 = '';
    for (let i = 0; i < 4; i++) { t1 += chars.charAt(Math.floor(Math.random() * chars.length)); }
    for (let i = 0; i < 4; i++) { t2 += chars.charAt(Math.floor(Math.random() * chars.length)); }
    return `TSC-${t1}-${t2}`;
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

    // Строгая валидация
    if (!user.startsWith('@') || user.length < 3) return showError(err, box, "Юзернейм должен начинаться с @ и быть длиннее 2 символов.");
    if (!name) return showError(err, box, "Введите ваше имя.");
    if (!age || isNaN(age) || age < 1) return showError(err, box, "Введите корректный возраст.");
    if (!gender) return showError(err, box, "Выберите пол.");
    if (pass.length < 4) return showError(err, box, "Пароль должен быть не менее 4 символов.");
    if (pass !== confirmPass) return showError(err, box, "Пароли не совпадают.");

    // Генерация токена и сохранение в localStorage
    const token = generateToken();
    localStorage.setItem('tsc_user', user);
    localStorage.setItem('tsc_name', name);
    localStorage.setItem('tsc_age', age);
    localStorage.setItem('tsc_gender', gender);
    localStorage.setItem('tsc_pass', pass);
    localStorage.setItem('tsc_token', token);

    document.getElementById('generated-token').textContent = token;
    switchAuthPanel('token');
}

function showError(el, box, msg) {
    el.textContent = msg;
    box.classList.remove('shake');
    void box.offsetWidth; // Триггер рефлоу для анимации
    box.classList.add('shake');
    setTimeout(() => el.textContent = '', 3000);
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
        switchAuthPanel('loading');
        simulateLoading();
    } else {
        showError(err, box, "Неверный юзернейм, пароль или TSC-Token.");
    }
}

function simulateLoading() {
    const fill = document.getElementById('load-progress');
    const text = document.getElementById('load-text');
    let progress = 0;
    
    const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress > 100) progress = 100;
        fill.style.width = progress + '%';
        if (progress > 75) text.textContent = "Доступ разрешен.";

        if (progress === 100) {
            clearInterval(interval);
            setTimeout(() => {
                // Плавный переход на сайт
                document.getElementById('auth-overlay').classList.add('fade-out');
                setTimeout(() => {
                    document.getElementById('auth-overlay').classList.add('hidden');
                    document.getElementById('main-content').classList.remove('hidden');
                    updateProfileUI(); // Подгружаем аватарку
                }, 500);
            }, 800);
        }
    }, 150);
}

// ===== ЛОГИКА ПРОФИЛЯ =====

function updateProfileUI() {
    const user = localStorage.getItem('tsc_user') || '@...';
    const name = localStorage.getItem('tsc_name') || 'Неизвестно';
    const age = localStorage.getItem('tsc_age') || '0';
    const gender = localStorage.getItem('tsc_gender') || 'Неизвестно';
    const avatar = localStorage.getItem('tsc_avatar');

    // Обновляем данные в модальном окне
    if(document.getElementById('prof-user')) {
        document.getElementById('prof-user').textContent = user;
        document.getElementById('prof-name').textContent = name;
        document.getElementById('prof-age').textContent = age;
        document.getElementById('prof-gender').textContent = gender;
    }

    const navAvatar = document.getElementById('nav-avatar-container');
    const profAvatar = document.getElementById('profile-avatar-large');

    if (avatar) {
        if(navAvatar) { navAvatar.style.backgroundImage = `url(${avatar})`; navAvatar.textContent = ''; }
        if(profAvatar) { profAvatar.style.backgroundImage = `url(${avatar})`; profAvatar.textContent = ''; }
    } else {
        // Если аватарки нет, показываем первую букву имени
        const initial = name.charAt(0).toUpperCase() || user.replace('@', '').charAt(0).toUpperCase() || '?';
        if(navAvatar) { navAvatar.style.backgroundImage = 'none'; navAvatar.textContent = initial; }
        if(profAvatar) { profAvatar.style.backgroundImage = 'none'; profAvatar.textContent = initial; }
    }
}

function openProfileModal() {
    updateProfileUI();
    document.getElementById('profile-modal').classList.remove('hidden');
}

function closeProfileModal(e) {
    if(e) e.stopPropagation();
    document.getElementById('profile-modal').classList.add('hidden');
}

// Функция для сжатия картинки (чтобы localStorage не переполнился)
function resizeImage(base64Str, maxWidth = 250, maxHeight = 250) {
    return new Promise((resolve) => {
        let img = new Image();
        img.src = base64Str;
        img.onload = () => {
            let canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            if (width > height) {
                if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
            } else {
                if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; }
            }
            canvas.width = width;
            canvas.height = height;
            let ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.8));
        }
    });
}

function uploadAvatar(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
        const rawBase64 = e.target.result;
        // Сжимаем перед сохранением
        const compressedBase64 = await resizeImage(rawBase64);
        localStorage.setItem('tsc_avatar', compressedBase64);
        updateProfileUI(); // Мгновенно обновляем на экране
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
    } else if (newPass) {
        alert("Пароль слишком короткий!");
    }
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
        location.reload(); // Перезагрузка для сброса
    }
}

// Для сброса аккаунта (если нужно потестить заново)
// Открой консоль (F12) и напиши resetTSC()
window.resetTSC = function() {
    localStorage.clear();
    location.reload();
};
