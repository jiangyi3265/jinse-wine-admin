<template>
  <business-crud title="门店" resource="store" id-field="storeId" :fields="fields" />
</template>

<script setup>
import BusinessCrud from '../components/BusinessCrud.vue'
import { onOffOptions } from '../components/fields'

// 门店坐标由后端按完整地址解析，表单不接收坐标输入。
const fields = [
  { prop: 'storeCode', label: '门店编码', search: true, table: true, autoCode: true, maxlength: 64 },
  { prop: 'storeName', label: '门店名称', search: true, table: true, required: true, maxlength: 128, width: 170 },
  { prop: 'regionPath', label: '省市区', type: 'region', search: true, required: true },
  { prop: 'province', label: '省份', table: true, form: false },
  { prop: 'city', label: '城市', table: true, form: false },
  { prop: 'district', label: '区县', table: true, form: false },
  { prop: 'address', label: '详细地址', table: true, required: true, maxlength: 255, width: 220 },
  { prop: 'phone', label: '联系电话', table: true, maxlength: 32 },
  { prop: 'openHours', label: '营业时间', maxlength: 128 },
  { prop: 'imageUrl', type: 'image', label: '门店图片', maxlength: 512 },
  { prop: 'serviceQr', type: 'image', label: '客服二维码', maxlength: 512 },
  { prop: 'groupQr', type: 'image', label: '社群二维码', maxlength: 512 },
  { prop: 'deptId', label: '核销员所属部门', lookup: 'dept', table: true, permission: 'business:store:scope' },
  { prop: 'sortNum', label: '排序', type: 'number', default: 0 },
  { prop: 'status', label: '状态', options: onOffOptions, table: true, search: true, required: true, default: '0' },
  { prop: 'remark', label: '备注', type: 'textarea', maxlength: 500 }
]
</script>
