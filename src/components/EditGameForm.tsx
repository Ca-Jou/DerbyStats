import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Game, Team } from '../types/Skater'

interface EditGameFormProps {
  show: boolean
  game: Game
  onClose: () => void
  onSuccess: (game: Game) => void
  onError: (error: Error) => void
}

function EditGameForm({ show, game, onClose, onSuccess, onError }: EditGameFormProps) {
  const [formData, setFormData] = useState({
    home_team_id: '',
    home_team_color: '',
    visiting_team_id: '',
    visiting_team_color: '',
    start_date: '',
    location: ''
  })
  const [teams, setTeams] = useState<Team[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [loadingTeams, setLoadingTeams] = useState(false)

  useEffect(() => {
    if (show && game) {
      setFormData({
        home_team_id: game.home_team_id,
        home_team_color: game.home_team_color || '',
        visiting_team_id: game.visiting_team_id,
        visiting_team_color: game.visiting_team_color || '',
        start_date: game.start_date ? game.start_date.substring(0, 16) : '',
        location: game.location || ''
      })
      fetchTeams()
    }
  }, [show, game])

  const fetchTeams = async () => {
    try {
      setLoadingTeams(true)
      const { data, error } = await supabase
        .from('teams')
        .select('id, name, city, country, light_color, dark_color')
        .order('name')

      if (error) throw error
      setTeams(data || [])
    } catch (error) {
      onError(error instanceof Error ? error : new Error('Failed to fetch teams'))
    } finally {
      setLoadingTeams(false)
    }
  }

  const getSelectedTeam = (teamId: string): Team | undefined => {
    return teams.find(t => t.id === teamId)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (formData.home_team_id === formData.visiting_team_id) {
      onError(new Error('Home team and visiting team must be different'))
      return
    }

    setSubmitting(true)

    try {
      const { data, error } = await supabase
        .from('games')
        .update({
          home_team_id: formData.home_team_id,
          home_team_color: formData.home_team_color || null,
          visiting_team_id: formData.visiting_team_id,
          visiting_team_color: formData.visiting_team_color || null,
          start_date: formData.start_date || null,
          location: formData.location || null
        })
        .eq('id', game.id)
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

  const homeTeam = getSelectedTeam(formData.home_team_id)
  const visitingTeam = getSelectedTeam(formData.visiting_team_id)

  return (
    <>
      <div className="modal show d-block" tabIndex={-1}>
        <div className="modal-dialog">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Edit Game</h5>
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
                  <label htmlFor="edit-home_team_id" className="form-label">
                    Home Team
                  </label>
                  <select
                    className="form-select"
                    id="edit-home_team_id"
                    value={formData.home_team_id}
                    onChange={(e) =>
                      setFormData({ ...formData, home_team_id: e.target.value, home_team_color: '' })
                    }
                    required
                    disabled={submitting || loadingTeams}
                  >
                    <option value="">Select a team...</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name} ({team.city})
                      </option>
                    ))}
                  </select>
                </div>
                {homeTeam && (
                  <div className="mb-3">
                    <label htmlFor="edit-home_team_color" className="form-label">
                      Home Team Color
                    </label>
                    <select
                      className="form-select"
                      id="edit-home_team_color"
                      value={formData.home_team_color}
                      onChange={(e) =>
                        setFormData({ ...formData, home_team_color: e.target.value })
                      }
                      disabled={submitting}
                    >
                      <option value="">Select color...</option>
                      {homeTeam.light_color && (
                        <option value={homeTeam.light_color}>Light</option>
                      )}
                      {homeTeam.dark_color && (
                        <option value={homeTeam.dark_color}>Dark</option>
                      )}
                    </select>
                  </div>
                )}
                <div className="mb-3">
                  <label htmlFor="edit-visiting_team_id" className="form-label">
                    Visiting Team
                  </label>
                  <select
                    className="form-select"
                    id="edit-visiting_team_id"
                    value={formData.visiting_team_id}
                    onChange={(e) =>
                      setFormData({ ...formData, visiting_team_id: e.target.value, visiting_team_color: '' })
                    }
                    required
                    disabled={submitting || loadingTeams}
                  >
                    <option value="">Select a team...</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>
                        {team.name} ({team.city})
                      </option>
                    ))}
                  </select>
                </div>
                {visitingTeam && (
                  <div className="mb-3">
                    <label htmlFor="edit-visiting_team_color" className="form-label">
                      Visiting Team Color
                    </label>
                    <select
                      className="form-select"
                      id="edit-visiting_team_color"
                      value={formData.visiting_team_color}
                      onChange={(e) =>
                        setFormData({ ...formData, visiting_team_color: e.target.value })
                      }
                      disabled={submitting}
                    >
                      <option value="">Select color...</option>
                      {visitingTeam.light_color && (
                        <option value={visitingTeam.light_color}>Light</option>
                      )}
                      {visitingTeam.dark_color && (
                        <option value={visitingTeam.dark_color}>Dark</option>
                      )}
                    </select>
                  </div>
                )}
                <div className="mb-3">
                  <label htmlFor="edit-start_date" className="form-label">
                    Start Date (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    className="form-control"
                    id="edit-start_date"
                    value={formData.start_date}
                    onChange={(e) =>
                      setFormData({ ...formData, start_date: e.target.value })
                    }
                    disabled={submitting}
                  />
                </div>
                <div className="mb-3">
                  <label htmlFor="edit-location" className="form-label">
                    Location (Optional)
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="edit-location"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    disabled={submitting}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleClose}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting || loadingTeams}
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

export default EditGameForm