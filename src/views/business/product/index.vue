<template>
  <business-crud title="商品" resource="product" id-field="productId" :fields="fields">
    <template #row-actions="{ row }">
      <el-button link type="primary" icon="Grid" v-hasPermi="['business:product:list']" @click="openSkus(row)">管理规格</el-button>
    </template>
  </business-crud>
</template>

<script setup>
import { useRouter } from 'vue-router'
import BusinessCrud from '../components/BusinessCrud.vue'
import { productStatusOptions } from '../components/fields'

const router = useRouter()
function openSkus(row) {
  router.push({ path: '/business/sku', query: { productId: row.productId } })
}

// prop 严格对应 biz_product 的数据库字段驼峰名。
const fields = [
  { prop: 'productCode', label: '商品编码', search: true, table: true, autoCode: true, maxlength: 64 },
  { prop: 'productName', label: '商品名称', search: true, table: true, required: true, maxlength: 128, width: 160 },
  { prop: 'categoryId', label: '商品分类', lookup: 'productCategory', search: true, required: true },
  { prop: 'category', label: '分类', table: true, form: false },
  { prop: 'shippingTemplateId', label: '运费模板', lookup: 'shippingTemplate', table: true, search: true, emptyLabel: '默认运费', placeholder: '不选择则使用默认运费' },
  { prop: 'spec', label: '基础规格描述', table: true, maxlength: 128 },
  { prop: 'series', label: '系列', table: true, maxlength: 128 },
  { prop: 'description', label: '商品描述', type: 'textarea', maxlength: 2000 },
  { prop: 'imageUrl', type: 'image', label: '商品主图', maxlength: 512 },
  { prop: 'priceCent', label: '基础售价（元）', type: 'money', table: true, required: true, min: 0 },
  { prop: 'originalPriceCent', label: '划线价（元）', type: 'money', table: true, default: 0 },
  { prop: 'stock', label: '基础库存', type: 'number', table: true, required: true, default: 0 },
  { prop: 'sales', label: '销量基数', type: 'number', default: 0 },
  { prop: 'sortNum', label: '排序', type: 'number', default: 0 },
  { prop: 'status', label: '状态', options: productStatusOptions, table: true, search: true, required: true, default: '0' },
  { prop: 'remark', label: '备注', type: 'textarea', maxlength: 500 }
]
</script>
