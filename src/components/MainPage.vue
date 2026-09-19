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

    <!--
      加载失败提示。
      ★ 为什么这个条不能省：数据在后端之后，「后端挂了」和「今天没任务」
        在界面上都是「一片空白」。用户会以为自己的数据丢了，
        反复刷新，而真正的原因（虚拟机没开机、隧道断了）完全看不出来。
        所以必须明确区分「加载失败」和「没有数据」。
    -->
    <div v-if="loadError" class="load-error">
      <span class="load-error-icon">⚠</span>
      <span class="load-error-text">{{ loadError }}</span>
      <button class="load-error-btn" @click="retryLoad">重试</button>
    </div>

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
import { attachments, markedDays, tasks as tasksApi } from '../api/index.js'
import { endSession, verify } from '../session.js'
import { formatDate } from '../utils/helpers.js'

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
/** 加载失败的原因。非空时界面上会显示提示条 */
const loadError = ref('')

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

/**
 * 把异常显示到顶部的提示条上。
 *
 * 数据在后端之后，请求失败是常态之一（VM 没开机、隧道断了、令牌失效），
 * 静默失败会让用户以为「数据没了」。所以每个数据操作都要有失败路径。
 */
function showError(e) {
  loadError.value = e?.message || '操作失败，请稍后重试'
}

async function loadImportantDays() {
  const data = await markedDays.list()
  importantDays.value = data.importantDays
  specialDays.value = data.specialDays
}

/** 用户点了提示条上的「重试」 */
async function retryLoad() {
  loadError.value = ''
  try {
    await Promise.all([loadTasks(), loadImportantDays()])
  } catch (e) {
    showError(e)
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

async function onToggleImportant() {
  if (!canMark.value) return
  await applyMarkedDay(isImportant.value ? null : 'important')
}

async function onToggleSpecial() {
  if (!canMark.value) return
  await applyMarkedDay(isSpecial.value ? null : 'special')
}

/**
 * 设置或取消当前选中日期的标记。
 *
 * ★ 前端只传「我想让它变成什么」——'important' / 'special' / null，
 *   互斥关系完全交给后端。前端不需要检查「另一个类型里有没有同一天」。
 *
 * 改造前有两个对称的函数（toggleImportantDay / toggleSpecialDay），
 * 各自维护「往一个数组加之前先从另一个数组删掉」的逻辑。
 * 现在它们合并成了这一个函数，而且互斥那段代码整个消失了——
 * 因为数据库的 UNIQUE(user_id, date) 保证了同一天不可能有两条记录。
 */
async function applyMarkedDay(type) {
  try {
    const data = await markedDays.set(selectedDate.value, type)
    importantDays.value = data.importantDays
    specialDays.value = data.specialDays
    loadError.value = ''
  } catch (e) {
    showError(e)
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

/**
 * 从后端拉全部任务。
 *
 * 改造前是「读 localStorage」，现在是「发一个 HTTP 请求」——
 * 所以它变成了异步的，所有调用点都要 await。
 *
 * 注意后端返回的每条任务里已经带上了 attachments 数组，
 * 不需要（也不能）再单独去 IndexedDB 里查附件列表。
 */
async function loadTasks() {
  tasks.value = await tasksApi.list()
}

function onHighlightDate(dateStr) {
  highlightedDate.value = dateStr || ''
}

async function onTaskCreate(formData) {
  try {
    // ① 先建任务，拿到数据库生成的自增 id
    const created = await tasksApi.create({
      title: formData.title,
      date: formData.date,
      isAllDay: formData.isAllDay,
      timeLabel: formData.timeLabel,
      latestStart: formData.latestStart || null,
      category: formData.category,
      note: formData.note,
    })

    // ② 再逐个上传附件
    //
    // ★ 顺序不能反。改造前任务的 id 是前端本地生成的（generateId('t')），
    //   所以可以「先造 id、再把附件挂上去」。
    //   现在 id 由数据库生成，必须先建任务拿到 id，
    //   才能往 /api/tasks/{id}/attachments 上传。
    //
    // 注意这里是「尽力而为」：如果第 2 个附件传失败，任务和第 1 个附件
    // 已经存在了（后端无法回滚）。用一个事务跨多个 HTTP 请求是做不到的。
    for (const att of formData.pendingAttachments || []) {
      if (!att._file) continue
      const uploaded = await attachments.upload(created.id, att._file)
      created.attachments.push(uploaded)
    }

    tasks.value.unshift(created)
    loadError.value = ''
  } catch (e) {
    showError(e)
  }
}

async function onTaskUpdate({ id, data }) {
  const task = tasks.value.find(t => t.id === id)
  if (!task) return

  try {
    // ① 先改任务的字段
    await tasksApi.update(id, {
      title: data.title,
      category: data.category,
      date: data.date,
      isAllDay: data.isAllDay,
      timeLabel: data.timeLabel,
      note: data.note,
      latestStart: data.latestStart || null,
    })

    // ② 附件要单独算差集，因为后端把附件设计成了独立的资源
    //    （PUT /api/tasks/{id} 明确不改动附件，避免两套逻辑冲突）
    const before = task.attachments || []
    const pending = data.pendingAttachments || []
    const keepIds = new Set(pending.filter(a => a.id).map(a => a.id))

    // 删掉用户移除的
    for (const att of before) {
      if (!keepIds.has(att.id)) {
        await attachments.remove(att.id)
      }
    }

    // 上传用户新加的
    for (const att of pending) {
      if (att._file) {
        await attachments.upload(id, att._file)
      }
    }

    // ③ 附件变动之后重新拉一次列表
    //
    // 也可以用更新的返回值 + 手工拼装附件数组，但那样要维护
    // 「哪些删了、哪些加了、服务端返回的 id 是什么」一堆状态，
    // 容易出错。任务数量本来就不大，多一个请求换确定性是划算的。
    await loadTasks()
    loadError.value = ''
  } catch (e) {
    showError(e)
  }
}

async function onTaskDelete(taskId) {
  try {
    // ★ 前端不需要逐个删附件。
    //
    // 后端在删任务时会一起处理：删附件记录、删磁盘文件、扣减用户配额。
    // 改造前这里要手工 deleteFiles() 清理 IndexedDB，现在留给后端做——
    // 它做得更完整（磁盘和配额也管了），而且不会漏。
    await tasksApi.remove(taskId)
    tasks.value = tasks.value.filter(t => t.id !== taskId)
    loadError.value = ''
  } catch (e) {
    showError(e)
  }
}

async function clearArchive() {
  // 保留最近 30 天
  const cutoff = formatDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000))
  try {
    const result = await tasksApi.clearArchive(cutoff)
    if (!result.deleted) return
    // 用同一个 cutoff 过滤本地列表，和后端的条件保持一致
    tasks.value = tasks.value.filter(t => t.date >= cutoff)
    loadError.value = ''
  } catch (e) {
    showError(e)
  }
}

async function onTaskToggleComplete(taskId) {
  const task = tasks.value.find(t => t.id === taskId)
  if (!task) return

  try {
    // 用后端返回的对象覆盖本地那一条。
    //
    // ★ 这里刻意**不做乐观更新**（先改本地再发请求）。
    //   乐观更新失败时要回滚，回滚又要处理「回滚到哪个状态」，
    //   状态一多就容易出现「界面显示已完成、服务器其实没改」。
    //   等响应回来再改，慢一点点，但界面永远和服务器一致。
    const updated = await tasksApi.setCompleted(taskId, !task.completed)
    Object.assign(task, updated)
    loadError.value = ''

    // 庆祝动画的判断读的是本地状态，上面同步完就对了
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
  } catch (e) {
    showError(e)
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
      // 退出登录 = 清掉本地的令牌。
      //
      // ★ 注意后端**没有**「注销令牌」这个操作——JWT 是无状态的，
      //   服务端不记录「谁登录了」，所以也没法让一个已签发的令牌失效。
      //   令牌在到期（7 天）之前一直有效。
      //
      //   这是 JWT 相对 Session 的固有代价：换来的是服务端不必存会话、
      //   天然支持多实例，付出的是「无法主动登出」。
      //   （真要支持就要维护一张「已失效令牌」黑名单，那又变成有状态了。）
      //
      //   对用户的影响：在公共电脑上退出登录后，那个令牌如果被人抄走，
      //   仍然能用。所以敏感场景下令牌有效期要设得短一些。
      endSession()
      router.push('/login')
      break
    case 'clearArchive':
      clearArchive()
      break
  }
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

/**
 * 加载数据。
 *
 * ★ 第一步是向后端确认令牌还有效，而不是直接拉数据。
 *
 * 因为本地存着的令牌可能已经失效（过期了、签发它的密钥换了、
 * 或者用户已经被删除）。路由守卫只能做同步的本地判断（「有没有令牌」），
 * 判断不了「令牌还有没有用」——那需要问后端。
 *
 * 三种结果要区别对待：
 *   ① 令牌有效        → 正常加载
 *   ② 令牌失效（401） → 回登录页（client 里的 onUnauthorized 已经处理了跳转）
 *   ③ 连不上后端      → 保留令牌，显示错误提示。不能把用户踢下线，
 *                       因为他什么都没做错，只是服务器暂时不可达
 */
async function initData() {
  try {
    const ok = await verify()
    if (!ok) return
  } catch (e) {
    showError(e)
    return
  }

  try {
    await Promise.all([loadTasks(), loadImportantDays()])
    loadError.value = ''
  } catch (e) {
    showError(e)
  }
}

onMounted(() => {
  document.addEventListener('keydown', onKeyDown)
  initData()

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

/* ===== Load error banner ===== */

.load-error {
  position: fixed;
  top: 76px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 60;
  display: flex;
  align-items: center;
  gap: 10px;
  max-width: min(680px, calc(100vw - 32px));
  padding: 10px 14px;
  border-radius: 12px;
  background: rgba(255, 244, 238, 0.96);
  border: 1px solid rgba(200, 90, 70, 0.32);
  box-shadow: 0 6px 22px rgba(120, 60, 40, 0.14);
  font-size: 13px;
  line-height: 1.5;
  color: #8a3a2a;
  animation: loadErrorIn 0.28s ease;
}

@keyframes loadErrorIn {
  from { opacity: 0; transform: translateX(-50%) translateY(-6px); }
  to   { opacity: 1; transform: translateX(-50%) translateY(0); }
}

.load-error-icon {
  flex-shrink: 0;
  font-size: 15px;
}

.load-error-text {
  flex: 1;
  min-width: 0;
}

.load-error-btn {
  flex-shrink: 0;
  padding: 5px 12px;
  border-radius: 8px;
  border: 1px solid rgba(200, 90, 70, 0.4);
  background: transparent;
  color: #8a3a2a;
  font-size: 12px;
  font-family: inherit;
  cursor: pointer;
}

.load-error-btn:hover {
  background: rgba(200, 90, 70, 0.1);
}

</style>
