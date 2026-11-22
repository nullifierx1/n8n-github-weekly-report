export const metrics = {
  openedIssues: 'Создано Issues',
  closedIssues: 'Закрыто Issues',
  openedPrs: 'Создано PR',
  mergedPrs: 'Объединено PR',
}

export const metricKeys = Object.keys(metrics) as (keyof typeof metrics)[]
export type Counts = Record<keyof typeof metrics, number>

export type Breakdown = { label: string; count: number }

export interface Report {
  status: 'success'
  weekStart: string
  weekEnd: string
  counts: Counts
  comparison: Counts | null
  byType: Breakdown[]
  byAuthor: Breakdown[]
}

export type ReportResponse = Report | {
  status: 'empty'
  weekStart: string
  message: string
}

export function validateWeek(value: string) {
  if (!value) return 'Укажите дату начала недели.'
  const date = new Date(value + 'T00:00:00Z')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(date.getTime())
      || date.toISOString().slice(0, 10) !== value || date.getUTCDay() !== 1) {
    return 'Выберите понедельник.'
  }
  if (date.getUTCFullYear() < 2008 || date.getUTCFullYear() > 9998) {
    return 'Укажите год от 2008 до 9998.'
  }
  return ''
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isCounts(value: unknown, allowNegative: boolean): value is Counts {
  return isRecord(value) && metricKeys.every((key) => {
    const count = value[key]
    return typeof count === 'number' && Number.isSafeInteger(count) && (allowNegative || count >= 0)
  })
}

function isBreakdown(value: unknown): value is Breakdown[] {
  return Array.isArray(value) && value.every((row) =>
    isRecord(row) && typeof row.label === 'string'
    && typeof row.count === 'number' && Number.isSafeInteger(row.count) && row.count >= 0)
}

function isReport(value: unknown, weekStart: string): value is Report {
  const weekEnd = new Date(weekStart + 'T00:00:00Z')
  weekEnd.setUTCDate(weekEnd.getUTCDate() + 6)
  return isRecord(value) && value.status === 'success' && value.weekStart === weekStart
    && value.weekEnd === weekEnd.toISOString().slice(0, 10)
    && isCounts(value.counts, false)
    && (value.comparison === null || isCounts(value.comparison, true))
    && isBreakdown(value.byType) && isBreakdown(value.byAuthor)
}

export function isReportResponse(value: unknown, weekStart: string): value is ReportResponse {
  return isReport(value, weekStart) || (isRecord(value) && value.status === 'empty'
    && value.weekStart === weekStart && typeof value.message === 'string' && value.message.trim().length > 0)
}

export async function fetchReport(weekStart: string): Promise<ReportResponse> {
  const query = new URLSearchParams({ weekStart })
  const response = await fetch('/api/weekly-report?' + query, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(25_000),
  })
  if (!response.ok) throw new Error('Report request failed')
  const report: unknown = await response.json()
  if (!isReportResponse(report, weekStart)) throw new Error('Invalid report response')
  return report
}

export function formatPeriod(weekStart: string, weekEnd: string) {
  const format = new Intl.DateTimeFormat('ru', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  })
  return format.formatRange(new Date(weekStart), new Date(weekEnd))
}
