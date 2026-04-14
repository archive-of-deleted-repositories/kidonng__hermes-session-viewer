import { access, readFile } from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import Database from 'better-sqlite3'
import type {
  JsonValue,
  SessionMetaInfo,
  SessionOrigin,
  SessionSummary,
  SessionTranscript,
  ToolCallView,
  ToolResultStatus,
  ToolResultView,
  TranscriptMessage,
  ViewerData,
} from '~/lib/hermes-types'
import { highlightCode, renderMarkdown } from '~/lib/server/markdown'

const HERMES_HOME = process.env.HERMES_HOME || path.join(os.homedir(), '.hermes')
const SESSIONS_DIR = path.join(HERMES_HOME, 'sessions')
const SESSION_INDEX_PATH = path.join(SESSIONS_DIR, 'sessions.json')
const STATE_DB_PATH = path.join(HERMES_HOME, 'state.db')

type ViewerRequest = {
  sessionId?: string
}

type RawToolCall = {
  call_id?: unknown
  id?: unknown
  function?: {
    name?: unknown
    arguments?: unknown
  }
}

type RawEntry = {
  role?: unknown
  content?: unknown
  reasoning?: unknown
  finish_reason?: unknown
  timestamp?: unknown
  tool_call_id?: unknown
  tool_calls?: unknown
  model?: unknown
  base_url?: unknown
  platform?: unknown
  session_start?: unknown
  last_updated?: unknown
  tools?: unknown
  system_prompt?: unknown
}

type PendingToolCall = {
  call: ToolCallView
  message: TranscriptMessage
}

type ParsedLine = {
  entry: RawEntry
  raw: string
}

const PREVIEW_KEYS: Record<string, string[]> = {
  browser_click: ['ref'],
  browser_navigate: ['url'],
  browser_press: ['key'],
  browser_type: ['text', 'ref'],
  browser_vision: ['question'],
  execute_code: ['code'],
  read_file: ['path'],
  search_files: ['pattern'],
  terminal: ['command'],
}

const DEFAULT_PREVIEW_KEYS = [
  'command',
  'url',
  'path',
  'question',
  'query',
  'prompt',
  'text',
  'expression',
  'symbol',
  'name',
  'filePath',
]

export async function getViewerData({ sessionId }: ViewerRequest): Promise<ViewerData> {
  const dbSessions = loadSessionsFromDb()
  const sessions = await loadSessions(dbSessions)
  const activeSessionId = resolveActiveSessionId(sessionId, sessions)

  if (!activeSessionId) {
    return {
      sessions,
      requestedSessionId: sessionId,
    }
  }

  const summary = sessions.find((candidate) => candidate.sessionId === activeSessionId)

  if (!summary) {
    return {
      sessions,
      requestedSessionId: sessionId,
    }
  }

  return {
    sessions,
    requestedSessionId: sessionId,
    activeSessionId,
    transcript: await loadTranscript(summary),
  }
}

async function loadSessions(
  dbSessions: Map<string, { title: string | null; messageCount: number }>,
): Promise<SessionSummary[]> {
  const index = await readJsonFile<Record<string, unknown>>(SESSION_INDEX_PATH)

  if (!index) {
    return []
  }

  return Object.values(index)
    .map((value) => toSessionSummary(value, dbSessions))
    .filter((value): value is SessionSummary => value !== null)
    .sort((left, right) => {
      const leftTime = Date.parse(left.updatedAt ?? left.createdAt ?? '')
      const rightTime = Date.parse(right.updatedAt ?? right.createdAt ?? '')
      return rightTime - leftTime
    })
}

function loadSessionsFromDb(): Map<string, { title: string | null; messageCount: number }> {
  const sessions = new Map<string, { title: string | null; messageCount: number }>()

  try {
    const db = new Database(STATE_DB_PATH, { readonly: true })
    const rows = db.prepare('SELECT id, title, message_count FROM sessions').all() as {
      id: string
      title: string | null
      message_count: number
    }[]

    for (const row of rows) {
      sessions.set(row.id, {
        title: row.title,
        messageCount: row.message_count,
      })
    }

    db.close()
  } catch {
    // Database not available or corrupted
  }

  return sessions
}

function resolveActiveSessionId(
  requestedSessionId: string | undefined,
  sessions: SessionSummary[],
): string | undefined {
  if (requestedSessionId && sessions.some((session) => session.sessionId === requestedSessionId)) {
    return requestedSessionId
  }

  return sessions[0]?.sessionId
}

async function loadTranscript(summary: SessionSummary): Promise<SessionTranscript> {
  const jsonlPath = path.join(SESSIONS_DIR, `${summary.sessionId}.jsonl`)
  const summaryPath = path.join(SESSIONS_DIR, `session_${summary.sessionId}.json`)
  const [jsonl, metaFile] = await Promise.all([
    readFile(jsonlPath, 'utf8'),
    readJsonFile<Record<string, unknown>>(summaryPath),
  ])
  const lines = jsonl
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
  const parsedLines = lines
    .map((raw) => {
      const parsed = safeParseJson(raw)
      if (!parsed || !isRecord(parsed)) {
        return null
      }
      return {
        entry: parsed as RawEntry,
        raw,
      }
    })
    .filter((value): value is ParsedLine => value !== null)

  const metaEntry = parsedLines.find((line) => toStringValue(line.entry.role) === 'session_meta')?.entry
  const meta = await buildSessionMeta(summary, metaEntry, metaFile, jsonlPath, summaryPath)
  const messages = await buildMessages(parsedLines)
  const messageCount = messages.length

  return {
    summary,
    meta,
    messages,
    messageCount,
    toolCallCount: messages.reduce((total, message) => total + message.toolCalls.length, 0),
  }
}

async function buildMessages(parsedLines: ParsedLine[]): Promise<TranscriptMessage[]> {
  const messages: TranscriptMessage[] = []
  const pending = new Map<string, PendingToolCall>()

  for (let index = 0; index < parsedLines.length; index += 1) {
    const parsedLine = parsedLines[index]
    const role = toStringValue(parsedLine.entry.role)

    if (role === 'session_meta') {
      continue
    }

    if (role === 'tool') {
      const toolCallId = toStringValue(parsedLine.entry.tool_call_id)
      const toolName = toolCallId && pending.has(toolCallId) ? pending.get(toolCallId)?.call.name : undefined
      const result = await toToolResultView(parsedLine.entry, parsedLine.raw, toolName)

      if (toolCallId && pending.has(toolCallId)) {
        const pendingCall = pending.get(toolCallId)
        if (pendingCall) {
          pendingCall.call.results.push(result)
          pending.delete(toolCallId)
        }
        continue
      }

      messages.push(await toOrphanToolMessage(parsedLine.entry, parsedLine.raw, index))
      continue
    }

    const message = await toTranscriptMessage(parsedLine.entry, parsedLine.raw, index)
    messages.push(message)

    for (const call of message.toolCalls) {
      pending.set(call.id, {
        call,
        message,
      })
    }
  }

  return messages
}

async function toTranscriptMessage(
  entry: RawEntry,
  raw: string,
  index: number,
): Promise<TranscriptMessage> {
  const content = toContentString(entry.content)
  const reasoning = toStringValue(entry.reasoning)
  const toolCalls = await Promise.all(
    toToolCalls(entry.tool_calls).map((toolCall, toolIndex) => toToolCallView(toolCall, index, toolIndex)),
  )

  return {
    id: `${toStringValue(entry.role) ?? 'message'}-${toStringValue(entry.timestamp) ?? index}-${index}`,
    role: toStringValue(entry.role) ?? 'unknown',
    timestamp: toStringValue(entry.timestamp),
    content,
    renderedContentHtml: content ? await renderMarkdown(content) : undefined,
    reasoning,
    renderedReasoningHtml: reasoning ? await renderMarkdown(reasoning) : undefined,
    finishReason: toStringValue(entry.finish_reason),
    toolCalls,
  }
}

async function toOrphanToolMessage(
  entry: RawEntry,
  raw: string,
  index: number,
): Promise<TranscriptMessage> {
  const content = toContentString(entry.content)
  const jsonBlock = content ? `\`\`\`json\n${content}\n\`\`\`` : ''

  return {
    id: `tool-${toStringValue(entry.timestamp) ?? index}-${index}`,
    role: 'tool',
    timestamp: toStringValue(entry.timestamp),
    content,
    renderedContentHtml: jsonBlock ? await renderMarkdown(jsonBlock) : undefined,
    toolCalls: [],
  }
}

async function toToolCallView(
  rawToolCall: RawToolCall,
  messageIndex: number,
  toolIndex: number,
): Promise<ToolCallView> {
  const name = toStringValue(rawToolCall.function?.name) ?? 'unknown_tool'
  const callId =
    toStringValue(rawToolCall.call_id) ??
    toStringValue(rawToolCall.id) ??
    `${name}-${messageIndex}-${toolIndex}`
  const rawArguments = toStringValue(rawToolCall.function?.arguments) ?? ''
  const argumentsObject = safeParseJson(rawArguments)
  const preview = buildToolPreview(name, argumentsObject, rawArguments)
  const command = name === 'terminal' ? getStringArgument(argumentsObject, 'command') : undefined

  const rendered: Record<string, string> = {}
  if (command) {
    rendered.command = await renderMarkdown(`\`\`\`sh\n${command}\n\`\`\``)
  }

  if (name === 'write_file') {
    const filePath = getStringArgument(argumentsObject, 'path')
    const content = getStringArgument(argumentsObject, 'content')
    if (filePath && content) {
      const lang = getLanguageFromPath(filePath)
      rendered.content = await highlightCode(content, lang)
    }
  }

  return {
    id: callId,
    name,
    previewLabel: preview.label,
    previewValue: preview.value,
    previewFullValue: preview.fullValue,
    previewKind: preview.kind,
    argumentsText:
      argumentsObject !== undefined ? JSON.stringify(argumentsObject, null, 2) : rawArguments || '{}',
    argumentsObject: isRecord(argumentsObject) ? (argumentsObject as { [key: string]: JsonValue }) : undefined,
    rendered,
    results: [],
  }
}

async function toToolResultView(entry: RawEntry, raw: string, toolName?: string): Promise<ToolResultView> {
  const contentText = toContentString(entry.content) ?? ''
  const parsed = safeParseJson(contentText)
  const status = inferToolStatus(parsed)
  const summary = buildResultSummary(parsed, contentText)

  const rendered: Record<string, string> = {}
  if (toolName === 'browser_vision' && isRecord(parsed) && 'analysis' in parsed) {
    rendered.analysis = await renderMarkdown(parsed.analysis as string)
  } else if (toolName === 'patch' && isRecord(parsed) && 'diff' in parsed) {
    rendered.diff = await highlightCode(parsed.diff as string, 'diff')
  } else if (toolName === 'skill_view' && isRecord(parsed) && 'content' in parsed) {
    rendered.content = await renderMarkdown(parsed.content as string)
  }

  return {
    raw,
    status,
    summary,
    contentText,
    parsed: isJsonValue(parsed) ? parsed : undefined,
    rendered,
  }
}

async function buildSessionMeta(
  summary: SessionSummary,
  metaEntry: RawEntry | undefined,
  metaFile: Record<string, unknown> | null,
  jsonlPath: string,
  summaryPath: string,
): Promise<SessionMetaInfo> {
  const metaToolCount = Array.isArray(metaEntry?.tools)
    ? metaEntry.tools.length
    : Array.isArray(metaFile?.tools)
      ? metaFile.tools.length
      : 0

  const systemPrompt = toStringValue(metaFile?.system_prompt)
  const renderedSystemPromptHtml = systemPrompt ? await renderMarkdown(systemPrompt) : undefined

  return {
    sessionId: summary.sessionId,
    model: toStringValue(metaEntry?.model) ?? toStringValue(metaFile?.model),
    baseUrl: toStringValue(metaEntry?.base_url) ?? toStringValue(metaFile?.base_url),
    platform: toStringValue(metaEntry?.platform) ?? toStringValue(metaFile?.platform) ?? summary.platform,
    sessionStart:
      toStringValue(metaEntry?.session_start) ??
      toStringValue(metaFile?.session_start) ??
      summary.createdAt,
    lastUpdated:
      toStringValue(metaEntry?.last_updated) ??
      toStringValue(metaFile?.last_updated) ??
      summary.updatedAt,
    toolCount: metaToolCount,
    systemPrompt,
    renderedSystemPromptHtml,
    jsonlPath,
    summaryPath: metaFile ? summaryPath : undefined,
  }
}

function toSessionSummary(
  value: unknown,
  dbSessions: Map<string, { title: string | null; messageCount: number }>,
): SessionSummary | null {
  if (!isRecord(value)) {
    return null
  }

  const sessionId = toStringValue(value.session_id)
  const sessionKey = toStringValue(value.session_key)

  if (!sessionId || !sessionKey) {
    return null
  }

  const dbSession = dbSessions.get(sessionId)
  const title = dbSession?.title ?? toStringValue(value.display_name)

  return {
    sessionKey,
    sessionId,
    createdAt: toStringValue(value.created_at),
    updatedAt: toStringValue(value.updated_at),
    displayName: title ?? sessionKey,
    platform: toStringValue(value.platform),
    chatType: toStringValue(value.chat_type),
    inputTokens: toNumberValue(value.input_tokens),
    outputTokens: toNumberValue(value.output_tokens),
    totalTokens: toNumberValue(value.total_tokens),
    estimatedCostUsd: toNumberValue(value.estimated_cost_usd),
    costStatus: toStringValue(value.cost_status),
    memoryFlushed: toBooleanValue(value.memory_flushed),
    origin: toOrigin(value.origin),
  }
}

function toOrigin(value: unknown): SessionOrigin | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  return {
    chat_id: nullableString(value.chat_id),
    chat_name: nullableString(value.chat_name),
    chat_topic: nullableString(value.chat_topic),
    chat_type: nullableString(value.chat_type),
    platform: nullableString(value.platform),
    thread_id: nullableString(value.thread_id),
    user_id: nullableString(value.user_id),
    user_name: nullableString(value.user_name),
  }
}

function toToolCalls(value: unknown): RawToolCall[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value.filter(isRecord) as RawToolCall[]
}

function buildToolPreview(name: string, argumentsObject: unknown, rawArguments: string) {
  const build = (label: string, fullValue: string, kind: 'text' | 'code' | 'link') => ({
    label,
    value: truncate(singleLine(fullValue), 112),
    fullValue,
    kind,
  })

  const keys = PREVIEW_KEYS[name] ?? DEFAULT_PREVIEW_KEYS

  for (const key of keys) {
    const value = getStringArgument(argumentsObject, key)
    if (value) {
      const kind = key === 'url' ? 'link' : name === 'terminal' && key === 'command' ? 'code' : 'text'
      return build(key, value, kind)
    }
  }

  if (rawArguments) {
    return build('args', rawArguments, 'text')
  }

  return build('args', 'No arguments', 'text')
}

function getLanguageFromPath(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase()
  const langMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    py: 'python',
    rb: 'ruby',
    rs: 'rust',
    go: 'go',
    java: 'java',
    c: 'c',
    cpp: 'cpp',
    h: 'c',
    hpp: 'cpp',
    cs: 'csharp',
    swift: 'swift',
    kt: 'kotlin',
    kts: 'kotlin',
    scala: 'scala',
    php: 'php',
    html: 'html',
    htm: 'html',
    css: 'css',
    scss: 'scss',
    sass: 'scss',
    less: 'less',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    toml: 'toml',
    md: 'markdown',
    mdx: 'markdown',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    fish: 'bash',
    ps1: 'powershell',
    psd1: 'powershell',
    psm1: 'powershell',
    sql: 'sql',
    graphql: 'graphql',
    gql: 'graphql',
    vim: 'vim',
    lua: 'lua',
    r: 'r',
    R: 'r',
    dart: 'dart',
    ex: 'elixir',
    exs: 'elixir',
    erl: 'erlang',
    hs: 'haskell',
    ml: 'ocaml',
    pls: 'plsql',
  }
  return langMap[ext ?? ''] ?? 'text'
}

function inferToolStatus(parsed: unknown): ToolResultStatus {
  if (!isRecord(parsed)) {
    return 'unknown'
  }

  if (typeof parsed.success === 'boolean') {
    return parsed.success ? 'success' : 'error'
  }

  if (typeof parsed.ok === 'boolean') {
    return parsed.ok ? 'success' : 'error'
  }

  if (typeof parsed.status === 'string') {
    if (/^(success|ok|done|completed)$/iu.test(parsed.status)) {
      return 'success'
    }

    if (/(error|fail|failed|failure)/iu.test(parsed.status)) {
      return 'error'
    }
  }

  if (parsed.error) {
    return 'error'
  }

  return 'unknown'
}

function buildResultSummary(parsed: unknown, contentText: string): string | undefined {
  if (!isRecord(parsed)) {
    return contentText ? truncate(singleLine(contentText), 140) : undefined
  }

  const summaryCandidates = ['message', 'status', 'error', 'result']

  for (const key of summaryCandidates) {
    const value = parsed[key]
    if (typeof value === 'string' && value.trim()) {
      return truncate(singleLine(value), 140)
    }
  }

  return contentText ? truncate(singleLine(contentText), 140) : undefined
}

async function readJsonFile<T>(filePath: string): Promise<T | null> {
  try {
    await access(filePath)
    const content = await readFile(filePath, 'utf8')
    return JSON.parse(content) as T
  } catch {
    return null
  }
}

function safeParseJson(raw: string): JsonValue | undefined {
  try {
    const parsed = JSON.parse(raw)
    return isJsonValue(parsed) ? parsed : undefined
  } catch {
    return undefined
  }
}

function toContentString(value: unknown): string | undefined {
  if (typeof value === 'string') {
    return value
  }

  if (value === undefined || value === null) {
    return undefined
  }

  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

function toStringValue(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined
}

function nullableString(value: unknown): string | null | undefined {
  if (value === null) {
    return null
  }

  return typeof value === 'string' ? value : undefined
}

function toBooleanValue(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined
}

function toNumberValue(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined
}

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isJsonValue(value: unknown): value is JsonValue {
  if (value === null) {
    return true
  }

  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return true
  }

  if (Array.isArray(value)) {
    return value.every((item) => isJsonValue(item))
  }

  if (isRecord(value)) {
    return Object.values(value).every((item) => isJsonValue(item))
  }

  return false
}

function getStringArgument(value: unknown, key: string): string | undefined {
  if (!isRecord(value)) {
    return undefined
  }

  return toStringValue(value[key])
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value
  }

  return `${value.slice(0, maxLength - 1)}…`
}

function singleLine(value: string): string {
  return value.replace(/\s+/gu, ' ').trim()
}
