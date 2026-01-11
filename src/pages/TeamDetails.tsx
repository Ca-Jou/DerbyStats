import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Team } from '../types/Skater'
import DeleteButton from '../components/DeleteButton'
import EditTeamForm from '../components/EditTeamForm'

interface SkaterOption {
  id: string
  number: string
  name: string
}

function TeamDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [team, setTeam] = useState<Team | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showRemoveModal, setShowRemoveModal] = useState(false)
  const [skaterToRemove, setSkaterToRemove] = useState<string | null>(null)
  const [removing, setRemoving] = useState(false)
  const [showAddSkaterModal, setShowAddSkaterModal] = useState(false)
  const [availableSkaters, setAvailableSkaters] = useState<SkaterOption[]>([])
  const [selectedSkaters, setSelectedSkaters] = useState<string[]>([])
  const [adding, setAdding] = useState(false)
  const [showCreateSkater, setShowCreateSkater] = useState(false)
  const [newSkaterNumber, setNewSkaterNumber] = useState('')
  const [newSkaterName, setNewSkaterName] = useState('')
  const [creating, setCreating] = useState(false)

  const handleOpenAddModal = async () => {
    try {
      // Fetch all skaters
      const { data, error } = await supabase
        .from('skaters')
        .select('id, number, name')
        .order('number')

      if (error) throw error

      // Filter out skaters already on the team
      const currentSkaterIds = team?.skaters?.map(s => s.id) || []
      const available = (data || []).filter(s => !currentSkaterIds.includes(s.id))

      setAvailableSkaters(available)
      setSelectedSkaters([])
      setShowAddSkaterModal(true)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    }
  }

  const handleAddSkaters = async () => {
    if (!team || selectedSkaters.length === 0) return

    setAdding(true)

    try {
      // Insert relationships into teams_skaters
      const insertData = selectedSkaters.map(skaterId => ({
        team_id: team.id,
        skater_id: skaterId
      }))

      const { error } = await supabase
        .from('teams_skaters')
        .insert(insertData)

      if (error) throw error

      // Fetch the newly added skaters details
      const { data: newSkaters, error: fetchError } = await supabase
        .from('skaters')
        .select('id, number, name')
        .in('id', selectedSkaters)

      if (fetchError) throw fetchError

      // Update UI
      if (team.skaters && newSkaters) {
        setTeam({
          ...team,
          skaters: [...team.skaters, ...newSkaters]
        })
      }

      setShowAddSkaterModal(false)
      setSelectedSkaters([])
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setAdding(false)
    }
  }

  const handleRemoveSkater = async () => {
    if (!skaterToRemove || !team) return

    setRemoving(true)

    try {
      const { error } = await supabase
        .from('teams_skaters')
        .delete()
        .eq('team_id', team.id)
        .eq('skater_id', skaterToRemove)

      if (error) throw error

      // Update UI to remove skater from list
      if (team.skaters) {
        setTeam({
          ...team,
          skaters: team.skaters.filter(s => s.id !== skaterToRemove)
        })
      }

      setShowRemoveModal(false)
      setSkaterToRemove(null)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setRemoving(false)
    }
  }

  const toggleSkaterSelection = (skaterId: string) => {
    setSelectedSkaters(prev =>
      prev.includes(skaterId)
        ? prev.filter(id => id !== skaterId)
        : [...prev, skaterId]
    )
  }

  const handleCreateSkater = async () => {
    if (!newSkaterNumber.trim() || !newSkaterName.trim()) return

    setCreating(true)

    try {
      const { data: newSkater, error: createError } = await supabase
        .from('skaters')
        .insert({
          number: newSkaterNumber.trim(),
          name: newSkaterName.trim()
        })
        .select('id, number, name')
        .single()

      if (createError) throw createError

      setAvailableSkaters(prev => [...prev, newSkater])
      setSelectedSkaters(prev => [...prev, newSkater.id])

      setNewSkaterNumber('')
      setNewSkaterName('')
      setShowCreateSkater(false)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred')
    } finally {
      setCreating(false)
    }
  }

  useEffect(() => {
    async function fetchTeam() {
      try {
        setLoading(true)

        const { data: teamData, error: teamError } = await supabase
          .from('teams')
          .select(`
            id,
            name,
            city,
            country,
            light_color,
            dark_color,
            teams_skaters(
              skater_id
            )
          `)
          .eq('id', id)
          .single()

        if (teamError) throw teamError

        const skaterIDs = teamData.teams_skaters.flatMap((t) => t.skater_id)

        const { data: skaterData, error: skaterError } = await supabase
          .from('skaters')
          .select(`
            id,
            number,
            name,
            teams_skaters(
              team_id
            )
          `)
          .in('id', skaterIDs)

        if (skaterError) throw skaterError

        const team = {
          id: teamData.id,
          name: teamData.name,
          city: teamData.city,
          country: teamData.country,
          light_color: teamData.light_color,
          dark_color: teamData.dark_color,
          skaters: skaterData,
        }
        setTeam(team)
      } catch (error) {
        setError(error instanceof Error ? error.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchTeam()
    }
  }, [id])

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="d-flex justify-content-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading team details...</span>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="container mt-4">
        <div className="alert alert-danger" role="alert">
          Error: {error}
        </div>
        <button className="btn btn-outline-info" onClick={() => navigate('/teams')}>
          Back to Teams
        </button>
      </div>
    )
  }

  if (!team) {
    return (
      <div className="container mt-4">
        <div className="alert alert-warning" role="alert">
          Team not found
        </div>
        <button className="btn btn-outline-info" onClick={() => navigate('/teams')}>
          Back to Teams
        </button>
      </div>
    )
  }

  return (
    <div className="container mt-4">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="mb-0 text-dark">Team Details</h1>
            <div>
              <button className="btn btn-outline-info me-2" onClick={() => navigate('/teams')}>
                <i className="bi bi-arrow-left me-2"></i>
                Back
              </button>
              <button className="btn btn-outline-primary me-2" onClick={() => setShowEditModal(true)}>
                <i className="bi bi-pencil-fill me-2"></i>
                Edit
              </button>
              <DeleteButton
                entityType="teams"
                id={team.id}
                onSuccess={() => navigate('/teams')}
                onError={(error) => setError(error.message)}
                confirmMessage="Are you sure you want to delete this team? This action cannot be undone!"
              />
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <div className="row mb-3">
                <div className="col-md-3">
                  <strong>Name:</strong>
                </div>
                <div className="col-md-9">
                  {team.name}
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-md-3">
                  <strong>City:</strong>
                </div>
                <div className="col-md-9">
                  {team.city}
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-md-3">
                  <strong>Country:</strong>
                </div>
                <div className="col-md-9">
                  {team.country}
                </div>
              </div>
              {team.light_color && (
                <div className="row mb-3">
                  <div className="col-md-3">
                    <strong>Light Color:</strong>
                  </div>
                  <div className="col-md-9">
                    <div className="d-flex align-items-center">
                      <div
                        style={{
                          width: '50px',
                          height: '50px',
                          backgroundColor: team.light_color,
                          border: '1px solid #dee2e6',
                          borderRadius: '4px'
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}
              {team.dark_color && (
                <div className="row mb-3">
                  <div className="col-md-3">
                    <strong>Dark Color:</strong>
                  </div>
                  <div className="col-md-9">
                    <div className="d-flex align-items-center">
                      <div
                        style={{
                          width: '50px',
                          height: '50px',
                          backgroundColor: team.dark_color,
                          border: '1px solid #dee2e6',
                          borderRadius: '4px'
                        }}
                      ></div>
                    </div>
                  </div>
                </div>
              )}
              <div className="row mb-3">
                <div className="col-md-3">
                  <strong>Skaters:</strong>
                </div>
                <div className="col-md-9">
                  {team.skaters && team.skaters.length > 0 ? (
                    <>
                      {team.skaters.map((skater) => (
                        <div key={skater.id} className="d-flex align-items-center mb-2">
                          <div style={{ minWidth: '60px' }}><strong>#{skater.number}</strong></div>
                          <div className="flex-grow-1">{skater.name}</div>
                          <button
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => {
                              setSkaterToRemove(skater.id)
                              setShowRemoveModal(true)
                            }}
                          >
                            <i className="bi bi-trash-fill"></i>
                          </button>
                        </div>
                      ))}
                    </>
                  ) : (
                    <p className="text-muted mb-2">No skaters on this team yet.</p>
                  )}
                  <button
                    className="btn btn-outline-primary btn-sm mt-2"
                    onClick={handleOpenAddModal}
                  >
                    <i className="bi bi-plus-circle me-2"></i>
                    Add Skaters
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <EditTeamForm
        show={showEditModal}
        team={team}
        onClose={() => setShowEditModal(false)}
        onSuccess={(updatedTeam) => {
          setTeam(updatedTeam)
          setShowEditModal(false)
        }}
        onError={(error) => {
          setError(error.message)
        }}
      />

      {showAddSkaterModal && (
        <>
          <div className="modal show d-block" tabIndex={-1}>
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Add Skaters to Team</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setShowAddSkaterModal(false)
                      setSelectedSkaters([])
                      setShowCreateSkater(false)
                      setNewSkaterNumber('')
                      setNewSkaterName('')
                    }}
                    disabled={adding || creating}
                  ></button>
                </div>
                <div className="modal-body">
                  {!showCreateSkater ? (
                    <>
                      {availableSkaters.length > 0 && (
                        <div className="mb-3">
                          <p className="mb-3">Select skaters to add to the team:</p>
                          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                            {availableSkaters.map((skater) => (
                              <div key={skater.id} className="form-check mb-2">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  id={`skater-${skater.id}`}
                                  checked={selectedSkaters.includes(skater.id)}
                                  onChange={() => toggleSkaterSelection(skater.id)}
                                  disabled={adding || creating}
                                />
                                <label
                                  className="form-check-label"
                                  htmlFor={`skater-${skater.id}`}
                                >
                                  #{skater.number} - {skater.name}
                                </label>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      <button
                        type="button"
                        className="btn btn-outline-success btn-sm"
                        onClick={() => setShowCreateSkater(true)}
                        disabled={adding || creating}
                      >
                        <i className="bi bi-plus-circle me-2"></i>
                        Create New Skater
                      </button>
                    </>
                  ) : (
                    <div>
                      <h6 className="mb-3">Create New Skater</h6>
                      <div className="mb-3">
                        <label className="form-label">Skater Number</label>
                        <input
                          type="text"
                          className="form-control"
                          value={newSkaterNumber}
                          onChange={(e) => setNewSkaterNumber(e.target.value)}
                          disabled={creating}
                          placeholder="e.g., 42"
                        />
                      </div>
                      <div className="mb-3">
                        <label className="form-label">Skater Name</label>
                        <input
                          type="text"
                          className="form-control"
                          value={newSkaterName}
                          onChange={(e) => setNewSkaterName(e.target.value)}
                          disabled={creating}
                          placeholder="e.g., Jane Doe"
                        />
                      </div>
                      <div className="d-flex gap-2">
                        <button
                          type="button"
                          className="btn btn-outline-info btn-sm"
                          onClick={() => {
                            setShowCreateSkater(false)
                            setNewSkaterNumber('')
                            setNewSkaterName('')
                          }}
                          disabled={creating}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="btn btn-success btn-sm"
                          onClick={handleCreateSkater}
                          disabled={creating || !newSkaterNumber.trim() || !newSkaterName.trim()}
                        >
                          {creating ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                              Creating...
                            </>
                          ) : (
                            <>
                              <i className="bi bi-check-circle me-2"></i>
                              Create & Add to Team
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                {!showCreateSkater && (
                  <div className="modal-footer">
                    <button
                      type="button"
                      className="btn btn-outline-info"
                      onClick={() => {
                        setShowAddSkaterModal(false)
                        setSelectedSkaters([])
                        setShowCreateSkater(false)
                        setNewSkaterNumber('')
                        setNewSkaterName('')
                      }}
                      disabled={adding || creating}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      onClick={handleAddSkaters}
                      disabled={adding || creating || selectedSkaters.length === 0}
                    >
                      {adding ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Adding...
                        </>
                      ) : (
                        `Add ${selectedSkaters.length > 0 ? `(${selectedSkaters.length})` : ''}`
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="modal-backdrop show"></div>
        </>
      )}

      {showRemoveModal && (
        <>
          <div className="modal show d-block" tabIndex={-1}>
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Remove Skater from Team</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setShowRemoveModal(false)
                      setSkaterToRemove(null)
                    }}
                    disabled={removing}
                  ></button>
                </div>
                <div className="modal-body">
                  <p>Are you sure you want to remove this skater from the team?</p>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-info"
                    onClick={() => {
                      setShowRemoveModal(false)
                      setSkaterToRemove(null)
                    }}
                    disabled={removing}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-danger"
                    onClick={handleRemoveSkater}
                    disabled={removing}
                  >
                    {removing ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Removing...
                      </>
                    ) : (
                      'Remove'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop show"></div>
        </>
      )}
    </div>
  )
}

export default TeamDetails
