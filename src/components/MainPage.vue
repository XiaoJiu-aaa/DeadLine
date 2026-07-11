<template>
  <div class="main-page" @click="onPageClick">
    <!-- Click-away backdrop -->
    <div class="dropdown-backdrop" :class="{ active: backdropActive }"></div>

    <!-- Header -->
    <AppHeader ref="appHeader" @settingsAction="handleSettingsAction" />

    <!-- Main Content -->
    <div class="main-content">
      <div class="placeholder-card">
        <h2>3D 台历区域</h2>
        <p>日历 + 抽屉组件将在后续迭代中实现</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from './AppHeader.vue'

const router = useRouter()
const appHeader = ref(null)
const backdropActive = ref(false)

// Watch for dropdown state changes using MutationObserver or events.
// For simplicity, backdrop is always "ready" — the actual backdrop intercepts
// clicks that pass through the dropdown panels.
function onPageClick() {
  appHeader.value?.closeDropdowns()
}

function handleSettingsAction(action) {
  switch (action) {
    case 'logout':
      const data = JSON.parse(localStorage.getItem('todo_calendar_data') || '{}')
      data.currentUser = null
      localStorage.setItem('todo_calendar_data', JSON.stringify(data))
      router.push('/login')
      break
    case 'export':
    case 'import':
    case 'downloadAll':
    case 'clearArchive':
      // Stub — will implement in later iterations
      break
  }
}

function onKeyDown(e) {
  if (e.key === 'Escape') {
    appHeader.value?.closeDropdowns()
  }
}

onMounted(() => {
  document.addEventListener('keydown', onKeyDown)
  document.body.setAttribute('data-theme', 'day')
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeyDown)
})
</script>

<style>
/* ===== Theme Variables (global for this page's components) ===== */
:root {
  --bg-from: #f5efe0;
  --bg-to: #e8dcc8;
  --header-bg: rgba(255, 255, 255, 0.72);
  --header-border: rgba(255, 255, 255, 0.5);
  --text-color: #3d2e1c;
  --text-secondary: #8a7560;
  --accent: #e8a850;
  --accent-glow: rgba(232, 168, 80, 0.25);
  --dropdown-bg: rgba(255, 255, 255, 0.88);
  --dropdown-border: rgba(200, 180, 160, 0.4);
  --hover-bg: rgba(0, 0, 0, 0.04);
  --shadow-sm: 0 2px 12px rgba(0, 0, 0, 0.06);
  --shadow-md: 0 8px 32px rgba(0, 0, 0, 0.12);
  --transition-speed: 0.8s;
  --cat-study: #4A90D9;
  --cat-life: #5CB85C;
  --cat-work: #F5A623;
  --cat-club: #9B59B6;
}

[data-theme="evening"] {
  --bg-from: #e8d5b8;
  --bg-to: #c8b8d8;
  --header-bg: rgba(255, 255, 255, 0.68);
  --header-border: rgba(255, 255, 255, 0.4);
  --text-color: #3a2e40;
  --text-secondary: #7a6e80;
  --accent: #9b7ec4;
  --accent-glow: rgba(155, 126, 196, 0.25);
  --dropdown-bg: rgba(255, 255, 255, 0.85);
  --dropdown-border: rgba(180, 160, 200, 0.4);
  --shadow-sm: 0 2px 12px rgba(0, 0, 0, 0.08);
  --shadow-md: 0 8px 32px rgba(0, 0, 0, 0.14);
}

[data-theme="night"] {
  --bg-from: #121220;
  --bg-to: #1a1a30;
  --header-bg: rgba(30, 30, 50, 0.7);
  --header-border: rgba(255, 255, 255, 0.1);
  --text-color: #e0e0f0;
  --text-secondary: #9090b0;
  --accent: #7b9ed4;
  --accent-glow: rgba(123, 158, 212, 0.25);
  --dropdown-bg: rgba(30, 30, 50, 0.92);
  --dropdown-border: rgba(255, 255, 255, 0.12);
  --hover-bg: rgba(255, 255, 255, 0.06);
  --shadow-sm: 0 2px 12px rgba(0, 0, 0, 0.3);
  --shadow-md: 0 8px 32px rgba(0, 0, 0, 0.4);
  --cat-study: #5a9fe9;
  --cat-life: #6cc86c;
  --cat-work: #f5b633;
  --cat-club: #ab6bc6;
}
</style>

<style scoped>
.main-page {
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  background: linear-gradient(170deg, var(--bg-from) 0%, var(--bg-to) 100%);
  transition: background var(--transition-speed) cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
}

/* Desktop texture overlay */
.main-page::before {
  content: '';
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
  background:
    repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(139, 105, 60, 0.03) 2px, rgba(139, 105, 60, 0.03) 4px),
    repeating-linear-gradient(90deg, transparent, transparent 80px, rgba(139, 105, 60, 0.02) 80px, rgba(139, 105, 60, 0.02) 81px),
    radial-gradient(ellipse at 20% 80%, rgba(180, 140, 100, 0.08) 0%, transparent 60%),
    radial-gradient(ellipse at 80% 20%, rgba(200, 160, 120, 0.05) 0%, transparent 50%);
  opacity: 1;
}

.dropdown-backdrop {
  position: fixed;
  inset: 0;
  z-index: 15;
  display: none;
}

.dropdown-backdrop.active {
  display: block;
}

.main-content {
  margin-top: 56px;
  height: calc(100vh - 56px);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 1;
}

.placeholder-card {
  padding: 40px 60px;
  background: var(--header-bg);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid var(--header-border);
  border-radius: 16px;
  box-shadow: var(--shadow-sm);
  text-align: center;
  transition: all var(--transition-speed) cubic-bezier(0.4, 0, 0.2, 1);
}

.placeholder-card h2 {
  font-family: "Noto Serif SC", serif;
  font-size: 20px;
  color: var(--text-color);
  letter-spacing: 2px;
  margin-bottom: 8px;
}

.placeholder-card p {
  font-size: 13px;
  color: var(--text-secondary);
  letter-spacing: 0.5px;
}
</style>
