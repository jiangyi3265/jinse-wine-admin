import test from 'node:test'
import assert from 'node:assert/strict'
import ExcelJS from 'exceljs'
import { buildLotteryCodeExcel } from '../src/utils/lotteryCodeExcel.js'

const row = n => ({
  code: `DRAW-${n}`,
  linkUrl: `https://example.com/qr/lottery/DRAW-${n}`,
})

test('all 100 QR strings export into one Excel column', async () => {
  const items = Array.from({ length: 100 }, (_, index) => row(index))
  const bytes = await buildLotteryCodeExcel(items)
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(bytes)
  const sheet = workbook.getWorksheet('二维码')
  assert.equal(sheet.rowCount, 101)
  assert.equal(sheet.columnCount, 1)
  assert.equal(sheet.getImages().length, 0)
  assert.equal(sheet.getCell(1, 1).value, '二维码')
  for (let i = 0; i < 100; i++) {
    assert.equal(sheet.getCell(i + 2, 1).value, row(i).linkUrl)
  }
})

test('missing, invalid, duplicate and unsafe strings fail the export', async () => {
  await assert.rejects(buildLotteryCodeExcel([row(0), { code: 'DRAW-1', linkUrl: '' }]), /缺失或无效.*HTTPS 普通链接前缀/)
  await assert.rejects(buildLotteryCodeExcel([row(0), row(0)]), /重复/)
  await assert.rejects(buildLotteryCodeExcel([row(0), { code: 'DRAW-1', linkUrl: 'javascript:alert(1)' }]), /缺失或无效/)
  await assert.rejects(buildLotteryCodeExcel([]), /没有可导出/)
})
