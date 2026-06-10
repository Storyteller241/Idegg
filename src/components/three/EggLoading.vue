<template>
  <div class="egg-loading-container">
    <!-- 磨砂玻璃背景 - 参考蛋池空状态风格 -->
    <div class="loading-glass">
      <div class="loading-icon">🥚</div>
      <div class="loading-text">Idea Space</div>
      <div class="loading-dots">
        <span v-for="i in 3" :key="i" :class="{ active: dotIndex >= i }">·</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

// 点动画索引
const dotIndex = ref(0)

// 点动画定时器
let dotTimer: number | null = null

onMounted(() => {
  // 启动点动画
  dotTimer = window.setInterval(() => {
    dotIndex.value = (dotIndex.value + 1) % 4
  }, 400)
})

onUnmounted(() => {
  if (dotTimer) {
    clearInterval(dotTimer)
    dotTimer = null
  }
})
</script>

<style lang="less" scoped>
.egg-loading-container {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  overflow: hidden;
  // 深色半透明背景，类似蛋池风格
  background: rgba(10, 10, 10, 0.4);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.loading-glass {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  // padding: 48px 64px;
  // 磨砂玻璃效果
  // background: rgba(255, 255, 255, 0.15);
  // backdrop-filter: blur(30px);
  // -webkit-backdrop-filter: blur(30px);
  // border: 1px solid rgba(255, 255, 255, 0.2);
  // border-radius: 24px;
  // box-shadow: 
  //   0 25px 50px -12px rgba(0, 0, 0, 0.25),
  //   inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.loading-icon {
  font-size: 64px;
  opacity: 0.8;
  animation: float 3s ease-in-out infinite;
  filter: drop-shadow(0 4px 12px rgba(0, 0, 0, 0.2));
}

.loading-text {
  font-size: 24px;
  font-weight: 500;
  letter-spacing: 2px;
  color: rgba(255, 255, 255, 0.9);
  text-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
}

.loading-dots {
  font-size: 32px;
  color: rgba(255, 255, 255, 0.7);
  letter-spacing: 4px;
  height: 32px;
  font-weight: 300;
  
  span {
    opacity: 0.3;
    transition: opacity 0.3s ease;
    
    &.active {
      opacity: 1;
    }
  }
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

// 进入/退出动画
:global(.loading-fade-enter-active),
:global(.loading-fade-leave-active) {
  transition: all 0.6s cubic-bezier(0.4, 0, 0.2, 1);
}

:global(.loading-fade-enter-from),
:global(.loading-fade-leave-to) {
  opacity: 0;
  transform: scale(1.05);
}
</style>
