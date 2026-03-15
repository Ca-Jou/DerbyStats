import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Game, GameRoster, RosterJammer, Skater } from '../types/Skater'
import JamTable from '../components/JamTable'

function EnterGameStats() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [game, setGame] = useState<Game | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [period, setPeriod] = useState<1 | 2>(1)
  const [homeRoster, setHomeRoster] = useState<GameRoster | null>(null)
  const [visitingRoster, setVisitingRoster] = useState<GameRoster | null>(null)
  const [homeTotal, setHomeTotal] = useState(0)
  const [visitingTotal, setVisitingTotal] = useState(0)

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
            locked,
            home_team:teams!games_home_team_id_fkey(id, name, city, country),
            visiting_team:teams!games_visiting_team_id_fkey(id, name, city, country)
          `)
          .eq('id', id)
          .single()

        if (error) throw error

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

  useEffect(() => {
    async function fetchRosters() {
      if (!game) return

      try {
        const { data: rosters, error } = await supabase
          .from('game_rosters')
          .select(`
            id,
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
          .eq('game_id', game.id)

        if (error) throw error

        const homeRosterData = rosters?.find((r) => r.team_id === game.home_team_id)
        const visitingRosterData = rosters?.find((r) => r.team_id === game.visiting_team_id)

        const mapJammers = (jammers: unknown[] | undefined): RosterJammer[] => {
          if (!jammers) return []
          return jammers.map((jammerRaw) => {
            const jammer = jammerRaw as { id: string; game_roster_id: string; skater_id: string; skater: Skater | Skater[] }
            return {
              id: jammer.id,
              game_roster_id: jammer.game_roster_id,
              skater_id: jammer.skater_id,
              skater: Array.isArray(jammer.skater) ? jammer.skater[0] : jammer.skater
            }
          })
        }

        setHomeRoster(homeRosterData ? {
          id: homeRosterData.id,
          game_id: game.id,
          team_id: game.home_team_id,
          roster_jammers: mapJammers(homeRosterData.roster_jammers as unknown[]),
          roster_lines: homeRosterData.roster_lines || []
        } : null)

        setVisitingRoster(visitingRosterData ? {
          id: visitingRosterData.id,
          game_id: game.id,
          team_id: game.visiting_team_id,
          roster_jammers: mapJammers(visitingRosterData.roster_jammers as unknown[]),
          roster_lines: visitingRosterData.roster_lines || []
        } : null)
      } catch (error) {
        console.error('Error fetching rosters:', error)
      }
    }

    fetchRosters()
  }, [game])

  const handleScoreChange = useCallback((home: number, visiting: number) => {
    setHomeTotal(home)
    setVisitingTotal(visiting)
  }, [])

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
        <button className="btn btn-outline-info" onClick={() => navigate(`/games/${id}`)}>
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
        <button className="btn btn-outline-info" onClick={() => navigate('/games')}>
          Back to Games
        </button>
      </div>
    )
  }

  if (game.locked) {
    return (
      <div className="container mt-4">
        <div className="alert alert-info d-flex align-items-center" role="alert">
          <i className="bi bi-lock-fill me-2"></i>
          This game is locked. Unlock it from the Game Details page to enter stats.
        </div>
        <button className="btn btn-outline-info" onClick={() => navigate(`/games/${id}`)}>
          <i className="bi bi-arrow-left me-2"></i>
          Back to Game Details
        </button>
      </div>
    )
  }

  const homeName = game.home_team?.name || 'Home'
  const visitingName = game.visiting_team?.name || 'Visiting'

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="mb-0">Enter Game Stats</h1>
        <div className="d-flex align-items-center gap-2">
          <button className="btn btn-outline-info" onClick={() => navigate(`/games/${game.id}`)}>
            <i className="bi bi-arrow-left me-2"></i>
            Back to Game Details
          </button>
          <button className="btn btn-primary" onClick={() => navigate(`/games/${game.id}/stats`)}>
            <i className="bi bi-graph-up me-2"></i>
            View Stats
          </button>
        </div>
      </div>

      <div className="card mb-4">
        <div className="card-body">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="mb-0">
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
              {homeName} {homeTotal} - {visitingTotal} {visitingName}
              {game.visiting_team_color && (
                <span
                  className="d-inline-block ms-2"
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
            </h5>
            <div className="btn-group">
              <button
                className={`btn ${period === 1 ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setPeriod(1)}
              >
                Period 1
              </button>
              <button
                className={`btn ${period === 2 ? 'btn-primary' : 'btn-outline-primary'}`}
                onClick={() => setPeriod(2)}
              >
                Period 2
              </button>
            </div>
          </div>

          <JamTable
            game={game}
            period={period}
            homeRoster={homeRoster}
            visitingRoster={visitingRoster}
            onScoreChange={handleScoreChange}
          />
        </div>
      </div>
    </div>
  )
}

export default EnterGameStats
