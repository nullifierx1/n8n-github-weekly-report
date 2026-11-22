import { readFileSync } from 'node:fs'
import { expect, test } from '@playwright/test'
import { isReportResponse } from '../src/report'
import { activeWeek, missingWeek, repository, savedActiveRow, savedZeroRow, zeroWeek } from './report-fixtures'

type Json = Record<string, unknown>
type Item = { json: Json }
type Node = { name: string; type: string; onError?: string; parameters: Json }

const workflow = JSON.parse(readFileSync(new URL('../n8n/weekly-report-api.json', import.meta.url), 'utf8')) as {
  nodes: Node[]
  connections: Record<string, { main: { node: string }[][] }>
}

function node(name: string) {
  const found = workflow.nodes.find((entry) => entry.name === name)
  if (!found) throw new Error('Missing node: ' + name)
  return found
}

// Execute the exported Code node with the small subset of n8n's item API it uses.
function runCode(name: string, rows: Json[], before: Record<string, Json> = {}): Json {
  const items: Item[] = rows.map((json) => ({ json }))
  const input = { first: () => items[0], all: () => items }
  const lookup = (key: string) => ({ first: () => ({ json: before[key] }) })
  const output = new Function('$input', '$', String(node(name).parameters.jsCode))(input, lookup) as Item[]
  return output[0].json
}

function validate(weekStart: string) {
  return runCode('Validate week', [{ query: { weekStart } }])
}

function respond(name: string, data: Json = {}) {
  const { responseBody, options } = node(name).parameters
  const expression = String(responseBody).slice(3, -2).trim()
  return {
    body: new Function('$json', 'return (' + expression + ')')(data),
    code: (options as { responseCode: number }).responseCode,
  }
}

function build(week: string, selected: Json, previous: Json[]) {
  const date = validate(week)
  const current = runCode('Select current row', [selected], { 'Validate week': date })
  return runCode('Build report', previous, { 'Validate week': date, 'Select current row': current })
}

test('сохранённые строки дают тот же JSON, что и клиентские фикстуры', () => {
  const active = build(activeWeek.weekStart, savedActiveRow, [savedZeroRow])
  const zero = build(zeroWeek.weekStart, savedZeroRow, [{}])
  expect(active).toEqual(activeWeek)
  expect(zero).toEqual(zeroWeek)
  expect(build(activeWeek.weekStart, savedActiveRow, [{}]).comparison).toBeNull()
  expect(isReportResponse(active, activeWeek.weekStart)).toBe(true)
  expect(isReportResponse(zero, zeroWeek.weekStart)).toBe(true)
})

test('контракт различает отсутствие строки, неверную дату и сбой', () => {
  const date = validate(missingWeek.weekStart)
  expect(date).toMatchObject({
    currentKey: repository + '#2026-11-30',
    previousKey: repository + '#2026-11-23',
  })
  const current = runCode('Select current row', [{}], { 'Validate week': date })
  expect(current.row).toBeNull()
  expect(respond('Respond empty', current)).toEqual({ code: 200, body: missingWeek })
  expect(isReportResponse(missingWeek, missingWeek.weekStart)).toBe(true)
  for (const invalid of ['', '2026-02-30', '2026-11-17']) {
    expect(validate(invalid)).toEqual({ valid: false })
  }
  expect(respond('Respond 400')).toMatchObject({ code: 400, body: { status: 'error' } })
  expect(respond('Respond 500', { error: 'internal' })).toEqual({
    code: 500,
    body: { status: 'error', message: 'Не удалось загрузить сохранённый отчёт' },
  })
})

test('дубликаты и повреждённые строки не становятся отчётом', () => {
  const date = validate(activeWeek.weekStart)
  expect(() => runCode('Select current row', [savedActiveRow, savedActiveRow], { 'Validate week': date })).toThrow()
  expect(() => build(activeWeek.weekStart, savedActiveRow, [savedZeroRow, savedZeroRow])).toThrow()
  expect(() => build(activeWeek.weekStart, { ...savedActiveRow, by_author_json: '{}' }, [{}])).toThrow()
  expect(() => build(activeWeek.weekStart, { ...savedActiveRow, by_type_json: '{' }, [{}])).toThrow()
  expect(() => build(activeWeek.weekStart, { ...savedActiveRow, week_end: savedActiveRow.week_start }, [{}])).toThrow()
  expect(() => build(activeWeek.weekStart, savedActiveRow, [{ ...savedZeroRow, issues_closed: null }])).toThrow()
})

test('экспорт только читает нужную таблицу, ошибки идут по отдельной ветке', () => {
  expect(workflow.nodes.filter(({ type }) => type === 'n8n-nodes-base.httpRequest')).toHaveLength(0)
  const reads = workflow.nodes.filter(({ type }) => type === 'n8n-nodes-base.dataTable')
  expect(reads.map(({ name }) => name)).toEqual(['Read selected week', 'Read previous week'])
  for (const read of reads) {
    expect(read.parameters).toMatchObject({ operation: 'get', dataTableId: { value: 'TaNHNo4q6sAD9eY9' }, limit: 2 })
    expect(read.onError).toBe('continueErrorOutput')
    expect(workflow.connections[read.name].main[1]).toEqual([{ node: 'Respond 500', type: 'main', index: 0 }])
  }
})
