import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { connection } from 'next/server'

import { MediaImage } from '@/components/MediaImage'
import { RichContent } from '@/components/RichContent'
import { formatDate } from '@/lib/format'
import { getCMS } from '@/lib/payload'

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const result = await (
    await getCMS()
  ).find({
    collection: 'posts',
    limit: 1,
    overrideAccess: false,
    where: { slug: { equals: slug } },
  })
  const post = result.docs[0]
  return post
    ? { title: post.meta?.title || post.title, description: post.meta?.description || post.excerpt }
    : {}
}

export default async function PostPage({ params }: Props) {
  await connection()
  const { slug } = await params
  const result = await (
    await getCMS()
  ).find({
    collection: 'posts',
    depth: 1,
    limit: 1,
    overrideAccess: false,
    where: { slug: { equals: slug } },
  })
  const post = result.docs[0]
  if (!post) notFound()
  return (
    <>
      <section className="detail-hero">
        <MediaImage fallbackAlt="" media={post.cover} priority />
      </section>
      <article className="band">
        <div className="shell narrow article-header">
          <p className="eyebrow">{post.publishedAt ? formatDate(post.publishedAt) : 'Notícia'}</p>
          <h1 className="detail-title">{post.title}</h1>
          <p className="page-lead">{post.excerpt}</p>
          <RichContent data={post.content} />
        </div>
      </article>
    </>
  )
}
