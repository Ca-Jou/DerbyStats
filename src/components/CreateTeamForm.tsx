import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { Team } from '../types/Skater'

interface CreateTeamFormProps {
  show: boolean
  onClose: () => void
  onSuccess: (team: Team) => void
  onError: (error: Error) => void
}

function CreateTeamForm({ show, onClose, onSuccess, onError }: CreateTeamFormProps) {
  const [formData, setFormData] = useState({ name: '', city: '', country: '', light_color: '', dark_color: '' })
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      const { data, error } = await supabase
        .from('teams')
        .insert([
          {
            name: formData.name,
            city: formData.city,
            country: formData.country,
            light_color: formData.light_color || null,
            dark_color: formData.dark_color || null
          }
        ])
        .select()

      if (error) throw error

      if (data && data.length > 0) {
        setFormData({ name: '', city: '', country: '', light_color: '', dark_color: '' })
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
      setFormData({ name: '', city: '', country: '', light_color: '', dark_color: '' })
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
              <h5 className="modal-title">Add New Team</h5>
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
                  <label htmlFor="name" className="form-label">
                    Name
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                    disabled={submitting}
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="city" className="form-label">
                    City
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="city"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                    required
                    disabled={submitting}
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="country" className="form-label">
                    Country
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="country"
                    value={formData.country}
                    onChange={(e) =>
                      setFormData({ ...formData, country: e.target.value })
                    }
                    required
                    disabled={submitting}
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="light_color" className="form-label">
                    Light Color (Optional)
                  </label>
                  <input
                    type="color"
                    className="form-control"
                    id="light_color"
                    value={formData.light_color}
                    onChange={(e) =>
                      setFormData({ ...formData, light_color: e.target.value })
                    }
                    disabled={submitting}
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="dark_color" className="form-label">
                    Dark Color (Optional)
                  </label>
                  <input
                    type="color"
                    className="form-control"
                    id="dark_color"
                    value={formData.dark_color}
                    onChange={(e) =>
                      setFormData({ ...formData, dark_color: e.target.value })
                    }
                    disabled={submitting}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline-info"
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
                      Adding...
                    </>
                  ) : (
                    'Add Team'
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

export default CreateTeamForm
