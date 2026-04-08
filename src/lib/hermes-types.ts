export type SessionOrigin = {
  chat_id?: string | null
  chat_name?: string | null
  chat_topic?: string | null
  chat_type?: string | null
  platform?: string | null
  thread_id?: string | null
  user_id?: string | null
  user_name?: string | null
}

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | { [key: string]: JsonValue }
  | JsonValue[]

export type SessionSummary = {
  sessionKey: string
  sessionId: string
  createdAt?: string
  updatedAt?: string
  displayName: string
  platform?: string
  chatType?: string
  inputTokens?: number
  outputTokens?: number
  totalTokens?: number
  estimatedCostUsd?: number
  costStatus?: string
  memoryFlushed?: boolean
  origin?: SessionOrigin
}

export type ToolResultStatus = 'success' | 'error' | 'unknown'

export type ToolResultView = {
  raw: string
  status: ToolResultStatus
  summary?: string
  contentText: string
  parsed?: JsonValue
  renderedAnalysisHtml?: string
}

export type ToolCallView = {
  id: string
  name: string
  previewLabel: string
  previewValue: string
  previewFullValue: string
  previewKind: 'text' | 'code' | 'link'
  argumentsText: string
  argumentsObject?: { [key: string]: JsonValue }
  renderedCommandHtml?: string
  results: ToolResultView[]
}

export type TranscriptMessage = {
  id: string
  role: string
  timestamp?: string
  content?: string
  renderedContentHtml?: string
  reasoning?: string
  renderedReasoningHtml?: string
  finishReason?: string
  toolCalls: ToolCallView[]
  rawBundle: string
}

export type SessionMetaInfo = {
  sessionId: string
  model?: string
  baseUrl?: string
  platform?: string
  sessionStart?: string
  lastUpdated?: string
  toolCount: number
  systemPrompt?: string
  jsonlPath: string
  summaryPath?: string
}

export type SessionTranscript = {
  summary: SessionSummary
  meta: SessionMetaInfo
  messages: TranscriptMessage[]
  messageCount: number
  toolCallCount: number
}

export type ViewerData = {
  sessions: SessionSummary[]
  requestedSessionId?: string
  activeSessionId?: string
  transcript?: SessionTranscript
}
