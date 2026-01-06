import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Skater } from '../types/Skater'

interface EditSkaterFormProps {
  show: boolean
  skater: Skater
  onClose: () => void
  onSuccess: (skater: Skater) => void
  onError: (error: Error) => void
}

function EditSkaterForm({ show, skater, onClose, onSuccess, onError }: EditSkaterFormProps) {
  const [formData, setFormData] = useState({ number: '', name: '' })
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (show && skater) {
      setFormData({
        number: skater.number,
        name: skater.name
      })
    }
  }, [show, skater])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const { data, error } = await supabase
        .from('skaters')
        .update({
          number: formData.number,
          name: formData.name
        })
        .eq('id', skater.id)
        .select()

      if (error) throw error

      if (data && data.length > 0) {
        onSuccess(data[0])
      }
    } catch (error) {
      onError(error instanceof Error ? error : new Error('Unknown error'))
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!submitting) {
      onClose()
    }
  }

  if (!show) return null

  return (
    <>
      <div className="modal show d-block" tabIndex={-1}>
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Edit Skater</h5>
              <button
                type="button"
                className="btn-close"
                onClick={handleClose}
                disabled={submitting}
              ></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="mb-3">
                  <label htmlFor="edit-number" className="form-label">
                    Number
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="edit-number"
                    value={formData.number}
                    onChange={(e) =>
                      setFormData({ ...formData, number: e.target.value })
                    }
                    required
                    disabled={submitting}
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="edit-name" className="form-label">
                    Name
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="edit-name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                    disabled={submitting}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={handleClose}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-outline-primary"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
      <div className="modal-backdrop show"></div>
    </>
  )
}

export default EditSkaterForm
