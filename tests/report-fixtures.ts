import type { Report } from '../src/report'

export const activeWeek: Report = {
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

export const emptyWeek: Report = {
  weekStart: '2026-11-09',
  weekEnd: '2026-11-15',
  counts: { openedIssues: 0, closedIssues: 0, openedPrs: 0, mergedPrs: 0 },
  byType: [],
  byAuthor: [],
  comparison: null,
}
