import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

import { formatDate } from '@/lib/format'
import type { Post } from '@/payload-types'

import { MediaImage } from './MediaImage'

export function PostCard({ post }: { post: Post }) {
  return (
    <article className="content-card">
      <div className="card-image">
        <MediaImage fallbackAlt="" media={post.cover} />
      </div>
      <div className="card-body">
        <p className="card-meta">{post.publishedAt ? formatDate(post.publishedAt) : 'Notícia'}</p>
        <h3>{post.title}</h3>
        <p>{post.excerpt}</p>
        <Link className="text-link inline-link" href={`/noticias/${post.slug}`}>
          Ler notícia <ArrowRight aria-hidden="true" size={16} />
        </Link>
      </div>
    </article>
  )
}
