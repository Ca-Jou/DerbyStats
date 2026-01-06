export interface Team {
  id: string
  name: string
  city: string
  country: string
  light_color?: string
  dark_color?: string
  skaters?: Skater[]
}

export interface Skater {
  id: string
  number: string
  name: string
  teams?: Team[]
}

export interface Game {
  id: string
  home_team_id: string
  home_team_color: string | null
  visiting_team_id: string
  visiting_team_color: string | null
  start_date: string | null
  location: string | null
  home_team?: Team
  visiting_team?: Team
}

export interface RosterJammer {
  id: string
  game_roster_id: string
  skater_id: string
  skater?: Skater
}

export interface RosterLine {
  id: string
  game_roster_id: string
  name: string
}

export interface GameRoster {
  id: string
  game_id: string
  team_id: string
  roster_jammers?: RosterJammer[]
  roster_lines?: RosterLine[]
}

export interface Jam {
  id: string
  game_id: string
  period: number
  jam_number: number
  home_jammer_id: string | null
  home_line_id: string | null
  home_points: number
  visiting_jammer_id: string | null
  visiting_line_id: string | null
  visiting_points: number
  lead_team: 'home' | 'visiting' | null
  home_jammer?: Skater
  home_line?: RosterLine
  visiting_jammer?: Skater
  visiting_line?: RosterLine
}
