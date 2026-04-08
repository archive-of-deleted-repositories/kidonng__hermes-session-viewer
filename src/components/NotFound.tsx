import { Link } from '@tanstack/react-router'

export function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="panel-shell max-w-xl px-6 py-6 sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-base-content/45">Not found</p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-base-content">There is nothing here.</h2>
        <p className="mt-3 text-sm leading-6 text-base-content/65">
          The route does not exist, or the URL no longer points at a valid session view.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" className="btn btn-outline rounded-full px-5" onClick={() => window.history.back()}>
            Go back
          </button>
          <Link to="/" className="btn btn-primary rounded-full px-5">
            Start over
          </Link>
        </div>
      </div>
    </div>
  )
}
