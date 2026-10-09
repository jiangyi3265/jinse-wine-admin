<template>
  <div class="app-container sku-page">
    <header class="page-heading">
      <div>
        <p>业务管理 / 商品管理</p>
        <h1>商品规格</h1>
      </div>
      <el-button icon="Back" @click="router.push('/business/product')">返回商品管理</el-button>
    </header>

    <div class="sku-toolbar">
      <el-form-item label="所属商品" required>
        <business-lookup :model-value="productId" owner="product" field="productId" placeholder="请选择商品，可输入名称搜索" style="width: min(380px, 70vw)" @update:model-value="selectProduct" />
      </el-form-item>
      <div class="toolbar-actions">
        <el-button icon="Plus" :disabled="!productId || loading || !canEdit" @click="addSku">新增规格</el-button>
        <el-button type="primary" icon="Check" :loading="saving" :disabled="!productId || loading || !dirty || !canEdit" @click="save">保存规格</el-button>
      </div>
    </div>

    <el-alert v-if="loadError" :title="loadError" type="error" show-icon :closable="false" class="page-alert">
      <template #default><el-button link type="primary" @click="loadProduct(productId)">重试</el-button></template>
    </el-alert>
    <template v-if="productId && product">
      <div class="product-summary">
        <strong>{{ product.productName }}</strong>
        <span>商品编码 {{ product.productCode || '—' }}</span>
        <span>基础售价 ¥{{ money(product.priceCent) }}</span>
        <span>基础库存 {{ product.stock ?? 0 }}</span>
        <el-tag :type="String(product.status) === '0' ? 'success' : 'info'" effect="plain">{{ String(product.status) === '0' ? '启用' : '停用' }}</el-tag>
      </div>
      <p class="sku-note">有规格的订单按所选规格的售价和库存结算；未选择规格的订单使用商品基础售价和库存。移除规格后，已有订单或购物车引用的规格会停用并清零库存。</p>
    </template>

    <el-table v-loading="loading" :data="rows" border stripe class="sku-table" empty-text="该商品暂无规格">
      <el-table-column label="规格编码" min-width="170">
        <template #default="scope">{{ scope.row.skuCode || '保存后自动生成' }}</template>
      </el-table-column>
      <el-table-column min-width="190">
        <template #header><span class="required">*</span> 规格名称</template>
        <template #default="scope"><el-input v-model.trim="scope.row.skuName" :disabled="!canEdit" maxlength="128" placeholder="请输入规格名称" /></template>
      </el-table-column>
      <el-table-column width="180">
        <template #header><span class="required">*</span> 售价（元）</template>
        <template #default="scope"><el-input-number v-model="scope.row.priceYuan" :min="0" :max="21474836.47" :precision="2" :step="1" :disabled="!canEdit" style="width: 100%" /></template>
      </el-table-column>
      <el-table-column width="160">
        <template #header><span class="required">*</span> 库存</template>
        <template #default="scope"><el-input-number v-model="scope.row.stock" :min="0" :max="2147483647" :precision="0" :disabled="!canEdit" style="width: 100%" /></template>
      </el-table-column>
      <el-table-column width="130">
        <template #header><span class="required">*</span> 状态</template>
        <template #default="scope"><el-select v-model="scope.row.status" :disabled="!canEdit"><el-option label="启用" value="0" /><el-option label="停用" value="1" /></el-select></template>
      </el-table-column>
      <el-table-column v-if="canEdit" label="操作" width="90" align="center" fixed="right">
        <template #default="scope"><el-button link type="danger" icon="Delete" @click="rows.splice(scope.$index, 1)">移除</el-button></template>
      </el-table-column>
    </el-table>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getBusiness } from '@/api/business'
import { getProductSkus, saveProductSkus } from '@/api/business/extension'
import { checkPermi } from '@/utils/permission'
import BusinessLookup from '../components/BusinessLookup.vue'

const route = useRoute()
const router = useRouter()
const productId = ref(null)
const product = ref(null)
const rows = ref([])
const baseline = ref('[]')
const loading = ref(false)
const saving = ref(false)
const loadError = ref('')
const canEdit = computed(() => checkPermi(['business:product:edit']))
const dirty = computed(() => JSON.stringify(rows.value) !== baseline.value)
let loadSequence = 0

const money = cents => (Number(cents || 0) / 100).toFixed(2)
const toRow = sku => ({ ...sku, priceYuan: Number(sku.priceCent || 0) / 100 })

async function loadProduct(id) {
  const sequence = ++loadSequence
  productId.value = id
  product.value = null
  rows.value = []
  baseline.value = '[]'
  loadError.value = ''
  if (!id) return
  loading.value = true
  try {
    const [detail, skus] = await Promise.all([getBusiness('product', id), getProductSkus(id)])
    if (sequence !== loadSequence) return
    product.value = detail.data
    rows.value = (skus || []).map(toRow)
    baseline.value = JSON.stringify(rows.value)
  } catch (error) {
    if (sequence === loadSequence) loadError.value = error?.message || '商品规格加载失败'
  } finally {
    if (sequence === loadSequence) loading.value = false
  }
}

async function confirmDiscard() {
  if (!dirty.value) return true
  try {
    await ElMessageBox.confirm('当前规格修改尚未保存，确定放弃吗？', '未保存的修改', { type: 'warning', confirmButtonText: '放弃修改', cancelButtonText: '继续编辑' })
    return true
  } catch { return false }
}

async function selectProduct(id) {
  if (String(id || '') === String(productId.value || '')) return
  if (!(await confirmDiscard())) return
  await loadProduct(id)
  await router.replace({ path: '/business/sku', query: id ? { productId: id } : {} })
}

function addSku() {
  rows.value.push({ skuId: null, skuCode: '', skuName: '', priceYuan: Number(product.value?.priceCent || 0) / 100, stock: 0, status: '0', specJson: '{}' })
}

async function save() {
  if (!productId.value) return ElMessage.warning('请选择商品')
  for (const [index, sku] of rows.value.entries()) {
    const row = `第 ${index + 1} 行`
    if (!String(sku.skuName || '').trim()) return ElMessage.warning(`请输入${row}规格名称`)
    if (sku.priceYuan === null || sku.priceYuan === undefined || sku.priceYuan === '' || !Number.isFinite(Number(sku.priceYuan)) || Number(sku.priceYuan) < 0) return ElMessage.warning(`请输入${row}售价`)
    if (sku.stock === null || sku.stock === undefined || sku.stock === '' || !Number.isInteger(Number(sku.stock)) || Number(sku.stock) < 0) return ElMessage.warning(`请输入${row}库存`)
    if (!sku.status) return ElMessage.warning(`请选择${row}状态`)
  }
  const original = JSON.parse(baseline.value)
  const removed = original.filter(item => item.skuId && !rows.value.some(row => String(row.skuId) === String(item.skuId)))
  if (removed.length) {
    try {
      await ElMessageBox.confirm(`将移除 ${removed.length} 个规格。已被订单或购物车引用的规格会停用并清零库存，确定保存吗？`, '确认移除规格', { type: 'warning' })
    } catch { return }
  }
  saving.value = true
  try {
    await saveProductSkus(productId.value, rows.value.map(({ priceYuan, ...sku }) => ({ ...sku, priceCent: Math.round(Number(priceYuan) * 100) })), original.filter(sku => sku.skuId).map(sku => sku.skuId))
    await loadProduct(productId.value)
    ElMessage.success('商品规格已保存')
  } catch (error) {
    ElMessage.error(error?.message || '商品规格保存失败')
  } finally { saving.value = false }
}

watch(() => route.query.productId, async id => {
  if (String(id || '') !== String(productId.value || '') && await confirmDiscard()) await loadProduct(id || null)
}, { immediate: true })

onBeforeRouteLeave(async () => await confirmDiscard())
</script>

<style scoped>
.sku-page { min-height: calc(100vh - 84px); padding: 18px 20px 28px; background: var(--el-bg-color-page); }
.page-heading { display: flex; justify-content: space-between; align-items: end; gap: 16px; margin-bottom: 18px; }
.page-heading p { margin: 0 0 4px; color: var(--el-text-color-secondary); font-size: 12px; }
.page-heading h1 { margin: 0; font-size: 24px; line-height: 1.3; }
.sku-toolbar { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 14px; }
.sku-toolbar :deep(.el-form-item) { margin: 0; }
.toolbar-actions { display: flex; gap: 8px; }
.product-summary { display: flex; align-items: center; flex-wrap: wrap; gap: 10px 24px; padding: 14px 0; border-top: 1px solid var(--el-border-color-light); color: var(--el-text-color-regular); }
.product-summary strong { color: var(--el-text-color-primary); }
.sku-note { margin: 0 0 14px; color: var(--el-text-color-secondary); font-size: 12px; line-height: 1.6; }
.sku-table { border-radius: 6px; }
.required { color: var(--el-color-danger); }
.page-alert { margin-bottom: 14px; }
@media (max-width: 600px) { .page-heading { align-items: start; } .sku-toolbar { align-items: stretch; } .toolbar-actions { width: 100%; } }
</style>
