<template>
  <business-crud title="积分兑换项" resource="exchangeItem" id-field="exchangeItemId" :fields="fields" />
</template>

<script setup>
import BusinessCrud from '../components/BusinessCrud.vue'
import { exchangeTypeOptions, productStatusOptions } from '../components/fields'

// 优惠券兑换项关联券模板 ID；下拉选项由后台券模板列表提供。
const fields = [
  { prop: 'exchangeCode', label: '兑换编码', search: true, table: true, autoCode: true, maxlength: 64 },
  { prop: 'itemName', label: '兑换名称', search: true, table: true, required: true, maxlength: 128, width: 170 },
  { prop: 'itemType', label: '兑换类型', options: exchangeTypeOptions, table: true, search: true, required: true, default: 'goods' },
  { prop: 'couponTemplateId', label: '券模板', lookup: 'couponTemplate', lookupId: 'couponTemplateId', lookupLabel: 'templateName', required: true, showWhen: { prop: 'itemType', value: 'coupon' } },
  { prop: 'spec', label: '规格说明', maxlength: 128 },
  { prop: 'imageUrl', type: 'image', label: '图片', maxlength: 512 },
  { prop: 'redeemStoreId', label: '指定兑换门店', lookup: 'store', lookupId: 'storeId', lookupLabel: 'storeName', table: true, width: 170, showWhen: { prop: 'itemType', value: 'goods' } },
  { prop: 'points', label: '所需积分', type: 'number', table: true, required: true, min: 1 },
  { prop: 'stock', label: '库存（-1不限）', type: 'number', table: true, required: true, min: -1, default: 0 },
  { prop: 'perUserLimit', label: '每人上限', type: 'number', min: 1, default: 1 },
  { prop: 'sortNum', label: '排序', type: 'number', default: 0 },
  { prop: 'status', label: '状态', options: productStatusOptions, table: true, search: true, required: true, default: '0' },
  { prop: 'remark', label: '备注', type: 'textarea', maxlength: 500 }
]
</script>
