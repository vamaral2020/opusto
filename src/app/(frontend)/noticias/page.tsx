import type { Metadata } from 'next'
import { connection } from 'next/server'

import { EmptyState } from '@/components/EmptyState'
import { PageIntro } from '@/components/PageIntro'
import { PostCard } from '@/components/PostCard'
import { getCMS } from '@/lib/payload'

export const metadata: Metadata = { title: 'Notícias' }

export default async function PostsPage() {
  await connection()
  const posts = await (
    await getCMS()
  ).find({ collection: 'posts', depth: 1, limit: 30, overrideAccess: false, sort: '-publishedAt' })
  return (
    <>
      <PageIntro
        eyebrow="Atualizações"
        lead="Notícias e registros da trajetória da Opus TO."
        title="Notícias"
      />
      <section className="band">
        <div className="shell">
          {posts.docs.length ? (
            <div className="card-grid">
              {posts.docs.map((post) => (
                <PostCard key={post.id} post={post} />
              ))}
            </div>
          ) : (
            <EmptyState message="Nenhuma notícia foi publicada ainda." />
          )}
        </div>
      </section>
    </>
  )
}
