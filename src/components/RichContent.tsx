import { RichText } from '@payloadcms/richtext-lexical/react'

type RichTextData = Parameters<typeof RichText>[0]['data']

export function RichContent({ data }: { data?: RichTextData | null }) {
  if (!data) return null
  return <RichText className="rich-content" data={data} />
}
