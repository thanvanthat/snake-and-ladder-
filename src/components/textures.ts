import { CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'
import { GRID, squareToGrid } from '../game/boardCoordinates'
import type { BoardConfig } from '../game/gameTypes'
import { FINAL_SQUARE } from '../game/gameTypes'

/** All textures are drawn procedurally at runtime: no image files can go missing. */

const CREAM = '#f5ecd7'
const ROW_COLORS = ['#e07a5f', '#e9b949', '#8ab17d', '#3d9a8b', '#5b8fc7']

export function cellColor(square: number): string {
  const { row, col } = squareToGrid(square)
  return (row + col) % 2 === 0 ? ROW_COLORS[row % ROW_COLORS.length] : CREAM
}

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  if (!ctx) throw new Error('2D canvas unavailable')
  return [c, ctx]
}

function finish(c: HTMLCanvasElement, repeat = false): CanvasTexture {
  const tex = new CanvasTexture(c)
  tex.colorSpace = SRGBColorSpace
  tex.anisotropy = 8
  if (repeat) tex.wrapS = tex.wrapT = RepeatWrapping
  return tex
}

const cache = new Map<string, CanvasTexture>()
function memo(key: string, make: () => CanvasTexture): CanvasTexture {
  let tex = cache.get(key)
  if (!tex) {
    tex = make()
    cache.set(key, tex)
  }
  return tex
}

export function woodTexture(base: string, grain: string): CanvasTexture {
  return memo(`wood:${base}:${grain}`, () => {
    const [c, ctx] = canvas(512, 512)
    ctx.fillStyle = base
    ctx.fillRect(0, 0, 512, 512)
    let seed = 7
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    for (let i = 0; i < 70; i++) {
      const y0 = rand() * 512
      ctx.strokeStyle = grain
      ctx.globalAlpha = 0.08 + rand() * 0.22
      ctx.lineWidth = 0.6 + rand() * 2.4
      ctx.beginPath()
      for (let x = 0; x <= 512; x += 16) {
        const y = y0 + Math.sin(x / (40 + rand() * 6) + i) * 5 + Math.sin(x / 130 + i * 0.7) * 9
        if (x === 0) ctx.moveTo(x, y)
        else ctx.lineTo(x, y)
      }
      ctx.stroke()
    }
    ctx.globalAlpha = 1
    return finish(c, true)
  })
}

export interface SnakeScheme {
  base: string
  pattern: string
  accent: string
  style: 'bands' | 'diamonds' | 'spots'
}

export const SNAKE_SCHEMES: SnakeScheme[] = [
  { base: '#3f9d4a', pattern: '#1f5e2a', accent: '#d9e86a', style: 'diamonds' },
  { base: '#d9822b', pattern: '#7a3410', accent: '#ffd28a', style: 'bands' },
  { base: '#7b4bb7', pattern: '#3d2366', accent: '#e2c8ff', style: 'spots' },
  { base: '#c8352e', pattern: '#2a1414', accent: '#f4d35e', style: 'bands' },
  { base: '#2f7fa8', pattern: '#123a52', accent: '#a8e0ff', style: 'diamonds' },
  { base: '#b5a33a', pattern: '#4f4512', accent: '#f6efb0', style: 'spots' },
  { base: '#2a8f7e', pattern: '#0e4038', accent: '#ffcf70', style: 'bands' },
  { base: '#9c3c62', pattern: '#3f1124', accent: '#ffc2d8', style: 'diamonds' },
]

export function snakeSkinTexture(scheme: SnakeScheme): CanvasTexture {
  return memo(`snake:${scheme.base}:${scheme.style}`, () => {
    const W = 256
    const H = 128
    const [c, ctx] = canvas(W, H)
    ctx.fillStyle = scheme.base
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = scheme.pattern
    if (scheme.style === 'bands') {
      for (let x = 0; x < W; x += 64) {
        ctx.fillRect(x, 0, 22, H)
        ctx.fillStyle = scheme.accent
        ctx.fillRect(x + 22, 0, 6, H)
        ctx.fillStyle = scheme.pattern
      }
    } else if (scheme.style === 'diamonds') {
      for (let x = 0; x < W; x += 64) {
        for (const yc of [H / 2, 0, H]) {
          ctx.beginPath()
          ctx.moveTo(x + 32, yc - 30)
          ctx.lineTo(x + 60, yc)
          ctx.lineTo(x + 32, yc + 30)
          ctx.lineTo(x + 4, yc)
          ctx.closePath()
          ctx.fill()
        }
        ctx.fillStyle = scheme.accent
        ctx.fillRect(x + 28, H / 2 - 4, 8, 8)
        ctx.fillStyle = scheme.pattern
      }
    } else {
      for (let i = 0; i < 26; i++) {
        const x = (i * 53) % W
        const y = (i * 37) % H
        ctx.beginPath()
        ctx.ellipse(x, y, 14, 9, 0, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    // Scale texture: tiny offset arcs.
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'
    ctx.lineWidth = 1
    for (let y = 0; y < H; y += 8) {
      for (let x = (y / 8) % 2 ? 4 : 0; x < W; x += 8) {
        ctx.beginPath()
        ctx.arc(x, y, 4, 0, Math.PI)
        ctx.stroke()
      }
    }
    return finish(c, true)
  })
}

/** Transparent overlay with every square number, drawn once for the whole board. */
export function boardLabelTexture(board: BoardConfig): CanvasTexture {
  return memo('labels', () => {
    const S = 2048
    const cell = S / GRID
    const [c, ctx] = canvas(S, S)
    const heads = new Set(board.snakes.map((s) => s.head))
    const feet = new Set(board.ladders.map((l) => l.bottom))
    for (let square = 1; square <= FINAL_SQUARE; square++) {
      const { row, col } = squareToGrid(square)
      const x = col * cell
      const y = (GRID - 1 - row) * cell
      const onCream = cellColor(square) === CREAM

      // Subtle inner border
      ctx.strokeStyle = onCream ? 'rgba(80,60,40,0.16)' : 'rgba(255,255,255,0.28)'
      ctx.lineWidth = 4
      ctx.strokeRect(x + 12, y + 12, cell - 24, cell - 24)

      ctx.font = `800 ${square === FINAL_SQUARE ? 60 : 58}px "Trebuchet MS", "Segoe UI", system-ui, sans-serif`
      ctx.textAlign = 'left'
      ctx.textBaseline = 'top'
      ctx.lineWidth = 8
      ctx.strokeStyle = onCream ? 'rgba(255,255,255,0.85)' : 'rgba(30,20,10,0.45)'
      ctx.fillStyle = onCream ? '#3b2a1e' : '#fffaf0'
      ctx.strokeText(String(square), x + 22, y + 20)
      ctx.fillText(String(square), x + 22, y + 20)

      // Small corner markers so entries are readable even when a figure stands on them.
      if (heads.has(square) || feet.has(square)) {
        ctx.fillStyle = heads.has(square) ? '#c0392b' : '#1e8449'
        ctx.beginPath()
        ctx.arc(x + cell - 34, y + 38, 13, 0, Math.PI * 2)
        ctx.fill()
      }
      if (square === 1 || square === FINAL_SQUARE) {
        ctx.font = '800 34px "Trebuchet MS", system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'
        ctx.fillStyle = onCream ? '#7a4b1e' : '#fffaf0'
        ctx.fillText(square === 1 ? 'START' : 'FINISH', x + cell / 2, y + cell - 20)
      }
    }
    return finish(c)
  })
}
