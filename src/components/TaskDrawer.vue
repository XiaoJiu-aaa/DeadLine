<template>
  <div class="drawer-wrapper" :class="{ visible: visible }" ref="drawerWrapper">
    <div class="drawer" ref="drawer" @click.stop>
      <div class="drawer-header">
        <div class="drawer-header-left">
          <span class="drawer-date">{{ monthDay }}</span>
          <span class="drawer-weekday">{{ weekday }}</span>
        </div>
        <button class="drawer-close" @click="$emit('close')">
          <svg viewBox="0 0 24 24"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>
        </button>
      </div>

      <div class="drawer-divider"></div>

      <button class="drawer-add" @click="openNewPanel">
        <span class="add-bg">
          <span class="add-bg-layers">
            <span class="add-bg-layer add-bg-layer-1"></span>
            <span class="add-bg-layer add-bg-layer-2"></span>
            <span class="add-bg-layer add-bg-layer-3"></span>
          </span>
        </span>
        <span class="add-inner">
          <span class="add-inner-static">＋ 新建任务</span>
          <span class="add-inner-hover">点击新建</span>
        </span>
      </button>

      <div class="drawer-list" ref="drawerList" @scroll="onListScroll">
        <div class="empty-state" v-if="activeTasks.length === 0 && completedTasks.length === 0">
          <div class="empty-state-icon">
            <svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          </div>
          <p>暂无任务</p>
        </div>

        <template v-for="task in activeTasks" :key="task.id">
          <TaskCard
            :task="task"
            :isExpanded="expandedTaskId === task.id"
            :isEditing="editingTaskId === task.id"
            :isCompleting="completingTaskId === task.id"
            :isDeleting="deletingTaskId === task.id"
            :isPastDate="isPastDate"
            @expand="onExpand(task)"
            @toggleComplete="onToggleComplete(task)"
            @edit="openEditPanel(task)"
            @delete="onDelete(task)"
          />
        </template>

        <div class="section-label" v-if="completedTasks.length">已完成 · {{ completedTasks.length }}</div>

        <template v-for="task in completedTasks" :key="task.id">
          <TaskCard
            :task="task"
            :isExpanded="expandedTaskId === task.id"
            :isEditing="false"
            :isCompleting="false"
            :isDeleting="deletingTaskId === task.id"
            :isPastDate="isPastDate"
            @expand="onExpand(task)"
            @toggleComplete="onToggleComplete(task)"
            @delete="onDelete(task)"
          />
        </template>
      </div>
    </div>

    <div class="edit-connector" :class="{ active: connectorActive }" :style="connectorStyle"></div>

    <TaskEditPanel
      :task="editingTask"
      :dateStr="dateStr"
      :visible="panelVisible"
      :panelStyle="panelPositionStyle"
      @save="onPanelSave"
      @cancel="closePanel"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import TaskEditPanel from './TaskEditPanel.vue'
import { getTaskStatus, CATEGORIES, formatDate, isPast } from '../utils/helpers.js'
import TaskCard from './TaskCard.vue'

const props = defineProps({
  tasks: { type: Array, default: () => [] },
  dateStr: { type: String, default: '' },
  visible: { type: Boolean, default: false },
})

const emit = defineEmits(['close', 'create', 'update', 'delete', 'toggleComplete'])

const drawerWrapper = ref(null)
const drawer = ref(null)
const drawerList = ref(null)

const expandedTaskId = ref(null)
const editingTaskId = ref(null)
const completingTaskId = ref(null)
const deletingTaskId = ref(null)
const panelMode = ref('closed') // 'closed' | 'new' | 'edit'
const panelPositionStyle = ref({})

const editingTask = computed(() => {
  if (panelMode.value === 'edit' && editingTaskId.value) {
    return props.tasks.find(t => t.id === editingTaskId.value) || null
  }
  return null
})

const panelVisible = computed(() => panelMode.value !== 'closed')

const todayStr = computed(() => formatDate(new Date()))
const isPastDate = computed(() => isPast(props.dateStr))

const activeTasks = computed(() => {
  return props.tasks
    .filter(t => !t.completed)
    .sort((a, b) => {
      if (a.isAllDay && !b.isAllDay) return -1
      if (!a.isAllDay && b.isAllDay) return 1
      return 0
    })
})

const completedTasks = computed(() => {
  return props.tasks.filter(t => t.completed)
})

const monthDay = computed(() => {
  if (!props.dateStr) return ''
  const parts = props.dateStr.split('-')
  return `${parseInt(parts[1])}月${parseInt(parts[2])}日`
})

const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六']
const weekday = computed(() => {
  if (!props.dateStr) return ''
  const d = new Date(props.dateStr)
  return weekdays[d.getDay()]
})

// Connector bridge
const connectorActive = ref(false)
const connectorStyle = ref({})

function recalcConnector(cardEl) {
  if (!drawerWrapper.value || !drawer.value || !cardEl) return
  const wrapperRect = drawerWrapper.value.getBoundingClientRect()
  const drawerRect = drawer.value.getBoundingClientRect()
  const cardRect = cardEl.getBoundingClientRect()

  const bridgeH = cardRect.height
  const top = cardRect.top - wrapperRect.top
  const left = drawerRect.right - wrapperRect.left - 3
  const gap = 14

  connectorStyle.value = {
    left: left + 'px',
    top: top + 'px',
    width: (gap + 6) + 'px',
    height: bridgeH + 'px',
  }

  // Position panel vertically centered on the card
  const panelEl = drawerWrapper.value.querySelector('.new-task-panel')
  if (panelEl && panelEl.classList.contains('active')) {
    const panelH = panelEl.offsetHeight
    const bridgeCenter = top + bridgeH / 2
    let mt = bridgeCenter - panelH / 2
    const cardTop = top
    const cardBottom = top + bridgeH
    if (mt < cardTop) mt = cardTop
    if (mt + panelH > cardBottom) mt = cardBottom - panelH
    panelPositionStyle.value = { top: Math.max(0, mt) + 10 + 'px' }
  }

  connectorActive.value = true
}

function onListScroll() {
  if (editingTaskId.value) {
    const cardEl = drawerList.value?.querySelector(`[data-task-id="${editingTaskId.value}"]`)
    if (cardEl) {
      recalcConnector(cardEl)
      // Lock card in visible area
      const listRect = drawerList.value.getBoundingClientRect()
      const cardRect = cardEl.getBoundingClientRect()
      const topGap = cardRect.top - listRect.top
      const bottomGap = listRect.bottom - cardRect.bottom
      if (topGap < 0) {
        drawerList.value.scrollTop += topGap
      } else if (bottomGap < 0) {
        drawerList.value.scrollTop -= bottomGap
      }
    }
  }
}

// Panel open/close
function openNewPanel() {
  if (isPastDate.value) return
  expandedTaskId.value = null
  editingTaskId.value = null
  panelMode.value = 'new'
  connectorActive.value = false
  panelPositionStyle.value = {}
}

function openEditPanel(task) {
  if (isPastDate.value) return
  expandedTaskId.value = task.id
  editingTaskId.value = task.id
  panelMode.value = 'edit'
  nextTick(() => {
    const cardEl = drawerList.value?.querySelector(`[data-task-id="${task.id}"]`)
    if (cardEl) recalcConnector(cardEl)
  })
}

function closePanel() {
  panelMode.value = 'closed'
  editingTaskId.value = null
  connectorActive.value = false
  panelPositionStyle.value = {}
}

function onPanelSave(data) {
  if (panelMode.value === 'edit' && editingTaskId.value) {
    emit('update', { id: editingTaskId.value, data })
  } else {
    emit('create', data)
  }
  closePanel()
}

function onExpand(task) {
  if (expandedTaskId.value === task.id) {
    expandedTaskId.value = null
  } else {
    expandedTaskId.value = task.id
  }
}

function onToggleComplete(task) {
  if (panelVisible.value) return
  if (task.completed) {
    emit('toggleComplete', task.id)
  } else {
    completingTaskId.value = task.id
    setTimeout(() => {
      completingTaskId.value = null
      emit('toggleComplete', task.id)
    }, 1000)
  }
}

function onDelete(task) {
  if (editingTaskId.value === task.id) closePanel()
  deletingTaskId.value = task.id
  setTimeout(() => {
    deletingTaskId.value = null
    emit('delete', task.id)
  }, 480)
}

function onKeyDown(e) {
  const tag = document.activeElement?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA') return

  if (e.key === 'Delete') {
    if (!expandedTaskId.value) return
    const task = props.tasks.find(t => t.id === expandedTaskId.value)
    if (task) onDelete(task)
    return
  }

  if (e.key === 'r' || e.key === 'R') {
    e.preventDefault()
    if (!expandedTaskId.value) return
    if (panelMode.value === 'edit') return
    const task = props.tasks.find(t => t.id === expandedTaskId.value)
    if (task && !task.completed) openEditPanel(task)
  }
}

onMounted(() => {
  document.addEventListener('keydown', onKeyDown)
  window.addEventListener('resize', onResize)
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('resize', onResize)
})

function onResize() {
  if (editingTaskId.value) {
    const cardEl = drawerList.value?.querySelector(`[data-task-id="${editingTaskId.value}"]`)
    if (cardEl) recalcConnector(cardEl)
  }
}

watch(() => props.visible, (v) => {
  if (!v) {
    expandedTaskId.value = null
    editingTaskId.value = null
    closePanel()
  }
})

defineExpose({})
</script>

<style>
/* ===== Drawer Theme Variables ===== */
.drawer-wrapper {
  --drawer-panel-bg: rgba(255,255,255,0.32);
  --drawer-panel-border: rgba(255,255,255,0.5);
  --drawer-glass-highlight: rgba(255,255,255,0.35);
  --drawer-text: #2c2418;
  --drawer-text-secondary: #8a8070;
  --drawer-text-muted: #c0b8a8;
  --drawer-divider: rgba(0,0,0,0.06);
  --drawer-item-bg: rgba(255,255,255,0.3);
  --drawer-item-hover: rgba(255,255,255,0.55);
  --drawer-grain-opacity: 0.3;
  --drawer-shadow-sm: 0 1px 3px rgba(0,0,0,0.04);
  --drawer-shadow-md: 0 8px 32px rgba(0,0,0,0.08);
  --drawer-accent: #4A90D9;
  --drawer-accent-soft: rgba(74,144,217,0.08);
  --drawer-red: #e05555;
  --drawer-red-soft: rgba(224,85,85,0.08);
  --drawer-orange: #e8883a;
  --drawer-orange-soft: rgba(232,136,58,0.08);
  --drawer-green: #5CB85C;
  --drawer-green-soft: rgba(92,184,92,0.1);
  --drawer-purple: #9B59B6;
  --drawer-add-layer1: #93c5fd;
  --drawer-add-layer2: #67e8f9;
  --drawer-add-layer3: #a5b4fc;
  --drawer-add-btn-bg: rgba(59,130,246,0.08);
  --drawer-add-btn-text: #4A90D9;
}

[data-theme="evening"] .drawer-wrapper {
  --drawer-panel-bg: rgba(255,245,232,0.32);
  --drawer-panel-border: rgba(255,230,210,0.45);
  --drawer-glass-highlight: rgba(255,245,230,0.35);
  --drawer-text: #4a3028;
  --drawer-text-secondary: #a08878;
  --drawer-text-muted: #c8b0a0;
  --drawer-divider: rgba(120,80,40,0.08);
  --drawer-item-bg: rgba(255,240,225,0.3);
  --drawer-item-hover: rgba(255,240,225,0.6);
  --drawer-grain-opacity: 0.25;
  --drawer-accent: #d4956b;
  --drawer-accent-soft: rgba(212,149,107,0.1);
  --drawer-red-soft: rgba(224,85,85,0.1);
  --drawer-orange-soft: rgba(232,136,58,0.1);
  --drawer-add-layer1: #fbbf24;
  --drawer-add-layer2: #fb923c;
  --drawer-add-layer3: #f9a8d4;
  --drawer-add-btn-bg: rgba(212,149,107,0.1);
  --drawer-add-btn-text: #d4956b;
  --drawer-green-soft: rgba(92,184,92,0.12);
}

[data-theme="night"] .drawer-wrapper {
  --drawer-panel-bg: rgba(22,22,42,0.38);
  --drawer-panel-border: rgba(255,255,255,0.06);
  --drawer-glass-highlight: rgba(255,255,255,0.04);
  --drawer-text: #d8d6e0;
  --drawer-text-secondary: #8a8a9a;
  --drawer-text-muted: #5a5a70;
  --drawer-divider: rgba(255,255,255,0.06);
  --drawer-item-bg: rgba(255,255,255,0.05);
  --drawer-item-hover: rgba(255,255,255,0.1);
  --drawer-grain-opacity: 0.06;
  --drawer-accent: #7b9ed4;
  --drawer-accent-soft: rgba(123,158,212,0.1);
  --drawer-red-soft: rgba(224,85,85,0.12);
  --drawer-orange-soft: rgba(232,136,58,0.12);
  --drawer-add-layer1: #22d3ee;
  --drawer-add-layer2: #6366f1;
  --drawer-add-layer3: #a78bfa;
  --drawer-add-btn-bg: rgba(99,102,241,0.1);
  --drawer-add-btn-text: #a5b4fc;
  --drawer-green-soft: rgba(92,184,92,0.14);
  --drawer-shadow-sm: 0 1px 3px rgba(0,0,0,0.15);
  --drawer-shadow-md: 0 8px 32px rgba(0,0,0,0.25);
}
</style>

<style scoped>
.drawer-wrapper {
  position: fixed;
  top: 80px;
  right: 24px;
  z-index: 10;
  display: flex;
  align-items: flex-start;
  gap: 0;
  opacity: 0;
  pointer-events: none;
  transform: translateY(16px) scale(0.96);
  transition: opacity 0.35s cubic-bezier(0.4, 0, 0.2, 1),
              transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
}

.drawer-wrapper.visible {
  opacity: 1;
  pointer-events: auto;
  transform: translateY(0) scale(1);
}

.drawer {
  position: relative;
  width: 380px;
  max-height: 82vh;
  background: var(--drawer-panel-bg);
  backdrop-filter: blur(40px) saturate(160%);
  -webkit-backdrop-filter: blur(40px) saturate(160%);
  border: 1px solid var(--drawer-panel-border);
  border-radius: 18px;
  box-shadow:
    0 0 0 1px var(--drawer-glass-highlight) inset,
    0 1px 0 rgba(255,255,255,0.2) inset,
    var(--drawer-shadow-md);
  display: flex;
  flex-direction: column;
  overflow: clip;
  transition: background 0.8s, border-color 0.8s, box-shadow 0.8s;
  flex-shrink: 0;
}

.drawer::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 100;
  pointer-events: none;
  border-radius: inherit;
  opacity: var(--drawer-grain-opacity);
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 180px 180px;
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 20px 14px;
  flex-shrink: 0;
  position: relative;
  z-index: 101;
}

.drawer-header-left {
  display: flex;
  align-items: baseline;
  gap: 8px;
}

.drawer-date {
  font-family: "Noto Serif SC", "PingFang SC", serif;
  font-size: 20px;
  font-weight: 700;
  color: var(--drawer-text);
  letter-spacing: 2px;
  transition: color 0.8s;
}

.drawer-weekday {
  font-size: 12px;
  font-weight: 400;
  color: var(--drawer-text-secondary);
  letter-spacing: 0;
  transition: color 0.8s;
}

.drawer-close {
  width: 32px; height: 32px;
  border: none; border-radius: 50%;
  background: transparent; cursor: pointer;
  color: var(--drawer-text-secondary);
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s ease;
}
.drawer-close:hover { background: rgba(0,0,0,0.05); color: var(--drawer-text); }
[data-theme="night"] .drawer-close:hover { background: rgba(255,255,255,0.08); }
.drawer-close svg { width: 16px; height: 16px; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; }

.drawer-divider {
  height: 1px; margin: 0 18px;
  background: var(--drawer-divider);
  transition: background 0.8s;
  flex-shrink: 0; position: relative; z-index: 101;
}

/* Add button */
.drawer-add {
  all: unset;
  position: relative;
  display: flex; height: 2.8rem;
  align-items: center; justify-content: center;
  border-radius: 9999px;
  margin: 12px 18px;
  font-family: inherit; font-size: 13px; font-weight: 600; letter-spacing: 1px;
  color: var(--drawer-add-btn-text);
  cursor: pointer;
  flex-shrink: 0; z-index: 101;
}

.add-bg {
  overflow: hidden; border-radius: 9999px;
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  transform: scale(1);
  transition: transform 1.8s cubic-bezier(0.19, 1, 0.22, 1);
  background: var(--drawer-add-btn-bg);
}

.add-bg-layers {
  position: absolute; left: 50%; top: 50%;
  transform: translate(-50%, -50%);
  aspect-ratio: 1 / 1; width: max(250%, 12rem);
}

.add-bg-layer {
  border-radius: 9999px;
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  transform: scale(0);
}
.add-bg-layer-1 { background-color: var(--drawer-add-layer1); }
.add-bg-layer-2 { background-color: var(--drawer-add-layer2); }
.add-bg-layer-3 { background-color: var(--drawer-add-layer3); }

.add-inner { position: relative; pointer-events: none; }
.add-inner-static, .add-inner-hover {
  display: block;
  transition: transform 1.4s cubic-bezier(0.19, 1, 0.22, 1), opacity 0.3s linear;
}
.add-inner-hover {
  position: absolute; top: 0; left: 0; width: 100%; text-align: center;
  opacity: 0; transform: translateY(70%); color: #fff;
}
.drawer-add:hover .add-inner-static { opacity: 0; transform: translateY(-70%); }
.drawer-add:hover .add-inner-hover {
  opacity: 1; transform: translateY(0);
  transition: transform 1.4s cubic-bezier(0.19, 1, 0.22, 1), opacity 1.4s cubic-bezier(0.19, 1, 0.22, 1);
}
.drawer-add:hover .add-bg-layer {
  transition: transform 1.3s cubic-bezier(0.19, 1, 0.22, 1), opacity 0.3s linear;
}
.drawer-add:hover .add-bg-layer-1 { transform: scale(1.1); }
.drawer-add:hover .add-bg-layer-2 { transition-delay: 0.1s; transform: scale(1.1); }
.drawer-add:hover .add-bg-layer-3 { transition-delay: 0.2s; transform: scale(1.1); }
.drawer-add:hover .add-bg { transform: scale(1.02); }
.drawer-add:active { transform: scale(0.97); }

/* List */
.drawer-list {
  flex: 1; min-height: 0;
  overflow-y: auto;
  padding: 4px 14px 16px;
  display: flex; flex-direction: column; gap: 4px;
  position: relative; z-index: 101;
  scrollbar-width: none;
  -ms-overflow-style: none;
}
.drawer-list::-webkit-scrollbar { display: none; }

.section-label {
  display: flex; align-items: center; gap: 10px;
  padding: 14px 6px 6px;
  font-size: 11px; font-weight: 600;
  color: var(--drawer-text-muted);
  letter-spacing: 2px;
  transition: color 0.8s;
  flex-shrink: 0;
}
.section-label::after {
  content: ''; flex: 1; height: 1px;
  background: var(--drawer-divider);
  transition: background 0.8s;
}
.section-label:first-child { padding-top: 6px; }
.section-label:first-child::after { display: none; }

.empty-state {
  text-align: center; padding: 48px 20px;
  color: var(--drawer-text-muted);
  transition: color 0.8s;
}
.empty-state-icon {
  width: 56px; height: 56px; margin: 0 auto 14px;
  border-radius: 50%;
  background: var(--drawer-item-bg);
  display: flex; align-items: center; justify-content: center;
  transition: background 0.8s;
}
.empty-state-icon svg {
  width: 24px; height: 24px;
  stroke: var(--drawer-text-muted);
  fill: none; stroke-width: 1.5; stroke-linecap: round;
  opacity: 0.4; transition: stroke 0.8s;
}
.empty-state p { font-size: 13px; letter-spacing: 1px; }

/* Edit Connector */
.edit-connector {
  position: absolute;
  z-index: 2;
  opacity: 0;
  transform: scaleY(0);
  pointer-events: none;
  background: var(--drawer-panel-bg);
  backdrop-filter: blur(40px) saturate(160%);
  -webkit-backdrop-filter: blur(40px) saturate(160%);
  border-top: 1px solid var(--drawer-panel-border);
  border-bottom: 1px solid var(--drawer-panel-border);
  border-left: none;
  border-right: none;
  clip-path: polygon(
    0 0, 25% 8px, 50% 10px, 75% 8px, 100% 0,
    100% 100%, 75% calc(100% - 8px), 50% calc(100% - 10px),
    25% calc(100% - 8px), 0 100%
  );
  box-shadow:
    0 1px 0 var(--drawer-glass-highlight) inset,
    0 -1px 0 rgba(0,0,0,0.02) inset;
  transition:
    opacity 0.3s ease,
    transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1),
    background 0.8s, border-color 0.8s, box-shadow 0.8s;
}
.edit-connector.active { opacity: 1; transform: scaleY(1); }
.edit-connector::after {
  content: ''; position: absolute; inset: 0; pointer-events: none;
  opacity: var(--drawer-grain-opacity);
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 180px 180px;
}
</style>
