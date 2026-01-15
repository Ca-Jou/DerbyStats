import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Game } from '../types/Skater'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import { Bar, Line } from 'react-chartjs-2'
import colors from '../assets/scss/colors.module.scss'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
)

interface JammerStats {
  skater_id: string
  skater_name: string
  skater_number: string
  jam_count: number
  lead_count: number
  lead_percentage: number
  points_for: number
  points_against: number
}

interface LineStats {
  line_id: string
  line_name: string
  jam_count: number
  lead_count: number
  lead_percentage: number
  points_for: number
  points_against: number
}

function GameStats() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [game, setGame] = useState<Game | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedTeam, setSelectedTeam] = useState<'home' | 'visiting'>('home')
  const [selectedPeriod, setSelectedPeriod] = useState<'all' | 1 | 2>('all')
  const [jammerStats, setJammerStats] = useState<JammerStats[]>([])
  const [lineStats, setLineStats] = useState<LineStats[]>([])
  const [totalJams, setTotalJams] = useState(0)
  const [scoreEvolution, setScoreEvolution] = useState<{
    labels: string[]
    homeScores: number[]
    visitingScores: number[]
  }>({ labels: [], homeScores: [], visitingScores: [] })

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

  useEffect(() => {
    async function fetchJammerStats() {
      if (!game) return

      try {
        const jammerField = selectedTeam === 'home' ? 'home_jammer_id' : 'visiting_jammer_id'
        const leadTeamValue = selectedTeam
        const pointsForField = selectedTeam === 'home' ? 'home_points' : 'visiting_points'
        const pointsAgainstField = selectedTeam === 'home' ? 'visiting_points' : 'home_points'

        let query = supabase
          .from('jams')
          .select(`
            ${jammerField},
            lead_team,
            home_points,
            visiting_points
          `)
          .eq('game_id', game.id)
          .not(jammerField, 'is', null)

        if (selectedPeriod !== 'all') {
          query = query.eq('period', selectedPeriod)
        }

        const { data: jams, error } = await query

        if (error) throw error

        const jammerCounts = new Map<string, number>()
        const jammerLeadCounts = new Map<string, number>()
        const jammerPointsFor = new Map<string, number>()
        const jammerPointsAgainst = new Map<string, number>()

        jams?.forEach((jam: Record<string, unknown>) => {
          const jammerId = jam[jammerField] as string
          if (jammerId) {
            jammerCounts.set(jammerId, (jammerCounts.get(jammerId) || 0) + 1)
            if (jam.lead_team === leadTeamValue) {
              jammerLeadCounts.set(jammerId, (jammerLeadCounts.get(jammerId) || 0) + 1)
            }
            const pointsFor = (jam[pointsForField] as number) || 0
            const pointsAgainst = (jam[pointsAgainstField] as number) || 0
            jammerPointsFor.set(jammerId, (jammerPointsFor.get(jammerId) || 0) + pointsFor)
            jammerPointsAgainst.set(jammerId, (jammerPointsAgainst.get(jammerId) || 0) + pointsAgainst)
          }
        })

        const jammerIds = Array.from(jammerCounts.keys())
        if (jammerIds.length === 0) {
          setJammerStats([])
          return
        }

        setTotalJams(jams?.length || 0)

        const { data: skaters, error: skatersError } = await supabase
          .from('skaters')
          .select('id, number, name')
          .in('id', jammerIds)

        if (skatersError) throw skatersError

        const stats: JammerStats[] = (skaters || []).map((skater) => {
          const jamCount = jammerCounts.get(skater.id) || 0
          const leadCount = jammerLeadCounts.get(skater.id) || 0
          const leadPercentage = jamCount > 0 ? (leadCount / jamCount) * 100 : 0
          const pointsFor = jammerPointsFor.get(skater.id) || 0
          const pointsAgainst = jammerPointsAgainst.get(skater.id) || 0

          return {
            skater_id: skater.id,
            skater_name: skater.name,
            skater_number: skater.number,
            jam_count: jamCount,
            lead_count: leadCount,
            lead_percentage: leadPercentage,
            points_for: pointsFor,
            points_against: pointsAgainst
          }
        })

        stats.sort((a, b) => a.skater_number.localeCompare(b.skater_number, undefined, { numeric: false }))
        setJammerStats(stats)
      } catch (error) {
        console.error('Error fetching jammer stats:', error)
      }
    }

    fetchJammerStats()
  }, [game, selectedTeam, selectedPeriod])

  useEffect(() => {
    async function fetchLineStats() {
      if (!game) return

      try {
        const lineField = selectedTeam === 'home' ? 'home_line_id' : 'visiting_line_id'
        const leadTeamValue = selectedTeam
        const pointsForField = selectedTeam === 'home' ? 'home_points' : 'visiting_points'
        const pointsAgainstField = selectedTeam === 'home' ? 'visiting_points' : 'home_points'

        let query = supabase
          .from('jams')
          .select(`
            ${lineField},
            lead_team,
            home_points,
            visiting_points
          `)
          .eq('game_id', game.id)
          .not(lineField, 'is', null)

        if (selectedPeriod !== 'all') {
          query = query.eq('period', selectedPeriod)
        }

        const { data: jams, error } = await query

        if (error) throw error

        const lineCounts = new Map<string, number>()
        const lineLeadCounts = new Map<string, number>()
        const linePointsFor = new Map<string, number>()
        const linePointsAgainst = new Map<string, number>()

        jams?.forEach((jam: Record<string, unknown>) => {
          const lineId = jam[lineField] as string
          if (lineId) {
            lineCounts.set(lineId, (lineCounts.get(lineId) || 0) + 1)
            if (jam.lead_team === leadTeamValue) {
              lineLeadCounts.set(lineId, (lineLeadCounts.get(lineId) || 0) + 1)
            }
            const pointsFor = (jam[pointsForField] as number) || 0
            const pointsAgainst = (jam[pointsAgainstField] as number) || 0
            linePointsFor.set(lineId, (linePointsFor.get(lineId) || 0) + pointsFor)
            linePointsAgainst.set(lineId, (linePointsAgainst.get(lineId) || 0) + pointsAgainst)
          }
        })

        const lineIds = Array.from(lineCounts.keys())
        if (lineIds.length === 0) {
          setLineStats([])
          return
        }

        const { data: lines, error: linesError } = await supabase
          .from('roster_lines')
          .select('id, name')
          .in('id', lineIds)

        if (linesError) throw linesError

        const stats: LineStats[] = (lines || []).map((line) => {
          const jamCount = lineCounts.get(line.id) || 0
          const leadCount = lineLeadCounts.get(line.id) || 0
          const leadPercentage = jamCount > 0 ? (leadCount / jamCount) * 100 : 0
          const pointsFor = linePointsFor.get(line.id) || 0
          const pointsAgainst = linePointsAgainst.get(line.id) || 0

          return {
            line_id: line.id,
            line_name: line.name,
            jam_count: jamCount,
            lead_count: leadCount,
            lead_percentage: leadPercentage,
            points_for: pointsFor,
            points_against: pointsAgainst
          }
        })

        stats.sort((a, b) => a.line_name.localeCompare(b.line_name))
        setLineStats(stats)
      } catch (error) {
        console.error('Error fetching line stats:', error)
      }
    }

    fetchLineStats()
  }, [game, selectedTeam, selectedPeriod])

  useEffect(() => {
    async function fetchScoreEvolution() {
      if (!game) return

      try {
        let query = supabase
          .from('jams')
          .select('period, jam_number, home_points, visiting_points')
          .eq('game_id', game.id)
          .order('period', { ascending: true })
          .order('jam_number', { ascending: true })

        if (selectedPeriod !== 'all') {
          query = query.eq('period', selectedPeriod)
        }

        const { data: jams, error } = await query

        if (error) throw error

        if (!jams || jams.length === 0) {
          setScoreEvolution({ labels: [], homeScores: [], visitingScores: [] })
          return
        }

        const labels: string[] = []
        const homeScores: number[] = []
        const visitingScores: number[] = []

        let homeCumulative = 0
        let visitingCumulative = 0

        jams.forEach((jam: Record<string, unknown>) => {
          homeCumulative += (jam.home_points as number) || 0
          visitingCumulative += (jam.visiting_points as number) || 0

          const label = selectedPeriod === 'all'
            ? `P${jam.period} J${jam.jam_number}`
            : `J${jam.jam_number}`

          labels.push(label)
          homeScores.push(homeCumulative)
          visitingScores.push(visitingCumulative)
        })

        setScoreEvolution({ labels, homeScores, visitingScores })
      } catch (error) {
        console.error('Error fetching score evolution:', error)
      }
    }

    fetchScoreEvolution()
  }, [game, selectedPeriod])

  const teamScoreEvolutionChartData = {
    labels: scoreEvolution.labels,
    datasets: [
      {
        label: game?.home_team?.name || 'Home Team',
        data: scoreEvolution.homeScores,
        borderColor: selectedTeam === 'home' ? colors.primary : colors.info,
        backgroundColor: selectedTeam === 'home' ? colors.primary : colors.info,
        tension: 0.1
      },
      {
        label: game?.visiting_team?.name || 'Visiting Team',
        data: scoreEvolution.visitingScores,
        borderColor: selectedTeam === 'visiting' ? colors.primary : colors.info,
        backgroundColor: selectedTeam === 'visiting' ? colors.primary : colors.info,
        tension: 0.1
      }
    ]
  }

  const teamScoreEvolutionChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const
      },
      title: {
        display: true,
        text: 'Score Evolution',
        font: {
          size: 18
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 5
        }
      }
    }
  }

  const jammerJamsChartData = {
    labels: jammerStats.map((j) => `#${j.skater_number} ${j.skater_name}`),
    datasets: [
      {
        label: 'Jams Played',
        data: jammerStats.map((j) => j.jam_count),
        backgroundColor: colors.primary,
        borderColor: colors.primary,
        borderWidth: 1
      }
    ]
  }

  const jammerJamsChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: 'Jams Played',
        font: {
          size: 18
        }
      },
      tooltip: {
        callbacks: {
          label: function(context: { parsed: { y: number | null }; dataIndex: number }) {
            const value = context.parsed.y || 0
            const percentage = totalJams > 0 ? ((value / totalJams) * 100).toFixed(0) : 0
            return `Jams played: ${value}/${totalJams} (${percentage}%)`
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      }
    }
  }

  const jammerLeadPercentageChartData = {
    labels: jammerStats.map((j) => `#${j.skater_number} ${j.skater_name}`),
    datasets: [
      {
        label: 'Lead Percentage',
        data: jammerStats.map((j) => j.lead_percentage),
        backgroundColor: colors.primary,
        borderColor: colors.primary,
        borderWidth: 1
      }
    ]
  }

  const jammerLeadPercentageChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: 'Lead Percentage',
        font: {
          size: 18
        }
      },
      tooltip: {
        callbacks: {
          label: function(context: { parsed: { y: number | null }; dataIndex: number }) {
            const dataIndex = context.dataIndex
            const jammer = jammerStats[dataIndex]
            const percentage = Math.round(jammer.lead_percentage)
            return `Lead Percentage: ${percentage}% (${jammer.lead_count}/${jammer.jam_count})`
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: function(value: string | number) {
            return value + '%'
          }
        }
      }
    }
  }

  const jammerPointsChartData = {
    labels: jammerStats.map((j) => `#${j.skater_number} ${j.skater_name}`),
    datasets: [
      {
        label: 'Points For',
        data: jammerStats.map((j) => j.points_for),
        backgroundColor: colors.primary,
        borderColor: colors.primary,
        borderWidth: 1
      },
      {
        label: 'Points Against',
        data: jammerStats.map((j) => j.points_against),
        backgroundColor: colors.info,
        borderColor: colors.info,
        borderWidth: 1
      },
      {
        label: 'Total Score',
        data: jammerStats.map((j) => j.points_for - j.points_against),
        backgroundColor: colors.warning,
        borderColor: colors.warning,
        borderWidth: 1
      },
    ]
  }

  const jammerPointsChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const
      },
      title: {
        display: true,
        text: 'Points For and Against',
        font: {
          size: 18
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: (context: { tick: { value: number } }) => {
            if (context.tick.value === 0) {
              return 'rgba(0, 0, 0, 0.3)'
            }
            return 'rgba(0, 0, 0, 0.1)'
          }
        }
      }
    }
  }

  const blockerJamsChartData = {
    labels: lineStats.map((l) => l.line_name),
    datasets: [
      {
        label: 'Jams Played',
        data: lineStats.map((l) => l.jam_count),
        backgroundColor: colors.primary,
        borderColor: colors.primary,
        borderWidth: 1
      }
    ]
  }

  const blockerJamsChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: 'Jams Played',
        font: {
          size: 18
        }
      },
      tooltip: {
        callbacks: {
          label: function(context: { parsed: { y: number | null }; dataIndex: number }) {
            const value = context.parsed.y || 0
            const percentage = totalJams > 0 ? ((value / totalJams) * 100).toFixed(0) : 0
            return `Jams played: ${value}/${totalJams} (${percentage}%)`
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1
        }
      }
    }
  }

  const blockerLeadPercentageChartData = {
    labels: lineStats.map((l) => l.line_name),
    datasets: [
      {
        label: 'Lead Percentage',
        data: lineStats.map((l) => l.lead_percentage),
        backgroundColor: colors.primary,
        borderColor: colors.primary,
        borderWidth: 1
      }
    ]
  }

  const blockerLeadPercentageChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: 'Lead Percentage',
        font: {
          size: 18
        }
      },
      tooltip: {
        callbacks: {
          label: function(context: { parsed: { y: number | null }; dataIndex: number }) {
            const dataIndex = context.dataIndex
            const line = lineStats[dataIndex]
            const percentage = Math.round(line.lead_percentage)
            return `Lead Percentage: ${percentage}% (${line.lead_count}/${line.jam_count})`
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        max: 100,
        ticks: {
          callback: function(value: string | number) {
            return value + '%'
          }
        }
      }
    }
  }

  const blockerPointsChartData = {
    labels: lineStats.map((l) => l.line_name),
    datasets: [
      {
        label: 'Points For',
        data: lineStats.map((l) => l.points_for),
        backgroundColor: colors.primary,
        borderColor: colors.primary,
        borderWidth: 1
      },
      {
        label: 'Points Against',
        data: lineStats.map((l) => l.points_against),
        backgroundColor: colors.info,
        borderColor: colors.info,
        borderWidth: 1
      },
      {
        label: 'Total Score',
        data: lineStats.map((l) => l.points_for - l.points_against),
        backgroundColor: colors.warning,
        borderColor: colors.warning,
        borderWidth: 1
      },
    ]
  }

  const blockerPointsChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const
      },
      title: {
        display: true,
        text: 'Points For and Against',
        font: {
          size: 18
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: (context: { tick: { value: number } }) => {
            if (context.tick.value === 0) {
              return 'rgba(0, 0, 0, 0.3)'
            }
            return 'rgba(0, 0, 0, 0.1)'
          }
        }
      }
    }
  }

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

  return (
    <div className="container mt-4">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="mb-0">Game Statistics</h1>
            <div className="d-flex align-items-center gap-2">
              <button className="btn btn-outline-info" onClick={() => navigate(`/games/${game.id}`)}>
                <i className="bi bi-arrow-left me-2"></i>
                Back to Game Details
              </button>
              <button
                className="btn btn-primary"
                onClick={() => navigate(`/games/${game.id}/enter-stats`)}
              >
                <i className="bi bi-pencil me-2"></i>
                Enter Stats
              </button>
            </div>
          </div>

          <div className="card mb-4">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div className="btn-group" role="group">
                  <button
                    type="button"
                    className={`btn ${selectedPeriod === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setSelectedPeriod('all')}
                  >
                    Full Game
                  </button>
                  <button
                    type="button"
                    className={`btn ${selectedPeriod === 1 ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setSelectedPeriod(1)}
                  >
                    Period 1
                  </button>
                  <button
                    type="button"
                    className={`btn ${selectedPeriod === 2 ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setSelectedPeriod(2)}
                  >
                    Period 2
                  </button>
                </div>
                <div className="btn-group" role="group">
                  <button
                    type="button"
                    className={`btn ${selectedTeam === 'home' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setSelectedTeam('home')}
                  >
                    {game.home_team?.name || 'Home Team'}
                  </button>
                  <button
                    type="button"
                    className={`btn ${selectedTeam === 'visiting' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setSelectedTeam('visiting')}
                  >
                    {game.visiting_team?.name || 'Visiting Team'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="card mb-4">
            <div className="card-body">
              <h5 className="card-title mb-3">Team Stats</h5>
              {scoreEvolution.labels.length > 0 ? (
                <div style={{ height: '400px' }}>
                  <Line data={teamScoreEvolutionChartData} options={teamScoreEvolutionChartOptions} />
                </div>
              ) : (
                <div className="alert alert-info">
                  No score data available for this period.
                </div>
              )}
            </div>
          </div>

          <div className="card mb-4">
            <div className="card-body">
              <h5 className="card-title mb-3">Jammer Stats</h5>
              {jammerStats.length > 0 ? (
                <>
                  <div style={{ height: '400px' }} className="mb-4">
                    <Bar data={jammerJamsChartData} options={jammerJamsChartOptions} />
                  </div>
                  <div style={{ height: '400px' }} className="mb-4">
                    <Bar data={jammerLeadPercentageChartData} options={jammerLeadPercentageChartOptions} />
                  </div>
                  <div style={{ height: '400px' }} className="mb-4">
                    <Bar data={jammerPointsChartData} options={jammerPointsChartOptions} />
                  </div>
                </>
              ) : (
                <div className="alert alert-info">
                  No jammer data available for this team.
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-body">
              <h5 className="card-title mb-3">Blocker Stats</h5>
              {lineStats.length > 0 ? (
                <>
                  <div style={{ height: '400px' }} className="mb-4">
                    <Bar data={blockerJamsChartData} options={blockerJamsChartOptions} />
                  </div>
                  <div style={{ height: '400px' }} className="mb-4">
                    <Bar data={blockerLeadPercentageChartData} options={blockerLeadPercentageChartOptions} />
                  </div>
                  <div style={{ height: '400px' }} className="mb-4">
                    <Bar data={blockerPointsChartData} options={blockerPointsChartOptions} />
                  </div>
                </>
              ) : (
                <div className="alert alert-info">
                  No blocker data available for this team.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default GameStats
