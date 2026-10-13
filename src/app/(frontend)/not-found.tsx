import Link from 'next/link'

export default function NotFound() {
  return (
    <section className="page-intro not-found">
      <div className="shell narrow">
        <p className="eyebrow">Erro 404</p>
        <h1>Página não encontrada</h1>
        <p className="page-lead">O conteúdo pode ter sido movido ou ainda não foi publicado.</p>
        <Link className="button" href="/">
          Voltar ao início
        </Link>
      </div>
    </section>
  )
}
