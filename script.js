// ===== МАТРИЧНЫЙ ДОЖДЬ =====
const canvas = document.getElementById('matrix');
const ctx = canvas.getContext('2d');

let width, height;
let columns, drops;
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
        if (i % 8 === 0) {
            ctx.fillStyle = '#ff00aa';
        } else {
            ctx.fillStyle = '#00f0ff';
        }
        ctx.fillText(char, i * fontSize, drops[i] * fontSize);

        if (drops[i] * fontSize > height && Math.random() > 0.975) {
            drops[i] = 0;
        }
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

// ===== МОДАЛЬНОЕ ОКНО СКАЧИВАНИЯ =====
const downloadModal = document.getElementById('download-modal');

function openDownloadModal() {
    downloadModal.classList.remove('hidden');
}

function closeDownloadModal() {
    downloadModal.classList.add('hidden');
}

// Закрытие по клику вне окна
downloadModal.addEventListener('click', (e) => {
    if (e.target === downloadModal) {
        closeDownloadModal();
    }
});

// Имитация скачивания
function startDownload(btn) {
    const originalText = btn.textContent;
    btn.textContent = 'Скачивание... 0%';
    btn.style.pointerEvents = 'none';
    
    let progress = 0;
    const interval = setInterval(() => {
        progress += Math.random() * 15;
        if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            btn.textContent = 'ФАЙЛ СКАЧАН (Заглушка)';
            btn.style.borderColor = 'var(--neon-cyan)';
            btn.style.color = 'var(--neon-cyan)';
            
            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.pointerEvents = 'auto';
                btn.style.borderColor = 'var(--neon-green)';
                btn.style.color = 'var(--neon-green)';
            }, 3000);
        } else {
            btn.textContent = `Скачивание... ${Math.floor(progress)}%`;
        }
    }, 200);
}

// ===== ТЕРМИНАЛ =====
const terminal = document.getElementById('terminal');
const termInput = document.getElementById('terminal-input');
const termOutput = document.getElementById('terminal-output');
const termClose = document.getElementById('terminal-close');

let commandHistory = [];
let historyIndex = -1;

function isTerminalOpen() {
    return !terminal.classList.contains('hidden');
}

function openTerminal() {
    terminal.classList.remove('hidden');
    setTimeout(() => termInput.focus(), 50);
}

function closeTerminal() {
    terminal.classList.add('hidden');
}

document.addEventListener('keydown', e => {
    if ((e.key === '~' || e.key === '`') && !isTerminalOpen()) {
        e.preventDefault();
        openTerminal();
    }
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
    if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (historyIndex > 0) {
            historyIndex--;
            termInput.value = commandHistory[historyIndex];
        }
    }
    if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (historyIndex < commandHistory.length - 1) {
            historyIndex++;
            termInput.value = commandHistory[historyIndex];
        } else {
            historyIndex = commandHistory.length;
            termInput.value = '';
        }
    }
});

function printLine(html) {
    const p = document.createElement('p');
    p.className = 'term-line';
    p.innerHTML = html;
    termOutput.appendChild(p);
    termOutput.scrollTop = termOutput.scrollHeight;
}

function escapeHtml(str) {
    return str.replace(/[&<>"]/g, ch => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;',
        '"': '&quot;', "'": '&#39;'
    }[ch]));
}

// ===== КОМАНДЫ =====
const commands = {
    help: () => {
        printLine('<span class="term-dim">Доступные команды:</span>');
        printLine('  <span class="term-cmd">help</span>       — этот список');
        printLine('  <span class="term-cmd">about</span>      — об игре');
        printLine('  <span class="term-cmd">status</span>     — статус проекта');
        printLine('  <span class="term-cmd">shop</span>       — цены магазина');
        printLine('  <span class="term-cmd">contact</span>    — контакты');
        printLine('  <span class="term-cmd">whoami</span>     — кто ты');
        printLine('  <span class="term-cmd">decode</span>     — расшифровать сообщение');
        printLine('  <span class="term-cmd">logo</span>       — ASCII-логотип');
        printLine('  <span class="term-cmd">clear</span>      — очистить экран');
        printLine('  <span class="term-cmd">exit</span>       — закрыть терминал');
        printLine('<span class="term-dim">Секретные коды принимаются напрямую.</span>');
    },

    about: () => {
        printLine('THE SILENT CHAT');
        printLine('Хакерский триллер в неоновом нуаре.');
        printLine('Одно сообщение. Одна ночь. Никаких свидетелей.');
    },

    status: () => {
        printLine('<span class="term-dim">Проверка систем...</span>');
        setTimeout(() => printLine('  [OK] Движок: <span class="term-success">Godot 4.7.2</span>'), 200);
        setTimeout(() => printLine('  [OK] Платформа: <span class="term-success">Android</span>'), 400);
        setTimeout(() => printLine('  [..] Релиз: <span class="term-cmd">в разработке</span>'), 600);
    },

    shop: () => {
        printLine('<span class="term-dim">Пакеты кристаллов:</span>');
        printLine('  💎10   → 🪙+20   — 99₽');
        printLine('  💎20   → 🪙+40   — 199₽');
        printLine('  💎60   → 🪙+100  — 499₽');
        printLine('  💎120  → 🪙+200  — 999₽');
        printLine('  💎260  → 🪙+400  — 1999₽');
        printLine('  💎670  → 🪙+1000 — 4999₽');
        printLine('  💎1500 → 🪙+2000 — 9999₽');
        printLine('<span class="term-dim">Покупки — после релиза.</span>');
    },

    contact: () => {
        printLine('<span class="term-dim">Каналы связи:</span>');
        printLine('  Email:    <span class="term-cmd">— скоро —</span>');
        printLine('  Telegram: <span class="term-cmd">— скоро —</span>');
        printLine('  Discord:  <span class="term-cmd">— скоро —</span>');
    },

    whoami: () => {
        printLine('Гость. Пока что.');
        printLine('<span class="term-dim">Введи правильный код — узнаешь больше.</span>');
    },

    decode: () => {
        printLine('<span class="term-dim">Зашифрованное сообщение:</span>');
        printLine('<span class="term-cmd">19 8 5 12 12</span>');
        printLine('<span class="term-dim">Подсказка: A=1, B=2, ...</span>');
    },

    logo: () => {
        const art = [
            '  ████████╗███████╗ ██████╗',
            '  ╚══██╔══╝██╔════╝██╔════╝',
            '     ██║   ███████╗██║     ',
            '     ██║   ╚════██║██║     ',
            '     ██║   ███████║╚██████╗',
            '     ╚═╝   ╚══════╝ ╚═════╝'
        ];
        art.forEach(line => printLine('<span class="term-cmd">' + line + '</span>'));
        printLine('<span class="term-dim">THE SILENT CHAT</span>');
    },

    clear: () => {
        termOutput.innerHTML = '';
    },

    exit: () => {
        closeTerminal();
    }
};

// ===== СЕКРЕТНЫЕ КОДЫ =====
const secrets = {
    'silent': () => {
        printLine('<span class="term-success">✓ Код принят. Добро пожаловать в круг.</span>');
        printLine('Секрет: в игре будет концовка, которую можно получить только');
        printLine('пройдя все мини-игры без единой ошибки.');
    },
    '1337': () => {
        printLine('<span class="term-success">✓ Элитный доступ подтверждён.</span>');
        printLine('<span class="term-dim">Ты знаешь, что делаешь.</span>');
    },
    'shell': () => {
        printLine('<span class="term-success">✓ Доступ к shell открыт.</span>');
        printLine('$ sudo unlock --everything');
        printLine('<span class="term-dim">Ты чувствуешь, что здесь что-то не так...</span>');
    }
};

function handleCommand(raw) {
    const cmd = raw.toLowerCase().trim();

    if (commands[cmd]) {
        commands[cmd]();
        return;
    }
    if (secrets[cmd]) {
        secrets[cmd]();
        return;
    }

    printLine('<span class="term-error">command not found: ' + escapeHtml(cmd) + '</span>');
    printLine('<span class="term-dim">Введи help для списка команд.</span>');
}

// ===== МАГАЗИН (заглушка покупки) =====
document.querySelectorAll('.shop-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const price = btn.dataset.price;
        btn.textContent = 'Скоро...';
        btn.style.opacity = '0.6';
        btn.disabled = true;
        setTimeout(() => {
            btn.textContent = price + '₽';
            btn.style.opacity = '1';
            btn.disabled = false;
        }, 1500);
    });
});

document.getElementById('restore-btn').addEventListener('click', function () {
    const original = this.textContent;
    this.textContent = 'Ищем покупки...';
    setTimeout(() => {
        this.textContent = 'Покупок не найдено';
        setTimeout(() => { this.textContent = original; }, 1500);
    }, 1200);
});

// Фокус в терминал при клике
document.addEventListener('click', () => {
    if (isTerminalOpen()) termInput.focus();
});
