import { createFileRoute } from '@tanstack/react-router'
import { createServerFn } from '@tanstack/react-start'
import { useState } from 'react'
import useLocalStorageState from 'use-local-storage-state'
import type { ViewerData } from '~/lib/hermes-types'
import { z } from 'zod'
import { MessageCard, SessionHeader, SessionSidebar } from '~/components/viewer'

const viewerSearchSchema = z.object({
  sessionId: z.string().optional(),
})

const loadViewerData = createServerFn({ method: 'GET' })
  .inputValidator((data: z.infer<typeof viewerSearchSchema>) => viewerSearchSchema.parse(data))
  .handler(async ({ data }) => {
    const { getViewerData } = await import('~/lib/server/hermes')
    return getViewerData(data)
  })

export const Route = createFileRoute('/')({
  validateSearch: (search) => viewerSearchSchema.parse(search),
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => loadViewerData({ data: deps }),
  component: ViewerRoute,
})

function ViewerRoute() {
  const data = Route.useLoaderData() as ViewerData
  const [filter, setFilter] = useState('')
  const [reasoningOpen, setReasoningOpen] = useLocalStorageState('hermes-viewer-reasoning-open', {
    defaultValue: false,
  })
  const [toolsOpen, setToolsOpen] = useLocalStorageState('hermes-viewer-tools-open', {
    defaultValue: true,
  })

  return (
    <div className="drawer lg:drawer-open min-h-screen">
      <input id="session-drawer" type="checkbox" className="drawer-toggle" />

      <div className="drawer-content">
        <main className="min-h-screen px-4 py-4 sm:px-5 lg:px-8 lg:py-7">
          <div className="mb-4 flex items-center justify-between gap-3 lg:hidden">
            <label htmlFor="session-drawer" className="btn btn-outline btn-sm rounded-full drawer-button px-4">
              Sessions
            </label>
            <span className="badge badge-outline rounded-full px-3 py-3 text-[11px] font-semibold uppercase tracking-[0.16em]">
              {data.sessions.length} loaded
            </span>
          </div>

          {data.transcript ? (
            <>
              <SessionHeader
                summary={data.transcript.summary}
                meta={data.transcript.meta}
                messageCount={data.transcript.messageCount}
                toolCallCount={data.transcript.toolCallCount}
                reasoningOpen={reasoningOpen}
                onReasoningOpenChange={setReasoningOpen}
                toolsOpen={toolsOpen}
                onToolsOpenChange={setToolsOpen}
              />

              <section className="mt-6 space-y-4">
                {data.transcript.messages.map((message, index) => (
                  <MessageCard
                    key={message.id}
                    message={message}
                    index={index}
                    reasoningOpen={reasoningOpen}
                    toolsOpen={toolsOpen}
                  />
                ))}
              </section>
            </>
          ) : (
            <section className="panel-shell flex min-h-[60vh] items-center justify-center px-6 py-12 text-center">
              <div className="max-w-lg">
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-base-content/45">No sessions</p>
                <h1 className="mt-3 text-4xl font-bold tracking-tight text-base-content">Nothing to render yet.</h1>
                <p className="mt-4 text-sm leading-7 text-base-content/65">
                  The viewer could not find a valid Hermes session index at <code>~/.hermes/sessions/sessions.json</code>.
                </p>
              </div>
            </section>
          )}
        </main>
      </div>

      <div className="drawer-side z-20">
        <label htmlFor="session-drawer" aria-label="close sidebar" className="drawer-overlay" />
        <div className="w-[22rem] max-w-[88vw]">
          <SessionSidebar
            sessions={data.sessions}
            activeSessionId={data.activeSessionId}
            filter={filter}
            onFilterChange={setFilter}
          />
        </div>
      </div>
    </div>
  )
}
