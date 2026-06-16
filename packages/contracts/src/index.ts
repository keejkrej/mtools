import { Schema } from "effect"

export const BoundingBox = Schema.Struct({
  x: Schema.Number,
  y: Schema.Number,
  width: Schema.Number,
  height: Schema.Number,
})

export type BoundingBox = typeof BoundingBox.Type

export const MicroscopyFrame = Schema.Struct({
  format: Schema.Literals(["nd2", "czi"]),
  position: Schema.Number,
  time: Schema.Number,
  channel: Schema.Number,
  z: Schema.Number,
})

export type MicroscopyFrame = typeof MicroscopyFrame.Type

export const ImageAsset = Schema.Struct({
  url: Schema.String,
  name: Schema.String,
  width: Schema.Number,
  height: Schema.Number,
  frame: Schema.optional(MicroscopyFrame),
})

export type ImageAsset = typeof ImageAsset.Type

export const PersistedAnnotatorSession = Schema.Struct({
  image: Schema.NullOr(ImageAsset),
  bbox: Schema.NullOr(BoundingBox),
})

export type PersistedAnnotatorSession = typeof PersistedAnnotatorSession.Type

export function formatBoundingBox(box: BoundingBox): string {
  const x = Math.round(box.x)
  const y = Math.round(box.y)
  const width = Math.round(box.width)
  const height = Math.round(box.height)
  return `${x}, ${y}, ${width}, ${height}`
}

export function formatBoundingBoxJson(box: BoundingBox): string {
  return JSON.stringify({
    x: Math.round(box.x),
    y: Math.round(box.y),
    width: Math.round(box.width),
    height: Math.round(box.height),
  })
}
