type Props = {
  eyebrow?: string
  lead?: string | null
  title: string
}

export function PageIntro({ eyebrow, lead, title }: Props) {
  return (
    <section className="page-intro">
      <div className="shell narrow">
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {lead ? <p className="page-lead">{lead}</p> : null}
      </div>
    </section>
  )
}
