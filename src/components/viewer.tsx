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

type SidebarProps = {
  sessions: SessionSummary[]
  activeSessionId?: string
  filter: string
  onFilterChange: (value: string) => void
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
  toolsOpen: boolean
}

export function SessionSidebar({ sessions, activeSessionId, filter, onFilterChange }: SidebarProps) {
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
        <p className="mt-2 max-w-xs text-sm leading-6 text-base-content/65">
          Read-only transcript explorer for local Hermes conversations, tool usage, and reasoning trails.
        </p>
        <label className="mt-4 block">
          <span className="mb-2 block text-xs font-semibold uppercase tracking-[0.22em] text-base-content/45">
            Filter sessions
          </span>
          <input
            value={filter}
            onChange={(event) => onFilterChange(event.target.value)}
            placeholder="Search by title, ID, or chat"
            className="input input-bordered w-full rounded-2xl border-base-300/80 bg-base-100/90"
          />
        </label>
      </div>

      <div className="px-3 py-4">
        <div className="mb-3 flex items-center justify-between px-2 text-xs font-semibold uppercase tracking-[0.22em] text-base-content/45">
          <span>Sessions</span>
          <span>{visibleSessions.length}</span>
        </div>

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
    <section className="panel-shell overflow-hidden px-5 py-5 sm:px-6">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
        <div className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-base-content/45">Session meta</p>
          <h2 className="mt-2 text-3xl font-bold tracking-tight text-base-content sm:text-4xl">{summary.displayName}</h2>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-base-content/65">{summary.sessionKey}</p>

          <div className="mt-4 flex flex-wrap gap-2">
            <span className="badge badge-primary badge-soft rounded-full px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.16em]">
              {summary.platform ?? 'local'}
            </span>
            {summary.chatType ? (
              <span className="badge badge-outline rounded-full px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.16em]">
                {summary.chatType}
              </span>
            ) : null}
            {meta.model ? (
              <span className="badge badge-outline rounded-full px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.16em]">
                {meta.model}
              </span>
            ) : null}
            <span className="badge badge-outline rounded-full px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.16em]">
              {meta.toolCount} tools
            </span>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 lg:max-w-md lg:justify-end">
          <MetricTile label="Updated" value={formatAbsoluteTime(meta.lastUpdated)} accent="secondary" />
          <MetricTile label="Messages" value={formatNumber(messageCount)} accent="primary" />
          <MetricTile label="Tool Calls" value={formatNumber(toolCallCount)} accent="accent" />
          <MetricTile
            label="Tokens"
            value={formatNumber(summary.totalTokens ?? summary.inputTokens ?? summary.outputTokens)}
            accent="info"
          />
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-5 border-t border-base-300/70 pt-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <MetaLine label="Started" value={formatAbsoluteTime(meta.sessionStart)} />
          <MetaLine label="Cost" value={formatCurrency(summary.estimatedCostUsd, summary.costStatus)} />
          <MetaLine label="Files" value={meta.summaryPath ? 'index + jsonl + summary' : 'index + jsonl'} />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <label className="flex items-center justify-between gap-3 rounded-2xl border border-base-300/70 bg-base-100/75 px-4 py-3 text-sm font-medium text-base-content/80">
            <span>Reasoning open by default</span>
            <input
              type="checkbox"
              className="toggle toggle-sm toggle-primary"
              checked={reasoningOpen}
              onChange={(event) => onReasoningOpenChange(event.target.checked)}
            />
          </label>
          <label className="flex items-center justify-between gap-3 rounded-2xl border border-base-300/70 bg-base-100/75 px-4 py-3 text-sm font-medium text-base-content/80">
            <span>Tool calls open by default</span>
            <input
              type="checkbox"
              className="toggle toggle-sm toggle-secondary"
              checked={toolsOpen}
              onChange={(event) => onToolsOpenChange(event.target.checked)}
            />
          </label>
        </div>
      </div>

      {meta.systemPrompt ? (
        <details className="mt-5 rounded-3xl border border-base-300/70 bg-base-100/70 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-base-content/85">System prompt</summary>
          <pre className="mt-4 overflow-x-auto rounded-2xl bg-neutral/95 p-4 font-mono text-xs leading-6 text-neutral-content">
            {meta.systemPrompt}
          </pre>
        </details>
      ) : null}
    </section>
  )
}

export function MessageCard({ message, index, reasoningOpen, toolsOpen }: MessageCardProps) {
  const roleClass =
    message.role === 'assistant'
      ? 'message-surface--assistant'
      : message.role === 'user'
        ? 'message-surface--user'
        : 'message-surface--system'

  return (
    <article
      className={`message-surface ${roleClass}`.trim()}
      style={{ animationDelay: `${Math.min(index * 45, 320)}ms` }}
    >
      <header className="flex flex-col gap-3 border-b border-base-300/70 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="badge rounded-full border-none bg-base-content text-[11px] font-semibold uppercase tracking-[0.16em] text-base-100">
              {message.role}
            </span>
            {message.finishReason ? (
              <span className="badge badge-outline rounded-full px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.16em]">
                {message.finishReason}
              </span>
            ) : null}
          </div>

          <time
            className="mt-3 block font-mono text-xs uppercase tracking-[0.16em] text-base-content/45"
            dateTime={message.timestamp}
            title={message.timestamp}
          >
            {formatAbsoluteTime(message.timestamp)}
          </time>
        </div>

        <CopyButton text={message.rawBundle} />
      </header>

      <div className="space-y-5 pt-5">
        {message.renderedContentHtml ? <MarkdownBlock html={message.renderedContentHtml} /> : null}

        {!message.renderedContentHtml && !message.toolCalls.length && message.role === 'assistant' ? (
          <p className="text-sm leading-6 text-base-content/55">This assistant turn only contains metadata.</p>
        ) : null}

        {message.renderedReasoningHtml ? (
          <details key={`${message.id}-reasoning-${reasoningOpen ? 'open' : 'closed'}`} defaultOpen={reasoningOpen}>
            <summary className="cursor-pointer text-sm font-semibold tracking-[0.08em] text-base-content/70">
              Reasoning
            </summary>
            <div className="mt-4 rounded-3xl border border-base-300/70 bg-base-100/65 p-4">
              <MarkdownBlock html={message.renderedReasoningHtml} className="md--reasoning" />
            </div>
          </details>
        ) : null}

        {message.toolCalls.length ? (
          <details key={`${message.id}-tools-${toolsOpen ? 'open' : 'closed'}`} defaultOpen={toolsOpen}>
            <summary className="cursor-pointer text-sm font-semibold tracking-[0.08em] text-base-content/70">
              Tool calls ({message.toolCalls.length})
            </summary>
            <div className="mt-4 space-y-3">
              {message.toolCalls.map((toolCall) => (
                <ToolInvocationCard key={toolCall.id} toolCall={toolCall} toolsOpen={toolsOpen} />
              ))}
            </div>
          </details>
        ) : null}
      </div>
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
      key={`${toolCall.id}-${toolsOpen ? 'open' : 'closed'}`}
      defaultOpen={toolsOpen}
    >
      <summary className="flex cursor-pointer list-none flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge badge-outline rounded-full px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.16em]">
              {toolCall.name}
            </span>
            <span className={statusBadgeClass(resultStatus)}>{resultStatus}</span>
          </div>
          <p className="mt-3 truncate font-mono text-xs leading-6 text-base-content/60">
            <span className="font-semibold uppercase tracking-[0.16em] text-base-content/40">
              {toolCall.previewLabel}
            </span>{' '}
            {toolCall.previewValue}
          </p>
        </div>

        <div className="text-xs font-semibold uppercase tracking-[0.18em] text-base-content/35">
          {toolCall.results.length ? `${toolCall.results.length} result${toolCall.results.length > 1 ? 's' : ''}` : 'pending'}
        </div>
      </summary>

      <div className="mt-5 space-y-4">
        {toolCall.previewKind === 'link' ? (
          <a
            href={toolCall.previewFullValue}
            target="_blank"
            rel="noreferrer"
            className="link link-primary break-all font-medium"
          >
            {toolCall.previewFullValue}
          </a>
        ) : null}

        {toolCall.renderedCommandHtml ? (
          <div className="rounded-3xl border border-base-300/70 bg-base-100/75 p-4">
            <MarkdownBlock html={toolCall.renderedCommandHtml} />
          </div>
        ) : null}

        <details className="rounded-3xl border border-base-300/70 bg-base-100/65 p-4">
          <summary className="cursor-pointer text-sm font-semibold text-base-content/75">Arguments</summary>
          <pre className="mt-4 overflow-x-auto rounded-2xl bg-neutral/95 p-4 font-mono text-xs leading-6 text-neutral-content">
            {toolCall.argumentsText}
          </pre>
        </details>

        {toolCall.results.map((result, index) => (
          <ToolResultCard key={`${toolCall.id}-result-${index}`} result={result} />
        ))}
      </div>
    </details>
  )
}

function ToolResultCard({ result }: { result: ToolResultView }) {
  const rawPreview = result.parsed ? JSON.stringify(result.parsed, null, 2) : result.contentText

  return (
    <section className={`rounded-3xl border p-4 ${result.status === 'error' ? 'border-error/35 bg-error/12' : 'border-base-300/70 bg-base-100/70'}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={statusBadgeClass(result.status)}>{result.status}</span>
            {result.summary ? <p className="text-sm text-base-content/70">{result.summary}</p> : null}
          </div>
        </div>

        <CopyButton text={result.raw} />
      </div>

      {result.renderedAnalysisHtml ? (
        <div className="mt-4 rounded-3xl border border-base-300/70 bg-base-100/75 p-4">
          <MarkdownBlock html={result.renderedAnalysisHtml} />
        </div>
      ) : null}

      <details className="mt-4 rounded-3xl border border-base-300/70 bg-base-100/65 p-4">
        <summary className="cursor-pointer text-sm font-semibold text-base-content/75">Raw result</summary>
        <pre className="mt-4 overflow-x-auto rounded-2xl bg-neutral/95 p-4 font-mono text-xs leading-6 text-neutral-content">
          {rawPreview}
        </pre>
      </details>
    </section>
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

function statusBadgeClass(status: string) {
  if (status === 'error') {
    return 'badge badge-error badge-soft rounded-full px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.16em]'
  }

  if (status === 'success') {
    return 'badge badge-success badge-soft rounded-full px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.16em]'
  }

  return 'badge badge-outline rounded-full px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-base-content/55'
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
