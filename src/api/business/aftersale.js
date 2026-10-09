import request from '@/utils/request'

const base = '/business/extension/aftersales'
export const listAftersales = params => request({ url: base, params }).then(r => r.data)
export const getAftersale = id => request({ url: `${base}/${id}` }).then(r => r.data)
export const actAftersale = (id, action, data) => request({ url: `${base}/${id}/${action}`, method: 'post', data }).then(r => r.data)
