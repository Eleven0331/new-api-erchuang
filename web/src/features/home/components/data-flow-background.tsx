/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { useEffect, useRef } from 'react'

import { useTheme } from '@/context/theme-provider'

interface FlowLane {
  accent: 0 | 1 | 2
  controlA: Point
  controlB: Point
  end: Point
  start: Point
  speed: number
}

interface FlowPalette {
  accents: [string, string, string]
  line: string
  node: string
}

interface Point {
  x: number
  y: number
}

const FLOW_LANES: FlowLane[] = [
  {
    accent: 0,
    start: { x: -0.08, y: 0.2 },
    controlA: { x: 0.23, y: 0.04 },
    controlB: { x: 0.47, y: 0.75 },
    end: { x: 0.98, y: 0.48 },
    speed: 0.034,
  },
  {
    accent: 1,
    start: { x: 0.12, y: -0.08 },
    controlA: { x: 0.36, y: 0.32 },
    controlB: { x: 0.58, y: 0.1 },
    end: { x: 1.08, y: 0.28 },
    speed: 0.026,
  },
  {
    accent: 2,
    start: { x: -0.05, y: 0.72 },
    controlA: { x: 0.29, y: 0.42 },
    controlB: { x: 0.58, y: 1.04 },
    end: { x: 1.06, y: 0.8 },
    speed: 0.03,
  },
  {
    accent: 1,
    start: { x: 0.32, y: 1.08 },
    controlA: { x: 0.38, y: 0.64 },
    controlB: { x: 0.84, y: 0.92 },
    end: { x: 0.83, y: -0.08 },
    speed: 0.022,
  },
  {
    accent: 0,
    start: { x: 0.62, y: 1.05 },
    controlA: { x: 0.52, y: 0.58 },
    controlB: { x: 0.2, y: 0.54 },
    end: { x: 0.18, y: -0.05 },
    speed: 0.024,
  },
  {
    accent: 2,
    start: { x: 1.08, y: 0.14 },
    controlA: { x: 0.66, y: 0.24 },
    controlB: { x: 0.72, y: 0.72 },
    end: { x: -0.08, y: 0.47 },
    speed: 0.028,
  },
]

const PARTICLE_OFFSETS = [0.04, 0.2, 0.37, 0.55, 0.72, 0.88]

const LIGHT_PALETTE: FlowPalette = {
  accents: ['39, 105, 235', '12, 156, 188', '123, 77, 221'],
  line: '76, 118, 174',
  node: '34, 105, 212',
}

const DARK_PALETTE: FlowPalette = {
  accents: ['96, 165, 250', '45, 212, 191', '192, 132, 252'],
  line: '103, 156, 210',
  node: '125, 211, 252',
}

export function DataFlowBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const { resolvedTheme } = useTheme()
  const themeRef = useRef(resolvedTheme)

  themeRef.current = resolvedTheme

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context) return

    let animationFrame = 0
    let width = 0
    let height = 0
    let devicePixelRatio = 1
    let reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
      .matches

    const pointer = {
      x: -1000,
      y: -1000,
      targetX: -1000,
      targetY: -1000,
    }

    const resize = () => {
      const bounds = canvas.getBoundingClientRect()
      width = Math.max(bounds.width, 1)
      height = Math.max(bounds.height, 1)
      devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(width * devicePixelRatio)
      canvas.height = Math.round(height * devicePixelRatio)
      context.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0)
    }

    const updatePointer = (event: PointerEvent) => {
      const bounds = canvas.getBoundingClientRect()
      pointer.targetX = event.clientX - bounds.left
      pointer.targetY = event.clientY - bounds.top
    }

    const resetPointer = () => {
      pointer.targetX = -1000
      pointer.targetY = -1000
    }

    const motionChange = (event: MediaQueryListEvent) => {
      reduceMotion = event.matches
      if (reduceMotion) {
        render(0)
      }
    }

    const render = (timestamp: number) => {
      pointer.x += (pointer.targetX - pointer.x) * 0.075
      pointer.y += (pointer.targetY - pointer.y) * 0.075

      context.clearRect(0, 0, width, height)
      const palette = themeRef.current === 'dark' ? DARK_PALETTE : LIGHT_PALETTE
      const time = reduceMotion ? 0 : timestamp / 1000

      drawAmbientField(context, width, height, pointer, time, palette)
      drawFlowLanes(context, width, height, pointer, time, palette)
      drawPointerHub(context, width, height, pointer, time, palette)

      if (!reduceMotion) {
        animationFrame = window.requestAnimationFrame(render)
      }
    }

    const observer = new ResizeObserver(resize)
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')

    resize()
    observer.observe(canvas)
    window.addEventListener('pointermove', updatePointer, { passive: true })
    window.addEventListener('pointerleave', resetPointer)
    motionQuery.addEventListener('change', motionChange)
    animationFrame = window.requestAnimationFrame(render)

    return () => {
      window.cancelAnimationFrame(animationFrame)
      observer.disconnect()
      window.removeEventListener('pointermove', updatePointer)
      window.removeEventListener('pointerleave', resetPointer)
      motionQuery.removeEventListener('change', motionChange)
    }
  }, [])

  return (
    <div aria-hidden className='pointer-events-none absolute inset-0 -z-10 overflow-hidden'>
      <canvas ref={canvasRef} className='h-full w-full opacity-80 dark:opacity-95' />
    </div>
  )
}

function drawAmbientField(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  pointer: Point,
  time: number,
  palette: FlowPalette
) {
  const centerX = width * 0.76 + Math.sin(time * 0.42) * width * 0.035
  const centerY = height * 0.28 + Math.cos(time * 0.36) * height * 0.04
  const glowRadius = Math.max(width, height) * 0.38
  const glow = context.createRadialGradient(
    centerX,
    centerY,
    0,
    centerX,
    centerY,
    glowRadius
  )

  glow.addColorStop(0, `rgba(${palette.accents[1]}, 0.13)`)
  glow.addColorStop(0.45, `rgba(${palette.accents[0]}, 0.045)`)
  glow.addColorStop(1, 'rgba(0, 0, 0, 0)')
  context.fillStyle = glow
  context.fillRect(0, 0, width, height)

  const mouseDistance = Math.hypot(pointer.x - width / 2, pointer.y - height / 2)
  if (mouseDistance > Math.max(width, height) * 1.1) return

  const mouseGlow = context.createRadialGradient(
    pointer.x,
    pointer.y,
    0,
    pointer.x,
    pointer.y,
    Math.max(width, height) * 0.22
  )
  mouseGlow.addColorStop(0, `rgba(${palette.accents[2]}, 0.11)`)
  mouseGlow.addColorStop(0.48, `rgba(${palette.accents[0]}, 0.025)`)
  mouseGlow.addColorStop(1, 'rgba(0, 0, 0, 0)')
  context.fillStyle = mouseGlow
  context.fillRect(0, 0, width, height)
}

function drawFlowLanes(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  pointer: Point,
  time: number,
  palette: FlowPalette
) {
  FLOW_LANES.forEach((lane, laneIndex) => {
    const accent = palette.accents[lane.accent]
    const pulse = 0.55 + Math.sin(time * 1.2 + laneIndex) * 0.15

    context.beginPath()
    for (let step = 0; step <= 52; step += 1) {
      const point = influencePoint(
        sampleLane(lane, step / 52, width, height),
        pointer,
        width,
        height
      )
      if (step === 0) context.moveTo(point.x, point.y)
      else context.lineTo(point.x, point.y)
    }
    context.strokeStyle = `rgba(${palette.line}, ${0.07 + pulse * 0.045})`
    context.lineWidth = 0.65
    context.stroke()

    PARTICLE_OFFSETS.forEach((offset, particleIndex) => {
      const progress = (offset + time * lane.speed) % 1
      const point = influencePoint(
        sampleLane(lane, progress, width, height),
        pointer,
        width,
        height
      )
      const nextPoint = influencePoint(
        sampleLane(lane, Math.min(progress + 0.026, 1), width, height),
        pointer,
        width,
        height
      )
      const tail = {
        x: point.x - (nextPoint.x - point.x) * 4.8,
        y: point.y - (nextPoint.y - point.y) * 4.8,
      }
      const radius = particleIndex % 3 === 0 ? 2.7 : 1.7

      context.beginPath()
      context.moveTo(tail.x, tail.y)
      context.lineTo(point.x, point.y)
      context.strokeStyle = `rgba(${accent}, 0.5)`
      context.lineWidth = radius * 0.82
      context.stroke()

      const particleGlow = context.createRadialGradient(
        point.x,
        point.y,
        0,
        point.x,
        point.y,
        radius * 4.5
      )
      particleGlow.addColorStop(0, `rgba(${accent}, 0.95)`)
      particleGlow.addColorStop(0.24, `rgba(${accent}, 0.5)`)
      particleGlow.addColorStop(1, `rgba(${accent}, 0)`)
      context.fillStyle = particleGlow
      context.beginPath()
      context.arc(point.x, point.y, radius * 4.5, 0, Math.PI * 2)
      context.fill()
    })

    if (laneIndex % 2 === 0) {
      const nodeProgress = 0.49 + Math.sin(time * 0.4 + laneIndex) * 0.08
      const node = influencePoint(
        sampleLane(lane, nodeProgress, width, height),
        pointer,
        width,
        height
      )
      drawNode(context, node, accent, palette.node, time + laneIndex)
    }
  })
}

function drawPointerHub(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  pointer: Point,
  time: number,
  palette: FlowPalette
) {
  const isOutsideViewport =
    pointer.x < -80 ||
    pointer.y < -80 ||
    pointer.x > width + 80 ||
    pointer.y > height + 80

  if (isOutsideViewport) return

  const radius = Math.min(width, height) * 0.045
  const accent = palette.accents[1]

  context.save()
  context.translate(pointer.x, pointer.y)
  context.strokeStyle = `rgba(${accent}, 0.38)`
  context.lineWidth = 0.8
  context.setLineDash([2, 7])
  context.lineDashOffset = -time * 28
  context.beginPath()
  context.arc(0, 0, radius, 0, Math.PI * 2)
  context.stroke()

  context.strokeStyle = `rgba(${palette.accents[0]}, 0.24)`
  context.setLineDash([1, 10])
  context.lineDashOffset = time * 18
  context.beginPath()
  context.arc(0, 0, radius * 1.55, 0, Math.PI * 2)
  context.stroke()
  context.setLineDash([])

  for (let index = 0; index < 3; index += 1) {
    const angle = time * 0.85 + (index * Math.PI * 2) / 3
    const orbitX = Math.cos(angle) * radius
    const orbitY = Math.sin(angle) * radius
    context.fillStyle = `rgba(${accent}, 0.85)`
    context.shadowBlur = 10
    context.shadowColor = `rgba(${accent}, 0.8)`
    context.beginPath()
    context.arc(orbitX, orbitY, 1.8, 0, Math.PI * 2)
    context.fill()
  }

  context.shadowBlur = 14
  context.shadowColor = `rgba(${palette.node}, 0.9)`
  context.fillStyle = `rgba(${palette.node}, 0.95)`
  context.beginPath()
  context.arc(0, 0, 2.6, 0, Math.PI * 2)
  context.fill()
  context.restore()
}

function drawNode(
  context: CanvasRenderingContext2D,
  point: Point,
  accent: string,
  node: string,
  time: number
) {
  const radius = 3.2 + Math.sin(time * 1.7) * 0.45
  const halo = context.createRadialGradient(
    point.x,
    point.y,
    0,
    point.x,
    point.y,
    radius * 5
  )
  halo.addColorStop(0, `rgba(${node}, 0.9)`)
  halo.addColorStop(0.22, `rgba(${accent}, 0.48)`)
  halo.addColorStop(1, `rgba(${accent}, 0)`)
  context.fillStyle = halo
  context.beginPath()
  context.arc(point.x, point.y, radius * 5, 0, Math.PI * 2)
  context.fill()

  context.fillStyle = `rgba(${node}, 0.9)`
  context.beginPath()
  context.arc(point.x, point.y, radius, 0, Math.PI * 2)
  context.fill()
}

function influencePoint(
  point: Point,
  pointer: Point,
  width: number,
  height: number
): Point {
  const deltaX = point.x - pointer.x
  const deltaY = point.y - pointer.y
  const distance = Math.hypot(deltaX, deltaY)
  const radius = Math.min(width, height) * 0.38

  if (distance > radius || distance < 1) return point

  const strength = (1 - distance / radius) ** 2
  const swirl = Math.min(width, height) * 0.034 * strength
  const pull = Math.min(width, height) * 0.012 * strength

  return {
    x: point.x - (deltaY / distance) * swirl - (deltaX / distance) * pull,
    y: point.y + (deltaX / distance) * swirl - (deltaY / distance) * pull,
  }
}

function sampleLane(
  lane: FlowLane,
  progress: number,
  width: number,
  height: number
): Point {
  const inverse = 1 - progress
  const x =
    inverse ** 3 * lane.start.x +
    3 * inverse ** 2 * progress * lane.controlA.x +
    3 * inverse * progress ** 2 * lane.controlB.x +
    progress ** 3 * lane.end.x
  const y =
    inverse ** 3 * lane.start.y +
    3 * inverse ** 2 * progress * lane.controlA.y +
    3 * inverse * progress ** 2 * lane.controlB.y +
    progress ** 3 * lane.end.y

  return { x: x * width, y: y * height }
}
