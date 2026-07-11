<template>
  <div class="login-page" data-theme="day">
    <DynamicBackground />

    <!-- Toast -->
    <div class="toast" :class="{ show: toastVisible }">{{ toastMsg }}</div>

    <!-- Login Card -->
    <div class="login-wrapper">
      <div class="login-card" ref="loginCard">
        <div class="card-glow" ref="cardGlow"></div>
        <div class="card-content">
          <div class="app-icon">📅</div>
          <h1 class="app-title">待办日程</h1>
          <p class="app-subtitle">3D 台历 · 日程管理</p>

          <form @submit.prevent="handleSubmit" autocomplete="off">
            <div class="form-group">
              <label>用户名</label>
              <div class="input-wrap">
                <span class="icon">👤</span>
                <input
                  type="text"
                  v-model="username"
                  placeholder="请输入用户名"
                  autocomplete="off"
                  @input="clearError('username')"
                />
              </div>
              <div class="error-msg" :class="{ visible: errors.username }">{{ errors.username }}</div>
            </div>

            <div class="form-group">
              <label>密码</label>
              <div class="input-wrap">
                <span class="icon">🔒</span>
                <input
                  type="password"
                  v-model="password"
                  placeholder="请输入密码"
                  autocomplete="off"
                  @input="clearError('password')"
                />
              </div>
              <div class="error-msg" :class="{ visible: errors.password }">{{ errors.password }}</div>
            </div>

            <button type="submit" class="animated-button">
              <svg xmlns="http://www.w3.org/2000/svg" class="arr-2" viewBox="0 0 24 24">
                <path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z"></path>
              </svg>
              <span class="text">{{ isRegisterMode ? '注 册' : '登 录' }}</span>
              <span class="circle"></span>
              <svg xmlns="http://www.w3.org/2000/svg" class="arr-1" viewBox="0 0 24 24">
                <path d="M16.1716 10.9999L10.8076 5.63589L12.2218 4.22168L20 11.9999L12.2218 19.778L10.8076 18.3638L16.1716 12.9999H4V10.9999H16.1716Z"></path>
              </svg>
            </button>
          </form>

          <p class="register-hint">
            {{ isRegisterMode ? '已有账号？' : '还没有账号？' }}
            <a @click="toggleMode">{{ isRegisterMode ? '去登录' : '立即注册' }}</a>
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import DynamicBackground from './DynamicBackground.vue'
import { validateLogin, registerUser } from '../utils/storage.js'

const router = useRouter()

const username = ref('')
const password = ref('')
const isRegisterMode = ref(false)
const toastVisible = ref(false)
const toastMsg = ref('')
const loginCard = ref(null)
const cardGlow = ref(null)
let toastTimer = null

const errors = reactive({ username: '', password: '' })

function clearError(field) {
  errors[field] = ''
}

function clearAllErrors() {
  errors.username = ''
  errors.password = ''
}

function showToast(msg) {
  toastMsg.value = msg
  toastVisible.value = true
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastVisible.value = false
  }, 2200)
}

function toggleMode() {
  isRegisterMode.value = !isRegisterMode.value
  clearAllErrors()
}

function handleSubmit() {
  clearAllErrors()
  const u = username.value.trim()
  const p = password.value.trim()
  let valid = true

  if (!u) {
    errors.username = '请输入用户名'
    valid = false
  }

  if (!p) {
    errors.password = '请输入密码'
    valid = false
  }

  if (!valid) return

  if (isRegisterMode.value) {
    // Register
    if (p.length < 3) {
      errors.password = '密码至少需要 3 个字符'
      return
    }

    const result = registerUser(u, p)
    if (!result) {
      errors.username = '该用户名已被注册'
      return
    }

    showToast('注册成功！已自动登录 🎉')
    setTimeout(() => router.push('/'), 600)
  } else {
    // Login
    const user = validateLogin(u, p)
    if (user === 'not_found') {
      errors.username = '用户不存在，请先注册'
      return
    }
    if (user === 'wrong_pwd') {
      errors.password = '密码错误，请重试'
      return
    }

    showToast('登录成功！欢迎回来 ✨')
    setTimeout(() => router.push('/'), 600)
  }
}

// Mouse-follow glow
function onMouseMove(e) {
  const rect = loginCard.value.getBoundingClientRect()
  const x = ((e.clientX - rect.left) / rect.width) * 100
  const y = ((e.clientY - rect.top) / rect.height) * 100
  cardGlow.value.style.background = `radial-gradient(circle 180px at ${x}% ${y}%, var(--accent-glow), transparent 70%)`
}

function onMouseEnter() {
  cardGlow.value.style.opacity = '1'
}

function onMouseLeave() {
  cardGlow.value.style.opacity = '0'
}

onMounted(() => {
  document.body.setAttribute('data-theme', 'day')
  const card = loginCard.value
  card.addEventListener('mousemove', onMouseMove)
  card.addEventListener('mouseenter', onMouseEnter)
  card.addEventListener('mouseleave', onMouseLeave)
})

onBeforeUnmount(() => {
  const card = loginCard.value
  card.removeEventListener('mousemove', onMouseMove)
  card.removeEventListener('mouseenter', onMouseEnter)
  card.removeEventListener('mouseleave', onMouseLeave)
})
</script>

<style scoped>
/* ===== CSS Variables ===== */
.login-page {
  --bg-from: #FFF5E6;
  --bg-to: #FFE0B2;
  --beam-color-1: rgba(255, 200, 120, 0.35);
  --beam-color-2: rgba(255, 180, 80, 0.25);
  --beam-color-3: rgba(255, 220, 150, 0.2);
  --card-bg: rgba(255, 255, 255, 0.72);
  --card-border: rgba(255, 255, 255, 0.5);
  --text-color: #3d2e1c;
  --text-secondary: #8a7560;
  --input-bg: rgba(255, 255, 255, 0.65);
  --input-border: rgba(180, 160, 140, 0.35);
  --input-focus-border: #e8a850;
  --btn-bg: linear-gradient(135deg, #e8a850, #d4893a);
  --btn-hover-bg: linear-gradient(135deg, #f0b860, #e09848);
  --accent: #e8a850;
  --accent-glow: rgba(232, 168, 80, 0.3);
  --error-color: #e05555;
  --shadow: 0 2px 24px rgba(0, 0, 0, 0.1);
  --particle-color: rgba(200, 160, 100, 0.7);
  --star-opacity: 0;
  --dust-opacity: 1;
  --beam-opacity: 1;
  --transition-speed: 1.2s;
  --btn-text: #3d2e1c;
  --btn-circle: #f5d5a0;
  --btn-ring: rgba(255,255,255,0.8);
  --btn-active-ring: #f0c060;
}

[data-theme="evening"] .login-page {
  --bg-from: #e8c38a;
  --bg-to: #5b4a8a;
  --beam-color-1: rgba(255, 180, 120, 0.18);
  --beam-color-2: rgba(255, 160, 100, 0.12);
  --beam-color-3: rgba(200, 140, 200, 0.1);
  --card-bg: rgba(255, 255, 255, 0.68);
  --card-border: rgba(255, 255, 255, 0.4);
  --text-color: #3a2e40;
  --text-secondary: #7a6e80;
  --input-bg: rgba(255, 255, 255, 0.6);
  --input-border: rgba(160, 140, 170, 0.35);
  --input-focus-border: #9b7ec4;
  --btn-bg: linear-gradient(135deg, #9b7ec4, #7c5ea8);
  --btn-hover-bg: linear-gradient(135deg, #ab8ed4, #8c6eb8);
  --accent: #9b7ec4;
  --accent-glow: rgba(155, 126, 196, 0.3);
  --shadow: 0 2px 24px rgba(0, 0, 0, 0.12);
  --particle-color: rgba(180, 150, 180, 0.5);
  --star-opacity: 0.4;
  --dust-opacity: 0.5;
  --btn-text: #3a2e40;
  --btn-circle: #d5c0e8;
  --btn-ring: rgba(255,255,255,0.7);
  --btn-active-ring: #c9a0dc;
}

[data-theme="night"] .login-page {
  --bg-from: #08081a;
  --bg-to: #151535;
  --beam-color-1: transparent;
  --beam-color-2: transparent;
  --beam-color-3: transparent;
  --card-bg: rgba(255, 255, 255, 0.08);
  --card-border: rgba(255, 255, 255, 0.15);
  --text-color: #e0e0f0;
  --text-secondary: #9090b0;
  --input-bg: rgba(255, 255, 255, 0.08);
  --input-border: rgba(255, 255, 255, 0.15);
  --input-focus-border: #7b9ed4;
  --btn-bg: linear-gradient(135deg, #4a7ec4, #3a5e9a);
  --btn-hover-bg: linear-gradient(135deg, #5a8ed4, #4a6eaa);
  --accent: #7b9ed4;
  --accent-glow: rgba(123, 158, 212, 0.3);
  --shadow: 0 2px 32px rgba(0, 0, 0, 0.4);
  --particle-color: rgba(200, 210, 240, 0.8);
  --star-opacity: 1;
  --dust-opacity: 0;
  --btn-text: #e0e0f0;
  --btn-circle: #3a5e8a;
  --btn-ring: rgba(255,255,255,0.25);
  --btn-active-ring: #5a8ed4;
}

/* ===== Page layout ===== */
.login-page {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(160deg, var(--bg-from) 0%, var(--bg-to) 100%);
  transition: background var(--transition-speed) cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

/* ===== Login Card ===== */
.login-wrapper {
  position: relative;
  z-index: 2;
}

.login-card {
  position: relative;
  width: 420px;
  padding: 48px 44px 40px;
  background: var(--card-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--card-border);
  border-radius: 20px;
  box-shadow: var(--shadow);
  transition: background var(--transition-speed) cubic-bezier(0.4, 0, 0.2, 1),
              border-color var(--transition-speed) cubic-bezier(0.4, 0, 0.2, 1),
              box-shadow var(--transition-speed) cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
}

.card-glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  opacity: 0;
  transition: opacity 0.3s ease;
  border-radius: 20px;
}

.login-card:hover .card-glow {
  opacity: 1;
}

.card-content {
  position: relative;
  z-index: 1;
}

/* ===== App icon ===== */
.app-icon {
  width: 56px;
  height: 56px;
  margin: 0 auto 16px;
  border-radius: 14px;
  background: linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 70%, #fff));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
  color: #fff;
  box-shadow: 0 4px 16px var(--accent-glow);
  transition: background var(--transition-speed) cubic-bezier(0.4, 0, 0.2, 1),
              box-shadow var(--transition-speed) cubic-bezier(0.4, 0, 0.2, 1);
}

.app-title {
  text-align: center;
  font-family: "Noto Serif SC", "ZCOOL XiaoWei", "STSong", serif;
  font-size: 26px;
  font-weight: 700;
  color: var(--text-color);
  margin-bottom: 4px;
  letter-spacing: 2px;
  transition: color var(--transition-speed) cubic-bezier(0.4, 0, 0.2, 1);
}

.app-subtitle {
  text-align: center;
  font-size: 13px;
  color: var(--text-secondary);
  margin-bottom: 36px;
  letter-spacing: 1px;
  transition: color var(--transition-speed) cubic-bezier(0.4, 0, 0.2, 1);
}

/* ===== Form ===== */
.form-group {
  margin-bottom: 20px;
  position: relative;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  margin-bottom: 8px;
  letter-spacing: 0.5px;
  transition: color var(--transition-speed) cubic-bezier(0.4, 0, 0.2, 1);
}

.input-wrap {
  position: relative;
}

.input-wrap .icon {
  position: absolute;
  left: 14px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 16px;
  opacity: 0.5;
  pointer-events: none;
  transition: opacity 0.25s ease;
}

.form-group input {
  width: 100%;
  padding: 13px 14px 13px 42px;
  font-size: 15px;
  font-family: inherit;
  color: var(--text-color);
  background: var(--input-bg);
  border: 1.5px solid var(--input-border);
  border-radius: 10px;
  outline: none;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  letter-spacing: 0.5px;
}

.form-group input:focus {
  border-color: var(--input-focus-border);
  box-shadow: 0 0 0 3px var(--accent-glow);
}

.form-group input::placeholder {
  color: var(--text-secondary);
  opacity: 0.5;
}

.error-msg {
  font-size: 12px;
  color: var(--error-color);
  margin-top: 6px;
  min-height: 18px;
  opacity: 0;
  transform: translateY(-4px);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  letter-spacing: 0.3px;
}

.error-msg.visible {
  opacity: 1;
  transform: translateY(0);
}

/* ===== Animated Button ===== */
.animated-button {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 100%;
  padding: 15px 36px;
  margin-top: 8px;
  border: 2px solid transparent;
  font-size: 16px;
  font-family: inherit;
  font-weight: 600;
  letter-spacing: 4px;
  background-color: transparent;
  border-radius: 100px;
  color: var(--btn-text);
  box-shadow: 0 0 0 2px var(--btn-ring);
  cursor: pointer;
  overflow: hidden;
  transition: all 0.6s cubic-bezier(0.23, 1, 0.32, 1);
}

.animated-button svg {
  position: absolute;
  width: 24px;
  fill: var(--btn-text);
  z-index: 9;
  transition: all 0.8s cubic-bezier(0.23, 1, 0.32, 1);
}

.animated-button .arr-1 { right: 20px; }
.animated-button .arr-2 { left: -25%; }

.animated-button .circle {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 24px;
  height: 24px;
  background-color: var(--btn-circle);
  border-radius: 50%;
  opacity: 0;
  transition: all 0.8s cubic-bezier(0.23, 1, 0.32, 1);
}

.animated-button .text {
  position: relative;
  z-index: 1;
  transform: translateX(-12px);
  transition: all 0.8s cubic-bezier(0.23, 1, 0.32, 1);
}

.animated-button:hover {
  box-shadow: 0 0 0 12px transparent;
  color: var(--btn-text);
  border-radius: 16px;
}

.animated-button:hover .arr-1 { right: -25%; }
.animated-button:hover .arr-2 { left: 20px; }
.animated-button:hover .text { transform: translateX(12px); }
.animated-button:hover svg { fill: var(--btn-text); }

.animated-button:active {
  scale: 0.95;
  box-shadow: 0 0 0 4px var(--btn-active-ring);
}

.animated-button:hover .circle {
  width: 500px;
  height: 500px;
  opacity: 1;
}

/* ===== Register hint ===== */
.register-hint {
  text-align: center;
  margin-top: 22px;
  font-size: 13px;
  color: var(--text-secondary);
  transition: color var(--transition-speed) cubic-bezier(0.4, 0, 0.2, 1);
}

.register-hint a {
  color: var(--accent);
  text-decoration: none;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s ease;
  margin-left: 4px;
}

.register-hint a:hover { opacity: 0.8; }

/* ===== Toast ===== */
.toast {
  position: fixed;
  top: 32px;
  left: 50%;
  transform: translateX(-50%) translateY(-120px);
  z-index: 100;
  padding: 12px 28px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 1px;
  color: #fff;
  background: rgba(0,0,0,0.8);
  backdrop-filter: blur(12px);
  transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
  pointer-events: none;
}

.toast.show {
  transform: translateX(-50%) translateY(0);
}
</style>
