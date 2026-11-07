import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc 
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Твои ключи от Firebase
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

// ==========================================
// ФУНКЦИЯ РЕГИСТРАЦИИ
// ==========================================
window.handleRegister = async function() {
    const email = document.getElementById('reg-email').value;
    const username = document.getElementById('reg-username').value;
    const pass = document.getElementById('reg-password').value;
    const passConfirm = document.getElementById('reg-password-confirm').value;
    const errBox = document.getElementById('reg-error');

    if (!email || !username || !pass) {
        errBox.innerText = "Заполните все поля!";
        return;
    }
    if (pass !== passConfirm) {
        errBox.innerText = "Пароли не совпадают!";
        return;
    }

    try {
        // Создаем аккаунт в Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        const user = userCredential.user;

        // Генерируем уникальный токен для игры
        const tscToken = "TSC-" + Math.random().toString(36).substring(2, 10).toUpperCase();

        // Сохраняем в базу данных Firestore
        await setDoc(doc(db, "users", user.uid), {
            email: email,
            username: username,
            tscToken: tscToken,
            role: "player",
            createdAt: new Date().toISOString()
        });

        // Показываем экран с токеном
        document.getElementById('generated-token').innerText = tscToken;
        switchAuthTab('token'); 
        
        // Сохраняем локально, чтобы игра могла прочитать (опционально)
        localStorage.setItem("tsc_token", tscToken);
        localStorage.setItem("tsc_username", username);

    } catch (error) {
        if (error.code === 'auth/email-already-in-use') {
            errBox.innerText = "Этот Email уже зарегистрирован.";
        } else if (error.code === 'auth/weak-password') {
            errBox.innerText = "Пароль слишком простой (минимум 6 символов).";
        } else {
            errBox.innerText = "Ошибка: " + error.message;
        }
    }
};

// ==========================================
// ФУНКЦИЯ ВХОДА
// ==========================================
window.handleLogin = async function() {
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    const errBox = document.getElementById('login-error');

    if (!email || !pass) {
        errBox.innerText = "Введите Email и пароль!";
        return;
    }

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, pass);
        const user = userCredential.user;

        // Достаем профиль из базы, чтобы взять токен
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();
            localStorage.setItem("tsc_token", data.tscToken);
            localStorage.setItem("tsc_username", data.username);
            
            // ЗДЕСЬ ТВОЙ КОД УСПЕШНОГО ВХОДА (Анимация взлома и переход на сайт)
            // Скорее всего у тебя в script.js есть функция вроде startBreachAnimation() или showMainContent()
            // Вызови её здесь:
            document.getElementById('auth-overlay').classList.add('hidden');
            // Примерно так (если функция так называется):
            if(typeof startBreachAnimation === 'function') startBreachAnimation();
            
        } else {
            errBox.innerText = "Профиль не найден в базе.";
        }
    } catch (error) {
        if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found') {
            errBox.innerText = "Неверный Email или пароль.";
        } else {
            errBox.innerText = "Ошибка: " + error.message;
        }
    }
};
