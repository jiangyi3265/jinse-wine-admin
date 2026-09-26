<template>
  <div class="app-container">
    <el-form v-show="showSearch" :model="query" inline @submit.prevent="search">
      <el-form-item v-for="field in searchFields" :key="field.prop" :label="field.label">
        <el-select v-if="field.options" v-model="query[field.prop]" clearable :placeholder="`全部${field.label}`" style="width: 180px">
          <el-option v-for="option in field.options" :key="option.value" :label="option.label" :value="option.value" />
        </el-select>
        <el-input v-else v-model.trim="query[field.prop]" clearable :placeholder="`请输入${field.label}`" style="width: 200px" />
      </el-form-item>
      <el-form-item>
        <el-button type="primary" native-type="submit" icon="Search">查询</el-button>
        <el-button icon="Refresh" @click="resetSearch">重置</el-button>
      </el-form-item>
    </el-form>

    <el-row class="mb8">
      <right-toolbar v-model:showSearch="showSearch" @queryTable="loadList" />
    </el-row>
    <el-table v-loading="loading" :data="rows" border stripe :row-key="idField" empty-text="暂无数据">
      <el-table-column v-for="field in tableFields" :key="field.prop" :prop="field.prop" :label="field.label" :min-width="field.width || 120" show-overflow-tooltip>
        <template #default="scope">{{ displayValue(field, scope.row[field.prop]) }}</template>
      </el-table-column>
      <el-table-column v-if="showDetail || statusTransitions" label="操作" fixed="right" width="160" align="center">
        <template #default="scope">
          <el-button v-if="showDetail" link type="primary" icon="View" v-hasPermi="[permission('query')]" @click="openDetail(scope.row)">详情</el-button>
          <el-button v-if="statusTransitions && availableTransitions(scope.row).length" link type="primary" icon="Edit" v-hasPermi="[permission('edit')]" @click="openStatus(scope.row)">处理</el-button>
        </template>
      </el-table-column>
    </el-table>
    <pagination v-show="total > 0" :total="total" v-model:page="query.pageNum" v-model:limit="query.pageSize" @pagination="loadList" />

    <el-dialog v-model="detailOpen" :title="`${title}详情`" width="min(880px, 94vw)" append-to-body>
      <el-descriptions v-if="detail" :column="2" border>
        <el-descriptions-item v-for="field in fields" :key="field.prop" :label="field.label" :span="field.span || 1">
          {{ displayValue(field, detail[field.prop]) }}
        </el-descriptions-item>
      </el-descriptions>
      <slot name="detail" :detail="detail" />
    </el-dialog>

    <el-dialog v-model="statusOpen" :title="`处理${title}`" width="min(500px, 94vw)" append-to-body>
      <el-form ref="statusRef" :model="statusForm" label-width="110px" :disabled="saving">
        <el-form-item label="当前状态">{{ displayValue(statusField, activeRow?.status) }}</el-form-item>
        <el-form-item label="目标状态" prop="status" :rules="[{ required: true, message: '请选择目标状态', trigger: 'change' }]">
          <el-select v-model="statusForm.status" placeholder="请选择目标状态" style="width: 100%">
            <el-option v-for="option in availableTransitions(activeRow)" :key="option.value" :label="option.label" :value="option.value" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="resource === 'member'" label="核销员门店 ID">
          <el-input-number v-model="statusForm.staffStoreId" :min="1" :max="999999999" controls-position="right" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="statusOpen = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveStatus">确认处理</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getBusiness, listBusiness, updateBusinessStatus } from '@/api/business'

const props = defineProps({
  title: { type: String, required: true },
  resource: { type: String, required: true },
  idField: { type: String, required: true },
  fields: { type: Array, required: true },
  showDetail: { type: Boolean, default: true },
  statusTransitions: { type: Object, default: null }
})

const permission = action => `business:${props.resource}:${action}`
const searchFields = computed(() => props.fields.filter(field => field.search))
const tableFields = computed(() => props.fields.filter(field => field.table))
const statusField = computed(() => props.fields.find(field => field.prop === 'status') || { label: '状态' })
const query = reactive({ pageNum: 1, pageSize: 10 })
const rows = ref([])
const total = ref(0)
const loading = ref(false)
const saving = ref(false)
const showSearch = ref(true)
const detailOpen = ref(false)
const statusOpen = ref(false)
const detail = ref(null)
const activeRow = ref(null)
const statusRef = ref()
const statusForm = reactive({ status: null, staffStoreId: null })

function displayValue(field, value) {
  if (value === null || value === undefined || value === '') return '—'
  if (field.type === 'money') return `¥${(Number(value) / 100).toFixed(2)}`
  const option = (field.options || []).find(item => item.value === value)
  if (option) return option.label
  if (typeof value === 'object') return JSON.stringify(value)
  return value
}

function availableTransitions(row) {
  if (!row || !props.statusTransitions) return []
  return props.statusTransitions[row.status] || []
}

async function loadList() {
  loading.value = true
  try {
    const response = await listBusiness(props.resource, query)
    rows.value = response.rows || []
    total.value = Number(response.total || 0)
  } finally {
    loading.value = false
  }
}

function search() {
  query.pageNum = 1
  loadList()
}

function resetSearch() {
  for (const field of searchFields.value) delete query[field.prop]
  search()
}

async function openDetail(row) {
  const response = await getBusiness(props.resource, row[props.idField])
  detail.value = response.data
  detailOpen.value = true
}

function openStatus(row) {
  activeRow.value = row
  statusForm.status = null
  statusForm.staffStoreId = row.staffStoreId ?? null
  statusOpen.value = true
}

async function saveStatus() {
  if (!await statusRef.value.validate()) return
  saving.value = true
  try {
    const data = { status: statusForm.status }
    if (props.resource === 'member') data.staffStoreId = statusForm.staffStoreId
    await updateBusinessStatus(props.resource, activeRow.value[props.idField], data)
    ElMessage.success('处理成功')
    statusOpen.value = false
    await loadList()
  } finally {
    saving.value = false
  }
}

onMounted(loadList)
</script>
