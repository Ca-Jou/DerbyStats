import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Game } from '../types/Skater'
import DeleteButton from '../components/DeleteButton'
import CreateGameForm from '../components/CreateGameForm'
import EditGameForm from '../components/EditGameForm'

function Games() {
  const navigate = useNavigate()
  const [games, setGames] = useState<Game[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [editingGame, setEditingGame] = useState<Game | null>(null)

  const fetchGameWithTeams = async (gameId: string): Promise<Game> => {
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
        home_team:teams!games_home_team_id_fkey(id, name, city, country),
        visiting_team:teams!games_visiting_team_id_fkey(id, name, city, country)
      `)
      .eq('id', gameId)
      .single()

    if (error) throw error

    // Map the data to handle arrays returned by Supabase
    return {
      ...data,
      home_team: Array.isArray(data.home_team) ? data.home_team[0] : data.home_team,
      visiting_team: Array.isArray(data.visiting_team) ? data.visiting_team[0] : data.visiting_team
    }
  }

  useEffect(() => {
    async function fetchGames() {
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
            home_team:teams!games_home_team_id_fkey(id, name, city, country),
            visiting_team:teams!games_visiting_team_id_fkey(id, name, city, country)
          `)
          .order('start_date', { ascending: false, nullsFirst: false })

        if (error) throw error

        // Map the data to handle the array returned by Supabase
        const mappedGames = (data || []).map((game) => ({
          ...game,
          home_team: Array.isArray(game.home_team) ? game.home_team[0] : game.home_team,
          visiting_team: Array.isArray(game.visiting_team) ? game.visiting_team[0] : game.visiting_team
        }))

        setGames(mappedGames)
      } catch (error) {
        setError(error instanceof Error ? error.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchGames()
  }, [])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'TBD'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
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
            <span className="visually-hidden">Loading games...</span>
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
      </div>
    )
  }

  return (
    <div className="container mt-4">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="mb-0">Games</h1>
            <button
              className="btn btn-outline-primary"
              onClick={() => setShowModal(true)}
            >
              <i className="bi bi-plus-circle me-2"></i>
              Add Game
            </button>
          </div>
          <div className="table-responsive">
            <table className="table table-striped table-hover">
              <thead className="table-dark">
                <tr>
                  <th>Date</th>
                  <th>Home Team</th>
                  <th>Visiting Team</th>
                  <th>Location</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {games.map((game) => (
                  <tr key={game.id}>
                    <td>{formatDate(game.start_date)}</td>
                    <td>
                      {game.home_team?.name || 'Unknown'}
                      {game.home_team_color && (
                        <span
                          className="ms-2 d-inline-block"
                          style={{
                            width: '20px',
                            height: '20px',
                            backgroundColor: game.home_team_color,
                            border: '1px solid #dee2e6',
                            borderRadius: '3px',
                            verticalAlign: 'middle'
                          }}
                        ></span>
                      )}
                    </td>
                    <td>
                      {game.visiting_team?.name || 'Unknown'}
                      {game.visiting_team_color && (
                        <span
                          className="ms-2 d-inline-block"
                          style={{
                            width: '20px',
                            height: '20px',
                            backgroundColor: game.visiting_team_color,
                            border: '1px solid #dee2e6',
                            borderRadius: '3px',
                            verticalAlign: 'middle'
                          }}
                        ></span>
                      )}
                    </td>
                    <td>{game.location || '-'}</td>
                    <td>
                      <button
                        className="btn btn-outline-primary btn-sm me-2"
                        onClick={() => navigate(`/games/${game.id}`)}
                      >
                        <i className="bi bi-eye-fill"></i>
                      </button>
                      <button
                        className="btn btn-outline-primary btn-sm me-2"
                        onClick={() => setEditingGame(game)}
                      >
                        <i className="bi bi-pencil-fill"></i>
                      </button>
                      <DeleteButton
                        entityType={'games'}
                        id={game.id}
                        onSuccess={() => {
                          setGames(games.filter(g => g.id !== game.id))
                        }}
                        onError={(error) => {
                          setError(error.message)
                        }}
                        confirmMessage="Are you sure you want to delete this game? This action cannot be undone!"
                        size="sm"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <CreateGameForm
        show={showModal}
        onClose={() => setShowModal(false)}
        onSuccess={async (newGame) => {
          try {
            const mappedGame = await fetchGameWithTeams(newGame.id)
            setGames([mappedGame, ...games])
          } catch (error) {
            setError(error instanceof Error ? error.message : 'Failed to fetch game data')
          }
          setShowModal(false)
        }}
        onError={(error) => {
          setError(error.message)
        }}
      />

      {editingGame && (
        <EditGameForm
          show={true}
          game={editingGame}
          onClose={() => setEditingGame(null)}
          onSuccess={async (updatedGame) => {
            try {
              const mappedGame = await fetchGameWithTeams(updatedGame.id)
              setGames(games.map(g => g.id === mappedGame.id ? mappedGame : g))
            } catch (error) {
              setError(error instanceof Error ? error.message : 'Failed to fetch game data')
            }
            setEditingGame(null)
          }}
          onError={(error) => {
            setError(error.message)
          }}
        />
      )}
    </div>
  )
}

export default Games
