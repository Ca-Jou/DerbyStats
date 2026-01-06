import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Game, GameRoster } from '../types/Skater'
import DeleteButton from '../components/DeleteButton'
import EditGameForm from '../components/EditGameForm'
import CreateRosterForm from '../components/CreateRosterForm'
import EditRosterForm from '../components/EditRosterForm'

function GameDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [game, setGame] = useState<Game | null>(null)
  const [homeRoster, setHomeRoster] = useState<GameRoster | null>(null)
  const [visitingRoster, setVisitingRoster] = useState<GameRoster | null>(null)
  const [hasJams, setHasJams] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showCreateHomeRoster, setShowCreateHomeRoster] = useState(false)
  const [showEditHomeRoster, setShowEditHomeRoster] = useState(false)
  const [showCreateVisitingRoster, setShowCreateVisitingRoster] = useState(false)
  const [showEditVisitingRoster, setShowEditVisitingRoster] = useState(false)
  const [showDeleteRosterConfirm, setShowDeleteRosterConfirm] = useState(false)
  const [rosterToDelete, setRosterToDelete] = useState<{ id: string, teamName: string } | null>(null)

  const fetchRosters = async (gameId: string, homeTeamId: string, visitingTeamId: string) => {
    try {
      const { data, error } = await supabase
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
        .eq('game_id', gameId)

      if (error) throw error

      const homeRosterData = data?.find(r => r.team_id === homeTeamId)
      const visitingRosterData = data?.find(r => r.team_id === visitingTeamId)

      // Map rosters to handle array returns from Supabase
      const mapRoster = (roster: any): GameRoster | null => {
        if (!roster) return null
        return {
          ...roster,
          roster_jammers: roster.roster_jammers?.map((jammer: any) => ({
            ...jammer,
            skater: Array.isArray(jammer.skater) ? jammer.skater[0] : jammer.skater
          })) || []
        }
      }

      setHomeRoster(mapRoster(homeRosterData))
      setVisitingRoster(mapRoster(visitingRosterData))
    } catch (error) {
      console.error('Error fetching rosters:', error)
    }
  }

  const checkJamsExist = async (gameId: string) => {
    try {
      const { data, error } = await supabase
        .from('jams')
        .select('id')
        .eq('game_id', gameId)
        .limit(1)

      if (error) throw error

      setHasJams(data && data.length > 0)
    } catch (error) {
      console.error('Error checking jams:', error)
      setHasJams(false)
    }
  }

  useEffect(() => {
    async function fetchGame() {
      try {
        setLoading(true)

        const { data, error } = await supabase
          .from('games')
          .select(`
            id,
            home_team_id,
            home_team_color,
            visiting_team_id,
            visiting_team_color,
            start_date,
            location,
            home_team:teams!games_home_team_id_fkey(id, name, city, country, light_color, dark_color),
            visiting_team:teams!games_visiting_team_id_fkey(id, name, city, country, light_color, dark_color)
          `)
          .eq('id', id)
          .single()

        if (error) throw error

        // Map the data to handle arrays returned by Supabase
        const mappedGame = {
          ...data,
          home_team: Array.isArray(data.home_team) ? data.home_team[0] : data.home_team,
          visiting_team: Array.isArray(data.visiting_team) ? data.visiting_team[0] : data.visiting_team
        }

        setGame(mappedGame)

        // Fetch rosters and check for jams after game is loaded
        await fetchRosters(mappedGame.id, mappedGame.home_team_id, mappedGame.visiting_team_id)
        await checkJamsExist(mappedGame.id)
      } catch (error) {
        setError(error instanceof Error ? error.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    if (id) {
      fetchGame()
    }
  }, [id])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'TBD'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="d-flex justify-content-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading game details...</span>
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
        <button className="btn btn-outline-secondary" onClick={() => navigate('/games')}>
          Back to Games
        </button>
      </div>
    )
  }

  if (!game) {
    return (
      <div className="container mt-4">
        <div className="alert alert-warning" role="alert">
          Game not found
        </div>
        <button className="btn btn-outline-secondary" onClick={() => navigate('/games')}>
          Back to Games
        </button>
      </div>
    )
  }

  return (
    <div className="container mt-4">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div className="d-flex align-items-center gap-3">
              <h1 className="mb-0">Game Details</h1>
              {hasJams && (
                <button
                  className="btn btn-primary"
                  onClick={() => navigate(`/games/${game.id}/stats`)}
                >
                  <i className="bi bi-speedometer2 me-2"></i>
                  View Stats
                </button>
              )}
            </div>
            <div>
              <button className="btn btn-outline-secondary me-2" onClick={() => navigate('/games')}>
                <i className="bi bi-arrow-left me-2"></i>
                Back
              </button>
              <button className="btn btn-outline-primary me-2" onClick={() => navigate(`/games/${game.id}/enter-stats`)}>
                <i className="bi bi-clipboard-data me-2"></i>
                Enter Stats
              </button>
              <button className="btn btn-outline-primary me-2" onClick={() => setShowEditModal(true)}>
                <i className="bi bi-pencil-fill me-2"></i>
                Edit
              </button>
              <DeleteButton
                entityType="games"
                id={game.id}
                onSuccess={() => navigate('/games')}
                onError={(error) => setError(error.message)}
                confirmMessage="Are you sure you want to delete this game? This action cannot be undone!"
              />
            </div>
          </div>

          <div className="card mb-3">
            <div className="card-body">
              <div className="row mb-3">
                <div className="col-md-3">
                  <strong>Date:</strong>
                </div>
                <div className="col-md-9">
                  {formatDate(game.start_date)}
                </div>
              </div>
              <div className="row mb-3">
                <div className="col-md-3">
                  <strong>Location:</strong>
                </div>
                <div className="col-md-9">
                  {game.location || 'TBD'}
                </div>
              </div>
            </div>
          </div>

          <div className="row">
            <div className="col-md-6">
              <div className="card">
                <div className="card-body">
                  <h5 className="card-title text-center mb-3">Home Team</h5>
                  <div className="text-center mb-3 d-flex align-items-center justify-content-center gap-2">
                    {game.home_team_color && (
                      <div
                        style={{
                          width: '25px',
                          height: '25px',
                          backgroundColor: game.home_team_color,
                          border: '1px solid #dee2e6',
                          borderRadius: '4px',
                          flexShrink: 0
                        }}
                      ></div>
                    )}
                    <div>
                      <strong className="fs-4">{game.home_team?.name || 'Unknown'}</strong>
                      {' '}
                      <span className="text-muted">({game.home_team?.city}, {game.home_team?.country})</span>
                    </div>
                  </div>


                  <hr />

                  {!homeRoster ? (
                    <div className="text-center">
                      <button
                        className="btn btn-outline-primary"
                        onClick={() => setShowCreateHomeRoster(true)}
                      >
                        <i className="bi bi-plus-circle me-2"></i>
                        Create Roster
                      </button>
                    </div>
                  ) : (
                    <>
                      <h6 className="text-center mb-3">Roster</h6>

                      {homeRoster.roster_jammers && homeRoster.roster_jammers.length > 0 && (
                        <div className="mb-3">
                          <strong>Jammers:</strong>
                          <ul className="list-unstyled ms-3 mt-2">
                            {homeRoster.roster_jammers.map((jammer) => (
                              <li key={jammer.id}>
                                #{jammer.skater?.number} - {jammer.skater?.name}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {homeRoster.roster_lines && homeRoster.roster_lines.length > 0 && (
                        <div className="mb-3">
                          <strong>Lines:</strong>
                          <ul className="list-unstyled ms-3 mt-2">
                            {homeRoster.roster_lines.map((line) => (
                              <li key={line.id}>{line.name}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="d-flex justify-content-center gap-2 mt-3">
                        <button
                          className="btn btn-outline-primary btn-sm"
                          onClick={() => setShowEditHomeRoster(true)}
                        >
                          <i className="bi bi-pencil-fill me-1"></i>
                          Edit
                        </button>
                        <button
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => {
                            setRosterToDelete({
                              id: homeRoster.id,
                              teamName: game.home_team?.name || 'Home Team'
                            })
                            setShowDeleteRosterConfirm(true)
                          }}
                        >
                          <i className="bi bi-trash-fill me-1"></i>
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            <div className="col-md-6">
              <div className="card">
                <div className="card-body">
                  <h5 className="card-title text-center mb-3">Visiting Team</h5>
                  <div className="text-center mb-3 d-flex align-items-center justify-content-center gap-2">
                    {game.visiting_team_color && (
                      <div
                        style={{
                          width: '25px',
                          height: '25px',
                          backgroundColor: game.visiting_team_color,
                          border: '1px solid #dee2e6',
                          borderRadius: '4px',
                          flexShrink: 0
                        }}
                      ></div>
                    )}
                    <div>
                      <strong className="fs-4">{game.visiting_team?.name || 'Unknown'}</strong>
                      {' '}
                      <span className="text-muted">({game.visiting_team?.city}, {game.visiting_team?.country})</span>
                    </div>
                  </div>

                  <hr />

                  {!visitingRoster ? (
                    <div className="text-center">
                      <button
                        className="btn btn-outline-primary"
                        onClick={() => setShowCreateVisitingRoster(true)}
                      >
                        <i className="bi bi-plus-circle me-2"></i>
                        Create Roster
                      </button>
                    </div>
                  ) : (
                    <>
                      <h6 className="text-center mb-3">Roster</h6>

                      {visitingRoster.roster_jammers && visitingRoster.roster_jammers.length > 0 && (
                        <div className="mb-3">
                          <strong>Jammers:</strong>
                          <ul className="list-unstyled ms-3 mt-2">
                            {visitingRoster.roster_jammers.map((jammer) => (
                              <li key={jammer.id}>
                                #{jammer.skater?.number} - {jammer.skater?.name}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {visitingRoster.roster_lines && visitingRoster.roster_lines.length > 0 && (
                        <div className="mb-3">
                          <strong>Lines:</strong>
                          <ul className="list-unstyled ms-3 mt-2">
                            {visitingRoster.roster_lines.map((line) => (
                              <li key={line.id}>{line.name}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="d-flex justify-content-center gap-2 mt-3">
                        <button
                          className="btn btn-outline-primary btn-sm"
                          onClick={() => setShowEditVisitingRoster(true)}
                        >
                          <i className="bi bi-pencil-fill me-1"></i>
                          Edit
                        </button>
                        <button
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => {
                            setRosterToDelete({
                              id: visitingRoster.id,
                              teamName: game.visiting_team?.name || 'Visiting Team'
                            })
                            setShowDeleteRosterConfirm(true)
                          }}
                        >
                          <i className="bi bi-trash-fill me-1"></i>
                          Delete
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <EditGameForm
        show={showEditModal}
        game={game}
        onClose={() => setShowEditModal(false)}
        onSuccess={(updatedGame) => {
          setGame(updatedGame)
          setShowEditModal(false)
        }}
        onError={(error) => {
          setError(error.message)
        }}
      />

      {/* Delete Roster Confirmation Modal */}
      {showDeleteRosterConfirm && rosterToDelete && (
        <>
          <div className="modal show d-block" tabIndex={-1}>
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Delete Roster</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setShowDeleteRosterConfirm(false)
                      setRosterToDelete(null)
                    }}
                  ></button>
                </div>
                <div className="modal-body">
                  <p>Are you sure you want to delete the roster for {rosterToDelete.teamName}? This action cannot be undone!</p>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => {
                      setShowDeleteRosterConfirm(false)
                      setRosterToDelete(null)
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-outline-danger"
                    onClick={async () => {
                      try {
                        const { error } = await supabase
                          .from('game_rosters')
                          .delete()
                          .eq('id', rosterToDelete.id)

                        if (error) throw error

                        // Update state to remove the roster
                        if (homeRoster?.id === rosterToDelete.id) {
                          setHomeRoster(null)
                        } else if (visitingRoster?.id === rosterToDelete.id) {
                          setVisitingRoster(null)
                        }

                        setShowDeleteRosterConfirm(false)
                        setRosterToDelete(null)
                      } catch (error) {
                        setError(error instanceof Error ? error.message : 'Failed to delete roster')
                        setShowDeleteRosterConfirm(false)
                        setRosterToDelete(null)
                      }
                    }}
                  >
                    Delete Roster
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="modal-backdrop show"></div>
        </>
      )}

      {/* Create/Edit Roster Modals */}
      <CreateRosterForm
        show={showCreateHomeRoster}
        gameId={game.id}
        teamId={game.home_team_id}
        teamName={game.home_team?.name || 'Home Team'}
        onClose={() => setShowCreateHomeRoster(false)}
        onSuccess={(newRoster) => {
          setHomeRoster(newRoster)
          setShowCreateHomeRoster(false)
        }}
        onError={(error) => {
          setError(error.message)
          setShowCreateHomeRoster(false)
        }}
      />

      {homeRoster && (
        <EditRosterForm
          show={showEditHomeRoster}
          roster={homeRoster}
          teamId={game.home_team_id}
          teamName={game.home_team?.name || 'Home Team'}
          onClose={() => setShowEditHomeRoster(false)}
          onSuccess={(updatedRoster) => {
            setHomeRoster(updatedRoster)
            setShowEditHomeRoster(false)
          }}
          onError={(error) => {
            setError(error.message)
            setShowEditHomeRoster(false)
          }}
        />
      )}

      <CreateRosterForm
        show={showCreateVisitingRoster}
        gameId={game.id}
        teamId={game.visiting_team_id}
        teamName={game.visiting_team?.name || 'Visiting Team'}
        onClose={() => setShowCreateVisitingRoster(false)}
        onSuccess={(newRoster) => {
          setVisitingRoster(newRoster)
          setShowCreateVisitingRoster(false)
        }}
        onError={(error) => {
          setError(error.message)
          setShowCreateVisitingRoster(false)
        }}
      />

      {visitingRoster && (
        <EditRosterForm
          show={showEditVisitingRoster}
          roster={visitingRoster}
          teamId={game.visiting_team_id}
          teamName={game.visiting_team?.name || 'Visiting Team'}
          onClose={() => setShowEditVisitingRoster(false)}
          onSuccess={(updatedRoster) => {
            setVisitingRoster(updatedRoster)
            setShowEditVisitingRoster(false)
          }}
          onError={(error) => {
            setError(error.message)
            setShowEditVisitingRoster(false)
          }}
        />
      )}
    </div>
  )
}

export default GameDetails
