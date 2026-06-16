import { Effect } from "effect"
import {
  AnnotatorSessionStore,
  Clipboard,
  ImageLoader,
  runPromise,
} from "@mtools/client"
import type { BoundingBox, ImageAsset } from "@mtools/contracts"
import { formatBoundingBox, formatBoundingBoxJson } from "@mtools/contracts"

export const loadImageFile = (file: File) =>
  runPromise(
    Effect.gen(function* () {
      const loader = yield* ImageLoader
      return yield* loader.loadFile(file)
    }),
  )

export const revokeImageUrl = (url: string) =>
  runPromise(
    Effect.gen(function* () {
      const loader = yield* ImageLoader
      yield* loader.revoke(url)
    }),
  )

export const copyBoundingBox = (box: BoundingBox, asJson: boolean) =>
  runPromise(
    Effect.gen(function* () {
      const clipboard = yield* Clipboard
      const text = asJson ? formatBoundingBoxJson(box) : formatBoundingBox(box)
      yield* clipboard.writeText(text)
      return text
    }),
  )

export const loadAnnotatorSession = () =>
  runPromise(
    Effect.gen(function* () {
      const store = yield* AnnotatorSessionStore
      return yield* store.load()
    }),
  )

export const saveAnnotatorSession = (
  image: ImageAsset,
  bbox: BoundingBox | null,
) =>
  runPromise(
    Effect.gen(function* () {
      const store = yield* AnnotatorSessionStore
      yield* store.save(image, bbox)
    }),
  )

export const clearAnnotatorSession = () =>
  runPromise(
    Effect.gen(function* () {
      const store = yield* AnnotatorSessionStore
      yield* store.clear()
    }),
  )
