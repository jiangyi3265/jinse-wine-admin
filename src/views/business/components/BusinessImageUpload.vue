<template>
  <div class="business-image-upload">
    <el-image v-if="modelValue" :src="mediaUrl(modelValue)" :preview-src-list="[mediaUrl(modelValue)]" preview-teleported fit="contain" class="preview">
      <template #error><span>图片暂不可用，可重新上传</span></template>
    </el-image>
    <div class="actions">
      <el-upload ref="uploader" :action="action" :headers="headers" accept="image/png,image/jpeg,image/webp,image/gif" :show-file-list="false" :disabled="disabled || uploading" :before-upload="beforeUpload" :on-success="uploaded" :on-error="failed">
        <el-button type="primary" plain icon="Upload" :disabled="disabled" :loading="uploading">{{ modelValue ? '更换图片' : '上传图片' }}</el-button>
      </el-upload>
      <el-button v-if="modelValue" link type="danger" :disabled="disabled || uploading" @click="emit('update:modelValue', '')">移除</el-button>
    </div>
    <small>支持 JPG、PNG、WEBP、GIF，最大 5 MB；上传后可点击预览。</small>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { getToken } from '@/utils/auth'
import { mediaUrl, pendingImageUploads } from '@/utils/businessMedia'

const props = defineProps({ modelValue: { type: String, default: '' }, disabled: Boolean, active: { type: Boolean, default: true }, contextKey: [String, Number] })
const emit = defineEmits(['update:modelValue'])
const action = `${import.meta.env.VITE_APP_BASE_API}/common/upload`
const headers = computed(() => ({ Authorization: `Bearer ${getToken()}` }))
const uploading = ref(false)
const uploader = ref()
let activeUid = null
let disposed = false
function finish() {
  activeUid = null
  if (uploading.value) pendingImageUploads.value--
  uploading.value = false
}
function beforeUpload(file) {
  if (disposed || !props.active || props.disabled) return false
  if (!/\.(jpe?g|png|webp|gif)$/i.test(file.name) || !/^image\/(jpeg|png|webp|gif)$/.test(file.type)) {
    ElMessage.error('请选择 JPG、PNG、WEBP 或 GIF 图片'); return false
  }
  if (file.size > 5 * 1024 * 1024) { ElMessage.error('图片不能超过 5 MB'); return false }
  if (uploading.value) return false
  uploading.value = true
  activeUid = file.uid
  pendingImageUploads.value++
  return true
}
function isCurrent(file) { return !disposed && props.active && uploading.value && file?.uid === activeUid }
function uploaded(response, file) {
  if (!isCurrent(file)) return
  finish()
  const url = response?.url || response?.fileName
  if (response?.code !== 200 || !url) { ElMessage.error(response?.msg || '上传失败，请重试'); return }
  emit('update:modelValue', url)
  ElMessage.success('图片上传成功，请保存表单')
}
function failed(error, file) { if (!isCurrent(file)) return; finish(); ElMessage.error('图片上传失败，请重试，原图片已保留') }
function cancelUpload() {
  // Invalidate first: abort may synchronously deliver an error callback.
  finish()
  uploader.value?.abort()
}
watch(() => [props.active, props.contextKey], cancelUpload, { flush: 'sync' })
onBeforeUnmount(() => { disposed = true; cancelUpload() })
</script>

<style scoped>
.business-image-upload { width: 100%; }
.preview { display: flex; width: 144px; height: 110px; margin-bottom: 10px; border: 1px solid var(--el-border-color-light); border-radius: 8px; background: var(--el-fill-color-light); font-size: 12px; }
.actions { display: flex; align-items: center; gap: 14px; }
small { display: block; margin-top: 6px; color: var(--el-text-color-secondary); line-height: 1.6; }
</style>
