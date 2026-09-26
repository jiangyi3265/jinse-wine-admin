import request from '@/utils/request'

// 管理端统一沿用若依的分页与响应格式；业务实体名称由页面配置集中指定。
const resourceUrl = resource => `/business/${resource}`

export function listBusiness(resource, params) {
  return request({ url: `${resourceUrl(resource)}/list`, method: 'get', params })
}

export function getBusiness(resource, id) {
  return request({ url: `${resourceUrl(resource)}/${id}`, method: 'get' })
}

export function createBusiness(resource, data) {
  return request({ url: resourceUrl(resource), method: 'post', data })
}

export function updateBusiness(resource, data) {
  return request({ url: resourceUrl(resource), method: 'put', data })
}

export function removeBusiness(resource, id) {
  return request({ url: `${resourceUrl(resource)}/${id}`, method: 'delete' })
}

export function updateBusinessStatus(resource, id, data) {
  return request({ url: `${resourceUrl(resource)}/${id}/status`, method: 'put', data })
}

export function getBrandConfig() {
  return request({ url: '/business/brand', method: 'get' })
}

export function updateBrandConfig(data) {
  return request({ url: '/business/brand', method: 'put', data })
}
