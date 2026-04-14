import rehypeShiki from '@shikijs/rehype'
import rehypeStringify from 'rehype-stringify'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'
import type { Element } from 'hast'

function extractFrontmatter(markdown: string): { frontmatter: string; content: string } | null {
  const lines = markdown.split('\n')
  if (lines[0]?.trim() !== '---') {
    return null
  }

  let endIndex = -1
  for (let i = 1; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      endIndex = i
      break
    }
  }

  if (endIndex === -1) {
    return null
  }

  const frontmatter = lines.slice(1, endIndex).join('\n')
  const content = lines.slice(endIndex + 1).join('\n')

  return { frontmatter, content }
}

interface Transformer {
  name: string
  pre(node: Element): void
}

function transformerCopyButton(): Transformer {
  return {
    name: 'copy-button',
    pre(node: Element) {
      const lang = node.properties.dataLanguage as string | undefined

      const copyButton: Element = {
        type: 'element',
        tagName: 'button',
        properties: {
          type: 'button',
          className: ['floating-copy-button', 'btn', 'btn-xs', 'btn-ghost', 'font-medium', 'normal-case'],
          ['data-lang']: lang || '',
          onClick: 'window.__copyCode(this)',
        },
        children: [{ type: 'text', value: 'Copy' }],
      } as Element

      node.children = [copyButton, ...node.children]
    },
  }
}

const markdownProcessor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeShiki, {
    themes: {
      light: 'github-light',
      dark: 'github-dark',
    },
    transformers: [transformerCopyButton()],
  })
  .use(rehypeStringify)

export async function renderMarkdown(markdown: string): Promise<string> {
  if (!markdown.trim()) {
    return ''
  }

  const frontmatterData = extractFrontmatter(markdown)
  const contentToRender = frontmatterData
    ? `\`\`\`yaml\n${frontmatterData.frontmatter}\n\`\`\`\n\n${frontmatterData.content}`
    : markdown

  const file = await markdownProcessor.process(contentToRender)
  const html = String(file)

  if (!html.includes('__copyCode')) return html

  const script = `<script>window.__copyCode=function(btn){var pre=btn.nextElementSibling;if(!pre)return; navigator.clipboard.writeText(pre.textContent||'').then(()=>{btn.textContent='Copied';btn._copied=true;setTimeout(()=>{btn.textContent='Copy';btn._copied=false},1600)}).catch(()=>{btn.textContent='Error'})}</script>`

  return html.replace('</pre>', '</pre>' + script)
}

export async function highlightCode(code: string, lang: string): Promise<string> {
  return renderMarkdown(`\`\`\`${lang}\n${code}\n\`\`\``)
}
