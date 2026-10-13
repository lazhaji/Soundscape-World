import type { GlassOptions } from './liquid-glass'
export interface GlassRenderer {
  setLenses(lenses: GlassOptions[]): void
  updateLens(index: number, options: GlassOptions): void
  render(): void
  destroy(): void
}
export function createGlassRenderer(canvas: HTMLCanvasElement, source: HTMLCanvasElement, options?: { pixelRatio?: number }): GlassRenderer
