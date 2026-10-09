import ExcelJS from 'exceljs'

/** Export one generated batch as a one-column workbook of complete QR strings. */
export async function buildLotteryCodeExcel(items) {
  const codes = items.map(item => String(item?.linkUrl || '').trim())
  if (!codes.length) throw new Error('当前没有可导出的二维码')
  if (codes.some(value => !value || /[\r\n]/.test(value) || !/^https:\/\//i.test(value))) {
    throw new Error('本批二维码链接缺失或无效，请配置 HTTPS 普通链接前缀后重试')
  }
  if (new Set(codes).size !== codes.length) throw new Error('本批二维码字符串存在重复，请重新加载')

  const workbook = new ExcelJS.Workbook()
  const sheet = workbook.addWorksheet('二维码')
  sheet.columns = [{ header: '二维码', key: 'qrString', width: 95 }]
  codes.forEach(qrString => sheet.addRow({ qrString }))
  sheet.getRow(1).font = { bold: true }
  sheet.getColumn(1).alignment = { vertical: 'middle' }
  return workbook.xlsx.writeBuffer()
}
