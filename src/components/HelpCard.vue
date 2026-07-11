<template>
  <div class="help-wrapper">
    <button class="help-btn" @click.stop="toggle">
      <span>?</span>
    </button>
    <div class="help-card-container" :class="{ visible: open }">
      <div class="canvas">
        <div
          v-for="i in 25"
          :key="i"
          class="tracker"
          :class="'tr-' + i"
        ></div>
        <div id="help-card">
          <div class="help-title">快捷键</div>
          <div class="help-content">
            <div class="help-row">
              <kbd>Q</kbd><span>标记 / 取消重要日</span>
            </div>
            <div class="help-row">
              <kbd>E</kbd><span>标记 / 取消特殊日</span>
            </div>
            <div class="help-row">
              <kbd>Delete</kbd><span>删除已展开的任务</span>
            </div>
            <div class="help-row">
              <kbd>Esc</kbd><span>关闭抽屉 / 下拉菜单</span>
            </div>
          </div>
          <div class="help-footer">2876331185@qq.com<br>Made By XiaoJiang</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const emit = defineEmits(['opened'])

const open = ref(false)

function toggle() {
  open.value = !open.value
  if (open.value) emit('opened')
}

function close() {
  open.value = false
}

defineExpose({ close })
</script>

<style scoped>
.help-wrapper { position: relative; }

.help-btn {
  width: 34px; height: 34px;
  border: none;
  border-radius: 8px;
  background: transparent;
  cursor: pointer;
  font-size: 17px;
  font-weight: 700;
  font-family: "Noto Serif SC", serif;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary, #8a7560);
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.help-btn:hover {
  background: var(--hover-bg, rgba(0, 0, 0, 0.04));
  color: var(--text-color, #3d2e1c);
}

/* Card container */
.help-card-container {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  width: 280px;
  height: 320px;
  transition: 200ms;
  opacity: 0;
  visibility: hidden;
  transform: translateY(-8px) scale(0.95);
  transition: all 0.28s cubic-bezier(0.4, 0, 0.2, 1);
}

.help-card-container.visible {
  opacity: 1;
  visibility: visible;
  transform: translateY(0) scale(1);
}

.help-card-container:active {
  width: 270px;
  height: 310px;
}

#help-card {
  position: absolute;
  inset: 0;
  z-index: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 20px;
  transition: 700ms;
  background: linear-gradient(43deg, rgb(65, 88, 208) 0%, rgb(200, 80, 192) 46%, rgb(255, 204, 112) 100%);
  padding: 24px;
  box-sizing: border-box;
}

#help-card::before {
  content: '';
  background: linear-gradient(43deg, rgb(65, 88, 208) 0%, rgb(200, 80, 192) 46%, rgb(255, 204, 112) 100%);
  filter: blur(2rem);
  opacity: 30%;
  width: 100%;
  height: 100%;
  position: absolute;
  z-index: -1;
  transition: 200ms;
}

.canvas {
  perspective: 800px;
  inset: 0;
  z-index: 200;
  position: absolute;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr 1fr 1fr;
  grid-template-rows: 1fr 1fr 1fr 1fr 1fr;
  gap: 0;
}

.tracker { position: absolute; z-index: 200; width: 100%; height: 100%; }
.tracker:hover { cursor: pointer; }
.tracker:hover ~ #help-card { transition: 300ms; filter: brightness(1.1); }

/* 5x5 grid: use nth-child positioning */
.tracker:nth-child(1)  { grid-area: 1 / 1; }
.tracker:nth-child(2)  { grid-area: 1 / 2; }
.tracker:nth-child(3)  { grid-area: 1 / 3; }
.tracker:nth-child(4)  { grid-area: 1 / 4; }
.tracker:nth-child(5)  { grid-area: 1 / 5; }
.tracker:nth-child(6)  { grid-area: 2 / 1; }
.tracker:nth-child(7)  { grid-area: 2 / 2; }
.tracker:nth-child(8)  { grid-area: 2 / 3; }
.tracker:nth-child(9)  { grid-area: 2 / 4; }
.tracker:nth-child(10) { grid-area: 2 / 5; }
.tracker:nth-child(11) { grid-area: 3 / 1; }
.tracker:nth-child(12) { grid-area: 3 / 2; }
.tracker:nth-child(13) { grid-area: 3 / 3; }
.tracker:nth-child(14) { grid-area: 3 / 4; }
.tracker:nth-child(15) { grid-area: 3 / 5; }
.tracker:nth-child(16) { grid-area: 4 / 1; }
.tracker:nth-child(17) { grid-area: 4 / 2; }
.tracker:nth-child(18) { grid-area: 4 / 3; }
.tracker:nth-child(19) { grid-area: 4 / 4; }
.tracker:nth-child(20) { grid-area: 4 / 5; }
.tracker:nth-child(21) { grid-area: 5 / 1; }
.tracker:nth-child(22) { grid-area: 5 / 2; }
.tracker:nth-child(23) { grid-area: 5 / 3; }
.tracker:nth-child(24) { grid-area: 5 / 4; }
.tracker:nth-child(25) { grid-area: 5 / 5; }

/* 3D tilt per cell */
.tracker:nth-child(1):hover  ~ #help-card { transition: 125ms ease-in-out; transform: rotateX(20deg) rotateY(-10deg) rotateZ(0deg); }
.tracker:nth-child(2):hover  ~ #help-card { transition: 125ms ease-in-out; transform: rotateX(20deg) rotateY(-5deg) rotateZ(0deg); }
.tracker:nth-child(3):hover  ~ #help-card { transition: 125ms ease-in-out; transform: rotateX(20deg) rotateY(0deg) rotateZ(0deg); }
.tracker:nth-child(4):hover  ~ #help-card { transition: 125ms ease-in-out; transform: rotateX(20deg) rotateY(5deg) rotateZ(0deg); }
.tracker:nth-child(5):hover  ~ #help-card { transition: 125ms ease-in-out; transform: rotateX(20deg) rotateY(10deg) rotateZ(0deg); }
.tracker:nth-child(6):hover  ~ #help-card { transition: 125ms ease-in-out; transform: rotateX(10deg) rotateY(-10deg) rotateZ(0deg); }
.tracker:nth-child(7):hover  ~ #help-card { transition: 125ms ease-in-out; transform: rotateX(10deg) rotateY(-5deg) rotateZ(0deg); }
.tracker:nth-child(8):hover  ~ #help-card { transition: 125ms ease-in-out; transform: rotateX(10deg) rotateY(0deg) rotateZ(0deg); }
.tracker:nth-child(9):hover  ~ #help-card { transition: 125ms ease-in-out; transform: rotateX(10deg) rotateY(5deg) rotateZ(0deg); }
.tracker:nth-child(10):hover ~ #help-card { transition: 125ms ease-in-out; transform: rotateX(10deg) rotateY(10deg) rotateZ(0deg); }
.tracker:nth-child(11):hover ~ #help-card { transition: 125ms ease-in-out; transform: rotateX(0deg) rotateY(-10deg) rotateZ(0deg); }
.tracker:nth-child(12):hover ~ #help-card { transition: 125ms ease-in-out; transform: rotateX(0deg) rotateY(-5deg) rotateZ(0deg); }
.tracker:nth-child(13):hover ~ #help-card { transition: 125ms ease-in-out; transform: rotateX(0deg) rotateY(0deg) rotateZ(0deg); }
.tracker:nth-child(14):hover ~ #help-card { transition: 125ms ease-in-out; transform: rotateX(0deg) rotateY(5deg) rotateZ(0deg); }
.tracker:nth-child(15):hover ~ #help-card { transition: 125ms ease-in-out; transform: rotateX(0deg) rotateY(10deg) rotateZ(0deg); }
.tracker:nth-child(16):hover ~ #help-card { transition: 125ms ease-in-out; transform: rotateX(-10deg) rotateY(-10deg) rotateZ(0deg); }
.tracker:nth-child(17):hover ~ #help-card { transition: 125ms ease-in-out; transform: rotateX(-10deg) rotateY(-5deg) rotateZ(0deg); }
.tracker:nth-child(18):hover ~ #help-card { transition: 125ms ease-in-out; transform: rotateX(-10deg) rotateY(0deg) rotateZ(0deg); }
.tracker:nth-child(19):hover ~ #help-card { transition: 125ms ease-in-out; transform: rotateX(-10deg) rotateY(5deg) rotateZ(0deg); }
.tracker:nth-child(20):hover ~ #help-card { transition: 125ms ease-in-out; transform: rotateX(-10deg) rotateY(10deg) rotateZ(0deg); }
.tracker:nth-child(21):hover ~ #help-card { transition: 125ms ease-in-out; transform: rotateX(-20deg) rotateY(-10deg) rotateZ(0deg); }
.tracker:nth-child(22):hover ~ #help-card { transition: 125ms ease-in-out; transform: rotateX(-20deg) rotateY(-5deg) rotateZ(0deg); }
.tracker:nth-child(23):hover ~ #help-card { transition: 125ms ease-in-out; transform: rotateX(-20deg) rotateY(0deg) rotateZ(0deg); }
.tracker:nth-child(24):hover ~ #help-card { transition: 125ms ease-in-out; transform: rotateX(-20deg) rotateY(5deg) rotateZ(0deg); }
.tracker:nth-child(25):hover ~ #help-card { transition: 125ms ease-in-out; transform: rotateX(-20deg) rotateY(10deg) rotateZ(0deg); }

.help-title {
  font-size: 18px;
  font-weight: 700;
  color: #fff;
  letter-spacing: 1px;
  margin-bottom: 16px;
}

.help-content {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.help-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.help-row kbd {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 32px;
  height: 22px;
  padding: 2px 8px;
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.22);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  letter-spacing: 0.5px;
}

.help-row span {
  color: rgba(255, 255, 255, 0.85);
  font-size: 13px;
  letter-spacing: 0.5px;
}

.help-footer {
  margin-top: 18px;
  color: rgba(255, 255, 255, 0.6);
  font-size: 12px;
  letter-spacing: 1px;
}
</style>
