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
