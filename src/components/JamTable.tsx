import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { Game, GameRoster, RosterJammer, Skater } from '../types/Skater'

interface JamRow {
  id?: string
  jam_number: number
  home_jammer_id: string
  home_line_id: string
  home_points: number
  visiting_jammer_id: string
  visiting_line_id: string
  visiting_points: number
  lead_team: 'home' | 'visiting' | null
  synced: boolean
}

interface JamTableProps {
  game: Game
  period: 1 | 2
  homeRoster: GameRoster | null
  visitingRoster: GameRoster | null
  onScoreChange: (homeTotal: number, visitingTotal: number) => void
}

const LOCALSTORAGE_KEY = (gameId: string) => `jams_${gameId}`

function getStoredJams(gameId: string): Record<string, JamRow[]> | null {
  try {
    const raw = localStorage.getItem(LOCALSTORAGE_KEY(gameId))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function storeJams(gameId: string, period: 1 | 2, jams: JamRow[]) {
  try {
    const existing = getStoredJams(gameId) || {}
    existing[String(period)] = jams
    localStorage.setItem(LOCALSTORAGE_KEY(gameId), JSON.stringify(existing))
  } catch {
    // localStorage full or unavailable — silent fail
  }
}

function clearStoredJams(gameId: string) {
  try {
    localStorage.removeItem(LOCALSTORAGE_KEY(gameId))
  } catch {
    // silent
  }
}

function emptyJamRow(jamNumber: number): JamRow {
  return {
    jam_number: jamNumber,
    home_jammer_id: '',
    home_line_id: '',
    home_points: 0,
    visiting_jammer_id: '',
    visiting_line_id: '',
    visiting_points: 0,
    lead_team: null,
    synced: false,
  }
}

function isJamEmpty(jam: JamRow): boolean {
  return (
    !jam.home_jammer_id &&
    !jam.home_line_id &&
    jam.home_points === 0 &&
    !jam.visiting_jammer_id &&
    !jam.visiting_line_id &&
    jam.visiting_points === 0 &&
    !jam.lead_team
  )
}

export default function JamTable({ game, period, homeRoster, visitingRoster, onScoreChange }: JamTableProps) {
  const [jams, setJams] = useState<JamRow[]>([])
  const [allJamsOtherPeriod, setAllJamsOtherPeriod] = useState<Array<{ home_points: number; visiting_points: number }>>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasSaveError, setHasSaveError] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  // New jammer modal
  const [showNewJammerModal, setShowNewJammerModal] = useState(false)
  const [newJammerTeam, setNewJammerTeam] = useState<'home' | 'visiting' | null>(null)
  const [newJammerNumber, setNewJammerNumber] = useState('')
  const [newJammerName, setNewJammerName] = useState('')
  const [creatingJammer, setCreatingJammer] = useState(false)
  const [localHomeJammers, setLocalHomeJammers] = useState<RosterJammer[]>(homeRoster?.roster_jammers || [])
  const [localVisitingJammers, setLocalVisitingJammers] = useState<RosterJammer[]>(visitingRoster?.roster_jammers || [])
  const [teamSkatersForModal, setTeamSkatersForModal] = useState<Skater[]>([])
  const [jammerSearchQuery, setJammerSearchQuery] = useState('')
  const [loadingTeamSkaters, setLoadingTeamSkaters] = useState(false)
  const [addingExistingSkater, setAddingExistingSkater] = useState<string | null>(null)

  // Debounce timers per jam index
  const saveTimers = useRef<Record<number, ReturnType<typeof setTimeout>>>({})

  useEffect(() => {
    setLocalHomeJammers(homeRoster?.roster_jammers || [])
  }, [homeRoster?.roster_jammers])

  useEffect(() => {
    setLocalVisitingJammers(visitingRoster?.roster_jammers || [])
  }, [visitingRoster?.roster_jammers])

  // Fetch jams for the current period
  useEffect(() => {
    async function fetchJams() {
      setLoading(true)
      try {
        const { data, error } = await supabase
          .from('jams')
          .select('*')
          .eq('game_id', game.id)
          .eq('period', period)
          .order('jam_number', { ascending: true })

        if (error) throw error

        const dbJams: JamRow[] = (data || []).map((j) => ({
          id: j.id,
          jam_number: j.jam_number,
          home_jammer_id: j.home_jammer_id || '',
          home_line_id: j.home_line_id || '',
          home_points: j.home_points,
          visiting_jammer_id: j.visiting_jammer_id || '',
          visiting_line_id: j.visiting_line_id || '',
          visiting_points: j.visiting_points,
          lead_team: j.lead_team,
          synced: true,
        }))

        // Check localStorage for unsynced data
        const stored = getStoredJams(game.id)
        const storedPeriod = stored?.[String(period)]
        if (storedPeriod) {
          const hasUnsynced = storedPeriod.some((sj) => !sj.synced)
          if (hasUnsynced) {
            // Merge: for each stored unsynced jam, override the DB version
            const merged = mergeJams(dbJams, storedPeriod)
            setJams(merged)
            setHasSaveError(true)
          } else {
            setJams(dbJams)
            setHasSaveError(false)
          }
        } else {
          setJams(dbJams)
          setHasSaveError(false)
        }
      } catch (error) {
        console.error('Error fetching jams:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchJams()
  }, [game.id, period])

  // Fetch jams from the OTHER period for full-game score
  useEffect(() => {
    async function fetchOtherPeriodJams() {
      const otherPeriod = period === 1 ? 2 : 1
      try {
        const { data, error } = await supabase
          .from('jams')
          .select('home_points, visiting_points')
          .eq('game_id', game.id)
          .eq('period', otherPeriod)

        if (error) throw error
        setAllJamsOtherPeriod(data || [])
      } catch (error) {
        console.error('Error fetching other period jams:', error)
      }
    }

    fetchOtherPeriodJams()
  }, [game.id, period])

  // Recalculate total score whenever jams change
  useEffect(() => {
    const currentHome = jams.reduce((sum, j) => sum + (j.home_points || 0), 0)
    const currentVisiting = jams.reduce((sum, j) => sum + (j.visiting_points || 0), 0)
    const otherHome = allJamsOtherPeriod.reduce((sum, j) => sum + (j.home_points || 0), 0)
    const otherVisiting = allJamsOtherPeriod.reduce((sum, j) => sum + (j.visiting_points || 0), 0)
    onScoreChange(currentHome + otherHome, currentVisiting + otherVisiting)
  }, [jams, allJamsOtherPeriod, onScoreChange])

  function mergeJams(dbJams: JamRow[], storedJams: JamRow[]): JamRow[] {
    const dbMap = new Map(dbJams.map((j) => [j.jam_number, j]))
    const result = new Map<number, JamRow>()

    // Start with DB jams
    for (const j of dbJams) {
      result.set(j.jam_number, j)
    }

    // Override with unsynced stored jams
    for (const sj of storedJams) {
      if (!sj.synced) {
        const dbVersion = dbMap.get(sj.jam_number)
        result.set(sj.jam_number, { ...sj, id: dbVersion?.id || sj.id })
      }
    }

    return Array.from(result.values()).sort((a, b) => a.jam_number - b.jam_number)
  }

  const saveJamToDb = useCallback(async (jam: JamRow): Promise<boolean> => {
    if (game.locked) return false
    if (isJamEmpty(jam)) return true // nothing to save

    try {
      const jamData = {
        game_id: game.id,
        period,
        jam_number: jam.jam_number,
        home_jammer_id: jam.home_jammer_id || null,
        home_line_id: jam.home_line_id || null,
        home_points: jam.home_points,
        visiting_jammer_id: jam.visiting_jammer_id || null,
        visiting_line_id: jam.visiting_line_id || null,
        visiting_points: jam.visiting_points,
        lead_team: jam.lead_team,
      }

      const { error } = await supabase
        .from('jams')
        .upsert(jamData, { onConflict: 'game_id,period,jam_number' })

      if (error) throw error
      return true
    } catch (error) {
      console.error('Error saving jam:', error)
      return false
    }
  }, [game.id, game.locked, period])

  const debouncedSave = useCallback((index: number, jam: JamRow) => {
    // Clear existing timer for this index
    if (saveTimers.current[index]) {
      clearTimeout(saveTimers.current[index])
    }

    saveTimers.current[index] = setTimeout(async () => {
      const success = await saveJamToDb(jam)
      if (success) {
        setJams((prev) => {
          const updated = [...prev]
          if (updated[index] && updated[index].jam_number === jam.jam_number) {
            updated[index] = { ...updated[index], synced: true }
          }
          storeJams(game.id, period, updated)
          // Clear error if all now synced
          if (updated.every((j) => j.synced || isJamEmpty(j))) {
            setHasSaveError(false)
          }
          return updated
        })
      } else {
        setHasSaveError(true)
      }
    }, 500)
  }, [saveJamToDb, game.id, period])

  const updateJamField = useCallback(<K extends keyof JamRow>(index: number, field: K, value: JamRow[K]) => {
    setJams((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value, synced: false }
      storeJams(game.id, period, updated)
      // Trigger debounced save
      debouncedSave(index, updated[index])
      return updated
    })
  }, [game.id, period, debouncedSave])

  const handleLeadToggle = useCallback((index: number, team: 'home' | 'visiting') => {
    setJams((prev) => {
      const updated = [...prev]
      const current = updated[index].lead_team
      updated[index] = { ...updated[index], lead_team: current === team ? null : team, synced: false }
      storeJams(game.id, period, updated)
      debouncedSave(index, updated[index])
      return updated
    })
  }, [game.id, period, debouncedSave])

  const saveAllUnsaved = async () => {
    setSaving(true)
    try {
      const unsaved = jams.filter((j) => !j.synced && !isJamEmpty(j))
      const results = await Promise.all(unsaved.map((j) => saveJamToDb(j)))
      const allSuccess = results.every(Boolean)

      if (allSuccess) {
        setJams((prev) => {
          const updated = prev.map((j) => ({ ...j, synced: true }))
          storeJams(game.id, period, updated)
          return updated
        })
        setHasSaveError(false)
      } else {
        // Mark successful ones as synced
        setJams((prev) => {
          const updated = [...prev]
          let idx = 0
          for (let i = 0; i < updated.length; i++) {
            if (!updated[i].synced && !isJamEmpty(updated[i])) {
              if (results[idx]) {
                updated[i] = { ...updated[i], synced: true }
              }
              idx++
            }
          }
          storeJams(game.id, period, updated)
          setHasSaveError(updated.some((j) => !j.synced && !isJamEmpty(j)))
          return updated
        })
      }
    } finally {
      setSaving(false)
    }
  }

  const addJam = () => {
    const maxJamNumber = jams.length > 0 ? Math.max(...jams.map((j) => j.jam_number)) : 0
    const newJam = emptyJamRow(maxJamNumber + 1)
    setJams((prev) => {
      const updated = [...prev, newJam]
      storeJams(game.id, period, updated)
      return updated
    })
  }

  const openDeleteModal = (index: number) => {
    setDeleteTarget(index)
    setShowDeleteModal(true)
  }

  const closeDeleteModal = () => {
    setShowDeleteModal(false)
    setDeleteTarget(null)
  }

  const deleteAndRenumber = async () => {
    if (deleteTarget === null) return
    const jam = jams[deleteTarget]

    setDeleting(true)
    try {
      // If the jam exists in DB, delete it
      if (jam.id) {
        const { error } = await supabase
          .from('jams')
          .delete()
          .eq('id', jam.id)
        if (error) throw error
      }

      // Renumber subsequent jams in DB
      const subsequentJams = jams.filter((j) => j.jam_number > jam.jam_number && j.id)
      for (const sj of subsequentJams) {
        const { error } = await supabase
          .from('jams')
          .update({ jam_number: sj.jam_number - 1 })
          .eq('id', sj.id!)
        if (error) throw error
      }

      // Update local state
      setJams((prev) => {
        const updated = prev
          .filter((_, i) => i !== deleteTarget)
          .map((j, i) => ({ ...j, jam_number: i + 1 }))
        storeJams(game.id, period, updated)
        return updated
      })

      closeDeleteModal()
    } catch (error) {
      console.error('Error deleting jam:', error)
      alert('Failed to delete jam')
    } finally {
      setDeleting(false)
    }
  }

  // New jammer modal handlers
  const fetchTeamSkatersNotInRoster = async (team: 'home' | 'visiting') => {
    const teamId = team === 'home' ? game.home_team_id : game.visiting_team_id
    const rosterJammers = team === 'home' ? localHomeJammers : localVisitingJammers
    const rosterSkaterIds = new Set(rosterJammers.map(j => j.skater_id))

    setLoadingTeamSkaters(true)
    try {
      const { data, error } = await supabase
        .from('teams_skaters')
        .select(`
          skater_id,
          skater:skaters(id, number, name)
        `)
        .eq('team_id', teamId)

      if (error) throw error

      const skaters = (data || [])
        .map((ts: { skater_id: string; skater: Skater | Skater[] }) =>
          Array.isArray(ts.skater) ? ts.skater[0] : ts.skater
        )
        .filter((s: Skater) => !rosterSkaterIds.has(s.id))

      setTeamSkatersForModal(skaters)
    } catch (error) {
      console.error('Error fetching team skaters:', error)
      setTeamSkatersForModal([])
    } finally {
      setLoadingTeamSkaters(false)
    }
  }

  const openNewJammerModal = (team: 'home' | 'visiting') => {
    setNewJammerTeam(team)
    setNewJammerNumber('')
    setNewJammerName('')
    setJammerSearchQuery('')
    setShowNewJammerModal(true)
    fetchTeamSkatersNotInRoster(team)
  }

  const closeNewJammerModal = () => {
    setShowNewJammerModal(false)
    setNewJammerTeam(null)
    setNewJammerNumber('')
    setNewJammerName('')
    setJammerSearchQuery('')
    setTeamSkatersForModal([])
  }

  const addExistingSkaterToRoster = async (skater: Skater) => {
    if (!newJammerTeam) return

    const roster = newJammerTeam === 'home' ? homeRoster : visitingRoster
    if (!roster) {
      alert('Roster not found')
      return
    }

    try {
      setAddingExistingSkater(skater.id)

      const { data: rosterJammer, error } = await supabase
        .from('roster_jammers')
        .insert({ game_roster_id: roster.id, skater_id: skater.id })
        .select()
        .single()
      if (error) throw error

      const newJammerData: RosterJammer = {
        id: rosterJammer.id,
        game_roster_id: roster.id,
        skater_id: skater.id,
        skater: { id: skater.id, number: skater.number, name: skater.name },
      }

      if (newJammerTeam === 'home') {
        setLocalHomeJammers((prev) => [...prev, newJammerData])
      } else {
        setLocalVisitingJammers((prev) => [...prev, newJammerData])
      }

      closeNewJammerModal()
    } catch (error) {
      console.error('Error adding skater to roster:', error)
      alert('Failed to add skater to roster')
    } finally {
      setAddingExistingSkater(null)
    }
  }

  const createNewJammer = async () => {
    if (!newJammerTeam || !newJammerNumber || !newJammerName) {
      alert('Please enter both number and name')
      return
    }

    const roster = newJammerTeam === 'home' ? homeRoster : visitingRoster
    if (!roster) {
      alert('Roster not found')
      return
    }

    try {
      setCreatingJammer(true)
      const teamId = newJammerTeam === 'home' ? game.home_team_id : game.visiting_team_id

      const { data: newSkater, error: skaterError } = await supabase
        .from('skaters')
        .insert({ number: newJammerNumber, name: newJammerName })
        .select()
        .single()
      if (skaterError) throw skaterError

      const { error: teamSkaterError } = await supabase
        .from('teams_skaters')
        .insert({ team_id: teamId, skater_id: newSkater.id })
      if (teamSkaterError) throw teamSkaterError

      const { data: rosterJammer, error: rosterJammerError } = await supabase
        .from('roster_jammers')
        .insert({ game_roster_id: roster.id, skater_id: newSkater.id })
        .select()
        .single()
      if (rosterJammerError) throw rosterJammerError

      const newJammerData: RosterJammer = {
        id: rosterJammer.id,
        game_roster_id: roster.id,
        skater_id: newSkater.id,
        skater: { id: newSkater.id, number: newSkater.number, name: newSkater.name },
      }

      if (newJammerTeam === 'home') {
        setLocalHomeJammers((prev) => [...prev, newJammerData])
      } else {
        setLocalVisitingJammers((prev) => [...prev, newJammerData])
      }

      closeNewJammerModal()
    } catch (error) {
      console.error('Error creating jammer:', error)
      alert('Failed to create jammer')
    } finally {
      setCreatingJammer(false)
    }
  }

  // Cleanup timers on unmount
  useEffect(() => {
    const timers = saveTimers.current
    return () => {
      Object.values(timers).forEach(clearTimeout)
    }
  }, [])

  // Cleanup localStorage when all synced
  useEffect(() => {
    if (!hasSaveError && jams.length > 0 && jams.every((j) => j.synced)) {
      clearStoredJams(game.id)
    }
  }, [hasSaveError, jams, game.id])

  if (loading) {
    return (
      <div className="d-flex justify-content-center py-4">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading jams...</span>
        </div>
      </div>
    )
  }

  return (
    <>
      {hasSaveError && (
        <div className="alert alert-warning d-flex align-items-center mb-3" role="alert">
          <i className="bi bi-exclamation-triangle me-2"></i>
          Some jams failed to save — click Save All to retry.
        </div>
      )}

      <div className="table-responsive">
        <table className="table table-striped table-hover align-middle">
          <thead className="table-dark">
            <tr>
              <th style={{ width: '50px' }}>#</th>
              <th>
                {game.home_team_color && (
                  <span
                    className="d-inline-block me-1"
                    style={{
                      width: '14px',
                      height: '14px',
                      backgroundColor: game.home_team_color,
                      border: '1px solid #dee2e6',
                      borderRadius: '3px',
                      verticalAlign: 'middle',
                    }}
                  ></span>
                )}
                {game.home_team?.name || 'Home'} Jammer
              </th>
              <th>{game.home_team?.name || 'Home'} Line</th>
              <th style={{ width: '80px' }}>Pts</th>
              <th style={{ width: '80px' }}>Lead</th>
              <th style={{ width: '80px' }}>Pts</th>
              <th>
                {game.visiting_team_color && (
                  <span
                    className="d-inline-block me-1"
                    style={{
                      width: '14px',
                      height: '14px',
                      backgroundColor: game.visiting_team_color,
                      border: '1px solid #dee2e6',
                      borderRadius: '3px',
                      verticalAlign: 'middle',
                    }}
                  ></span>
                )}
                {game.visiting_team?.name || 'Visiting'} Jammer
              </th>
              <th>{game.visiting_team?.name || 'Visiting'} Line
              </th>
              <th style={{ width: '60px' }}></th>
            </tr>
          </thead>
          <tbody>
            {jams.map((jam, index) => (
              <tr key={jam.jam_number} style={!jam.synced ? { backgroundColor: '#d7aef2' } : undefined}>
                <td className="fw-bold">{jam.jam_number}</td>

                {/* Home Jammer */}
                <td>
                  <div className="d-flex gap-1">
                    <select
                      className="form-select form-select-sm"
                      value={jam.home_jammer_id}
                      onChange={(e) => updateJamField(index, 'home_jammer_id', e.target.value)}
                    >
                      <option value="">—</option>
                      {localHomeJammers.map((j) => (
                        <option key={j.id} value={j.skater_id}>
                          {j.skater ? `#${j.skater.number} ${j.skater.name}` : 'Unknown'}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn btn-outline-success btn-sm"
                      onClick={() => openNewJammerModal('home')}
                      title="Add new jammer"
                    >
                      <i className="bi bi-plus"></i>
                    </button>
                  </div>
                </td>

                {/* Home Line */}
                <td>
                  <select
                    className="form-select form-select-sm"
                    value={jam.home_line_id}
                    onChange={(e) => updateJamField(index, 'home_line_id', e.target.value)}
                  >
                    <option value="">—</option>
                    {(homeRoster?.roster_lines || []).map((line) => (
                      <option key={line.id} value={line.id}>{line.name}</option>
                    ))}
                  </select>
                </td>

                {/* Home Points */}
                <td>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    min="0"
                    value={jam.home_points}
                    onChange={(e) => updateJamField(index, 'home_points', parseInt(e.target.value) || 0)}
                  />
                </td>

                {/* Lead */}
                <td className="text-center">
                  <div className="d-flex gap-1 justify-content-center">
                    <button
                      type="button"
                      className={`btn btn-sm ${jam.lead_team === 'home' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => handleLeadToggle(index, 'home')}
                      title="Home lead"
                    >
                      H
                    </button>
                    <button
                      type="button"
                      className={`btn btn-sm ${jam.lead_team === 'visiting' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => handleLeadToggle(index, 'visiting')}
                      title="Visiting lead"
                    >
                      V
                    </button>
                  </div>
                </td>

                {/* Visiting Points */}
                <td>
                  <input
                    type="number"
                    className="form-control form-control-sm"
                    min="0"
                    value={jam.visiting_points}
                    onChange={(e) => updateJamField(index, 'visiting_points', parseInt(e.target.value) || 0)}
                  />
                </td>

                {/* Visiting Jammer */}
                <td>
                  <div className="d-flex gap-1">
                    <select
                      className="form-select form-select-sm"
                      value={jam.visiting_jammer_id}
                      onChange={(e) => updateJamField(index, 'visiting_jammer_id', e.target.value)}
                    >
                      <option value="">—</option>
                      {localVisitingJammers.map((j) => (
                        <option key={j.id} value={j.skater_id}>
                          {j.skater ? `#${j.skater.number} ${j.skater.name}` : 'Unknown'}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn btn-outline-success btn-sm"
                      onClick={() => openNewJammerModal('visiting')}
                      title="Add new jammer"
                    >
                      <i className="bi bi-plus"></i>
                    </button>
                  </div>
                </td>

                {/* Visiting Line */}
                <td>
                  <select
                    className="form-select form-select-sm"
                    value={jam.visiting_line_id}
                    onChange={(e) => updateJamField(index, 'visiting_line_id', e.target.value)}
                  >
                    <option value="">—</option>
                    {(visitingRoster?.roster_lines || []).map((line) => (
                      <option key={line.id} value={line.id}>{line.name}</option>
                    ))}
                  </select>
                </td>

                {/* Actions */}
                <td>
                  <button
                    type="button"
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => openDeleteModal(index)}
                    title="Delete jam"
                  >
                    <i className="bi bi-trash"></i>
                  </button>
                </td>
              </tr>
            ))}
            {jams.length === 0 && (
              <tr>
                <td colSpan={9} className="text-center text-muted py-4">
                  No jams yet for this period. Click "Add Jam" to get started.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="d-flex justify-content-between mt-3">
        <button className="btn btn-outline-primary" onClick={addJam}>
          <i className="bi bi-plus-lg me-2"></i>
          Add Jam
        </button>
        <button
          className="btn btn-primary"
          onClick={saveAllUnsaved}
          disabled={!hasSaveError || saving}
        >
          {saving ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              Saving...
            </>
          ) : (
            <>
              <i className="bi bi-save me-2"></i>
              Save All
            </>
          )}
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deleteTarget !== null && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Delete Jam {jams[deleteTarget]?.jam_number}</h5>
                <button type="button" className="btn-close" onClick={closeDeleteModal} disabled={deleting}></button>
              </div>
              <div className="modal-body">
                <p>
                  Are you sure you want to delete Jam {jams[deleteTarget]?.jam_number}?
                  All following jams will be renumbered.
                </p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeDeleteModal} disabled={deleting}>
                  Cancel
                </button>
                <button type="button" className="btn btn-danger" onClick={deleteAndRenumber} disabled={deleting}>
                  {deleting ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Deleting...
                    </>
                  ) : (
                    'Delete & Renumber'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Jammer Modal */}
      {showNewJammerModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  Add Jammer - {newJammerTeam === 'home' ? (game.home_team?.name || 'Home') : (game.visiting_team?.name || 'Visiting')}
                </h5>
                <button type="button" className="btn-close" onClick={closeNewJammerModal} disabled={creatingJammer || !!addingExistingSkater}></button>
              </div>
              <div className="modal-body">
                {/* Search existing team skaters */}
                <div className="mb-3">
                  <input
                    type="text"
                    className="form-control"
                    value={jammerSearchQuery}
                    onChange={(e) => setJammerSearchQuery(e.target.value)}
                    placeholder="Search existing skaters..."
                    disabled={creatingJammer || !!addingExistingSkater}
                  />
                </div>

                {loadingTeamSkaters ? (
                  <div className="text-center py-3">
                    <div className="spinner-border spinner-border-sm" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : (
                  <>
                    {(() => {
                      const query = jammerSearchQuery.toLowerCase()
                      const filtered = teamSkatersForModal.filter(s =>
                        !query || s.number.toLowerCase().includes(query) || s.name.toLowerCase().includes(query)
                      )
                      return filtered.length > 0 ? (
                        <div style={{ maxHeight: '200px', overflowY: 'auto' }} className="border rounded mb-3">
                          {filtered.map((skater) => (
                            <div
                              key={skater.id}
                              className="d-flex justify-content-between align-items-center px-3 py-2 border-bottom"
                            >
                              <span>#{skater.number} {skater.name}</span>
                              <button
                                type="button"
                                className="btn btn-outline-success btn-sm"
                                onClick={() => addExistingSkaterToRoster(skater)}
                                disabled={creatingJammer || addingExistingSkater === skater.id}
                              >
                                {addingExistingSkater === skater.id ? (
                                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                ) : (
                                  <><i className="bi bi-plus"></i> Add</>
                                )}
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : teamSkatersForModal.length > 0 ? (
                        <p className="text-muted small mb-3">No matching skaters found.</p>
                      ) : null
                    })()}
                  </>
                )}

                {/* Create new jammer section */}
                <hr />
                <h6>Create new jammer</h6>
                <div className="mb-3">
                  <label className="form-label">Number</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newJammerNumber}
                    onChange={(e) => setNewJammerNumber(e.target.value)}
                    placeholder="Enter jammer number"
                    disabled={creatingJammer || !!addingExistingSkater}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Name</label>
                  <input
                    type="text"
                    className="form-control"
                    value={newJammerName}
                    onChange={(e) => setNewJammerName(e.target.value)}
                    placeholder="Enter jammer name"
                    disabled={creatingJammer || !!addingExistingSkater}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeNewJammerModal} disabled={creatingJammer || !!addingExistingSkater}>
                  Cancel
                </button>
                <button type="button" className="btn btn-primary" onClick={createNewJammer} disabled={creatingJammer || !!addingExistingSkater}>
                  {creatingJammer ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Creating...
                    </>
                  ) : (
                    'Create Jammer'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
