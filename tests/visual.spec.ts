import { expect, test } from '@playwright/test'
import { activeWeek, emptyWeek } from './report-fixtures'

test('вид отчёта на широком и узком экране', async ({ page }) => {
  await page.route('**/api/weekly-report?**', (route) => route.fulfill({ json: activeWeek }))
  await page.goto('/')
  await page.getByLabel('Начало недели').fill(activeWeek.weekStart)
  await page.getByRole('button', { name: 'Показать отчёт' }).click()
  await expect(page.getByRole('status')).toHaveText('Отчёт загружен')
  await expect(page).toHaveScreenshot('report-desktop.png', { animations: 'disabled', fullPage: true })
  await page.setViewportSize({ width: 390, height: 844 })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(390)
  await expect(page).toHaveScreenshot('report-mobile.png', { animations: 'disabled', fullPage: true })
})

test('вид пустого отчёта и ошибки на узком экране', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.route('**/api/weekly-report?**', (route) => {
    const week = new URL(route.request().url()).searchParams.get('weekStart')
    return week === emptyWeek.weekStart
      ? route.fulfill({ json: emptyWeek })
      : route.fulfill({ status: 500, json: { error: 'upstream failed' } })
  })
  await page.goto('/')
  const date = page.getByLabel('Начало недели')
  const submit = page.getByRole('button', { name: 'Показать отчёт' })
  await date.fill(emptyWeek.weekStart)
  await submit.click()
  await expect(page.getByText('За эту неделю нет активности')).toBeVisible()
  await expect(page).toHaveScreenshot('report-empty-mobile.png', { animations: 'disabled', fullPage: true })

  await date.fill(activeWeek.weekStart)
  await submit.click()
  await expect(page.getByRole('alert')).toBeVisible()
  await expect(page).toHaveScreenshot('report-error-mobile.png', { animations: 'disabled', fullPage: true })
})
