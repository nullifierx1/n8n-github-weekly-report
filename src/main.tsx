import { StrictMode, useRef, useState, type FormEvent } from 'react'
import { createRoot } from 'react-dom/client'
import { CalendarDays, CircleAlert, GitPullRequest, LoaderCircle } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { fetchReport, formatPeriod, metricKeys, metrics, validateWeek, type Breakdown, type Report, type ReportResponse } from './report'
import './style.css'

type Result = { status: 'initial' | 'loading' | 'error' } | ReportResponse

function BreakdownCard({ title, rows }: { title: string; rows: Breakdown[] }) {
  return (
    <Card>
      <CardHeader><CardTitle><h3>{title}</h3></CardTitle></CardHeader>
      <CardContent>
        {rows.length ? (
          <ul className="divide-y">
            {rows.map(({ label, count }) => (
              <li key={label} className="flex justify-between gap-4 py-2">
                <span className="break-all text-muted-foreground">{label}</span><strong>{count}</strong>
              </li>
            ))}
          </ul>
        ) : <p className="text-muted-foreground">Нет данных</p>}
      </CardContent>
    </Card>
  )
}

function ReportView({ report }: { report: Report }) {
  const empty = metricKeys.every((key) => report.counts[key] === 0)
  return (
    <section aria-labelledby="report-title" className="space-y-4">
      <div>
        <h2 id="report-title" className="text-2xl font-semibold">{formatPeriod(report.weekStart, report.weekEnd)}</h2>
        {empty && <p className="mt-1 text-muted-foreground">Сохранённый отчёт: за эту неделю нет активности</p>}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {metricKeys.map((key) => (
          <Card key={key} className="gap-2 py-4">
            <CardHeader className="px-4"><CardTitle><h3 className="text-sm text-muted-foreground">{metrics[key]}</h3></CardTitle></CardHeader>
            <CardContent className="px-4">
              <p className="text-3xl font-semibold tabular-nums">{report.counts[key]}</p>
              {report.comparison && (
                <p className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
                  <span className="rounded-full border bg-background px-2 py-0.5 font-medium tabular-nums text-foreground">{new Intl.NumberFormat('ru', { signDisplay: 'exceptZero' }).format(report.comparison[key])}</span> к прошлой неделе
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      {!report.comparison && <p className="text-sm text-muted-foreground">Данных за предыдущую неделю нет</p>}
      {!empty && (
        <div className="grid gap-3 sm:grid-cols-2">
          <BreakdownCard title="Issues по типам" rows={report.byType} />
          <BreakdownCard title="Issues по авторам" rows={report.byAuthor} />
        </div>
      )}
    </section>
  )
}

function App() {
  const [week, setWeek] = useState('')
  const [fieldError, setFieldError] = useState('')
  const [result, setResult] = useState<Result>({ status: 'initial' })
  const pending = useRef(false)
  const loading = result.status === 'loading'

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending.current) return
    const validation = validateWeek(week)
    setFieldError(validation)
    if (validation) return
    pending.current = true
    setResult({ status: 'loading' })
    try {
      setResult(await fetchReport(week))
    } catch {
      setResult({ status: 'error' })
    } finally {
      pending.current = false
    }
  }

  return (
    <>
      <header className="border-b bg-card">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-3 px-5 py-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground">
            <GitPullRequest size={16} aria-hidden="true" />
          </span>
          <p className="min-w-0 break-words text-sm font-medium">nullifierx1 / n8n-code-review-test</p>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl space-y-6 px-5 py-8 sm:py-10">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Сохранённые недельные отчёты GitHub</h1>
        <Card>
          <CardContent>
            <form onSubmit={submit} noValidate className="flex flex-wrap items-end gap-3">
              <div className="w-full space-y-2 sm:w-auto">
                <Label htmlFor="week">Начало недели</Label>
                <Input
                  id="week" type="date" value={week} required readOnly={loading}
                  aria-invalid={Boolean(fieldError)}
                  aria-describedby={fieldError ? 'week-error' : undefined}
                  onChange={(event) => { setWeek(event.target.value); setFieldError('') }}
                />
              </div>
              <Button type="submit" disabled={loading}>
                {loading ? <LoaderCircle className="motion-safe:animate-spin" aria-hidden="true" /> : <CalendarDays aria-hidden="true" />}
                Показать отчёт
              </Button>
              {fieldError && <p id="week-error" role="alert" className="w-full text-sm text-destructive">{fieldError}</p>}
            </form>
          </CardContent>
        </Card>
        <div role="status" className={loading ? 'rounded-lg border bg-card p-4 text-muted-foreground' : 'sr-only'}>
          {loading ? 'Загружаем отчёт…' : result.status === 'success' ? 'Отчёт загружен' : ''}
        </div>
        {result.status === 'error' && (
          <Alert variant="destructive" role="alert">
            <CircleAlert aria-hidden="true" />
            <AlertTitle>Не удалось загрузить отчёт</AlertTitle>
            <AlertDescription>Проверьте подключение и повторите попытку.</AlertDescription>
          </Alert>
        )}
        {result.status === 'success' && <ReportView report={result} />}
        {result.status === 'empty' && (
          <Alert role="status">
            <AlertTitle className="line-clamp-none">{result.message}</AlertTitle>
            <AlertDescription>Неделя с {formatPeriod(result.weekStart, result.weekStart)}</AlertDescription>
          </Alert>
        )}
      </main>
    </>
  )
}

createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)
