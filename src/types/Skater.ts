export interface Team {
  id: string
  name: string
  city: string
  country: string
  light_color?: string
  dark_color?: string
}

export interface Skater {
  id: string
  number: string
  name: string
  teams?: Team[]
}
