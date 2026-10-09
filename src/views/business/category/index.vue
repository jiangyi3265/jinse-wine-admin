<template>
  <div>
    <el-alert class="category-guide" type="info" show-icon :closable="false" title="先添加商品分类，再到商品管理中选择。停用分类不影响已有商品；有商品引用的分类不能删除。" />
    <business-crud title="商品分类" resource="productCategory" id-field="categoryId" :fields="fields" />
  </div>
</template>

<script setup>
import BusinessCrud from '../components/BusinessCrud.vue'
import { onOffOptions } from '../components/fields'

const fields = [
  { prop: 'categoryCode', label: '分类编码', autoCode: true, maxlength: 64 },
  { prop: 'categoryName', label: '分类名称', required: true, search: true, table: true, maxlength: 64, width: 180 },
  { prop: 'productCount', label: '商品数量', table: true, form: false },
  { prop: 'sortNum', label: '排序', type: 'number', default: 0, min: 0, max: 999999, table: true },
  { prop: 'status', label: '状态', options: onOffOptions, default: '0', required: true, search: true, table: true },
  { prop: 'remark', label: '备注', type: 'textarea', maxlength: 500 }
]
</script>

<style scoped>
.category-guide { margin: 20px 20px 0; width: auto; }
</style>
