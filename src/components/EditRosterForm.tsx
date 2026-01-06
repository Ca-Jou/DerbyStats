import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { GameRoster, Skater } from '../types/Skater'

interface EditRosterFormProps {
  show: boolean
  roster: GameRoster
  teamId: string
  teamName: string
  onClose: () => void
  onSuccess: (roster: GameRoster) => void
  onError: (error: Error) => void
}

function EditRosterForm({ show, roster, teamId, teamName, onClose, onSuccess, onError }: EditRosterFormProps) {
  const [teamSkaters, setTeamSkaters] = useState<Skater[]>([])
  const [selectedJammers, setSelectedJammers] = useState<string[]>([])
  const [lineNames, setLineNames] = useState<string[]>([''])
  const [submitting, setSubmitting] = useState(false)
  const [loadingSkaters, setLoadingSkaters] = useState(false)

  useEffect(() => {
    if (show && roster) {
      // Pre-populate form with existing roster data
      const jammerIds = roster.roster_jammers?.map(j => j.skater_id) || []
      setSelectedJammers(jammerIds)

      const existingLines = roster.roster_lines?.map(l => l.name) || []
      setLineNames(existingLines.length > 0 ? existingLines : [''])

      fetchTeamSkaters()
    }
  }, [show, roster, teamId])

  const fetchTeamSkaters = async () => {
    try {
      setLoadingSkaters(true)
      const { data, error } = await supabase
        .from('teams_skaters')
        .select(`
          skater_id,
          skater:skaters(id, number, name)
        `)
        .eq('team_id', teamId)

      if (error) throw error

      const skaters = data?.map((ts: any) => ({
        ...(Array.isArray(ts.skater) ? ts.skater[0] : ts.skater)
      })) || []

      setTeamSkaters(skaters)
    } catch (error) {
      onError(error instanceof Error ? error : new Error('Failed to fetch team skaters'))
    } finally {
      setLoadingSkaters(false)
    }
  }

  const toggleJammer = (skaterId: string) => {
    setSelectedJammers(prev =>
      prev.includes(skaterId)
        ? prev.filter(id => id !== skaterId)
        : [...prev, skaterId]
    )
  }

  const addLine = () => {
    setLineNames([...lineNames, ''])
  }

  const updateLine = (index: number, value: string) => {
    const updated = [...lineNames]
    updated[index] = value
    setLineNames(updated)
  }

  const removeLine = (index: number) => {
    setLineNames(lineNames.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)

    try {
      // Step 1: Delete existing roster_jammers
      const { error: deleteJammersError } = await supabase
        .from('roster_jammers')
        .delete()
        .eq('game_roster_id', roster.id)

      if (deleteJammersError) throw deleteJammersError

      // Step 2: Delete existing roster_lines
      const { error: deleteLinesError } = await supabase
        .from('roster_lines')
        .delete()
        .eq('game_roster_id', roster.id)

      if (deleteLinesError) throw deleteLinesError

      // Step 3: Insert new roster_jammers
      if (selectedJammers.length > 0) {
        const jammerInserts = selectedJammers.map(skaterId => ({
          game_roster_id: roster.id,
          skater_id: skaterId
        }))

        const { error: jammersError } = await supabase
          .from('roster_jammers')
          .insert(jammerInserts)

        if (jammersError) throw jammersError
      }

      // Step 4: Insert new roster_lines (only non-empty lines)
      const validLines = lineNames.filter(name => name.trim() !== '')
      if (validLines.length > 0) {
        const lineInserts = validLines.map(name => ({
          game_roster_id: roster.id,
          name: name.trim()
        }))

        const { error: linesError } = await supabase
          .from('roster_lines')
          .insert(lineInserts)

        if (linesError) throw linesError
      }

      // Step 5: Fetch the updated roster with all relationships
      const { data: updatedRoster, error: fetchError } = await supabase
        .from('game_rosters')
        .select(`
          id,
          game_id,
          team_id,
          roster_jammers(
            id,
            game_roster_id,
            skater_id,
            skater:skaters(id, number, name)
          ),
          roster_lines(
            id,
            game_roster_id,
            name
          )
        `)
        .eq('id', roster.id)
        .single()

      if (fetchError) throw fetchError

      // Map the roster to handle array returns
      const mappedRoster: GameRoster = {
        ...updatedRoster,
        roster_jammers: updatedRoster.roster_jammers?.map((jammer: any) => ({
          ...jammer,
          skater: Array.isArray(jammer.skater) ? jammer.skater[0] : jammer.skater
        })) || []
      }

      onSuccess(mappedRoster)
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
        <div className="modal-dialog modal-lg">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">Edit Roster for {teamName}</h5>
              <button
                type="button"
                className="btn-close"
                onClick={handleClose}
                disabled={submitting}
              ></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {/* Jammers Section */}
                <div className="mb-4">
                  <h6>Jammers</h6>
                  {loadingSkaters ? (
                    <div className="text-center py-3">
                      <div className="spinner-border spinner-border-sm" role="status">
                        <span className="visually-hidden">Loading skaters...</span>
                      </div>
                    </div>
                  ) : teamSkaters.length === 0 ? (
                    <p className="text-muted">No skaters available for this team.</p>
                  ) : (
                    <div style={{ maxHeight: '200px', overflowY: 'auto' }} className="border p-2 rounded">
                      {teamSkaters.map((skater) => (
                        <div key={skater.id} className="form-check">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id={`jammer-${skater.id}`}
                            checked={selectedJammers.includes(skater.id)}
                            onChange={() => toggleJammer(skater.id)}
                            disabled={submitting}
                          />
                          <label className="form-check-label" htmlFor={`jammer-${skater.id}`}>
                            #{skater.number} - {skater.name}
                          </label>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Lines Section */}
                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="mb-0">Lines</h6>
                    <button
                      type="button"
                      className="btn btn-sm btn-success"
                      onClick={addLine}
                      disabled={submitting}
                    >
                      <i className="bi bi-plus-circle me-1"></i>
                      Add Line
                    </button>
                  </div>
                  {lineNames.map((name, index) => (
                    <div key={index} className="input-group mb-2">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Line name (e.g., Line 1, Power Jam Line)"
                        value={name}
                        onChange={(e) => updateLine(index, e.target.value)}
                        disabled={submitting}
                      />
                      {lineNames.length > 1 && (
                        <button
                          type="button"
                          className="btn btn-outline-danger"
                          onClick={() => removeLine(index)}
                          disabled={submitting}
                        >
                          <i className="bi bi-trash-fill"></i>
                        </button>
                      )}
                    </div>
                  ))}
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
                  disabled={submitting || loadingSkaters}
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

export default EditRosterForm