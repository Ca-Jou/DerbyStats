import { useState, useEffect, useRef } from 'react'
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

  const [homeTeamSearch, setHomeTeamSearch] = useState('')
  const [visitingTeamSearch, setVisitingTeamSearch] = useState('')
  const [showHomeDropdown, setShowHomeDropdown] = useState(false)
  const [showVisitingDropdown, setShowVisitingDropdown] = useState(false)

  const homeDropdownRef = useRef<HTMLDivElement>(null)
  const visitingDropdownRef = useRef<HTMLDivElement>(null)

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

  const filterTeams = (search: string) => {
    if (!search.trim()) return teams
    const searchLower = search.toLowerCase()
    return teams.filter(
      (team) =>
        team.name.toLowerCase().includes(searchLower) ||
        team.city.toLowerCase().includes(searchLower)
    )
  }

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (homeDropdownRef.current && !homeDropdownRef.current.contains(event.target as Node)) {
        setShowHomeDropdown(false)
      }
      if (visitingDropdownRef.current && !visitingDropdownRef.current.contains(event.target as Node)) {
        setShowVisitingDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
                <div className="mb-3" ref={homeDropdownRef}>
                  <label htmlFor="edit-home_team_search" className="form-label">
                    Home Team
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="edit-home_team_search"
                    value={homeTeam ? `${homeTeam.name} (${homeTeam.city})` : homeTeamSearch}
                    onChange={(e) => {
                      setHomeTeamSearch(e.target.value)
                      setShowHomeDropdown(true)
                      if (!e.target.value && formData.home_team_id) {
                        setFormData({ ...formData, home_team_id: '', home_team_color: '' })
                      }
                    }}
                    onFocus={() => setShowHomeDropdown(true)}
                    placeholder="Type to search teams..."
                    disabled={submitting || loadingTeams}
                    autoComplete="off"
                    required={!formData.home_team_id}
                  />
                  {showHomeDropdown && (
                    <div
                      className="border rounded mt-1 bg-white position-absolute"
                      style={{ maxHeight: '200px', overflowY: 'auto', zIndex: 1000, width: 'calc(100% - 30px)' }}
                    >
                      {filterTeams(homeTeamSearch).length > 0 ? (
                        filterTeams(homeTeamSearch).map((team) => (
                          <div
                            key={team.id}
                            className="p-2 cursor-pointer border-bottom"
                            style={{ cursor: 'pointer' }}
                            onClick={() => {
                              setFormData({ ...formData, home_team_id: team.id, home_team_color: '' })
                              setHomeTeamSearch('')
                              setShowHomeDropdown(false)
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                          >
                            {team.name} ({team.city})
                          </div>
                        ))
                      ) : (
                        <div className="p-2 text-muted">No teams found</div>
                      )}
                    </div>
                  )}
                </div>
                {homeTeam && (
                  <div className="mb-3">
                    <label className="form-label d-block">Home Team Color</label>
                    {homeTeam.light_color && (
                      <div className="form-check mb-2">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="home_team_color"
                          id="home-light"
                          value={homeTeam.light_color}
                          checked={formData.home_team_color === homeTeam.light_color}
                          onChange={(e) =>
                            setFormData({ ...formData, home_team_color: e.target.value })
                          }
                          disabled={submitting}
                        />
                        <label className="form-check-label d-flex align-items-center" htmlFor="home-light">
                          <span
                            className="d-inline-block me-2"
                            style={{
                              width: '24px',
                              height: '24px',
                              backgroundColor: homeTeam.light_color,
                              border: '1px solid #dee2e6',
                              borderRadius: '3px'
                            }}
                          ></span>
                          Light
                        </label>
                      </div>
                    )}
                    {homeTeam.dark_color && (
                      <div className="form-check mb-2">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="home_team_color"
                          id="home-dark"
                          value={homeTeam.dark_color}
                          checked={formData.home_team_color === homeTeam.dark_color}
                          onChange={(e) =>
                            setFormData({ ...formData, home_team_color: e.target.value })
                          }
                          disabled={submitting}
                        />
                        <label className="form-check-label d-flex align-items-center" htmlFor="home-dark">
                          <span
                            className="d-inline-block me-2"
                            style={{
                              width: '24px',
                              height: '24px',
                              backgroundColor: homeTeam.dark_color,
                              border: '1px solid #dee2e6',
                              borderRadius: '3px'
                            }}
                          ></span>
                          Dark
                        </label>
                      </div>
                    )}
                  </div>
                )}
                <div className="mb-3" ref={visitingDropdownRef}>
                  <label htmlFor="edit-visiting_team_search" className="form-label">
                    Visiting Team
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="edit-visiting_team_search"
                    value={visitingTeam ? `${visitingTeam.name} (${visitingTeam.city})` : visitingTeamSearch}
                    onChange={(e) => {
                      setVisitingTeamSearch(e.target.value)
                      setShowVisitingDropdown(true)
                      if (!e.target.value && formData.visiting_team_id) {
                        setFormData({ ...formData, visiting_team_id: '', visiting_team_color: '' })
                      }
                    }}
                    onFocus={() => setShowVisitingDropdown(true)}
                    placeholder="Type to search teams..."
                    disabled={submitting || loadingTeams}
                    autoComplete="off"
                    required={!formData.visiting_team_id}
                  />
                  {showVisitingDropdown && (
                    <div
                      className="border rounded mt-1 bg-white position-absolute"
                      style={{ maxHeight: '200px', overflowY: 'auto', zIndex: 1000, width: 'calc(100% - 30px)' }}
                    >
                      {filterTeams(visitingTeamSearch).length > 0 ? (
                        filterTeams(visitingTeamSearch).map((team) => (
                          <div
                            key={team.id}
                            className="p-2 cursor-pointer border-bottom"
                            style={{ cursor: 'pointer' }}
                            onClick={() => {
                              setFormData({ ...formData, visiting_team_id: team.id, visiting_team_color: '' })
                              setVisitingTeamSearch('')
                              setShowVisitingDropdown(false)
                            }}
                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                          >
                            {team.name} ({team.city})
                          </div>
                        ))
                      ) : (
                        <div className="p-2 text-muted">No teams found</div>
                      )}
                    </div>
                  )}
                </div>
                {visitingTeam && (
                  <div className="mb-3">
                    <label className="form-label d-block">Visiting Team Color</label>
                    {visitingTeam.light_color && (
                      <div className="form-check mb-2">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="visiting_team_color"
                          id="visiting-light"
                          value={visitingTeam.light_color}
                          checked={formData.visiting_team_color === visitingTeam.light_color}
                          onChange={(e) =>
                            setFormData({ ...formData, visiting_team_color: e.target.value })
                          }
                          disabled={submitting}
                        />
                        <label className="form-check-label d-flex align-items-center" htmlFor="visiting-light">
                          <span
                            className="d-inline-block me-2"
                            style={{
                              width: '24px',
                              height: '24px',
                              backgroundColor: visitingTeam.light_color,
                              border: '1px solid #dee2e6',
                              borderRadius: '3px'
                            }}
                          ></span>
                          Light
                        </label>
                      </div>
                    )}
                    {visitingTeam.dark_color && (
                      <div className="form-check mb-2">
                        <input
                          className="form-check-input"
                          type="radio"
                          name="visiting_team_color"
                          id="visiting-dark"
                          value={visitingTeam.dark_color}
                          checked={formData.visiting_team_color === visitingTeam.dark_color}
                          onChange={(e) =>
                            setFormData({ ...formData, visiting_team_color: e.target.value })
                          }
                          disabled={submitting}
                        />
                        <label className="form-check-label d-flex align-items-center" htmlFor="visiting-dark">
                          <span
                            className="d-inline-block me-2"
                            style={{
                              width: '24px',
                              height: '24px',
                              backgroundColor: visitingTeam.dark_color,
                              border: '1px solid #dee2e6',
                              borderRadius: '3px'
                            }}
                          ></span>
                          Dark
                        </label>
                      </div>
                    )}
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
                  className="btn btn-outline-info"
                  onClick={handleClose}
                  disabled={submitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-outline-primary"
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
