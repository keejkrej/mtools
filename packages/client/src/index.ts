import { Context, Effect, Layer, Schema } from "effect"
import type { ImageAsset } from "@mtools/contracts"
import { AnnotatorSessionStore } from "./session"

export class ImageLoadError extends Schema.TaggedErrorClass<ImageLoadError>()(
  "ImageLoadError",
  {
    message: Schema.String,
  },
) {}

export class ClipboardError extends Schema.TaggedErrorClass<ClipboardError>()(
  "ClipboardError",
  {
    message: Schema.String,
  },
) {}

const readFileAsDataUrl = (file: File) =>
  Effect.tryPromise({
    try: () =>
      new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => {
          if (typeof reader.result === "string") {
            resolve(reader.result)
            return
          }
          reject(new Error("Invalid data URL result"))
        }
        reader.onerror = () => {
          reject(new Error("File read failed"))
        }
        reader.readAsDataURL(file)
      }),
    catch: () =>
      new ImageLoadError({
        message: "Could not read the selected image",
      }),
  })

const readImageDimensions = (url: string) =>
  Effect.tryPromise({
    try: () =>
      new Promise<{ width: number; height: number }>((resolve, reject) => {
        const image = new Image()
        image.onload = () => {
          resolve({
            width: image.naturalWidth,
            height: image.naturalHeight,
          })
        }
        image.onerror = () => {
          reject(new Error("Image decode failed"))
        }
        image.src = url
      }),
    catch: () =>
      new ImageLoadError({
        message: "Could not read image dimensions",
      }),
  })

export class ImageLoader extends Context.Service<
  ImageLoader,
  {
    readonly loadFile: (file: File) => Effect.Effect<ImageAsset, ImageLoadError>
    readonly revoke: (url: string) => Effect.Effect<void>
  }
>()("@mtools/ImageLoader") {
  static readonly layer = Layer.succeed(ImageLoader, {
    loadFile: Effect.fn(function* (file: File) {
      if (!file.type.startsWith("image/")) {
        return yield* Effect.fail(
          new ImageLoadError({ message: "Choose an image file" }),
        )
      }

      const url = yield* readFileAsDataUrl(file)
      const dimensions = yield* readImageDimensions(url).pipe(
        Effect.mapError(
          () =>
            new ImageLoadError({
              message: "Could not decode the selected image",
            }),
        ),
      )

      return {
        url,
        name: file.name,
        width: dimensions.width,
        height: dimensions.height,
      } satisfies ImageAsset
    }),

    revoke: (url: string) =>
      Effect.sync(() => {
        if (url.startsWith("blob:")) {
          URL.revokeObjectURL(url)
        }
      }),
  })
}

export class Clipboard extends Context.Service<
  Clipboard,
  {
    readonly writeText: (text: string) => Effect.Effect<void, ClipboardError>
  }
>()("@mtools/Clipboard") {
  static readonly layer = Layer.succeed(Clipboard, {
    writeText: (text: string) =>
      Effect.tryPromise({
        try: () => navigator.clipboard.writeText(text),
        catch: () =>
          new ClipboardError({ message: "Clipboard access was denied" }),
      }),
  })
}

export const AppLive = Layer.mergeAll(
  AnnotatorSessionStore.layer,
  ImageLoader.layer,
  Clipboard.layer,
)

export const runPromise = <A, E>(
  effect: Effect.Effect<
    A,
    E,
    ImageLoader | Clipboard | AnnotatorSessionStore
  >,
) => Effect.runPromise(effect.pipe(Effect.provide(AppLive)))

export { AnnotatorSessionStore } from "./session"
