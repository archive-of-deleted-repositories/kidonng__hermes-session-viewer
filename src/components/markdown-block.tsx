type MarkdownBlockProps = {
  html?: string
  className?: string
}

export function MarkdownBlock({ html, className }: MarkdownBlockProps) {
  if (!html) {
    return null
  }

  return <div className={`md ${className ?? ''}`.trim()} dangerouslySetInnerHTML={{ __html: html }} />
}
