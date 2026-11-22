import { expect, test } from '@playwright/test'
import { activeWeek } from './report-fixtures'

test('вид отчёта на широком и узком экране', async ({ page }) => {
  await page.route('**/api/weekly-report?**', (route) => route.fulfill({ json: activeWeek }))
  await page.goto('/')
  await page.getByLabel('Начало недели').fill(activeWeek.weekStart)
  await page.getByRole('button', { name: 'Показать отчёт' }).click()
  await expect(page.getByRole('status')).toHaveText('Отчёт загружен')
  await expect(page).toHaveScreenshot('report-desktop.png', { animations: 'disabled' })
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)
  await expect(page).toHaveScreenshot('report-mobile.png', { animations: 'disabled' })
})
