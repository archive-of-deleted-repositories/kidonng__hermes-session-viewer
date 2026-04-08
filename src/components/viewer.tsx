import { Link } from '@tanstack/react-router'
import { useDeferredValue } from 'react'
import type {
  SessionMetaInfo,
  SessionSummary,
  ToolCallView,
  ToolResultView,
  TranscriptMessage,
} from '~/lib/hermes-types'
import { CopyButton } from '~/components/copy-button'
import { MarkdownBlock } from '~/components/markdown-block'
import emojiMapData from '~/data/emoji-map.json'

const emojiMap: Record<string, string> = emojiMapData.reduce(
  (acc, { name, emoji }) => ({ ...acc, [name]: emoji }),
  {}
)

type SidebarProps = {
  sessions: SessionSummary[]
  activeSessionId?: string
  filter: string
  onFilterChange: (value: string) => void
  theme: string
  onThemeChange: (value: string) => void
}

type SessionHeaderProps = {
  summary: SessionSummary
  meta: SessionMetaInfo
  messageCount: number
  toolCallCount: number
  reasoningOpen: boolean
  onReasoningOpenChange: (value: boolean) => void
  toolsOpen: boolean
  onToolsOpenChange: (value: boolean) => void
}

type MessageCardProps = {
  message: TranscriptMessage
  index: number
  reasoningOpen: boolean
  onReasoningOpenChange: (value: boolean) => void
  toolsOpen: boolean
  onToolsOpenChange: (value: boolean) => void
}

export function SessionSidebar({ sessions, activeSessionId, filter, onFilterChange, theme, onThemeChange }: SidebarProps) {
  const deferredFilter = useDeferredValue(filter)
  const normalizedFilter = deferredFilter.trim().toLowerCase()
  const visibleSessions = sessions.filter((session) => {
    if (!normalizedFilter) {
      return true
    }

    const haystack = [
      session.displayName,
      session.sessionKey,
      session.sessionId,
      session.origin?.chat_name,
      session.origin?.user_name,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()

    return haystack.includes(normalizedFilter)
  })

  return (
    <aside className="sidebar-panel h-full min-h-screen border-r border-base-300/70 bg-base-100/92 backdrop-blur-xl">
      <div className="border-b border-base-300/70 px-5 pb-5 pt-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-base-content/45">Hermes</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-base-content">Session Viewer</h1>
        <div className="mt-4 flex items-center gap-2">
          <label htmlFor="theme-select" className="text-xs font-semibold uppercase tracking-[0.22em] text-base-content/45">Theme</label>
          <select
            id="theme-select"
            aria-label="Theme"
            className="select select-bordered select-sm w-auto rounded-xl"
            value={theme}
            onChange={(e) => onThemeChange(e.target.value)}
          >
            <option value="system">System</option>
            <option value="hermes">Light</option>
            <option value="hermes-dark">Dark</option>
          </select>
        </div>
      </div>

      <div className="px-3 py-4">
        <label className="mb-4 block">
          <span className="mb-3 flex items-center justify-between px-2 text-xs font-semibold uppercase tracking-[0.22em] text-base-content/45">
            <span>Sessions</span>
            <span>{visibleSessions.length}</span>
          </span>
          <input
            value={filter}
            onChange={(event) => onFilterChange(event.target.value)}
            placeholder="Search by title, ID, or chat"
            className="input input-bordered w-full rounded-2xl border-base-300/80 bg-base-100/90"
          />
        </label>

        <div className="space-y-2">
          {visibleSessions.map((session) => {
            const active = session.sessionId === activeSessionId

            return (
              <Link
                key={session.sessionId}
                to="/"
                search={{ sessionId: session.sessionId }}
                className={`session-link ${active ? 'session-link--active' : ''}`.trim()}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold tracking-tight text-base-content">
                      {session.displayName}
                    </p>
                    <p className="mt-1 truncate font-mono text-[11px] text-base-content/45">{session.sessionId}</p>
                  </div>
                  <span className="badge badge-ghost rounded-full border-base-300/80 px-2 py-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-base-content/55">
                    {session.platform ?? 'local'}
                  </span>
                </div>

                <div className="mt-3 flex items-center justify-between gap-3 text-xs text-base-content/55">
                  <span className="truncate">{session.chatType ?? session.origin?.chat_type ?? 'session'}</span>
                  <time dateTime={session.updatedAt}>{formatRelativeTime(session.updatedAt)}</time>
                </div>
              </Link>
            )
          })}

          {!visibleSessions.length ? (
            <div className="rounded-3xl border border-dashed border-base-300/80 bg-base-100/70 px-4 py-6 text-sm leading-6 text-base-content/55">
              No sessions match the current filter.
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  )
}

export function SessionHeader({
  summary,
  meta,
  messageCount,
  toolCallCount,
  reasoningOpen,
  onReasoningOpenChange,
  toolsOpen,
  onToolsOpenChange,
}: SessionHeaderProps) {
  return (
    <>
      <section className="sticky top-4 lg:top-7 z-10 rounded-2xl border border-base-300/70 bg-base-100/90 backdrop-blur-xl">
        <div className="flex flex-col px-4 py-2 lg:py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 lg:px-6">
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <div className="min-w-0">
              <h2 className="truncate text-base font-bold tracking-tight text-base-content sm:text-lg">{summary.displayName}</h2>
              <p className="truncate font-mono text-[10px] text-base-content/45 sm:text-xs">{meta.sessionId}</p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <span className="badge badge-primary badge-soft rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] sm:text-[10px] sm:px-2 sm:py-1.5">
                {summary.platform ?? 'local'}
              </span>
              {summary.chatType ? (
                <span className="badge badge-outline rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] sm:text-[10px] sm:px-2 sm:py-1.5">
                  {summary.chatType}
                </span>
              ) : null}
              {meta.model ? (
                <span className="badge badge-outline rounded-full px-2 py-1 text-[9px] font-semibold uppercase tracking-[0.12em] sm:text-[10px] sm:px-2 sm:py-1.5">
                  {meta.model}
                </span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-2 sm:gap-4">
            <div className="flex items-center gap-3 text-[11px] sm:text-xs">
              <span className="text-base-content/45">
                <span className="font-medium text-base-content/65">{formatNumber(messageCount)}</span> msgs
              </span>
            </div>

            <div className="flex items-center gap-2">
              {meta.systemPrompt ? (
                <button
                  type="button"
                  onClick={() => (document.getElementById('system-prompt-modal') as HTMLDialogElement | null)?.showModal()}
                  className="btn btn-sm btn-ghost rounded-full px-2 text-[10px] font-medium sm:px-3 sm:text-xs"
                >
                  System prompt
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => onReasoningOpenChange(!reasoningOpen)}
                className="btn btn-sm btn-ghost rounded-full px-2 text-[10px] font-medium sm:px-3 sm:text-xs"
              >
                {reasoningOpen ? '✓' : '○'} Reasoning
              </button>
              <button
                type="button"
                onClick={() => onToolsOpenChange(!toolsOpen)}
                className="btn btn-sm btn-ghost rounded-full px-2 text-[10px] font-medium sm:px-3 sm:text-xs"
              >
                {toolsOpen ? '✓' : '○'} Tools
              </button>
            </div>
          </div>
        </div>
      </section>

      {meta.systemPrompt ? (
        <dialog id="system-prompt-modal" className="modal">
          <div className="modal-box max-w-3xl">
            <form method="dialog">
              <button className="btn btn-sm btn-circle btn-ghost absolute right-6 top-6">✕</button>
            </form>
            <h3 className="text-lg font-bold">System Prompt</h3>
            <div className="mt-4 max-h-[60vh] overflow-y-auto">
              <MarkdownBlock html={meta.renderedSystemPromptHtml} />
            </div>
          </div>
          <form method="dialog" className="modal-backdrop">
            <button>close</button>
          </form>
        </dialog>
      ) : null}
    </>
  )
}

export function MessageCard({
  message,
  index,
  reasoningOpen,
  onReasoningOpenChange,
  toolsOpen,
  onToolsOpenChange,
}: MessageCardProps) {
  const roleClass =
    message.role === 'assistant'
      ? 'message-surface--assistant'
      : message.role === 'user'
        ? 'message-surface--user'
        : 'message-surface--system'

  return (
    <article
      className={`message-surface ${roleClass} group`.trim()}
      style={{ animationDelay: `${Math.min(index * 45, 320)}ms` }}
    >
      <div className="space-y-5">
        {message.renderedReasoningHtml ? (
          <details className="group" open={reasoningOpen}>
            <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold tracking-[0.08em] text-base-content/70">
              <span className="transition-transform duration-200 group-open:rotate-90">▶</span>
              Reasoning
            </summary>
            <div className="mt-4 rounded-3xl border border-base-300/70 bg-base-100/65 p-4">
              <MarkdownBlock html={message.renderedReasoningHtml} className="md--reasoning" />
            </div>
          </details>
        ) : null}

        {message.renderedContentHtml ? <MarkdownBlock html={message.renderedContentHtml} /> : null}

        {!message.renderedContentHtml && !message.toolCalls.length && message.role === 'assistant' ? (
          <p className="text-sm leading-6 text-base-content/55">This assistant turn only contains metadata.</p>
        ) : null}

        {message.toolCalls.length ? (
          <div className="mb-4">
            {message.toolCalls.length === 1 ? (
              <ToolInvocationCard toolCall={message.toolCalls[0]} toolsOpen={toolsOpen} />
            ) : (
              <>
                <details className="group" open={toolsOpen}>
                  <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-semibold tracking-[0.08em] text-base-content/70">
                    <span className="transition-transform duration-200 group-open:rotate-90">▶</span>
                    Tool calls ({message.toolCalls.length})
                  </summary>
                  <div className="mt-4 space-y-3">
                    {message.toolCalls.map((toolCall) => (
                      <ToolInvocationCard key={toolCall.id} toolCall={toolCall} toolsOpen={toolsOpen} />
                    ))}
                  </div>
                </details>
              </>
            )}
          </div>
        ) : null}
      </div>

      <footer className="mt-2 flex flex-row items-center justify-between gap-3">
        <span className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 focus-within:opacity-100 transition-opacity duration-150">
          {message.content?.trim() ? <CopyButton text={message.content} /> : null}
        </span>
        <time
          className="font-mono text-xs uppercase tracking-[0.16em] text-base-content/45"
          dateTime={message.timestamp}
          title={formatAbsoluteTime(message.timestamp)}
        >
          {formatShortTime(message.timestamp)}
        </time>
      </footer>
    </article>
  )
}

function ToolInvocationCard({ toolCall, toolsOpen }: { toolCall: ToolCallView; toolsOpen: boolean }) {
  const resultStatus = toolCall.results.some((result) => result.status === 'error')
    ? 'error'
    : toolCall.results.some((result) => result.status === 'success')
      ? 'success'
      : 'unknown'

  return (
    <details
      className={`tool-panel ${resultStatus === 'error' ? 'tool-panel--error' : ''}`.trim()}
      open={toolsOpen}
    >
      <summary className="flex cursor-pointer list-none flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge badge-outline rounded-full px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.16em]">
              {emojiMap[toolCall.name] ?? ''} {toolCall.name}
            </span>
            <p className="tool-preview truncate font-mono text-xs leading-6 text-base-content/60">
              {toolCall.previewValue}
            </p>
          </div>
        </div>
        {resultStatus === 'error' && <span className="tool-status badge badge-error badge-soft rounded-full px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.16em]">error</span>}
      </summary>

      <div className="mt-5 space-y-6">
        {toolCall.argumentsObject ? (
            <JsonTable
              data={toolCall.argumentsObject}
              columns={toolCall.previewKind === 'link' ? { [toolCall.previewLabel]: 'url' } : undefined}
              rendered={toolCall.rendered}
            />
        ) : (
          <pre className="overflow-x-auto rounded-2xl bg-base-200 p-4 font-mono text-xs leading-6 text-base-content">
            {toolCall.argumentsText}
          </pre>
        )}

        {toolCall.results.length > 0 && (
          <div className="border-t-2 border-base-300/80 pt-6">
            {toolCall.results.map((result, index) => (
              <ToolResultCard key={`${toolCall.id}-result-${index}`} result={result} toolName={toolCall.name} />
            ))}
          </div>
        )}
      </div>
    </details>
  )
}

type JsonColumnType = 'url' | 'pre' | 'html'

type JsonColumns = Record<string, JsonColumnType>

function JsonTable({ data, columns, rendered }: { data: Record<string, unknown> | unknown[]; columns?: JsonColumns; rendered?: Record<string, string> }) {
  const isArray = Array.isArray(data)
  const entries = isArray ? data.map((v, i) => [String(i), v] as [string, unknown]) : Object.entries(data)

  function renderValue(value: unknown, key: string): React.ReactNode {
    if (typeof value === 'object' && value !== null) {
      return JSON.stringify(value)
    }
    const str = String(value)
    const colType = columns?.[key]

    if (rendered?.[key]) {
      return <div className="md relative" dangerouslySetInnerHTML={{ __html: rendered[key] }} />
    }

    if (colType === 'url') {
      return (
        <a href={str} target="_blank" rel="noreferrer" className="link link-primary break-all">
          {str}
        </a>
      )
    }

    if (colType === 'pre') {
      return (
        <div className="relative">
          <pre className="overflow-x-auto rounded-2xl bg-base-200 p-4 font-mono text-xs leading-6 text-base-content">
            <code>{str}</code>
          </pre>
          <CopyButton text={str} className="floating-copy-button" />
        </div>
      )
    }

    if (colType === 'html') {
      return <div dangerouslySetInnerHTML={{ __html: str }} />
    }

    return <span className="font-mono text-xs break-all">{str}</span>
  }

  return (
    <div className="space-y-3">
      {entries.map(([key, value]) => (
        <div key={key}>
          <div className="font-semibold text-xs text-base-content/50 uppercase tracking-[0.16em] mb-1">{key}</div>
          <div className="text-base-content/80">{renderValue(value, key)}</div>
        </div>
      ))}
    </div>
  )
}

function ToolResultCard({ result, toolName }: { result: ToolResultView; toolName: string }) {
  const rawPreview = result.parsed ? JSON.stringify(result.parsed, null, 2) : result.contentText
  const codeKeys: Record<string, string[]> = {
    terminal: ['output'],
    browser_snapshot: ['snapshot'],
    browser_navigate: ['snapshot'],
  }
  const keys = codeKeys[toolName]
  const columns: JsonColumns | undefined = keys ? Object.fromEntries(keys.map((k) => [k, 'pre'])) : undefined

  return (
    <div>
      {result.status === 'error' && <span className="badge badge-error badge-soft rounded-full px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.16em]">error</span>}

      {result.parsed && typeof result.parsed === 'object' ? (
          <JsonTable data={result.parsed} columns={columns} rendered={result.rendered} />
      ) : (
        <pre className="overflow-x-auto rounded-2xl bg-base-200 p-4 font-mono text-xs leading-6 text-base-content">
          {rawPreview}
        </pre>
      )}
    </div>
  )
}

function MetricTile({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="metric-tile">
      <div className={`metric-dot metric-dot--${accent}`} />
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-base-content/45">{label}</p>
      <p className="mt-2 text-2xl font-bold tracking-tight text-base-content">{value}</p>
    </div>
  )
}

function MetaLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-base-content/45">{label}</p>
      <p className="mt-2 text-sm font-medium leading-6 text-base-content/75">{value}</p>
    </div>
  )
}

function formatNumber(value: number | undefined) {
  if (!value && value !== 0) {
    return '—'
  }

  return new Intl.NumberFormat().format(value)
}

function formatCurrency(value: number | undefined, status?: string) {
  if (!value && value !== 0) {
    return status ?? '—'
  }

  return `${new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 4,
  }).format(value)}${status && status !== 'unknown' ? ` · ${status}` : ''}`
}

function formatAbsoluteTime(value?: string) {
  if (!value) {
    return '—'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function formatShortTime(value?: string) {
  if (!value) {
    return '—'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat(undefined, {
    timeStyle: 'short',
  }).format(date)
}

function formatRelativeTime(value?: string) {
  if (!value) {
    return '—'
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000)
  const absoluteSeconds = Math.abs(diffSeconds)
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

  if (absoluteSeconds < 60) {
    return formatter.format(diffSeconds, 'second')
  }

  if (absoluteSeconds < 3600) {
    return formatter.format(Math.round(diffSeconds / 60), 'minute')
  }

  if (absoluteSeconds < 86400) {
    return formatter.format(Math.round(diffSeconds / 3600), 'hour')
  }

  return formatter.format(Math.round(diffSeconds / 86400), 'day')
}
