import rehypeShiki from '@shikijs/rehype'
import rehypeStringify from 'rehype-stringify'
import remarkGfm from 'remark-gfm'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import { unified } from 'unified'

const markdownProcessor = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(remarkRehype)
  .use(rehypeShiki, {
    themes: {
      light: 'github-light',
      dark: 'github-dark',
    },
  })
  .use(rehypeStringify)

export async function renderMarkdown(markdown: string): Promise<string> {
  if (!markdown.trim()) {
    return ''
  }

  const file = await markdownProcessor.process(markdown)
  return String(file)
}
