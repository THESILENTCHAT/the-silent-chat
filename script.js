// ===== МАТРИЧНЫЙ ДОЖДЬ =====
const canvas = document.getElementById('matrix');
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
    // Сбрасываем шаги через 300мс (когда анимация закрытия пройдет)
    setTimeout(() => {
        document.getElementById('dl-step-1').classList.remove('hidden');
        document.getElementById('dl-step-2').classList.add('hidden');
        document.getElementById('dl-step-android').classList.add('hidden');
        document.getElementById('dl-step-ios').classList.add('hidden');
    }, 300);
}
downloadModal.addEventListener('click', (e) => { if (e.target === downloadModal) closeDownloadModal(); });

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
                // Возвращаем кнопку в исходное состояние
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

function isTerminalOpen() { return !terminal.classList.contains('hidden'); }
function openTerminal() { terminal.classList.remove('hidden'); setTimeout(() => termInput.focus(), 50); }
function closeTerminal() { terminal.classList.add('hidden'); }

document.addEventListener('keydown', e => {
    if ((e.key === '~' || e.key === '`') && !isTerminalOpen()) { e.preventDefault(); openTerminal(); }
    if (e.key === 'Escape') {
        if (isTerminalOpen()) closeTerminal();
        if (!downloadModal.classList.contains('hidden')) closeDownloadModal();
    }
});

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

// Запуск магазина (заглушка)
document.getElementById('restore-btn').addEventListener('click', function () {
    const original = this.textContent;
    this.textContent = 'Ищем покупки...';
    setTimeout(() => { this.textContent = 'Покупок не найдено'; setTimeout(() => { this.textContent = original; }, 1500); }, 1200);
});
