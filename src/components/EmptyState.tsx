import { Music2 } from 'lucide-react'

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="empty-state">
      <Music2 aria-hidden="true" />
      <p>{message}</p>
    </div>
  )
}
