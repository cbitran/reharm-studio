export interface SuggestedProgression {
  id: string
  name: string
  mood: string
  chords: string[]
}

export interface TabState {
  id: string
  label: string
  chords: string[]
  progressionName: string
}
