<template>
  <el-drawer v-model="visible" :title="`${prize?.prizeName || ''} · 门票库存`" size="min(1000px, 96vw)" destroy-on-close :before-close="closeInventory" :close-on-press-escape="!saving" :close-on-click-modal="!saving">
    <div class="ticket-toolbar">
      <el-select v-model="status" placeholder="全部状态" clearable style="width:160px" @change="reload(1)"><el-option v-for="(label, key) in statusLabels" :key="key" :label="label" :value="key" /></el-select>
      <el-button :icon="Refresh" :loading="loading" @click="reload()">刷新</el-button>
      <el-button type="primary" :icon="Plus" v-hasPermi="['business:lottery:edit']" @click="addDialog = true">录入门票</el-button>
    </div>
    <el-table :data="rows" v-loading="loading" border stripe empty-text="暂无门票，请先录入售票方提供的独立二维码">
      <el-table-column prop="providerName" label="售票方" min-width="130" />
      <el-table-column prop="externalNo" label="票号" min-width="150" />
      <el-table-column label="状态" width="110"><template #default="scope"><el-tag :type="scope.row.status === 'available' ? 'success' : 'info'">{{ statusLabels[scope.row.status] || '状态异常' }}</el-tag></template></el-table-column>
      <el-table-column prop="validUntil" label="门票有效期至" min-width="170" />
      <el-table-column prop="memberNo" label="中奖会员编号" min-width="180" />
      <el-table-column prop="memberName" label="中奖会员" min-width="130" />
      <el-table-column prop="issuedAt" label="发放时间" min-width="170" />
      <el-table-column label="操作" width="140" fixed="right"><template #default="scope"><el-button link type="primary" v-hasPermi="['business:lottery:edit']" @click="preview(scope.row)">原始票码</el-button><el-button v-if="scope.row.status === 'available'" link type="danger" v-hasPermi="['business:lottery:edit']" @click="disable(scope.row)">停用</el-button></template></el-table-column>
    </el-table>
    <el-pagination class="ticket-pagination" layout="total, prev, pager, next" :total="total" :page-size="20" :current-page="page" @current-change="reload" />
    <el-dialog v-model="addDialog" title="录入独立门票" width="min(720px, 94vw)" append-to-body :close-on-click-modal="!saving" :show-close="!saving" :before-close="closeAdd">
      <el-form label-width="110px" :disabled="saving">
        <el-form-item label="售票方" required><el-input v-model="providerName" maxlength="128" placeholder="请输入售票方名称" /></el-form-item>
        <el-form-item label="门票有效期" required><el-date-picker v-model="validUntil" type="datetime" value-format="YYYY-MM-DD HH:mm:ss" placeholder="请选择门票有效期" style="width:100%" /></el-form-item>
        <el-form-item label="原始票码图片" required>
          <el-upload ref="uploader" multiple :auto-upload="false" accept="image/png,image/jpeg" :show-file-list="false" :on-change="chooseFile" :disabled="saving"><el-button type="primary" plain :icon="Upload">选择二维码图片</el-button></el-upload>
        </el-form-item>
        <div v-for="(item, index) in pending" :key="item.uid" class="ticket-upload-row">
          <img :src="item.preview" :alt="item.file.name" />
          <el-form-item :label="`门票 ${index + 1} 票号`" required><el-input v-model="item.externalNo" maxlength="128" placeholder="请输入售票方唯一票号" /><small>{{ item.file.name }} {{ item.error }}</small></el-form-item>
          <el-button :icon="Delete" circle :disabled="saving" title="移除此门票" @click="remove(item)" />
        </div>
      </el-form>
      <template #footer><el-button :disabled="saving" @click="closeAdd(() => { addDialog = false })">取消</el-button><el-button type="primary" :loading="saving" @click="submit">保存 {{ pending.length }} 张门票</el-button></template>
    </el-dialog>
    <el-dialog v-model="previewDialog" title="售票方原始票码" width="min(520px, 94vw)" append-to-body @closed="clearPreview"><img v-if="previewUrl" class="ticket-original" :src="previewUrl" alt="原始门票二维码" /></el-dialog>
  </el-drawer>
</template>

<script setup>
import { ref, computed, watch, onBeforeUnmount } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Refresh, Upload, Delete } from '@element-plus/icons-vue'
import { listExternalTickets, uploadExternalTicket, disableExternalTicket, getExternalTicketImage } from '@/api/business/extension'
const props = defineProps({ modelValue: Boolean, prize: Object })
const emit = defineEmits(['update:modelValue', 'changed'])
const visible = computed({ get: () => props.modelValue, set: value => emit('update:modelValue', value) })
const rows = ref([]), total = ref(0), page = ref(1), status = ref(''), loading = ref(false)
const addDialog = ref(false), saving = ref(false), providerName = ref(''), validUntil = ref(''), pending = ref([]), uploader = ref()
const previewDialog = ref(false), previewUrl = ref('')
const statusLabels = { available: '待分配', reserved: '抽奖码预留', issued: '已发放', disabled: '已停用', expired: '已过期' }
let sequence = 0
watch(() => [props.modelValue, props.prize?.prizeId], () => {
  sequence++
  if (props.modelValue) { status.value = ''; rows.value = []; void reload(1) }
  else { clearPending(); addDialog.value = false; previewDialog.value = false; clearPreview() }
})
async function reload(target = page.value) {
  if (!props.prize?.prizeId) return
  const version = ++sequence
  loading.value = true
  try {
    const data = await listExternalTickets({ prizeId: props.prize.prizeId, status: status.value, pageNum: target, pageSize: 20 })
    if (version !== sequence) return
    rows.value = data.rows; total.value = data.total; page.value = target
  } finally { if (version === sequence) loading.value = false }
}
function chooseFile(item) {
  const file = item.raw
  if (!file || pending.value.some(row => row.uid === item.uid)) return
  if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > 2 * 1024 * 1024) return ElMessage.warning('请选择2MB以内的PNG或JPG原始二维码')
  if (pending.value.length >= 100) return ElMessage.warning('每次最多录入100张门票')
  pending.value.push({ uid: item.uid, file, preview: URL.createObjectURL(file), externalNo: file.name.replace(/\.[^.]+$/, ''), error: '' })
}
function remove(item) { URL.revokeObjectURL(item.preview); pending.value = pending.value.filter(row => row.uid !== item.uid) }
function clearPending() { pending.value.forEach(item => URL.revokeObjectURL(item.preview)); pending.value = []; uploader.value?.clearFiles() }
function closeAdd(done) { if (!saving.value) { clearPending(); done() } }
function closeInventory(done) { if (!saving.value) done() }
async function submit() {
  if (!providerName.value.trim()) return ElMessage.warning('请输入售票方名称')
  if (!validUntil.value || new Date(validUntil.value.replace(' ', 'T')).getTime() <= Date.now()) return ElMessage.warning('请选择晚于当前时间的门票有效期')
  if (!pending.value.length) return ElMessage.warning('请选择门票原始二维码图片')
  if (pending.value.some(item => !item.externalNo.trim())) return ElMessage.warning('请输入每张门票的售票方票号')
  if (new Set(pending.value.map(item => item.externalNo.trim())).size !== pending.value.length) return ElMessage.warning('门票票号重复，请修改后保存')
  saving.value = true
  const prizeId = props.prize.prizeId
  let success = 0
  try {
    for (const item of [...pending.value]) {
      const body = new FormData()
      body.append('prizeId', prizeId); body.append('providerName', providerName.value.trim())
      body.append('externalNo', item.externalNo.trim()); body.append('validUntil', validUntil.value); body.append('file', item.file)
      try { await uploadExternalTicket(body); remove(item); success++ }
      catch (error) { item.error = error.message || '保存失败'; break }
    }
    if (success) { ElMessage.success(`已录入 ${success} 张门票`); emit('changed'); await reload(1) }
    if (!pending.value.length) { addDialog.value = false; clearPending() }
  } finally { saving.value = false }
}
async function disable(row) {
  await ElMessageBox.confirm(`停用门票 ${row.externalNo}？`, '停用门票', { type: 'warning' })
  await disableExternalTicket(row.ticketId); emit('changed'); await reload()
}
function clearPreview() { if (previewUrl.value) URL.revokeObjectURL(previewUrl.value); previewUrl.value = '' }
async function preview(row) {
  const version = sequence
  const blob = await getExternalTicketImage(row.ticketId)
  if (version !== sequence || !props.modelValue) return
  if (!blob.type.startsWith('image/')) return ElMessage.error('原始票码暂不可用')
  clearPreview(); previewUrl.value = URL.createObjectURL(blob); previewDialog.value = true
}
onBeforeUnmount(() => { sequence++; clearPending(); clearPreview() })
</script>

<style scoped>
.ticket-toolbar { display:flex; gap:12px; align-items:center; margin-bottom:16px; flex-wrap:wrap; }
.ticket-pagination { margin-top:16px; }
.ticket-upload-row { display:flex; gap:12px; align-items:center; border-top:1px solid var(--el-border-color-lighter); padding:12px 0; }
.ticket-upload-row img { width:80px; height:80px; object-fit:contain; flex-shrink:0; }
.ticket-upload-row .el-form-item { flex:1; min-width:0; margin:0; }
.ticket-upload-row small { display:block; word-break:break-all; color:var(--el-text-color-secondary); }
.ticket-original { width:100%; max-height:65vh; object-fit:contain; }
</style>
