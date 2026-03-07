import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Game } from '../types/Skater'
import {
  Chart as ChartJS,
  BubbleController,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  SubTitle,
  Tooltip,
  Legend
} from 'chart.js'
import { Bar, Bubble, Line } from 'react-chartjs-2'
import colors from '../assets/scss/colors.module.scss'

ChartJS.register(
  BubbleController,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  SubTitle,
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

interface MatchupCell {
  jamCount: number
  totalScoreDiff: number
}

interface MatchupData {
  homeJammers: { id: string; label: string }[]
  visitingJammers: { id: string; label: string }[]
  homeLines: { id: string; label: string }[]
  visitingLines: { id: string; label: string }[]
  homeJammerVsHomeLine: Map<string, MatchupCell>
  homeJammerVsVisitingJammer: Map<string, MatchupCell>
  homeJammerVsVisitingLine: Map<string, MatchupCell>
  visitingJammerVsHomeLine: Map<string, MatchupCell>
  visitingLineVsHomeLine: Map<string, MatchupCell>
}

// #60a7a9 (prd-green/success)
const GREEN_RGB = '96, 167, 169'
// #d55c41 (prd-red/danger)
const RED_RGB = '213, 92, 65'

function scoreDiffToColor(avgDiff: number): string {
  const maxDiff = 5
  const normalized = Math.min(Math.abs(avgDiff), maxDiff) / maxDiff
  const alpha = 0.2 + normalized * 0.7
  if (avgDiff >= 0) {
    return `rgba(${GREEN_RGB}, ${alpha})`
  } else {
    return `rgba(${RED_RGB}, ${alpha})`
  }
}

function scaleBubbleRadius(jamCount: number, maxJamCount: number): number {
  const minR = 6
  const maxR = 25
  if (maxJamCount <= 0) return minR
  return minR + (jamCount / maxJamCount) * (maxR - minR)
}

function buildBubbleChart(
  title: string,
  subtitle: string,
  yEntities: { id: string; label: string }[],
  xEntities: { id: string; label: string }[],
  matrix: Map<string, MatchupCell>,
  useWith: boolean = false
) {
  let maxJamCount = 0
  matrix.forEach(cell => { if (cell.jamCount > maxJamCount) maxJamCount = cell.jamCount })

  const dataPoints: { x: number; y: number; r: number }[] = []
  const backgroundColors: string[] = []
  const borderColors: string[] = []
  const tooltipData: { yLabel: string; xLabel: string; avgDiff: number; jamCount: number }[] = []

  for (let yIdx = 0; yIdx < yEntities.length; yIdx++) {
    for (let xIdx = 0; xIdx < xEntities.length; xIdx++) {
      const key = `${yIdx}-${xIdx}`
      const cell = matrix.get(key)
      if (!cell || cell.jamCount === 0) continue

      const avgDiff = cell.totalScoreDiff / cell.jamCount

      dataPoints.push({ x: xIdx, y: yIdx, r: scaleBubbleRadius(cell.jamCount, maxJamCount) })
      backgroundColors.push(scoreDiffToColor(avgDiff))
      borderColors.push(avgDiff >= 0 ? `rgba(${GREEN_RGB}, 1)` : `rgba(${RED_RGB}, 1)`)
      tooltipData.push({
        yLabel: yEntities[yIdx].label,
        xLabel: xEntities[xIdx].label,
        avgDiff: +avgDiff.toFixed(2),
        jamCount: cell.jamCount
      })
    }
  }

  const data = {
    datasets: [{
      label: title,
      data: dataPoints,
      backgroundColor: backgroundColors,
      borderColor: borderColors,
      borderWidth: 1
    }]
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      title: { display: true, text: title, font: { size: 18 } },
      subtitle: { display: true, text: subtitle, font: { size: 13 }, padding: { bottom: 16 } },
      tooltip: {
        callbacks: {
          label: (context: { dataIndex: number }) => {
            const td = tooltipData[context.dataIndex]
            return [
              `${td.yLabel} ${useWith ? 'with' : 'vs'} ${td.xLabel}`,
              `Avg score diff: ${td.avgDiff > 0 ? '+' : ''}${td.avgDiff} (${td.jamCount} jams)`
            ]
          }
        }
      }
    },
    scales: {
      x: {
        type: 'linear' as const,
        min: -0.5,
        max: xEntities.length - 0.5,
        afterBuildTicks: (axis: { ticks: { value: number }[] }) => {
          axis.ticks = xEntities.map((_, i) => ({ value: i }))
        },
        ticks: {
          callback: (value: number | string) => xEntities[value as number]?.label || ''
        },
        grid: { color: 'rgba(0, 0, 0, 0.1)' }
      },
      y: {
        type: 'linear' as const,
        min: -0.5,
        max: yEntities.length - 0.5,
        afterBuildTicks: (axis: { ticks: { value: number }[] }) => {
          axis.ticks = yEntities.map((_, i) => ({ value: i }))
        },
        ticks: {
          callback: (value: number | string) => yEntities[value as number]?.label || ''
        },
        grid: { color: 'rgba(0, 0, 0, 0.1)' }
      }
    }
  }

  return { title, subtitle, data, options, empty: yEntities.length === 0 || xEntities.length === 0 }
}

function GameStats() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [game, setGame] = useState<Game | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedView, setSelectedView] = useState<'home' | 'visiting' | 'matchups'>('home')
  const [matchupData, setMatchupData] = useState<MatchupData | null>(null)
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
      if (!game || selectedView === 'matchups') return

      try {
        const jammerField = selectedView === 'home' ? 'home_jammer_id' : 'visiting_jammer_id'
        const leadTeamValue = selectedView
        const pointsForField = selectedView === 'home' ? 'home_points' : 'visiting_points'
        const pointsAgainstField = selectedView === 'home' ? 'visiting_points' : 'home_points'

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
  }, [game, selectedView, selectedPeriod])

  useEffect(() => {
    async function fetchLineStats() {
      if (!game || selectedView === 'matchups') return

      try {
        const lineField = selectedView === 'home' ? 'home_line_id' : 'visiting_line_id'
        const leadTeamValue = selectedView
        const pointsForField = selectedView === 'home' ? 'home_points' : 'visiting_points'
        const pointsAgainstField = selectedView === 'home' ? 'visiting_points' : 'home_points'

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
  }, [game, selectedView, selectedPeriod])

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

  useEffect(() => {
    async function fetchMatchupData() {
      if (!game || selectedView !== 'matchups') return

      try {
        let query = supabase
          .from('jams')
          .select('home_jammer_id, home_line_id, home_points, visiting_jammer_id, visiting_line_id, visiting_points')
          .eq('game_id', game.id)

        if (selectedPeriod !== 'all') {
          query = query.eq('period', selectedPeriod)
        }

        const { data: jams, error } = await query
        if (error) throw error
        if (!jams || jams.length === 0) {
          setMatchupData(null)
          return
        }

        const homeJammerIds = new Set<string>()
        const visitingJammerIds = new Set<string>()
        const homeLineIds = new Set<string>()
        const visitingLineIds = new Set<string>()

        jams.forEach((jam) => {
          if (jam.home_jammer_id) homeJammerIds.add(jam.home_jammer_id)
          if (jam.visiting_jammer_id) visitingJammerIds.add(jam.visiting_jammer_id)
          if (jam.home_line_id) homeLineIds.add(jam.home_line_id)
          if (jam.visiting_line_id) visitingLineIds.add(jam.visiting_line_id)
        })

        const [homeJammersRes, visitingJammersRes, homeLinesRes, visitingLinesRes] = await Promise.all([
          homeJammerIds.size > 0
            ? supabase.from('skaters').select('id, number, name').in('id', [...homeJammerIds])
            : { data: [], error: null },
          visitingJammerIds.size > 0
            ? supabase.from('skaters').select('id, number, name').in('id', [...visitingJammerIds])
            : { data: [], error: null },
          homeLineIds.size > 0
            ? supabase.from('roster_lines').select('id, name').in('id', [...homeLineIds])
            : { data: [], error: null },
          visitingLineIds.size > 0
            ? supabase.from('roster_lines').select('id, name').in('id', [...visitingLineIds])
            : { data: [], error: null },
        ])

        const homeJammers = (homeJammersRes.data || [])
          .map((s) => ({ id: s.id, label: `#${s.number} ${s.name}` }))
          .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }))
        const visitingJammers = (visitingJammersRes.data || [])
          .map((s) => ({ id: s.id, label: `#${s.number} ${s.name}` }))
          .sort((a, b) => a.label.localeCompare(b.label, undefined, { numeric: true }))
        const homeLines = (homeLinesRes.data || [])
          .map((l) => ({ id: l.id, label: l.name }))
          .sort((a, b) => a.label.localeCompare(b.label))
        const visitingLines = (visitingLinesRes.data || [])
          .map((l) => ({ id: l.id, label: l.name }))
          .sort((a, b) => a.label.localeCompare(b.label))

        const homeJammerIdx = new Map(homeJammers.map((e, i) => [e.id, i]))
        const visitingJammerIdx = new Map(visitingJammers.map((e, i) => [e.id, i]))
        const homeLineIdx = new Map(homeLines.map((e, i) => [e.id, i]))
        const visitingLineIdx = new Map(visitingLines.map((e, i) => [e.id, i]))

        const homeJammerVsHomeLine = new Map<string, MatchupCell>()
        const homeJammerVsVisitingJammer = new Map<string, MatchupCell>()
        const homeJammerVsVisitingLine = new Map<string, MatchupCell>()
        const visitingJammerVsHomeLine = new Map<string, MatchupCell>()
        const visitingLineVsHomeLine = new Map<string, MatchupCell>()

        const addToMatrix = (matrix: Map<string, MatchupCell>, yIdx: number | undefined, xIdx: number | undefined, scoreDiff: number) => {
          if (yIdx === undefined || xIdx === undefined) return
          const key = `${yIdx}-${xIdx}`
          const cell = matrix.get(key) || { jamCount: 0, totalScoreDiff: 0 }
          cell.jamCount++
          cell.totalScoreDiff += scoreDiff
          matrix.set(key, cell)
        }

        jams.forEach((jam) => {
          const scoreDiff = (jam.home_points || 0) - (jam.visiting_points || 0)
          const hjIdx = jam.home_jammer_id ? homeJammerIdx.get(jam.home_jammer_id) : undefined
          const vjIdx = jam.visiting_jammer_id ? visitingJammerIdx.get(jam.visiting_jammer_id) : undefined
          const hlIdx = jam.home_line_id ? homeLineIdx.get(jam.home_line_id) : undefined
          const vlIdx = jam.visiting_line_id ? visitingLineIdx.get(jam.visiting_line_id) : undefined

          addToMatrix(homeJammerVsHomeLine, hjIdx, hlIdx, scoreDiff)
          addToMatrix(homeJammerVsVisitingJammer, hjIdx, vjIdx, scoreDiff)
          addToMatrix(homeJammerVsVisitingLine, hjIdx, vlIdx, scoreDiff)
          addToMatrix(visitingJammerVsHomeLine, hlIdx, vjIdx, scoreDiff)
          addToMatrix(visitingLineVsHomeLine, hlIdx, vlIdx, scoreDiff)
        })

        setMatchupData({
          homeJammers, visitingJammers, homeLines, visitingLines,
          homeJammerVsHomeLine, homeJammerVsVisitingJammer, homeJammerVsVisitingLine,
          visitingJammerVsHomeLine, visitingLineVsHomeLine
        })
      } catch (error) {
        console.error('Error fetching matchup data:', error)
      }
    }

    fetchMatchupData()
  }, [game, selectedPeriod, selectedView])

  const homeName = game?.home_team?.name || 'Home'
  const visitingName = game?.visiting_team?.name || 'Visiting'

  const matchupCharts = matchupData ? [
    buildBubbleChart(
      `${homeName} Jammers with ${homeName} Lines`,
      `Average score diff per jam for ${homeName} jammers with ${homeName} lines.`,
      matchupData.homeJammers, matchupData.homeLines, matchupData.homeJammerVsHomeLine, true
    ),
    buildBubbleChart(
      `${homeName} Jammers vs ${visitingName} Jammers`,
      `Average score diff per jam for ${homeName} jammers against ${visitingName} jammers.`,
      matchupData.homeJammers, matchupData.visitingJammers, matchupData.homeJammerVsVisitingJammer
    ),
    buildBubbleChart(
      `${homeName} Jammers vs ${visitingName} Lines`,
      `Average score diff per jam for ${homeName} jammers against ${visitingName} lines.`,
      matchupData.homeJammers, matchupData.visitingLines, matchupData.homeJammerVsVisitingLine
    ),
    buildBubbleChart(
      `${homeName} Lines vs ${visitingName} Jammers`,
      `Average score diff per jam for ${homeName} lines against ${visitingName} jammers.`,
      matchupData.homeLines, matchupData.visitingJammers, matchupData.visitingJammerVsHomeLine
    ),
    buildBubbleChart(
      `${homeName} Lines vs ${visitingName} Lines`,
      `Average score diff per jam for ${homeName} lines against ${visitingName} lines.`,
      matchupData.homeLines, matchupData.visitingLines, matchupData.visitingLineVsHomeLine
    ),
  ] : []

  const teamScoreEvolutionChartData = {
    labels: scoreEvolution.labels,
    datasets: [
      {
        label: game?.home_team?.name || 'Our Team',
        data: scoreEvolution.homeScores,
        borderColor: selectedView === 'home' ? colors.primary : colors.info,
        backgroundColor: selectedView === 'home' ? colors.primary : colors.info,
        tension: 0.1
      },
      {
        label: game?.visiting_team?.name || 'Opposing Team',
        data: scoreEvolution.visitingScores,
        borderColor: selectedView === 'visiting' ? colors.primary : colors.info,
        backgroundColor: selectedView === 'visiting' ? colors.primary : colors.info,
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
        label: 'Score Diff',
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
      },
      tooltip: {
        callbacks: {
          label: (context: { dataset: { label?: string }; raw: unknown; dataIndex: number }) => {
            const jamCount = jammerStats[context.dataIndex]?.jam_count ?? 0
            return `${context.dataset.label}: ${context.raw} (${jamCount} jams played)`
          }
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

  const jammerAvgPointsChartData = {
    labels: jammerStats.map((j) => `#${j.skater_number} ${j.skater_name}`),
    datasets: [
      {
        label: 'Avg Points For',
        data: jammerStats.map((j) => j.jam_count > 0 ? +(j.points_for / j.jam_count).toFixed(2) : 0),
        backgroundColor: colors.primary,
        borderColor: colors.primary,
        borderWidth: 1
      },
      {
        label: 'Avg Points Against',
        data: jammerStats.map((j) => j.jam_count > 0 ? +(j.points_against / j.jam_count).toFixed(2) : 0),
        backgroundColor: colors.info,
        borderColor: colors.info,
        borderWidth: 1
      },
      {
        label: 'Avg Score Diff',
        data: jammerStats.map((j) => j.jam_count > 0 ? +((j.points_for - j.points_against) / j.jam_count).toFixed(2) : 0),
        backgroundColor: colors.warning,
        borderColor: colors.warning,
        borderWidth: 1
      },
    ]
  }

  const jammerAvgPointsChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const
      },
      title: {
        display: true,
        text: 'Average Points Per Jam',
        font: {
          size: 18
        }
      },
      tooltip: {
        callbacks: {
          label: (context: { dataset: { label?: string }; raw: unknown; dataIndex: number }) => {
            const jamCount = jammerStats[context.dataIndex]?.jam_count ?? 0
            return `${context.dataset.label}: ${context.raw} (${jamCount} jams played)`
          }
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
        label: 'Score Diff',
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
      },
      tooltip: {
        callbacks: {
          label: (context: { dataset: { label?: string }; raw: unknown; dataIndex: number }) => {
            const jamCount = lineStats[context.dataIndex]?.jam_count ?? 0
            return `${context.dataset.label}: ${context.raw} (${jamCount} jams played)`
          }
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

  const blockerAvgPointsChartData = {
    labels: lineStats.map((l) => l.line_name),
    datasets: [
      {
        label: 'Avg Points For',
        data: lineStats.map((l) => l.jam_count > 0 ? +(l.points_for / l.jam_count).toFixed(2) : 0),
        backgroundColor: colors.primary,
        borderColor: colors.primary,
        borderWidth: 1
      },
      {
        label: 'Avg Points Against',
        data: lineStats.map((l) => l.jam_count > 0 ? +(l.points_against / l.jam_count).toFixed(2) : 0),
        backgroundColor: colors.info,
        borderColor: colors.info,
        borderWidth: 1
      },
      {
        label: 'Avg Score Diff',
        data: lineStats.map((l) => l.jam_count > 0 ? +((l.points_for - l.points_against) / l.jam_count).toFixed(2) : 0),
        backgroundColor: colors.warning,
        borderColor: colors.warning,
        borderWidth: 1
      },
    ]
  }

  const blockerAvgPointsChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top' as const
      },
      title: {
        display: true,
        text: 'Average Points Per Jam',
        font: {
          size: 18
        }
      },
      tooltip: {
        callbacks: {
          label: (context: { dataset: { label?: string }; raw: unknown; dataIndex: number }) => {
            const jamCount = lineStats[context.dataIndex]?.jam_count ?? 0
            return `${context.dataset.label}: ${context.raw} (${jamCount} jams played)`
          }
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
                    className={`btn ${selectedView === 'home' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setSelectedView('home')}
                  >
                    {game.home_team?.name || 'Our Team'}
                  </button>
                  <button
                    type="button"
                    className={`btn ${selectedView === 'visiting' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setSelectedView('visiting')}
                  >
                    {game.visiting_team?.name || 'Opposing Team'}
                  </button>
                  <button
                    type="button"
                    className={`btn ${selectedView === 'matchups' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setSelectedView('matchups')}
                  >
                    Matchups
                  </button>
                </div>
              </div>
            </div>
          </div>

          {selectedView !== 'matchups' && (
          <>
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
                <div className="row">
                  <div className="col-12 col-lg-6 mb-4">
                    <div style={{ height: '400px' }}>
                      <Bar data={jammerJamsChartData} options={jammerJamsChartOptions} />
                    </div>
                  </div>
                  <div className="col-12 col-lg-6 mb-4">
                    <div style={{ height: '400px' }}>
                      <Bar data={jammerLeadPercentageChartData} options={jammerLeadPercentageChartOptions} />
                    </div>
                  </div>
                  <div className="col-12 col-lg-6 mb-4">
                    <div style={{ height: '400px' }}>
                      <Bar data={jammerPointsChartData} options={jammerPointsChartOptions} />
                    </div>
                  </div>
                  <div className="col-12 col-lg-6 mb-4">
                    <div style={{ height: '400px' }}>
                      <Bar data={jammerAvgPointsChartData} options={jammerAvgPointsChartOptions} />
                    </div>
                  </div>
                </div>
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
                <div className="row">
                  <div className="col-12 col-lg-6 mb-4">
                    <div style={{ height: '400px' }}>
                      <Bar data={blockerJamsChartData} options={blockerJamsChartOptions} />
                    </div>
                  </div>
                  <div className="col-12 col-lg-6 mb-4">
                    <div style={{ height: '400px' }}>
                      <Bar data={blockerLeadPercentageChartData} options={blockerLeadPercentageChartOptions} />
                    </div>
                  </div>
                  <div className="col-12 col-lg-6 mb-4">
                    <div style={{ height: '400px' }}>
                      <Bar data={blockerPointsChartData} options={blockerPointsChartOptions} />
                    </div>
                  </div>
                  <div className="col-12 col-lg-6 mb-4">
                    <div style={{ height: '400px' }}>
                      <Bar data={blockerAvgPointsChartData} options={blockerAvgPointsChartOptions} />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="alert alert-info">
                  No blocker data available for this team.
                </div>
              )}
            </div>
          </div>
          </>
          )}

          {selectedView === 'matchups' && (
            <div className="card mb-4">
              <div className="card-body">
                <h5 className="card-title mb-1">Matchups</h5>
                <p className="text-muted small mb-4">
                  The bubble size reflects the number of jams played with this combination. The bubble color reflects the score differential.
                </p>
                {matchupCharts.length > 0 ? (
                  matchupCharts.map((chart, idx) =>
                    chart.empty ? (
                      <div key={idx} className="mb-4">
                        <h6>{chart.title}</h6>
                        <div className="alert alert-info">
                          No data available — no jammers or lines recorded for this matchup.
                        </div>
                      </div>
                    ) : (
                      <div key={idx} style={{ height: '400px' }} className="mb-4">
                        <Bubble data={chart.data} options={chart.options} />
                      </div>
                    )
                  )
                ) : (
                  <div className="alert alert-info">
                    No matchup data available for this period.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default GameStats
