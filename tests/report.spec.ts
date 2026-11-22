import { expect, test } from '@playwright/test'
import { activeWeek, missingWeek, zeroWeek } from './report-fixtures'

const api = '**/api/weekly-report?**'

test('выбор недели и отправка с клавиатуры показывают отчёт', async ({ page }) => {
  await page.route(api, async (route) => {
    expect(new URL(route.request().url()).searchParams.get('weekStart')).toBe(activeWeek.weekStart)
    await route.fulfill({ json: activeWeek })
  })
  await page.goto('/')
  await page.keyboard.press('Tab')
  const field = page.getByLabel('Начало недели')
  await expect(field).toBeFocused()
  await field.fill(activeWeek.weekStart)
  const submit = page.getByRole('button', { name: 'Показать отчёт' })
  for (let tab = 0; tab < 5 && !await submit.evaluate((button) => button.matches(':focus-visible')); tab++) {
    await page.keyboard.press('Tab')
  }
  await expect(submit).toBeFocused()
  await page.keyboard.press('Enter')

  const report = page.getByRole('region', { name: /16.*22 ноября 2026/ })
  await expect(report.getByText('Создано Issues')).toBeVisible()
  for (const [label, count] of [['Создано Issues', 8], ['Закрыто Issues', 4], ['Создано PR', 7], ['Объединено PR', 1]] as const) {
    const card = report.locator('[data-slot=card]').filter({ has: page.getByRole('heading', { name: label, exact: true }) })
    await expect(card.getByText(String(count), { exact: true })).toBeVisible()
  }
  await expect(report.getByRole('heading', { name: 'Issues по авторам' })).toBeVisible()
})

test('пустая дата и день в середине недели показывают ошибку поля', async ({ page }) => {
  let requests = 0
  await page.route(api, async (route) => { requests++; await route.fulfill({ json: activeWeek }) })
  await page.goto('/')
  const submit = page.getByRole('button', { name: 'Показать отчёт' })
  await submit.click()
  await expect(page.getByRole('alert')).toHaveText('Укажите дату начала недели.')
  const field = page.getByLabel('Начало недели')
  await field.fill('2026-11-17')
  await submit.click()
  await expect(field).toHaveAccessibleDescription('Выберите понедельник.')
  expect(requests).toBe(0)
})

test('пока ответ задержан, повторная отправка даёт один запрос', async ({ page }) => {
  let requests = 0
  const { promise, resolve } = Promise.withResolvers<void>()
  await page.route(api, async (route) => {
    requests++
    await promise
    await route.fulfill({ json: activeWeek })
  })
  await page.goto('/')
  await page.getByLabel('Начало недели').fill(activeWeek.weekStart)
  const submit = page.getByRole('button', { name: 'Показать отчёт' })
  try {
    await submit.dblclick({ force: true })
    await expect(page.getByRole('status')).toHaveText('Загружаем отчёт…')
    await expect(submit).toBeDisabled()
    await page.getByLabel('Начало недели').press('Enter')
    await page.locator('form').evaluate((form: HTMLFormElement) => form.requestSubmit())
  } finally {
    resolve()
  }
  await expect(page.getByRole('status')).toHaveText('Отчёт загружен')
  expect(requests).toBe(1)
})

test('сохранённая нулевая неделя показывает четыре нуля и отсутствие сравнения', async ({ page }) => {
  await page.route(api, (route) => route.fulfill({ json: zeroWeek }))
  await page.goto('/')
  await page.getByLabel('Начало недели').fill(zeroWeek.weekStart)
  await page.getByRole('button', { name: 'Показать отчёт' }).click()
  await expect(page.getByText('За эту неделю нет активности')).toBeVisible()
  await expect(page.getByText('Данных за предыдущую неделю нет')).toBeVisible()
  await expect(page.getByText('0', { exact: true })).toHaveCount(4)
})

test('отсутствующая строка не показывает нулевой отчёт', async ({ page }) => {
  await page.route(api, (route) => route.fulfill({ json: missingWeek }))
  await page.goto('/')
  await page.getByLabel('Начало недели').fill(missingWeek.weekStart)
  await page.getByRole('button', { name: 'Показать отчёт' }).click()
  await expect(page.getByText(missingWeek.message)).toBeVisible()
  await expect(page.getByText(/Неделя с 30 ноября 2026/)).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Создано Issues' })).toHaveCount(0)
})

test('ошибка сохраняет дату и позволяет повторить запрос', async ({ page }) => {
  let requests = 0
  await page.route(api, (route) => ++requests === 1
    ? route.fulfill({ status: 500, json: { error: 'upstream failed' } })
    : route.fulfill({ json: activeWeek }))
  await page.goto('/')
  const field = page.getByLabel('Начало недели')
  await field.fill(activeWeek.weekStart)
  const submit = page.getByRole('button', { name: 'Показать отчёт' })
  await submit.click()
  await expect(page.getByRole('alert')).toContainText('Не удалось загрузить отчёт')
  await expect(field).toHaveValue(activeWeek.weekStart)
  await submit.click()
  await expect(page.getByRole('status')).toHaveText('Отчёт загружен')
  await expect(page.getByRole('alert')).toHaveCount(0)
  await expect(page.getByRole('region', { name: /16.*22 ноября 2026/ })).toBeVisible()
  expect(requests).toBe(2)
})
