import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Game } from '../types/Skater'

function EnterGameStats() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [game, setGame] = useState<Game | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
            home_team:teams!games_home_team_id_fkey(id, name, city, country),
            visiting_team:teams!games_visiting_team_id_fkey(id, name, city, country)
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

  if (loading) {
    return (
      <div className="container mt-4">
        <div className="d-flex justify-content-center">
          <div className="spinner-border" role="status">
            <span className="visually-hidden">Loading game stats...</span>
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
        <button className="btn btn-secondary" onClick={() => navigate(`/games/${id}`)}>
          Back to Game Details
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
            <h1 className="mb-0">Enter Game Stats</h1>
            <button className="btn btn-secondary" onClick={() => navigate(`/games/${game.id}`)}>
              <i className="bi bi-arrow-left me-2"></i>
              Back to Game Details
            </button>
          </div>

          <div className="card mb-4">
            <div className="card-body">
              <div className="row">
                <div className="col-md-6 text-center">
                  <h5>
                    {game.home_team_color && (
                      <span
                        className="d-inline-block me-2"
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
                    {game.home_team?.name || 'Home Team'}
                  </h5>
                </div>
                <div className="col-md-6 text-center">
                  <h5>
                    {game.visiting_team_color && (
                      <span
                        className="d-inline-block me-2"
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
                    {game.visiting_team?.name || 'Visiting Team'}
                  </h5>
                </div>
              </div>
            </div>
          </div>

          <div className="alert alert-info">
            Jam entry form coming soon...
          </div>
        </div>
      </div>
    </div>
  )
}

export default EnterGameStats