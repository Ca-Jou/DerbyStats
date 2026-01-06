import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface DeleteButtonProps {
  entityType: string
  id: string | number
  onSuccess?: () => void
  onError?: (error: Error) => void
  confirmTitle?: string
  confirmMessage?: string
  className?: string
  size?: 'sm' | 'lg'
  disabled?: boolean
}

function DeleteButton({
  entityType,
  id,
  onSuccess,
  onError,
  confirmTitle = 'Confirm Delete',
  confirmMessage = 'Are you sure you want to delete this item? This action cannot be undone!',
  className = '',
  size,
  disabled = false
}: DeleteButtonProps) {
  const [showModal, setShowModal] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleDelete = async () => {
    setIsLoading(true)

    try {
      const { error } = await supabase
        .from(entityType)
        .delete()
        .eq('id', id)

      if (error) {
        throw error
      }

      setShowModal(false)

      if (onSuccess) {
        onSuccess()
      }
    } catch (error) {
      console.error('Delete error:', error)

      if (onError) {
        onError(error instanceof Error ? error : new Error('Unknown error'))
      }
    } finally {
      setIsLoading(false)
    }
  }

  const sizeClass = size ? `btn-${size}` : ''
  const buttonClasses = `btn btn-outline-danger ${sizeClass} ${className}`.trim()

  return (
    <>
      <button
        type="button"
        className={buttonClasses}
        onClick={() => setShowModal(true)}
        disabled={disabled || isLoading}
      >
        <i className="bi bi-trash-fill"></i>
      </button>

      {showModal && (
        <>
          <div className="modal show d-block" tabIndex={-1}>
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">{confirmTitle}</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowModal(false)}
                    disabled={isLoading}
                  ></button>
                </div>
                <div className="modal-body">
                  <p>{confirmMessage}</p>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowModal(false)}
                    disabled={isLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-danger"
                    onClick={handleDelete}
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Deleting...
                      </>
                    ) : (
                      'Delete'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop show"></div>
        </>
      )}
    </>
  )
}

export default DeleteButton
