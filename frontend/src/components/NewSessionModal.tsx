import { FormEvent, useState } from 'react'

interface NewSessionModalProps {
  open: boolean
  loading: boolean
  onClose: () => void
  onCreate: (title: string) => Promise<void>
}

function NewSessionModal({ open, loading, onClose, onCreate }: NewSessionModalProps) {
  const [title, setTitle] = useState('')

  if (!open) {
    return null
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextTitle = title.trim() || 'New Chat'
    await onCreate(nextTitle)
    onClose()
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <h3>Create session</h3>
        <form onSubmit={handleSubmit}>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Session title"
          />
          <div className="modal-actions">
            <button
              type="button"
              className="ghost-button"
              onClick={() => {
                setTitle('')
                onClose()
              }}
            >
              Cancel
            </button>
            <button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default NewSessionModal
