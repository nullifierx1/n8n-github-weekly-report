import type { Report, ReportResponse } from '../src/report'

export const repository = 'nullifierx1/n8n-code-review-test'

export const savedActiveRow = {
  report_key: repository + '#2026-11-16',
  week_start: '2026-11-16T00:00:00.000Z',
  week_end: '2026-11-23T00:00:00.000Z',
  issues_created: 8,
  issues_closed: 4,
  prs_created: 7,
  prs_merged: 1,
  by_type_json: '{"bug":2,"task":1,"feature":1,"unknown":4}',
  by_author_json: '[{"author":"nullifierx1","issues_created":8}]',
}

export const savedZeroRow = {
  report_key: repository + '#2026-11-09',
  week_start: '2026-11-09T00:00:00.000Z',
  week_end: '2026-11-16T00:00:00.000Z',
  issues_created: 0,
  issues_closed: 0,
  prs_created: 0,
  prs_merged: 0,
  by_type_json: '{"bug":0,"task":0,"feature":0,"unknown":0}',
  by_author_json: '[]',
}

export const activeWeek: Report = {
  status: 'success',
  weekStart: '2026-11-16',
  weekEnd: '2026-11-22',
  counts: { openedIssues: 8, closedIssues: 4, openedPrs: 7, mergedPrs: 1 },
  byType: [
    { label: 'bug', count: 2 },
    { label: 'task', count: 1 },
    { label: 'feature', count: 1 },
    { label: 'unknown', count: 4 },
  ],
  byAuthor: [{ label: 'nullifierx1', count: 8 }],
  comparison: { openedIssues: 8, closedIssues: 4, openedPrs: 7, mergedPrs: 1 },
}

export const zeroWeek: Report = {
  status: 'success',
  weekStart: '2026-11-09',
  weekEnd: '2026-11-15',
  counts: { openedIssues: 0, closedIssues: 0, openedPrs: 0, mergedPrs: 0 },
  byType: [
    { label: 'bug', count: 0 },
    { label: 'task', count: 0 },
    { label: 'feature', count: 0 },
    { label: 'unknown', count: 0 },
  ],
  byAuthor: [],
  comparison: null,
}

export const missingWeek: Extract<ReportResponse, { status: 'empty' }> = {
  status: 'empty',
  weekStart: '2026-11-30',
  message: 'За выбранную неделю сохранённого отчёта нет',
}
