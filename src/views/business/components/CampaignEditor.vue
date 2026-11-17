<template>
  <el-drawer v-model="visible" title="活动展示设置" size="min(760px, 95vw)" :close-on-click-modal="false" :close-on-press-escape="!saving" :show-close="!saving">
    <div v-loading="loading">
      <el-alert v-if="error" :title="error" type="error" :closable="false" />
      <el-tabs v-if="ready" v-model="tab">
        <el-tab-pane label="首页活动弹窗" name="popup">
          <el-form label-position="top" :disabled="saving">
            <el-form-item label="启用活动弹窗"><el-switch v-model="popup.enabled" /></el-form-item>
            <el-form-item label="活动标题"><el-input v-model="popup.title" maxlength="32" /></el-form-item>
            <el-form-item label="副标题"><el-input v-model="popup.subtitle" maxlength="80" /></el-form-item>
            <el-form-item label="活动主视觉"><BusinessImageUpload v-model="popup.image" :active="visible" :context-key="revision" /></el-form-item>
            <el-form-item label="活动说明"><el-input v-model="popup.description" type="textarea" maxlength="500" :rows="3" /></el-form-item>
            <el-form-item label="按钮文案"><el-input v-model="popup.button" maxlength="12" /></el-form-item>
            <el-form-item label="按钮跳转"><el-select v-model="popup.route"><el-option v-for="route in routes" :key="route.value" v-bind="route" /></el-select></el-form-item>
          </el-form>
        </el-tab-pane>
        <el-tab-pane label="活动规则" name="rules">
          <div v-for="(section, index) in sections" :key="index" class="rule-section-editor">
            <el-input v-model="section.heading" placeholder="章节标题" maxlength="80" :disabled="saving" />
            <el-input v-model="section.text" type="textarea" :rows="4" placeholder="每行填写一条规则" maxlength="4000" :disabled="saving" />
            <el-button type="danger" text :disabled="saving" @click="sections.splice(index, 1)">删除章节</el-button>
          </div>
          <el-button icon="Plus" :disabled="saving" @click="sections.push({ heading: '', text: '' })">添加规则章节</el-button>
          <h3>奖品 / 优惠表格</h3>
          <p class="rule-help">留空时，小程序展示当前可领取优惠。表格内容用于规则展示，奖品数量和发放条件在活动管理中配置。</p>
          <div class="rule-table-editor">
            <el-input v-for="(_, index) in columns" :key="index" v-model="columns[index]" placeholder="表头" maxlength="40" :disabled="saving" />
          </div>
          <div v-for="(row, index) in rows" :key="index" class="rule-table-editor">
            <el-input v-for="(_, cell) in columns" :key="cell" v-model="row[cell]" placeholder="内容" maxlength="120" :disabled="saving" />
            <el-button type="danger" text :disabled="saving" @click="rows.splice(index, 1)">删除</el-button>
          </div>
          <el-button icon="Plus" :disabled="saving" @click="rows.push(columns.map(() => ''))">添加一行</el-button>
        </el-tab-pane>
      </el-tabs>
    </div>
    <template #footer><el-button :disabled="saving || pendingImageUploads > 0" @click="visible = false">关闭</el-button><el-button type="primary" :loading="saving" :disabled="!ready || pendingImageUploads > 0" @click="save">保存{{ tab === 'popup' ? '首页弹窗' : '活动规则' }}</el-button></template>
  </el-drawer>
</template>
<script setup>
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { listBusiness, createBusiness, updateBusiness } from '@/api/business'
import { pendingImageUploads } from '@/utils/businessMedia'
import BusinessImageUpload from './BusinessImageUpload.vue'
const visible = ref(false), loading = ref(false), saving = ref(false), ready = ref(false), error = ref(''), tab = ref('popup'), revision = ref(0)
const popup = ref({}), sections = ref([]), columns = ref([]), rows = ref([])
const routes = [{ label: '领券中心', value: 'coupons' }, { label: '活动专区', value: 'campaign' }, { label: '扫码有礼', value: 'scan' }, { label: '商城', value: 'shop' }, { label: '积分兑换', value: 'points' }]
let originals = {}, contents = {}
async function open() {
  visible.value = true
  ready.value = false
  loading.value = true
  error.value = ''
  const current = ++revision.value
  try {
    const results = await Promise.all(['home.popup', 'rules.campaign'].map(key => listBusiness('miniContent', { exactContentKey: key, contentKey: key, pageSize: 200 })))
    if (current !== revision.value) return
    originals = Object.fromEntries(['home.popup', 'rules.campaign'].map((key, index) => [key, results[index].rows.find(item => item.contentKey === key)]))
    contents = Object.fromEntries(Object.entries(originals).map(([key, item]) => [key, typeof item?.contentJson === 'string' ? JSON.parse(item.contentJson) : item?.contentJson || {}]))
    popup.value = { enabled: false, route: 'coupons', button: '立即领券', ...contents['home.popup'] }
    const rule = contents['rules.campaign']
    sections.value = (Array.isArray(rule) ? rule : rule.sections || []).map(item => ({ heading: item.heading || item.title || '', text: (item.lines || [item.text || '']).join('\n') }))
    columns.value = [...(rule.table?.columns || ['奖品', '数量', '说明'])]
    rows.value = (rule.table?.rows || []).map(row => [...row])
    ready.value = true
  } catch (e) { error.value = e.message || '活动内容加载失败，请重新打开' }
  finally { loading.value = false }
}
async function save() {
  if (saving.value || !ready.value || pendingImageUploads.value) return
  if (tab.value === 'popup' && popup.value.enabled && (!popup.value.title?.trim() || !popup.value.image)) return ElMessage.warning('请填写活动标题并上传主视觉')
  if (tab.value === 'rules' && sections.value.some(item => !item.heading.trim() || !item.text.trim())) return ElMessage.warning('请填写规则章节标题和正文')
  if (tab.value === 'rules' && rows.value.length && (columns.value.some(cell => !cell.trim()) || rows.value.some(row => row.some(cell => !String(cell || '').trim())))) return ElMessage.warning('请填写完整的表格内容')
  const key = tab.value === 'popup' ? 'home.popup' : 'rules.campaign'
  const data = tab.value === 'popup' ? { ...popup.value } : {
    ...(Array.isArray(contents[key]) ? {} : contents[key]),
    sections: sections.value.map(item => ({ heading: item.heading, lines: item.text.split('\n').map(line => line.trim()).filter(Boolean) })),
    table: rows.value.length ? { columns: columns.value, rows: rows.value } : null,
  }
  const original = originals[key]
  const payload = { ...original, contentKey: key, type: key === 'home.popup' ? 'page' : 'rule', contentJson: data, title: key === 'home.popup' ? '首页活动弹窗' : '活动规则', status: '0' }
  saving.value = true
  try {
    if (original) await updateBusiness('miniContent', { ...payload, expectedContentJson: contents[key], expectedContentKey: original.contentKey, expectedStatus: original.status })
    else await createBusiness('miniContent', payload)
    ElMessage.success('活动内容已保存，小程序同步生效')
    visible.value = false
  } catch (e) { ElMessage.error(e.message || '保存失败，请重试') }
  finally { saving.value = false }
}
defineExpose({ open })
</script>
<style scoped>
.rule-section-editor { border: 1px solid var(--el-border-color-light); padding: 16px; border-radius: 10px; margin-bottom: 16px; display: flex; flex-direction: column; gap: 12px; }
.rule-table-editor { display: flex; gap: 8px; margin-bottom: 10px; }
.rule-table-editor .el-input { flex: 1; min-width: 0; }
.rule-help { font-size: 13px; color: var(--el-text-color-secondary); line-height: 1.8; }
</style>
