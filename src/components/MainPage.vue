<template>
  <div class="main-page" :class="{ ready: pageReady }" @click="onPageClick" @mousemove="onGlowMove" ref="mainPageRef">
    <!-- Dynamic background particles -->
    <DynamicBackground :showThemeSlider="false" />

    <!-- Ceiling lamp (night theme) -->
    <div
      class="ceiling-lamp"
      :class="{ visible: isNight, off: !lampOn }"
      @click.stop="toggleLamp"
    >
      <div class="lamp-cord"></div>
      <div class="lamp-shade">
        <div class="lamp-bulb"></div>
      </div>
      <div class="lamp-light"></div>
    </div>

    <!-- Mouse-follow glow -->
    <div class="page-glow" ref="pageGlow"></div>

    <!-- Click-away backdrop -->
    <div class="dropdown-backdrop" :class="{ active: backdropActive }"></div>

    <!-- Header -->
    <AppHeader
      ref="appHeader"
      :selectedDate="selectedDate"
      :isImportant="isImportant"
      :isSpecial="isSpecial"
      :canMark="canMark"
      @settingsAction="handleSettingsAction"
      @toggleImportant="onToggleImportant"
      @toggleSpecial="onToggleSpecial"
    />

    <!-- Day Diary Panel -->
    <DayDiary :dateStr="diaryDate" :visible="diaryOpen" @close="closeDiary" />

    <!-- Main Content -->
    <div class="main-content">
      <CalendarPage ref="calendarRef" :importantDays="importantDays" :specialDays="specialDays" :taskDatesMap="taskDatesMap" :highlightedDate="highlightedDate" @selectDate="onSelectDate" />
    </div>

    <!-- Task Drawer -->
    <TaskDrawer
      :tasks="tasksForDate"
      :dateStr="selectedDate"
      :visible="drawerOpen"
      @close="closeDrawer"
      @create="onTaskCreate"
      @update="onTaskUpdate"
      @delete="onTaskDelete"
      @toggleComplete="onTaskToggleComplete"
      @highlightDate="onHighlightDate"
    />

    <CelebrationEffect :trigger="celebrateTrigger" @done="isCelebrating = false" />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { useRouter } from 'vue-router'
import AppHeader from './AppHeader.vue'
import CalendarPage from './CalendarPage.vue'
import DynamicBackground from './DynamicBackground.vue'
import DayDiary from './DayDiary.vue'
import TaskDrawer from './TaskDrawer.vue'
import CelebrationEffect from './CelebrationEffect.vue'
import { saveFile, deleteFiles, getFile } from '../utils/db.js'
import { getCurrentUser, getImportantDays, toggleImportantDay, getSpecialDays, toggleSpecialDay, getAllTasks, saveAllTasks } from '../utils/storage.js'
import { generateId, formatDate } from '../utils/helpers.js'
import JSZip from 'jszip'

const router = useRouter()
const appHeader = ref(null)
const calendarRef = ref(null)
const backdropActive = ref(false)
const pageGlow = ref(null)
const pageReady = ref(false)
const diaryOpen = ref(false)
const diaryDate = ref('')
const selectedDate = ref('')
const highlightedDate = ref('')
const importantDays = ref([])
const specialDays = ref([])
const tasks = ref([])
const drawerOpen = ref(false)
const celebrateTrigger = ref(0)
const isCelebrating = ref(false)

const tasksForDate = computed(() =>
  tasks.value.filter(t => t.date === selectedDate.value)
)

const taskDatesMap = computed(() => {
  const map = {}
  for (const t of tasks.value) {
    if (!t.completed) {
      if (!map[t.date]) map[t.date] = []
      if (!map[t.date].includes(t.category)) {
        map[t.date].push(t.category)
      }
    }
  }
  return map
})

const isImportant = computed(() => importantDays.value.includes(selectedDate.value))
const isSpecial = computed(() => specialDays.value.includes(selectedDate.value))
const canMark = computed(() => {
  if (!selectedDate.value) return false
  return selectedDate.value >= formatDate(new Date())
})

function loadImportantDays() {
  const user = getCurrentUser()
  if (user) {
    importantDays.value = getImportantDays(user)
    specialDays.value = getSpecialDays(user)
  }
}

function onSelectDate(dateStr) {
  appHeader.value?.closeDropdowns()
  selectedDate.value = dateStr
  drawerOpen.value = true
  const todayStr = formatDate(new Date())
  if (dateStr > todayStr) {
    diaryOpen.value = false
    return
  }
  diaryDate.value = dateStr
  diaryOpen.value = true

  // Celebration: today + all tasks completed + at least one task + not already playing
  if (dateStr === todayStr && !isCelebrating.value) {
    const todayTasks = tasks.value.filter(t => t.date === todayStr)
    if (todayTasks.length > 0 && todayTasks.every(t => t.completed)) {
      isCelebrating.value = true
      celebrateTrigger.value++
    }
  }
}

function onToggleImportant() {
  if (!canMark.value) return
  const user = getCurrentUser()
  if (!user) return
  const result = toggleImportantDay(user, selectedDate.value)
  if (result) {
    importantDays.value = result.importantDays
    specialDays.value = result.specialDays
  }
}

function onToggleSpecial() {
  if (!canMark.value) return
  const user = getCurrentUser()
  if (!user) return
  const result = toggleSpecialDay(user, selectedDate.value)
  if (result) {
    importantDays.value = result.importantDays
    specialDays.value = result.specialDays
  }
}

function closeDiary() {
  diaryOpen.value = false
  selectedDate.value = ''
  calendarRef.value?.clearSelection()
}

function closeDrawer() {
  drawerOpen.value = false
  selectedDate.value = ''
  diaryOpen.value = false
  calendarRef.value?.clearSelection()
}

function loadTasks() {
  const user = getCurrentUser()
  if (user) {
    tasks.value = getAllTasks(user) || []
  }
}

function persistTasks() {
  const user = getCurrentUser()
  if (user) saveAllTasks(user, tasks.value)
}

function onHighlightDate(dateStr) {
  highlightedDate.value = dateStr || ''
}

async function onTaskCreate(formData) {
  const task = {
    id: generateId('t'),
    title: formData.title,
    date: formData.date,
    isAllDay: formData.isAllDay,
    timeLabel: formData.timeLabel,
    latestStart: formData.latestStart || null,
    category: formData.category,
    note: formData.note,
    completed: false,
    attachments: [],
  }
  // Save file attachments to IndexedDB
  const pendingAtts = formData.pendingAttachments || []
  for (const att of pendingAtts) {
    const attId = generateId('att')
    if (att._file) {
      await saveFile(attId, att._file)
    }
    task.attachments.push({ id: attId, name: att.name, size: att.size })
  }
  tasks.value.unshift(task)
  persistTasks()
}

async function onTaskUpdate({ id, data }) {
  const task = tasks.value.find(t => t.id === id)
  if (!task) return
  task.title = data.title
  task.category = data.category
  task.date = data.date
  task.isAllDay = data.isAllDay
  task.timeLabel = data.timeLabel
  task.note = data.note
  task.latestStart = data.latestStart || null
  // Replace attachments with pending list (handles both add and remove)
  const newAtts = data.pendingAttachments || []
  const newAttachments = []
  for (const att of newAtts) {
    if (att.id && !att._file) {
      // Existing attachment, keep it
      newAttachments.push({ id: att.id, name: att.name, size: att.size })
    } else {
      // New file attachment
      const attId = generateId('att')
      if (att._file) {
        await saveFile(attId, att._file)
      }
      newAttachments.push({ id: attId, name: att.name, size: att.size })
    }
  }
  // Delete removed attachments from IndexedDB
  const keptIds = new Set(newAttachments.map(a => a.id).filter(Boolean))
  const removedIds = task.attachments.filter(a => !keptIds.has(a.id)).map(a => a.id)
  if (removedIds.length) {
    await deleteFiles(removedIds)
  }
  task.attachments = newAttachments
  persistTasks()
}

async function onTaskDelete(taskId) {
  const task = tasks.value.find(t => t.id === taskId)
  if (task && task.attachments.length) {
    const ids = task.attachments.map(a => a.id)
    await deleteFiles(ids).catch(() => {})
  }
  tasks.value = tasks.value.filter(t => t.id !== taskId)
  persistTasks()
}

async function clearArchive() {
  const cutoff = formatDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
  const old = tasks.value.filter(t => t.date < cutoff)
  if (old.length === 0) return
  const attIds = old.flatMap(t => (t.attachments || []).map(a => a.id))
  if (attIds.length) {
    await deleteFiles(attIds).catch(() => {})
  }
  tasks.value = tasks.value.filter(t => t.date >= cutoff)
  persistTasks()
}

function onTaskToggleComplete(taskId) {
  const task = tasks.value.find(t => t.id === taskId)
  if (task) {
    task.completed = !task.completed
    persistTasks()

    // Celebration: today selected + just completed last task + not already playing
    if (task.completed && !isCelebrating.value) {
      const todayStr = formatDate(new Date())
      if (selectedDate.value === todayStr) {
        const todayTasks = tasks.value.filter(t => t.date === todayStr)
        if (todayTasks.length > 0 && todayTasks.every(t => t.completed)) {
          isCelebrating.value = true
          celebrateTrigger.value++
        }
      }
    }
  }
}

// Ceiling lamp
const lampOn = ref(true)
const isNight = ref(false)
let themeObserver = null
let lampTimer = null

function toggleLamp() {
  lampOn.value = !lampOn.value
}

function syncTheme() {
  const theme = document.body.getAttribute('data-theme')
  clearTimeout(lampTimer)

  if (theme === 'night') {
    // Slide down first (1.6s), then turn on
    isNight.value = true
    lampOn.value = false
    lampTimer = setTimeout(() => { lampOn.value = true }, 1600)
  } else {
    // Turn off first (light fades in 0.7s), then slide up
    lampOn.value = false
    lampTimer = setTimeout(() => { isNight.value = false }, 700)
  }
}

function onGlowMove(e) {
  const x = (e.clientX / window.innerWidth) * 100
  const y = (e.clientY / window.innerHeight) * 100
  const theme = document.body.getAttribute('data-theme')
  if (theme === 'night') {
    pageGlow.value.style.background = `radial-gradient(circle 300px at ${x}% ${y}%, rgba(255,245,225,0.40), rgba(240,225,200,0.15) 40%, transparent 65%)`
  } else {
    pageGlow.value.style.background = `radial-gradient(circle 300px at ${x}% ${y}%, var(--accent-glow), transparent 70%)`
  }
}

// Watch for dropdown state changes using MutationObserver or events.
// For simplicity, backdrop is always "ready" — the actual backdrop intercepts
// clicks that pass through the dropdown panels.
function onPageClick(e) {
  appHeader.value?.closeDropdowns()
  const inDrawer = e.target.closest('.drawer-wrapper')
  if (drawerOpen.value && !inDrawer) {
    closeDrawer()
  }
  if (diaryOpen.value && !e.target.closest('.diary-group') && !inDrawer) {
    closeDiary()
  }
}

function handleSettingsAction(action) {
  switch (action) {
    case 'logout':
      const data = JSON.parse(localStorage.getItem('todo_calendar_data') || '{}')
      data.currentUser = null
      localStorage.setItem('todo_calendar_data', JSON.stringify(data))
      router.push('/login')
      break
    case 'clearArchive':
      clearArchive()
      break
    case 'export':
      exportData()
      break
    case 'import':
      importData()
      break
    case 'downloadAll':
      break
  }
}

async function exportData() {
  const user = getCurrentUser()
  if (!user) return
  const userData = JSON.parse(localStorage.getItem('todo_calendar_data') || '{}')
  const profile = userData.users[user] || {}
  const tasks = profile.tasks || []

  const zip = new JSZip()
  const attachmentsFolder = zip.folder('attachments')

  // Collect all attachment IDs and fetch blobs from IndexedDB
  const allAttIds = []
  for (const task of tasks) {
    if (task.attachments) {
      for (const att of task.attachments) {
        if (att.id) allAttIds.push(att.id)
      }
    }
  }

  // Fetch and add each attachment file to the ZIP
  for (const attId of allAttIds) {
    try {
      const record = await getFile(attId)
      if (record && record.blob) {
        attachmentsFolder.file(attId, record.blob)
      }
    } catch (_) { /* skip missing files */ }
  }

  // Add data.json (metadata only, same structure as before)
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    username: user,
    tasks: tasks,
    importantDays: profile.importantDays || [],
    specialDays: profile.specialDays || [],
    diaries: profile.diaries || {},
  }
  zip.file('data.json', JSON.stringify(payload, null, 2))

  const blob = await zip.generateAsync({ type: 'blob' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `todo-calendar-backup-${formatDate(new Date())}.zip`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function importData() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.zip,.json'
  input.onchange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      let payload

      if (file.name.endsWith('.zip')) {
        const zip = await JSZip.loadAsync(file)
        const dataFile = zip.file('data.json')
        if (!dataFile) { alert('ZIP 中未找到 data.json'); return }
        const text = await dataFile.async('string')
        payload = JSON.parse(text)

        // Restore attachments to IndexedDB
        const attachmentsFolder = zip.folder('attachments')
        if (attachmentsFolder) {
          const attFiles = []
          attachmentsFolder.forEach((relativePath, zipEntry) => {
            if (!zipEntry.dir) attFiles.push({ id: relativePath, entry: zipEntry })
          })
          for (const { id, entry } of attFiles) {
            try {
              const blob = await entry.async('blob')
              await saveFile(id, blob)
            } catch (_) { /* skip */ }
          }
        }
      } else {
        // Plain JSON fallback (no attachments)
        const text = await file.text()
        payload = JSON.parse(text)
      }

      if (!payload.version || !payload.tasks) {
        alert('无效的备份文件格式')
        return
      }
      const user = getCurrentUser()
      if (!user) return
      const data = JSON.parse(localStorage.getItem('todo_calendar_data') || '{}')
      if (!data.users[user]) return

      const existingIds = new Set((data.users[user].tasks || []).map(t => t.id))
      const newTasks = (payload.tasks || []).filter(t => !existingIds.has(t.id))
      data.users[user].tasks = [...(data.users[user].tasks || []), ...newTasks]

      const existingImp = new Set(data.users[user].importantDays || [])
      data.users[user].importantDays = [
        ...(data.users[user].importantDays || []),
        ...(payload.importantDays || []).filter(d => !existingImp.has(d)),
      ]

      const existingSp = new Set(data.users[user].specialDays || [])
      data.users[user].specialDays = [
        ...(data.users[user].specialDays || []),
        ...(payload.specialDays || []).filter(d => !existingSp.has(d)),
      ]

      if (payload.diaries) {
        if (!data.users[user].diaries) data.users[user].diaries = {}
        for (const [date, diary] of Object.entries(payload.diaries)) {
          if (!data.users[user].diaries[date]) {
            data.users[user].diaries[date] = diary
          }
        }
      }

      localStorage.setItem('todo_calendar_data', JSON.stringify(data))
      loadTasks()
      loadImportantDays()
      alert(`导入成功！新增 ${newTasks.length} 条任务`)
    } catch (err) {
      alert('文件解析失败，请检查文件格式')
    }
  }
  input.click()
}

function onKeyDown(e) {
  // Don't trigger shortcuts when typing in inputs
  const tag = document.activeElement?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return

  if (e.key === 'Escape') {
    if (drawerOpen.value) { closeDrawer(); return }
    appHeader.value?.closeDropdowns()
  }
  if (e.key === 'q' || e.key === 'Q') {
    onToggleImportant()
  }
  if (e.key === 'e' || e.key === 'E') {
    onToggleSpecial()
  }
}

onMounted(() => {
  document.addEventListener('keydown', onKeyDown)
  loadImportantDays()
  loadTasks()

  syncTheme()
  themeObserver = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.attributeName === 'data-theme') syncTheme()
    }
  })
  themeObserver.observe(document.body, { attributes: true, attributeFilter: ['data-theme'] })

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      pageReady.value = true
    })
  })
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeyDown)
  if (themeObserver) themeObserver.disconnect()
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

.page-glow {
  position: fixed;
  inset: 0;
  z-index: 30;
  pointer-events: none;
  background: radial-gradient(circle 300px at 50% 50%, var(--accent-glow), transparent 70%);
  transition: opacity 0.6s ease;
}

[data-theme="night"] .page-glow {
  background: radial-gradient(circle 300px at 50% 50%, rgba(255,245,225,0.40), rgba(240,225,200,0.15) 40%, transparent 65%);
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

/* ===== Ceiling Lamp ===== */
.ceiling-lamp {
  position: fixed;
  top: 0;
  left: 50%;
  transform: translateX(-50%) translateY(-290px);
  z-index: 25;
  display: flex;
  flex-direction: column;
  align-items: center;
  cursor: pointer;
  transition: transform 1.6s cubic-bezier(0.34, 0.1, 0.5, 1);
  filter: drop-shadow(0 0 12px rgba(255, 220, 150, 0.3));
}

.ceiling-lamp.visible {
  transform: translateX(-50%) translateY(0);
}

.lamp-cord {
  width: 2px;
  height: 44px;
  background: linear-gradient(180deg, #555 0%, #777 100%);
  border-radius: 1px;
  flex-shrink: 0;
}

.lamp-shade {
  width: 72px;
  height: 48px;
  background: linear-gradient(180deg, #5a5a5a 0%, #3d3d3d 30%, #4a4a4a 100%);
  clip-path: polygon(25% 0%, 75% 0%, 92% 100%, 8% 100%);
  position: relative;
  border-radius: 3px 3px 0 0;
  transition: background 0.6s ease;
}

.ceiling-lamp.off .lamp-shade {
  background: linear-gradient(180deg, #444 0%, #2e2e2e 30%, #383838 100%);
}

.lamp-bulb {
  position: absolute;
  bottom: -8px;
  left: 50%;
  transform: translateX(-50%);
  width: 26px;
  height: 18px;
  background: radial-gradient(circle at 50% 30%, rgba(255, 245, 210, 0.95) 0%, rgba(255, 210, 130, 0.9) 60%, rgba(255, 180, 80, 0.6) 100%);
  border-radius: 50%;
  box-shadow:
    0 0 18px rgba(255, 225, 160, 0.9),
    0 0 45px rgba(255, 200, 120, 0.5),
    0 0 70px rgba(255, 180, 90, 0.25);
  transition: all 0.6s ease;
}

.ceiling-lamp.off .lamp-bulb {
  background: radial-gradient(circle at 50% 30%, rgba(180, 175, 160, 0.6) 0%, rgba(150, 145, 130, 0.4) 60%, rgba(120, 115, 100, 0.2) 100%);
  box-shadow: 0 0 6px rgba(150, 145, 130, 0.3), 0 0 15px rgba(130, 125, 110, 0.1);
}

.lamp-light {
  position: absolute;
  top: 92px;
  left: 50%;
  transform: translateX(-50%);
  width: 420px;
  height: 560px;
  background:
    radial-gradient(ellipse 80% 30% at 50% 0%, rgba(255, 240, 190, 0.45) 0%, rgba(255, 225, 155, 0.20) 30%, rgba(255, 210, 130, 0.06) 60%, transparent 80%),
    linear-gradient(180deg, rgba(255, 240, 185, 0.35) 0%, rgba(255, 220, 140, 0.12) 35%, transparent 100%);
  clip-path: polygon(43% 0%, 57% 0%, 95% 100%, 5% 100%);
  pointer-events: none;
  mix-blend-mode: screen;
  transition: opacity 0.7s ease;
}

.ceiling-lamp.off .lamp-light {
  opacity: 0;
}

/* ===== Entry animation ===== */
.main-page :deep(.app-header) {
  transform: translateY(-100%);
  transition: transform 0.55s cubic-bezier(0.22, 0.61, 0.36, 1);
}

.main-page.ready :deep(.app-header) {
  transform: translateY(0);
}

.main-page :deep(.calendar-wrapper) {
  opacity: 0;
  transform: translateY(60px) scale(0.95);
  transition: opacity 0.6s cubic-bezier(0.22, 0.61, 0.36, 1) 0.12s,
              transform 0.6s cubic-bezier(0.22, 0.61, 0.36, 1) 0.12s;
}

.main-page.ready :deep(.calendar-wrapper) {
  opacity: 1;
  transform: translateY(0) scale(1);
}

</style>
