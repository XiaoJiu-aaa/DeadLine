<template>
  <div class="new-task-panel" :class="{ active: visible }" ref="panelRef" :style="panelStyle">
    <div class="ntp-header">
      <span class="ntp-title">{{ isEdit ? '编辑任务' : '新建任务' }}</span>
      <button class="ntp-close" @click="$emit('cancel')">
        <svg viewBox="0 0 24 24"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>
      </button>
    </div>

    <div class="ntp-divider"></div>

    <div class="ntp-body">
      <input class="ntp-input" type="text" placeholder="任务名称" v-model="form.title" ref="titleInput" />

      <div class="ntp-row">
        <div class="ntp-select-wrapper" ref="selectWrapper">
          <select class="ntp-select" v-model="form.category">
            <option value="" disabled>选择分类</option>
            <option value="study">学习</option>
            <option value="work">工作</option>
            <option value="life">生活</option>
            <option value="club">其他</option>
          </select>
          <div class="ntp-select-trigger" :class="{ open: selectOpen }" tabindex="0" role="combobox" @click="toggleSelect" @keydown.enter="toggleSelect" @keydown.space.prevent="toggleSelect" @keydown.escape="closeSelect">
            <span :class="{ 'ntp-select-placeholder': !form.category }">{{ categoryLabel || '选择分类' }}</span>
            <svg class="ntp-select-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="6 9 12 15 18 9"/></svg>
          </div>
        </div>
        <input class="ntp-input" type="date" v-model="form.date" />
      </div>

      <div class="ntp-all-day-row">
        <span class="ntp-all-day-label">全天</span>
        <div class="ntp-toggle" :class="{ active: form.isAllDay }" @click="form.isAllDay = !form.isAllDay" role="switch" :aria-checked="form.isAllDay" tabindex="0" @keydown.enter.prevent="form.isAllDay = !form.isAllDay" @keydown.space.prevent="form.isAllDay = !form.isAllDay">
          <div class="ntp-toggle-knob"></div>
        </div>
      </div>

      <div class="ntp-time-row" :class="{ hidden: form.isAllDay }">
        <span class="ntp-label">时间段</span>
        <div class="ntp-row">
          <input class="ntp-input" type="time" v-model="form.timeStart" />
          <input class="ntp-input" type="time" v-model="form.timeEnd" />
        </div>
      </div>

      <span class="ntp-label">备注</span>
      <textarea class="ntp-textarea" placeholder="备注（可选）" v-model="form.note" maxlength="250"></textarea>

      <span class="ntp-label">附件</span>
      <div class="ntp-attach-zone" @click="openFilePicker">
        <svg viewBox="0 0 24 24"><path d="M21.44 11.05l-9.19 9.19a6 6 0 01-8.49-8.49l9.19-9.19a4 4 0 015.66 5.66l-9.2 9.19a2 2 0 01-2.83-2.83l8.49-8.48"/></svg>
        <span class="ntp-attach-text">点击选择文件</span>
      </div>
      <input type="file" ref="fileInput" multiple style="display:none" @change="onFilesSelected" />
      <div class="ntp-attach-list" v-if="pendingAttachments.length">
        <div class="ntp-attach-item" v-for="(f, i) in pendingAttachments" :key="i">
          <span class="ntp-attach-name">{{ f.name }}</span>
          <span class="ntp-attach-size">{{ formatSize(f.size) }}</span>
          <button class="ntp-attach-remove" @click="removeAttachment(i)" title="移除">
            <svg viewBox="0 0 24 24"><line x1="6" y1="6" x2="18" y2="18"/><line x1="18" y1="6" x2="6" y2="18"/></svg>
          </button>
        </div>
      </div>
    </div>

    <div class="ntp-footer">
      <button class="ntp-btn ntp-cancel" @click="$emit('cancel')">取消</button>
      <button class="ntp-btn ntp-save" @click="onSave">
        保存
        <span class="ntp-save-star star-1"><svg viewBox="0 0 784 816"><path class="star-fill" d="M392 0c-21 210-184 378-392 408 208 29 371 197 392 408 21-210 184-379 392-408-208-29-371-198-392-408z"/></svg></span>
        <span class="ntp-save-star star-2"><svg viewBox="0 0 784 816"><path class="star-fill" d="M392 0c-21 210-184 378-392 408 208 29 371 197 392 408 21-210 184-379 392-408-208-29-371-198-392-408z"/></svg></span>
        <span class="ntp-save-star star-3"><svg viewBox="0 0 784 816"><path class="star-fill" d="M392 0c-21 210-184 378-392 408 208 29 371 197 392 408 21-210 184-379 392-408-208-29-371-198-392-408z"/></svg></span>
        <span class="ntp-save-star star-4"><svg viewBox="0 0 784 816"><path class="star-fill" d="M392 0c-21 210-184 378-392 408 208 29 371 197 392 408 21-210 184-379 392-408-208-29-371-198-392-408z"/></svg></span>
        <span class="ntp-save-star star-5"><svg viewBox="0 0 784 816"><path class="star-fill" d="M392 0c-21 210-184 378-392 408 208 29 371 197 392 408 21-210 184-379 392-408-208-29-371-198-392-408z"/></svg></span>
        <span class="ntp-save-star star-6"><svg viewBox="0 0 784 816"><path class="star-fill" d="M392 0c-21 210-184 378-392 408 208 29 371 197 392 408 21-210 184-379 392-408-208-29-371-198-392-408z"/></svg></span>
      </button>
    </div>
  </div>

  <!-- Teleport dropdown -->
  <Teleport to="body">
    <div class="ntp-select-dropdown" :class="{ open: selectOpen }" ref="dropdownRef" :style="dropdownStyle" role="listbox">
      <div class="ntp-select-option" :class="{ selected: form.category === 'study' }" data-value="study" @click="selectCategory('study')">学习</div>
      <div class="ntp-select-option" :class="{ selected: form.category === 'work' }" data-value="work" @click="selectCategory('work')">工作</div>
      <div class="ntp-select-option" :class="{ selected: form.category === 'life' }" data-value="life" @click="selectCategory('life')">生活</div>
      <div class="ntp-select-option" :class="{ selected: form.category === 'club' }" data-value="club" @click="selectCategory('club')">其他</div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed, watch, onBeforeUnmount } from 'vue'
import { CATEGORIES } from '../utils/helpers.js'

const props = defineProps({
  task: { type: Object, default: null },
  dateStr: { type: String, default: '' },
  visible: { type: Boolean, default: false },
  panelStyle: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['save', 'cancel'])

const isEdit = computed(() => !!props.task)

const form = reactive({
  title: '',
  category: '',
  date: '',
  isAllDay: false,
  timeStart: '09:00',
  timeEnd: '10:00',
  note: '',
})

const pendingAttachments = ref([])
const titleInput = ref(null)
const fileInput = ref(null)
const selectWrapper = ref(null)
const dropdownRef = ref(null)
const selectOpen = ref(false)
const dropdownStyle = ref({})

const categoryLabel = computed(() => {
  const cat = CATEGORIES[form.category]
  return cat ? cat.label : ''
})

function initForm() {
  if (props.task) {
    form.title = props.task.title || ''
    form.category = props.task.category || ''
    form.date = props.task.date || props.dateStr
    form.isAllDay = props.task.isAllDay || false
    form.note = props.task.note || ''
    if (!props.task.isAllDay && props.task.timeLabel && props.task.timeLabel.includes('–')) {
      const parts = props.task.timeLabel.split('–').map(s => s.trim())
      form.timeStart = parts[0] || '09:00'
      form.timeEnd = parts[1] || '10:00'
    } else {
      form.timeStart = '09:00'
      form.timeEnd = '10:00'
    }
    pendingAttachments.value = (props.task.attachments || []).map(a => ({ name: a.name, size: a.size, id: a.id }))
  } else {
    form.title = ''
    form.category = ''
    form.date = props.dateStr || ''
    form.isAllDay = false
    form.timeStart = '09:00'
    form.timeEnd = '10:00'
    form.note = ''
    pendingAttachments.value = []
  }
}

watch(() => props.visible, (v) => {
  if (v) {
    initForm()
  } else {
    closeSelect()
  }
})

watch(() => props.task, () => {
  if (props.visible) initForm()
})

function openFilePicker() {
  fileInput.value?.click()
}

function onFilesSelected() {
  const files = fileInput.value?.files
  if (!files || !files.length) return
  for (const f of files) {
    if (!pendingAttachments.value.some(a => a.name === f.name)) {
      pendingAttachments.value.push({ name: f.name, size: f.size, _file: f })
    }
  }
  fileInput.value.value = ''
}

function removeAttachment(index) {
  pendingAttachments.value.splice(index, 1)
}

function formatSize(bytes) {
  if (!bytes || bytes < 1024) return bytes ? bytes + ' B' : ''
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function toggleSelect() {
  if (selectOpen.value) { closeSelect() }
  else { openSelect() }
}

function openSelect() {
  positionDropdown()
  selectOpen.value = true
  document.addEventListener('click', onClickOutside, true)
  window.addEventListener('scroll', positionDropdown, true)
  window.addEventListener('resize', positionDropdown)
}

function closeSelect() {
  selectOpen.value = false
  document.removeEventListener('click', onClickOutside, true)
  window.removeEventListener('scroll', positionDropdown, true)
  window.removeEventListener('resize', positionDropdown)
}

function onClickOutside(e) {
  const wrapper = selectWrapper.value
  const dropdown = dropdownRef.value
  if (!wrapper || !dropdown) return
  if (!wrapper.contains(e.target) && !dropdown.contains(e.target)) closeSelect()
}

function positionDropdown() {
  const trigger = selectWrapper.value?.querySelector('.ntp-select-trigger')
  if (!trigger) return
  const rect = trigger.getBoundingClientRect()
  dropdownStyle.value = {
    position: 'fixed',
    top: (rect.bottom + 6) + 'px',
    left: rect.left + 'px',
    width: rect.width + 'px',
  }
}

function selectCategory(val) {
  form.category = val
  closeSelect()
}

function onSave() {
  const title = form.title.trim()
  if (!title) {
    titleInput.value?.focus()
    titleInput.value.style.borderColor = 'var(--drawer-red)'
    setTimeout(() => {
      if (titleInput.value) titleInput.value.style.borderColor = ''
    }, 1000)
    return
  }
  const isAllDay = form.isAllDay
  const timeLabel = isAllDay ? '全天' : `${form.timeStart} – ${form.timeEnd}`
  emit('save', {
    title,
    category: form.category || 'study',
    date: form.date || props.dateStr,
    isAllDay,
    timeLabel,
    timeStart: form.timeStart,
    timeEnd: form.timeEnd,
    note: form.note.trim(),
    pendingAttachments: [...pendingAttachments.value],
  })
}

defineExpose({ save: onSave })

onBeforeUnmount(() => {
  document.removeEventListener('click', onClickOutside, true)
  window.removeEventListener('scroll', positionDropdown, true)
  window.removeEventListener('resize', positionDropdown)
})
</script>

<style scoped>
.new-task-panel {
  position: relative;
  width: 0;
  flex-shrink: 0;
  max-height: 82vh;
  background: var(--drawer-panel-bg, rgba(255,255,255,0.32));
  backdrop-filter: blur(40px) saturate(160%);
  -webkit-backdrop-filter: blur(40px) saturate(160%);
  border: 1px solid transparent;
  border-radius: 18px;
  box-shadow: none;
  overflow: hidden;
  opacity: 0;
  transform: translateX(-30px);
  transition:
    width 0.45s cubic-bezier(0.34, 1.56, 0.64, 1),
    opacity 0.3s ease,
    transform 0.45s cubic-bezier(0.34, 1.56, 0.64, 1),
    border-color 0.8s,
    box-shadow 0.45s ease;
  display: flex;
  flex-direction: column;
  margin-left: 0;
}
.new-task-panel.active {
  width: 300px;
  opacity: 1;
  transform: translateX(0);
  margin-left: 14px;
  border: 1px solid var(--drawer-panel-border, rgba(255,255,255,0.5));
  box-shadow:
    0 0 0 1px var(--drawer-glass-highlight, rgba(255,255,255,0.35)) inset,
    0 1px 0 rgba(255,255,255,0.2) inset,
    0 8px 32px rgba(0,0,0,0.08);
}
.new-task-panel.active::after {
  content: '';
  position: absolute;
  inset: 0;
  z-index: 100;
  pointer-events: none;
  border-radius: inherit;
  opacity: var(--drawer-grain-opacity, 0.3);
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 180px 180px;
}

.ntp-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 20px 14px;
  flex-shrink: 0;
  position: relative;
  z-index: 101;
}
.ntp-title {
  font-family: "Noto Serif SC", "PingFang SC", serif;
  font-size: 18px;
  font-weight: 700;
  color: var(--drawer-text, #2c2418);
  letter-spacing: 2px;
  transition: color 0.8s;
}
.ntp-close {
  width: 32px; height: 32px;
  border: none; border-radius: 50%;
  background: transparent; cursor: pointer;
  color: var(--drawer-text-secondary, #8a8070);
  display: flex; align-items: center; justify-content: center;
  transition: all 0.2s ease;
}
.ntp-close:hover { background: rgba(0,0,0,0.05); color: var(--drawer-text, #2c2418); }
[data-theme="night"] .ntp-close:hover { background: rgba(255,255,255,0.08); }
.ntp-close svg { width: 16px; height: 16px; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; }

.ntp-divider {
  height: 1px; margin: 0 18px;
  background: var(--drawer-divider, rgba(0,0,0,0.06));
  transition: background 0.8s, opacity 0.35s ease;
  flex-shrink: 0; position: relative; z-index: 101;
  opacity: 0;
}
.new-task-panel.active .ntp-divider { opacity: 1; }

.ntp-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px 18px;
  display: flex; flex-direction: column; gap: 14px;
  position: relative; z-index: 101;
  opacity: 0;
  transition: opacity 0.2s ease 0.15s;
}
.new-task-panel.active .ntp-body { opacity: 1; }
.ntp-body::-webkit-scrollbar { width: 4px; }
.ntp-body::-webkit-scrollbar-track { background: transparent; }
.ntp-body::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.1); border-radius: 2px; }
[data-theme="night"] .ntp-body::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); }

.ntp-input, .ntp-textarea {
  width: 100%; padding: 10px 14px;
  border: 1px solid var(--drawer-divider, rgba(0,0,0,0.06));
  border-radius: 8px;
  background: var(--drawer-item-bg, rgba(255,255,255,0.3));
  font-family: inherit; font-size: 13.5px;
  color: var(--drawer-text, #2c2418);
  outline: none;
  transition: all 0.2s ease, background 0.8s, color 0.8s, border-color 0.8s;
}
.ntp-input:focus, .ntp-textarea:focus {
  border-color: var(--drawer-accent, #4A90D9);
  box-shadow: 0 0 0 3px var(--drawer-accent-soft, rgba(74,144,217,0.08));
  background: var(--drawer-item-hover, rgba(255,255,255,0.55));
}
.ntp-input::placeholder, .ntp-textarea::placeholder { color: var(--drawer-text-muted, #c0b8a8); transition: color 0.8s; }
.ntp-textarea { min-height: 80px; resize: vertical; scrollbar-width: none; line-height: 1.5; }
.ntp-textarea::-webkit-scrollbar { display: none; }

.ntp-row { display: flex; gap: 10px; }
.ntp-row .ntp-input { flex: 1; min-width: 0; }

.ntp-select-wrapper { position: relative; flex: 1; min-width: 0; }
.ntp-select-wrapper .ntp-select { position: absolute; top: 0; left: 0; width: 100%; height: 100%; opacity: 0; pointer-events: none; }

.ntp-select-trigger {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  width: 100%; padding: 10px 14px;
  border: 1px solid var(--drawer-divider, rgba(0,0,0,0.06));
  border-radius: 8px;
  background: var(--drawer-item-bg, rgba(255,255,255,0.3));
  font-family: inherit; font-size: 13.5px;
  color: var(--drawer-text, #2c2418);
  cursor: pointer; user-select: none;
  transition: all 0.2s ease, background 0.8s, color 0.8s, border-color 0.8s;
}
.ntp-select-trigger.open {
  border-color: var(--drawer-accent, #4A90D9);
  box-shadow: 0 0 0 3px var(--drawer-accent-soft, rgba(74,144,217,0.08));
  background: var(--drawer-item-hover, rgba(255,255,255,0.55));
}
.ntp-select-trigger .ntp-select-chevron { width: 12px; height: 12px; flex-shrink: 0; transition: transform 0.25s ease; color: var(--drawer-text-secondary, #8a8070); }
.ntp-select-trigger.open .ntp-select-chevron { transform: rotate(180deg); }
.ntp-select-placeholder { color: var(--drawer-text-muted, #c0b8a8); }

.ntp-label { font-size: 11px; font-weight: 600; color: var(--drawer-text-muted, #c0b8a8); letter-spacing: 1.5px; transition: color 0.8s; margin-bottom: -8px; }

.ntp-all-day-row { display: flex; align-items: center; justify-content: space-between; }
.ntp-all-day-label { font-size: 13px; color: var(--drawer-text-secondary, #8a8070); user-select: none; transition: color 0.8s; }

.ntp-toggle { position: relative; width: 44px; height: 24px; border-radius: 12px; background: var(--drawer-divider, rgba(0,0,0,0.06)); cursor: pointer; transition: background 0.25s ease; flex-shrink: 0; }
.ntp-toggle.active { background: var(--drawer-accent, #4A90D9); }
.ntp-toggle-knob { position: absolute; top: 3px; left: 3px; width: 18px; height: 18px; border-radius: 50%; background: #fff; box-shadow: 0 1px 3px rgba(0,0,0,0.15); transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1); }
.ntp-toggle.active .ntp-toggle-knob { transform: translateX(20px); }

.ntp-time-row { transition: opacity 0.25s ease, max-height 0.35s ease, margin 0.35s ease; overflow: hidden; }
.ntp-time-row.hidden { opacity: 0; max-height: 0; margin-top: 0; pointer-events: none; }

.ntp-attach-zone {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px;
  padding: 22px 16px;
  border: 1.5px dashed var(--drawer-divider, rgba(0,0,0,0.06));
  border-radius: 8px;
  background: var(--drawer-item-bg, rgba(255,255,255,0.3));
  cursor: pointer;
  transition: all 0.2s ease, background 0.8s, border-color 0.8s;
  text-align: center;
}
.ntp-attach-zone:hover { border-color: var(--drawer-accent, #4A90D9); background: var(--drawer-accent-soft, rgba(74,144,217,0.08)); }
.ntp-attach-zone svg { width: 28px; height: 28px; stroke: var(--drawer-text-muted, #c0b8a8); fill: none; stroke-width: 1.5; stroke-linecap: round; opacity: 0.5; transition: stroke 0.8s; }
.ntp-attach-zone .ntp-attach-text { font-size: 12px; color: var(--drawer-text-secondary, #8a8070); font-weight: 500; transition: color 0.8s; }

.ntp-attach-list { display: flex; flex-direction: column; gap: 6px; }
.ntp-attach-list:empty { display: none; }
.ntp-attach-item { display: flex; align-items: center; gap: 8px; padding: 8px 12px; border-radius: 8px; background: var(--drawer-item-bg, rgba(255,255,255,0.3)); font-size: 12.5px; transition: background 0.8s; }
.ntp-attach-item .ntp-attach-name { flex: 1; min-width: 0; color: var(--drawer-text, #2c2418); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; transition: color 0.8s; }
.ntp-attach-item .ntp-attach-size { font-size: 11px; color: var(--drawer-text-muted, #c0b8a8); flex-shrink: 0; transition: color 0.8s; }
.ntp-attach-item .ntp-attach-remove { width: 22px; height: 22px; border: none; border-radius: 50%; background: transparent; cursor: pointer; color: var(--drawer-text-muted, #c0b8a8); display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.2s ease; }
.ntp-attach-item .ntp-attach-remove:hover { background: var(--drawer-red-soft, rgba(224,85,85,0.08)); color: var(--drawer-red, #e05555); }
.ntp-attach-item .ntp-attach-remove svg { width: 12px; height: 12px; stroke: currentColor; fill: none; stroke-width: 2; stroke-linecap: round; }

.ntp-footer { display: flex; gap: 10px; padding: 14px 18px 18px; flex-shrink: 0; position: relative; z-index: 101; opacity: 0; transition: opacity 0.2s ease 0.1s; }
.new-task-panel.active .ntp-footer { opacity: 1; }

.ntp-btn { flex: 1; padding: 10px 0; border-radius: 8px; border: 1px solid var(--drawer-divider, rgba(0,0,0,0.06)); background: var(--drawer-item-bg, rgba(255,255,255,0.3)); cursor: pointer; font-family: inherit; font-size: 13px; font-weight: 600; letter-spacing: 1px; color: var(--drawer-text-secondary, #8a8070); transition: all 0.2s ease, background 0.8s, color 0.8s, border-color 0.8s; }
.ntp-btn:hover { background: var(--drawer-item-hover, rgba(255,255,255,0.55)); }

.ntp-btn.ntp-save { position: relative; background: #fec195; color: #181818; border: 3px solid #fec195; box-shadow: 0 0 0 rgba(254,193,149,0.35); transition: all 0.3s ease-in-out; overflow: visible; }
.ntp-btn.ntp-save:hover { background: transparent; color: #fec195; box-shadow: 0 0 25px rgba(254,193,149,0.35); transform: translateY(-1px); }
[data-theme="evening"] .ntp-btn.ntp-save:hover { color: #fff; }
.ntp-btn.ntp-save:active { transform: scale(0.97); }

.ntp-save-star { position: absolute; width: 16px; height: auto; z-index: -1; transition: all 1s cubic-bezier(0.05, 0.83, 0.43, 0.96); pointer-events: none; }
.ntp-save-star.star-1 { top: 20%; left: 15%; width: 18px; }
.ntp-save-star.star-2 { top: 45%; left: 40%; width: 10px; transition-duration: 0.8s; }
.ntp-save-star.star-3 { top: 60%; left: 30%; width: 6px; }
.ntp-save-star.star-4 { top: 15%; left: 55%; width: 8px; transition-duration: 0.7s; }
.ntp-save-star.star-5 { top: 35%; left: 70%; width: 12px; transition-duration: 0.9s; }
.ntp-save-star.star-6 { top: 50%; left: 10%; width: 5px; transition-duration: 0.6s; }

.ntp-btn.ntp-save:hover .ntp-save-star { z-index: 2; filter: drop-shadow(0 0 6px #fec195); }
.ntp-btn.ntp-save:hover .star-1 { top: -60%; left: -20%; width: 20px; }
.ntp-btn.ntp-save:hover .star-2 { top: -20%; left: 5%; width: 12px; }
.ntp-btn.ntp-save:hover .star-3 { top: 65%; left: 20%; width: 7px; }
.ntp-btn.ntp-save:hover .star-4 { top: 25%; left: 75%; width: 9px; }
.ntp-btn.ntp-save:hover .star-5 { top: 30%; left: 105%; width: 14px; }
.ntp-btn.ntp-save:hover .star-6 { top: 55%; left: 65%; width: 6px; }

.ntp-btn.ntp-save .star-fill { fill: #fec195; }
.ntp-btn.ntp-save:hover .star-fill { fill: #fec195; }
</style>

<style>
/* Teleported dropdown — must be non-scoped */
.ntp-select-dropdown {
  margin: 0;
  background: var(--drawer-panel-bg, rgba(255,255,255,0.32));
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--drawer-panel-border, rgba(255,255,255,0.5));
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0,0,0,0.08);
  overflow: hidden;
  z-index: 1000;
  display: none;
  transition: background 0.8s, border-color 0.8s;
}
.ntp-select-dropdown.open {
  display: block;
}
.ntp-select-option {
  padding: 10px 14px;
  font-size: 13.5px;
  color: var(--drawer-text, #2c2418);
  cursor: pointer;
  transition: background 0.15s ease, color 0.8s;
  font-family: inherit;
}
.ntp-select-option:hover {
  background: var(--drawer-item-hover, rgba(255,255,255,0.55));
}
.ntp-select-option.selected {
  color: var(--drawer-accent, #4A90D9);
  font-weight: 600;
  background: var(--drawer-accent-soft, rgba(74,144,217,0.08));
}
[data-theme="night"] .ntp-select-dropdown {
  background: rgba(30,30,55,0.94);
  border-color: rgba(255,255,255,0.1);
  box-shadow: 0 8px 32px rgba(0,0,0,0.25);
}
[data-theme="night"] .ntp-select-option {
  color: #d8d6e0;
}
[data-theme="night"] .ntp-select-option:hover {
  background: rgba(255,255,255,0.1);
}
[data-theme="night"] .ntp-select-option.selected {
  color: #7b9ed4;
  background: rgba(123,158,212,0.12);
}
</style>
