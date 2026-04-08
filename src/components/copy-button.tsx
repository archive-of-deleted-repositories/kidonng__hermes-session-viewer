import { useState } from 'react'

type CopyButtonProps = {
  text: string
  label?: string
}

export function CopyButton({ text, label = 'Copy' }: CopyButtonProps) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <button type="button" className="btn btn-xs btn-ghost font-medium normal-case" onClick={handleCopy}>
      {copied ? 'Copied' : label}
    </button>
  )
}
