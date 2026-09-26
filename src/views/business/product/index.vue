<template>
  <business-crud title="商品" resource="product" id-field="productId" :fields="fields" />
</template>

<script setup>
import BusinessCrud from '../components/BusinessCrud.vue'
import { productStatusOptions } from '../components/fields'

// prop 严格对应 biz_product 的数据库字段驼峰名。
const fields = [
  { prop: 'productCode', label: '商品编码', search: true, table: true, required: true, maxlength: 64 },
  { prop: 'productName', label: '商品名称', search: true, table: true, required: true, maxlength: 128, width: 160 },
  { prop: 'category', label: '分类', search: true, table: true, required: true, maxlength: 64 },
  { prop: 'spec', label: '规格', table: true, maxlength: 128 },
  { prop: 'series', label: '系列', table: true, maxlength: 128 },
  { prop: 'description', label: '商品描述', type: 'textarea', maxlength: 2000 },
  { prop: 'imageUrl', label: '主图地址', maxlength: 512 },
  { prop: 'priceCent', label: '售价（元）', type: 'money', table: true, required: true, min: 0 },
  { prop: 'originalPriceCent', label: '划线价（元）', type: 'money', table: true, default: 0 },
  { prop: 'stock', label: '库存', type: 'number', table: true, required: true, default: 0 },
  { prop: 'sales', label: '销量基数', type: 'number', default: 0 },
  { prop: 'sortNum', label: '排序', type: 'number', default: 0 },
  { prop: 'status', label: '状态', options: productStatusOptions, table: true, search: true, required: true, default: '0' },
  { prop: 'remark', label: '备注', type: 'textarea', maxlength: 500 }
]
</script>
