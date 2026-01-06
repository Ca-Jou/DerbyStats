import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Game } from '../types/Skater'
import DeleteButton from '../components/DeleteButton'
import EditGameForm from '../components/EditGameForm'

function GameDetails() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [game, setGame] = useState<Game | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)

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
        <button className="btn btn-secondary" onClick={() => navigate('/games')}>
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
        <button className="btn btn-secondary" onClick={() => navigate('/games')}>
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
            <h1 className="mb-0">Game Details</h1>
            <div>
              <button className="btn btn-secondary me-2" onClick={() => navigate('/games')}>
                <i className="bi bi-arrow-left me-2"></i>
                Back
              </button>
              <button className="btn btn-primary me-2" onClick={() => setShowEditModal(true)}>
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

          <div className="card">
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
              <hr />
              <div className="row mb-3">
                <div className="col-md-3">
                  <strong>Home Team:</strong>
                </div>
                <div className="col-md-9">
                  <div className="mb-2">
                    <strong className="fs-5">{game.home_team?.name || 'Unknown'}</strong>
                  </div>
                  <div className="mb-1">
                    {game.home_team?.city}, {game.home_team?.country}
                  </div>
                  {game.home_team_color && (
                    <div className="d-flex align-items-center mt-2">
                      <span className="me-2">Jersey Color:</span>
                      <div
                        style={{
                          width: '50px',
                          height: '50px',
                          backgroundColor: game.home_team_color,
                          border: '1px solid #dee2e6',
                          borderRadius: '4px'
                        }}
                      ></div>
                    </div>
                  )}
                </div>
              </div>
              <hr />
              <div className="row mb-3">
                <div className="col-md-3">
                  <strong>Visiting Team:</strong>
                </div>
                <div className="col-md-9">
                  <div className="mb-2">
                    <strong className="fs-5">{game.visiting_team?.name || 'Unknown'}</strong>
                  </div>
                  <div className="mb-1">
                    {game.visiting_team?.city}, {game.visiting_team?.country}
                  </div>
                  {game.visiting_team_color && (
                    <div className="d-flex align-items-center mt-2">
                      <span className="me-2">Jersey Color:</span>
                      <div
                        style={{
                          width: '50px',
                          height: '50px',
                          backgroundColor: game.visiting_team_color,
                          border: '1px solid #dee2e6',
                          borderRadius: '4px'
                        }}
                      ></div>
                    </div>
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
    </div>
  )
}

export default GameDetails