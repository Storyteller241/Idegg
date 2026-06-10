<template>
  <teleport to="body">
    <transition name="modal-fade">
      <div v-if="visible" class="modal-overlay" @click.self="handleClose">
        <div class="modal-container" :class="{ 'modal-enter': visible }">
          <!-- 头部：创建者信息 -->
          <div class="modal-header">
            <div class="creator-info">
              <div class="creator-avatar">
                <img v-if="eggDetail?.creator_avatar" :src="getAvatarUrl(eggDetail.creator_avatar)" alt="avatar" />
                <div v-else class="avatar-placeholder">
                  {{ eggDetail?.creator_name ? eggDetail.creator_name.charAt(0).toUpperCase() : 'U' }}
                </div>
              </div>
              <div class="creator-meta">
                <div class="creator-name">{{ eggDetail?.creator_name || '未知用户' }}</div>
                <div class="egg-status">
                  <span class="status-dot" :style="{ background: statusColor }"></span>
                  {{ statusText }}
                </div>
              </div>
            </div>
            <div class="close-btn" @click="handleClose">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
          </div>

          <!-- 主体内容 -->
          <div class="modal-body">
            <!-- Idea 详情 -->
            <div class="idea-section">
              <h2 class="idea-title">{{ idea?.title || '未命名 Idea' }}</h2>
              <div v-if="idea?.content" class="idea-content">{{ idea.content }}</div>
              <div class="idea-meta">
                <span class="meta-item">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  {{ formatTime(idea?.createTime) }}
                </span>
              </div>
            </div>

            <!-- AI 分析卡片 -->
            <div class="ai-card" :class="{ 'ai-streaming': isAnalyzing, 'ai-done': !isAnalyzing && aiContent }">
              <div class="ai-header">
                <span class="ai-icon">🪄</span>
                <span class="ai-title">AI 导师分析</span>
                <button
                  v-if="!isAnalyzing && aiContent"
                  class="ai-retry-btn"
                  @click="startStreamAnalysis"
                  title="重新分析"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                    <polyline points="23 4 23 10 17 10" />
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                  </svg>
                </button>
              </div>
              <!-- 流式加载中 -->
              <div v-if="isAnalyzing && !aiContent" class="ai-loading">
                <div class="egg-pulse">
                  <div class="pulse-ring"></div>
                  <div class="pulse-ring delay"></div>
                  <span class="pulse-egg">🥚</span>
                </div>
                <span class="loading-text">AI 正在思考...</span>
              </div>
              <!-- 流式内容 -->
              <div v-else-if="aiContent" class="ai-stream-content">
                <div v-if="aiIsStale" class="ai-stale-hint">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                  <span>技能信息已更新，结果可能已过期</span>
                  <button class="stale-retry-btn" @click="startStreamAnalysis">重新分析</button>
                </div>
                <div class="ai-markdown" v-html="renderMarkdown(aiContent)"></div>
                <span v-if="isAnalyzing" class="streaming-cursor"></span>
              </div>
              <div v-else class="ai-empty">
                点击重试，让 AI 导师分析你的 Idea
              </div>
            </div>

            <!-- 人类评分卡片 -->
            <div class="rating-card">
              <div class="rating-header">
                <span class="rating-icon">👥</span>
                <span class="rating-title">人类评分</span>
                <span v-if="humanRatingCount > 0" class="rating-count">{{ humanRatingCount }} 人评价</span>
              </div>
              
              <!-- 评分展示/操作区 -->
              <div class="rating-content">
                <!-- 平均分展示 -->
                <div v-if="humanRatingCount > 0" class="rating-average">
                  <span class="average-value">{{ humanRatingAvg }}</span>
                  <div class="average-stars">
                    <svg v-for="i in 5" :key="i" viewBox="0 0 24 24" 
                         :class="['star-icon', { 'filled': i <= Math.round(parseFloat(humanRatingAvg || '0')) }]">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                  </div>
                </div>
                <div v-else class="rating-empty">
                  暂无评分，来当第一个评价者吧～
                </div>

                <!-- 评分操作区 -->
                <div v-if="!isOwner && userStore.isLoggedIn" class="rating-action">
                  <div v-if="eggDetail?.user_has_rated" class="rated-info">
                    <span class="rated-text">您已评分</span>
                    <div class="user-rating-stars">
                      <svg v-for="i in 5" :key="i" viewBox="0 0 24 24" 
                           :class="['star-icon', 'small', { 'filled': i <= (eggDetail?.user_rating || 0) }]">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    </div>
                  </div>
                  <div v-else class="rating-input">
                    <span class="rating-prompt">点击星星评分：</span>
                    <div class="star-input" @mouseleave="hoverRating = 0">
                      <svg v-for="i in 5" :key="i" viewBox="0 0 24 24" 
                           :class="['star-icon', 'interactive', { 'filled': i <= (hoverRating || selectedRating), 'hovered': i <= hoverRating }]"
                           @mouseenter="hoverRating = i"
                           @click="handleRate(i)">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    </div>
                  </div>
                </div>
                <div v-else-if="isOwner" class="rating-hint">
                  您是创建者，无法为自己评分
                </div>
                <div v-else class="rating-hint">
                  登录后即可参与评分
                </div>
              </div>
            </div>

            <!-- 回复流 -->
            <div class="comments-section">
              <h3 class="section-title">
                回复
                <span class="comment-count">{{ comments.length }}</span>
              </h3>
              <div v-if="isLoadingComments" class="comments-loading">
                <t-loading size="small" text="加载中..." />
              </div>
              <div v-else-if="comments.length === 0" class="comments-empty">
                暂无回复，来说点什么吧～
              </div>
              <div v-else class="comments-list">
                <div v-for="comment in comments" :key="comment.id" class="comment-item">
                  <div class="comment-avatar">
                    <img v-if="comment.avatar" :src="getAvatarUrl(comment.avatar)" alt="avatar" />
                    <div v-else class="avatar-placeholder">
                      {{ comment.username ? comment.username.charAt(0).toUpperCase() : 'U' }}
                    </div>
                  </div>
                  <div class="comment-content">
                    <div class="comment-header">
                      <div class="header-left">
                        <span class="comment-author">{{ comment.username }}</span>
                        <span class="comment-time">{{ formatCommentTime(comment.created_at) }}</span>
                      </div>
                      <button
                        v-if="comment.user_id === userStore.user?.id"
                        class="delete-comment-btn"
                        @click="handleDeleteComment(comment.id)"
                        title="删除评论"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                          <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                        </svg>
                      </button>
                    </div>
                    <div class="comment-text">{{ comment.content }}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 底部：操作区 -->
          <div class="modal-footer">
            <!-- 回复输入框 -->
            <div class="comment-input-area">
              <t-input
                v-model="newComment"
                placeholder="写下你的想法..."
                size="large"
                class="comment-input"
                @enter="handleSubmitComment"
              />
              <t-button
                theme="primary"
                size="large"
                :loading="isSubmittingComment"
                :disabled="!newComment.trim()"
                @click="handleSubmitComment"
              >
                回复
              </t-button>
            </div>

            <!-- 操作按钮 -->
            <div class="action-buttons">
              <t-button
                v-if="isOwner"
                theme="danger"
                variant="text"
                size="large"
                class="break-btn"
                @click="handleBreak"
              >
                <template #icon>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="18" height="18">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                </template>
                打碎蛋
              </t-button>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { MessagePlugin, DialogPlugin } from 'tdesign-vue-next'
import { useUserStore } from '../../stores/user'
import { eggApi, type Comment, type EggData } from '../../api/eggApi'
import type { Idea } from '../../types'
import { marked } from 'marked'

// AI 分析状态
const aiContent = ref('')
const isAnalyzing = ref(false)
const aiIsStale = ref(false)
let aiController: AbortController | null = null

const props = defineProps<{
  visible: boolean
  idea: Idea | null
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'break': [idea: Idea]
}>()

const userStore = useUserStore()

// 状态
const eggDetail = ref<EggData | null>(null)
const comments = ref<Comment[]>([])
const newComment = ref('')
const isLoadingComments = ref(false)
const isSubmittingComment = ref(false)

// 评分相关状态
const hoverRating = ref(0)
const selectedRating = ref(0)
const isSubmittingRating = ref(false)

// 是否是创建者
const isOwner = computed(() => {
  return eggDetail.value?.user_id === userStore.user?.id
})

// 状态文本和颜色
const statusText = computed(() => {
  if (!eggDetail.value) return '新鲜'
  return eggDetail.value.status || '新鲜'
})

const statusColor = computed(() => {
  return eggDetail.value?.displayColor || '#FFFFFF'
})

// 人类评分相关计算属性
const humanRatingAvg = computed(() => {
  return eggDetail.value?.human_score_avg || '0.0'
})

const humanRatingCount = computed(() => {
  return eggDetail.value?.human_rating_count || 0
})

// 格式化时间
const formatTime = (timestamp: number | undefined): string => {
  if (!timestamp) return ''
  const date = new Date(timestamp)
  return date.toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// API 基础 URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL
const ASSET_BASE_URL = import.meta.env.VITE_ASSET_BASE_URL || API_BASE_URL

// 获取完整头像 URL
const getAvatarUrl = (avatar: string | null): string => {
  if (!avatar) return ''
  if (avatar.startsWith('http')) return avatar
  return `${ASSET_BASE_URL}${avatar}`
}

// 格式化评论时间
const formatCommentTime = (timeStr: string): string => {
  const date = new Date(timeStr)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / (60 * 1000))
  const hours = Math.floor(diff / (60 * 60 * 1000))
  const days = Math.floor(diff / (24 * 60 * 60 * 1000))

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  return date.toLocaleDateString('zh-CN')
}

// 加载蛋详情
const loadEggDetail = async () => {
  if (!props.idea?.dbId) return

  try {
    const result = await eggApi.getEggDetail(props.idea.dbId)
    eggDetail.value = result.data
  } catch (error: any) {
    console.error('加载蛋详情失败:', error)
  }
}

// 加载评论
const loadComments = async () => {
  if (!props.idea?.dbId) return

  isLoadingComments.value = true
  try {
    const result = await eggApi.getComments(props.idea.dbId)
    comments.value = result.data
  } catch (error: any) {
    console.error('加载评论失败:', error)
  } finally {
    isLoadingComments.value = false
  }
}

// Markdown 渲染
const renderMarkdown = (text: string): string => {
  return marked.parse(text, { async: false }) as string
}

// 先查缓存，有缓存直接显示，无缓存则流式分析
const loadAIAnalysis = async () => {
  if (!props.idea?.dbId) return

  aiContent.value = ''
  aiIsStale.value = false

  try {
    const result = await eggApi.getCachedAnalysis(props.idea.dbId)
    if (result.data) {
      aiContent.value = result.data.content
      aiIsStale.value = result.data.is_stale
      return
    }
  } catch (e) {
    // 缓存查询失败，降级到流式分析
  }

  // 无缓存，触发流式分析
  startStreamAnalysis()
}

// SSE 流式 AI 分析
const startStreamAnalysis = () => {
  if (!props.idea?.dbId) return

  stopStreamAnalysis()

  aiContent.value = ''
  aiIsStale.value = false
  isAnalyzing.value = true
  aiController = eggApi.analyzeEgg(
    props.idea.dbId,
    (text: string) => {
      aiContent.value += text
    },
    () => {
      isAnalyzing.value = false
      aiController = null
    },
    (error: string) => {
      console.error('AI 分析失败:', error)
      isAnalyzing.value = false
      aiController = null
      if (aiContent.value) {
        aiContent.value += `\n\n> ⚠️ 分析中断：${error}`
      } else {
        aiContent.value = `> ⚠️ 分析失败：${error}`
      }
    }
  )
}

// 停止流式分析
const stopStreamAnalysis = () => {
  if (aiController) {
    aiController.abort()
    aiController = null
  }
  isAnalyzing.value = false
}

// 提交评论
const handleSubmitComment = async () => {
  const content = newComment.value.trim()
  if (!content || !props.idea?.dbId) return

  isSubmittingComment.value = true
  try {
    await eggApi.addComment(props.idea.dbId, content)
    newComment.value = ''
    MessagePlugin.success('回复成功')
    // 刷新评论列表
    await loadComments()
  } catch (error: any) {
    MessagePlugin.error(error.message || '回复失败')
  } finally {
    isSubmittingComment.value = false
  }
}

// 删除评论
const handleDeleteComment = async (commentId: number) => {
  try {
    await eggApi.deleteComment(commentId)
    MessagePlugin.success('评论已删除')
    // 刷新评论列表
    await loadComments()
  } catch (error: any) {
    MessagePlugin.error(error.message || '删除失败')
  }
}

// 关闭弹窗
const handleClose = () => {
  stopStreamAnalysis()
  emit('update:visible', false)
  // 清空数据
  eggDetail.value = null
  comments.value = []
  aiContent.value = ''
  newComment.value = ''
  // 重置评分状态
  hoverRating.value = 0
  selectedRating.value = 0
}

// 提交评分
const handleRate = async (score: number) => {
  if (!props.idea?.dbId || isSubmittingRating.value) return
  
  // 检查用户是否已登录
  if (!userStore.isLoggedIn) {
    MessagePlugin.warning('请先登录')
    return
  }
  
  // 检查是否是创建者
  if (isOwner.value) {
    MessagePlugin.warning('不能给自己的作品评分')
    return
  }
  
  // 检查是否已评分
  if (eggDetail.value?.user_has_rated) {
    MessagePlugin.warning('您已经评分过了')
    return
  }
  
  isSubmittingRating.value = true
  selectedRating.value = score
  
  try {
    const result = await eggApi.rateEgg(props.idea.dbId, score)
    MessagePlugin.success('评分成功！')
    
    // 更新本地数据
    if (eggDetail.value) {
      eggDetail.value.user_has_rated = true
      eggDetail.value.user_rating = score
      eggDetail.value.human_score_avg = result.data.human_score_avg
      eggDetail.value.human_rating_count = result.data.human_rating_count
    }
  } catch (error: any) {
    MessagePlugin.error(error.message || '评分失败')
    selectedRating.value = 0
  } finally {
    isSubmittingRating.value = false
    hoverRating.value = 0
  }
}

// 打碎蛋
const handleBreak = () => {
  if (!props.idea) return
  
  const confirmDialog = DialogPlugin.confirm({
    header: '确认打碎蛋',
    body: '打碎后蛋将消失，这个操作不可恢复，确定要打碎吗？',
    confirmBtn: {
      content: '确认打碎',
      theme: 'danger',
    },
    cancelBtn: {
      content: '取消',
      theme: 'default',
    },
    onConfirm: () => {
      emit('break', props.idea!)
      emit('update:visible', false)
      confirmDialog.destroy()
    },
    onCancel: () => {
      confirmDialog.destroy()
    },
  })
}

// 监听 visible 变化
watch(() => props.visible, (newVal) => {
  if (newVal && props.idea) {
    loadEggDetail()
    loadComments()
    // 查缓存 or 流式分析
    loadAIAnalysis()
  }
})
</script>

<style lang="less" scoped>
// 遮罩层
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

// 弹窗容器 - 白色磨砂基调
.modal-container {
  width: 100%;
  max-width: 520px;
  max-height: 85vh;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(30px);
  -webkit-backdrop-filter: blur(30px);
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  transform: scale(0.9);
  opacity: 0;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.modal-enter {
  transform: scale(1);
  opacity: 1;
}

// 淡入动画
.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.3s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
}

// 头部
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24px 28px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.15);
}

.creator-info {
  display: flex;
  align-items: center;
  gap: 14px;
}

.creator-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, #00c8ff, #0096ff);
  box-shadow: 0 4px 12px rgba(0, 150, 255, 0.25);

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .avatar-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 20px;
    font-weight: 600;
    color: #fff;
  }
}

.creator-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.creator-name {
  font-size: 16px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.85);
}

.egg-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.5);
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.close-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: rgba(0, 0, 0, 0.4);
  transition: all 0.2s ease;

  svg {
    width: 20px;
    height: 20px;
  }

  &:hover {
    background: rgba(0, 0, 0, 0.05);
    color: rgba(0, 0, 0, 0.7);
  }
}

// 主体内容
.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px 28px;
  scrollbar-width: thin;
  scrollbar-color: rgba(0, 0, 0, 0.2) transparent;

  &::-webkit-scrollbar {
    width: 6px;
  }

  &::-webkit-scrollbar-thumb {
    background: rgba(0, 0, 0, 0.2);
    border-radius: 3px;
  }
}

// Idea 详情
.idea-section {
  margin-bottom: 24px;
}

.idea-title {
  font-size: 22px;
  font-weight: 700;
  color: rgba(0, 0, 0, 0.9);
  margin-bottom: 12px;
  line-height: 1.4;
}

.idea-content {
  font-size: 15px;
  color: rgba(0, 0, 0, 0.65);
  line-height: 1.7;
  margin-bottom: 12px;
}

.idea-meta {
  display: flex;
  gap: 16px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.4);

  svg {
    color: rgba(0, 0, 0, 0.3);
  }
}

// AI 分析卡片
.ai-card {
  background: linear-gradient(135deg, rgba(0, 200, 255, 0.08), rgba(0, 150, 255, 0.05));
  border-radius: 20px;
  padding: 20px;
  margin-bottom: 24px;
  border: 1px solid rgba(0, 200, 255, 0.15);
  transition: all 0.3s ease;

  &.ai-streaming {
    border-color: rgba(0, 200, 255, 0.35);
    box-shadow: 0 0 20px rgba(0, 200, 255, 0.1);
  }
}

.ai-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.ai-retry-btn {
  margin-left: auto;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 200, 255, 0.12);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(0, 150, 255, 0.7);
  transition: all 0.2s ease;

  &:hover {
    background: rgba(0, 200, 255, 0.25);
    color: #0096ff;
    transform: rotate(180deg);
  }
}

.ai-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
  padding: 24px 0;
}

// 蛋脉冲动画
.egg-pulse {
  position: relative;
  width: 48px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.pulse-egg {
  font-size: 28px;
  animation: eggBounce 1.2s ease-in-out infinite;
  position: relative;
  z-index: 1;
}

.pulse-ring {
  position: absolute;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  border: 2px solid rgba(0, 200, 255, 0.4);
  animation: pulseRing 1.5s ease-out infinite;

  &.delay {
    animation-delay: 0.5s;
  }
}

@keyframes eggBounce {
  0%, 100% {
    transform: translateY(0) scale(1);
  }
  50% {
    transform: translateY(-8px) scale(1.05);
  }
}

@keyframes pulseRing {
  0% {
    transform: scale(1);
    opacity: 0.6;
  }
  100% {
    transform: scale(2);
    opacity: 0;
  }
}

.loading-text {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.5);
  animation: textFade 1.5s ease-in-out infinite;
}

@keyframes textFade {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 1; }
}

// 流式内容区
.ai-stream-content {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.75);
  line-height: 1.7;
  padding: 14px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 14px;
  position: relative;

  // Markdown 元素样式
  :deep(h1), :deep(h2), :deep(h3) {
    font-weight: 700;
    color: rgba(0, 0, 0, 0.85);
    margin: 12px 0 6px;
    line-height: 1.4;
  }
  :deep(h1) { font-size: 18px; }
  :deep(h2) { font-size: 16px; }
  :deep(h3) { font-size: 15px; }

  :deep(p) {
    margin: 4px 0;
  }

  :deep(strong) {
    color: rgba(0, 100, 180, 0.9);
    font-weight: 600;
  }

  :deep(ul), :deep(ol) {
    margin: 6px 0;
    padding-left: 20px;
  }

  :deep(li) {
    margin: 2px 0;
  }

  :deep(code) {
    background: rgba(0, 0, 0, 0.06);
    padding: 1px 6px;
    border-radius: 4px;
    font-family: 'SF Mono', 'Fira Code', monospace;
    font-size: 13px;
  }

  :deep(pre) {
    background: rgba(0, 0, 0, 0.05);
    padding: 10px 14px;
    border-radius: 8px;
    overflow-x: auto;
    margin: 8px 0;

    code {
      background: none;
      padding: 0;
    }
  }

  :deep(blockquote) {
    border-left: 3px solid rgba(0, 150, 255, 0.3);
    padding-left: 12px;
    margin: 8px 0;
    color: rgba(0, 0, 0, 0.55);
  }

  :deep(hr) {
    border: none;
    border-top: 1px solid rgba(0, 0, 0, 0.08);
    margin: 10px 0;
  }
}

// 缓存过期提示
.ai-stale-hint {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  margin-bottom: 10px;
  background: rgba(255, 180, 0, 0.1);
  border: 1px solid rgba(255, 180, 0, 0.25);
  border-radius: 8px;
  font-size: 12px;
  color: rgba(180, 120, 0, 0.85);

  svg { flex-shrink: 0; }
}

.stale-retry-btn {
  margin-left: auto;
  padding: 2px 10px;
  border: 1px solid rgba(255, 180, 0, 0.4);
  border-radius: 6px;
  background: transparent;
  color: rgba(180, 120, 0, 0.9);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(255, 180, 0, 0.15);
    border-color: rgba(255, 180, 0, 0.6);
  }
}

// 打字光标
.streaming-cursor {
  display: inline-block;
  width: 2px;
  height: 16px;
  background: #0096ff;
  margin-left: 2px;
  vertical-align: text-bottom;
  animation: cursorBlink 0.8s step-end infinite;
}

@keyframes cursorBlink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.ai-icon {
  font-size: 18px;
}

.ai-title {
  font-size: 15px;
  font-weight: 600;
  color: rgba(0, 150, 255, 0.9);
}

.ai-empty {
  text-align: center;
  padding: 20px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.4);
  cursor: pointer;
  border: 1px dashed rgba(0, 200, 255, 0.25);
  border-radius: 14px;
  transition: all 0.2s ease;

  &:hover {
    border-color: rgba(0, 200, 255, 0.5);
    color: rgba(0, 150, 255, 0.7);
    background: rgba(0, 200, 255, 0.05);
  }
}

// 人类评分卡片
.rating-card {
  background: linear-gradient(135deg, rgba(255, 200, 100, 0.08), rgba(255, 150, 50, 0.05));
  border-radius: 20px;
  padding: 20px;
  margin-bottom: 24px;
  border: 1px solid rgba(255, 200, 100, 0.15);
}

.rating-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.rating-icon {
  font-size: 18px;
}

.rating-title {
  font-size: 15px;
  font-weight: 600;
  color: rgba(200, 120, 0, 0.9);
}

.rating-count {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.4);
  background: rgba(0, 0, 0, 0.06);
  padding: 2px 8px;
  border-radius: 10px;
  margin-left: auto;
}

.rating-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.rating-average {
  display: flex;
  align-items: center;
  gap: 12px;
}

.average-value {
  font-size: 36px;
  font-weight: 700;
  color: rgba(200, 120, 0, 0.9);
  line-height: 1;
}

.average-stars {
  display: flex;
  gap: 4px;
}

.rating-empty {
  text-align: center;
  padding: 16px;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.4);
  background: rgba(255, 255, 255, 0.3);
  border-radius: 12px;
}

.rating-action {
  padding-top: 12px;
  border-top: 1px solid rgba(0, 0, 0, 0.08);
}

.rated-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.rated-text {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.6);
}

.user-rating-stars {
  display: flex;
  gap: 4px;
}

.rating-input {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rating-prompt {
  font-size: 13px;
  color: rgba(0, 0, 0, 0.5);
}

.star-input {
  display: flex;
  gap: 8px;
}

.star-icon {
  width: 24px;
  height: 24px;
  fill: rgba(0, 0, 0, 0.1);
  stroke: rgba(0, 0, 0, 0.2);
  stroke-width: 1.5;
  transition: all 0.2s ease;

  &.small {
    width: 18px;
    height: 18px;
  }

  &.filled {
    fill: #ffc800;
    stroke: #ffc800;
  }

  &.interactive {
    cursor: pointer;

    &:hover,
    &.hovered {
      fill: #ffc800;
      stroke: #ffc800;
      transform: scale(1.1);
    }
  }
}

.rating-hint {
  text-align: center;
  padding: 12px;
  font-size: 13px;
  color: rgba(0, 0, 0, 0.4);
  background: rgba(255, 255, 255, 0.3);
  border-radius: 12px;
}

// 评论区域
.comments-section {
  margin-bottom: 16px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.7);
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.comment-count {
  font-size: 12px;
  font-weight: 500;
  color: rgba(0, 0, 0, 0.4);
  background: rgba(0, 0, 0, 0.06);
  padding: 2px 8px;
  border-radius: 10px;
}

.comments-loading {
  padding: 20px;
  text-align: center;
}

.comments-empty {
  text-align: center;
  padding: 32px 20px;
  font-size: 14px;
  color: rgba(0, 0, 0, 0.4);
}

.comments-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.comment-item {
  display: flex;
  gap: 12px;
}

.comment-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  overflow: hidden;
  background: linear-gradient(135deg, #00c8ff, #0096ff);
  flex-shrink: 0;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .avatar-placeholder {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 14px;
    font-weight: 600;
    color: #fff;
  }
}

.comment-content {
  flex: 1;
  min-width: 0;
}

.comment-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.delete-comment-btn {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(0, 0, 0, 0.25);
  transition: all 0.2s ease;

  &:hover {
    color: #ff4d4f;
    background: rgba(255, 77, 79, 0.1);
  }

  svg {
    flex-shrink: 0;
  }
}

.comment-author {
  font-size: 14px;
  font-weight: 600;
  color: rgba(0, 0, 0, 0.75);
}

.comment-time {
  font-size: 12px;
  color: rgba(0, 0, 0, 0.35);
}

.comment-text {
  font-size: 14px;
  color: rgba(0, 0, 0, 0.65);
  line-height: 1.5;
  word-break: break-word;
}

// 底部
.modal-footer {
  padding: 20px 28px;
  border-top: 1px solid rgba(255, 255, 255, 0.15);
  background: rgba(255, 255, 255, 0.2);
}

.comment-input-area {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.comment-input {
  flex: 1;

  :deep(.t-input) {
    background: rgba(255, 255, 255, 0.7);
    border-color: rgba(0, 0, 0, 0.08);
    border-radius: 12px;
  

    &:hover, &:focus {
      border-color: rgba(0, 150, 255, 0.4);
      background: rgba(255, 255, 255, 0.9);
    }
  }
  :deep(.t-input__inner) {
    color: #333;
  }
}

.action-buttons {
  display: flex;
  justify-content: center;
}

.break-btn {
  color: #ff4d4f !important;

  &:hover {
    background: rgba(255, 77, 79, 0.1) !important;
  }
}
</style>
