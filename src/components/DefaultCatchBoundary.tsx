import {
  ErrorComponent,
  Link,
  rootRouteId,
  useMatch,
  useRouter,
} from '@tanstack/react-router'
import type { ErrorComponentProps } from '@tanstack/react-router'

export function DefaultCatchBoundary({ error }: ErrorComponentProps) {
  const router = useRouter()
  const isRoot = useMatch({
    strict: false,
    select: (state) => state.id === rootRouteId,
  })

  console.error('Hermes viewer error:', error)

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="panel-shell max-w-2xl px-6 py-6 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-base-content/45">Viewer error</p>
        <div className="mt-4">
          <ErrorComponent error={error} />
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" className="btn btn-primary rounded-full px-5" onClick={() => router.invalidate()}>
            Try again
          </button>
          {isRoot ? (
            <Link to="/" className="btn btn-outline rounded-full px-5">
              Reload home
            </Link>
          ) : (
            <Link
              to="/"
              className="btn btn-outline rounded-full px-5"
              onClick={(event) => {
                event.preventDefault()
                window.history.back()
              }}
            >
              Go back
            </Link>
          )}
        </div>
      </div>
    </div>
  )
}
