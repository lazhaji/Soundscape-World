// Typed boundary for the unmodified, vendored v1.0.0 engine. Only our used API is exposed.
export interface GlassOptions {
  x?: number; y?: number; width?: number; height?: number; radius?: number
  refraction?: number; bezel?: number; curvature?: number; chroma?: number
  specular?: number; specularWidth?: number; mapScale?: number; clip?: boolean; hidden?: boolean
}
export interface GlassController {
  update(options: GlassOptions): void
  destroy(): void
  flush(): void
  readonly filterId: string
}
export interface SpringController {
  set(value: number, options?: { immediate?: boolean }): void
  stop(): void
}
export function createGlass(target: HTMLElement, options: GlassOptions): GlassController
export function createSpring(initial: number, update: (value: number, velocity: number) => void): SpringController
