import type { PlayerColorId } from './gameTypes'

export type HairStyle = 'short' | 'ponytail' | 'curly' | 'bun' | 'spiky' | 'long'

export interface Appearance {
  label: string
  /** UI accent / identity colour. */
  accent: string
  skin: string
  hair: string
  hairStyle: HairStyle
  shirt: string
  pants: string
  shoes: string
}

/** Each colour choice is a distinct character, so the 3D figure always matches the player card. */
export const APPEARANCES: Record<PlayerColorId, Appearance> = {
  crimson: { label: 'Crimson', accent: '#e63946', skin: '#f1c7a6', hair: '#4a2c1d', hairStyle: 'short', shirt: '#d62839', pants: '#2b3a55', shoes: '#f4f1ea' },
  azure: { label: 'Azure', accent: '#3a86ff', skin: '#f6d3b8', hair: '#e8c26a', hairStyle: 'ponytail', shirt: '#3a86ff', pants: '#f2efe6', shoes: '#26324a' },
  emerald: { label: 'Emerald', accent: '#2a9d5f', skin: '#8d5a3b', hair: '#1b1410', hairStyle: 'curly', shirt: '#2a9d5f', pants: '#3b2f2a', shoes: '#e9c46a' },
  amber: { label: 'Amber', accent: '#f4a024', skin: '#e9b98f', hair: '#b5452a', hairStyle: 'bun', shirt: '#f4a024', pants: '#40506b', shoes: '#7a3e2b' },
  violet: { label: 'Violet', accent: '#8e5cf7', skin: '#c48a64', hair: '#22182e', hairStyle: 'spiky', shirt: '#8e5cf7', pants: '#1f2433', shoes: '#ffffff' },
  teal: { label: 'Teal', accent: '#14a3a3', skin: '#a8714f', hair: '#0f0f14', hairStyle: 'long', shirt: '#14a3a3', pants: '#efe6d2', shoes: '#b23a48' },
}
