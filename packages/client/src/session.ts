import { Context, Effect, Layer, Option, Schema } from "effect"
import {
  PersistedAnnotatorSession,
  type BoundingBox,
  type ImageAsset,
} from "@mtools/contracts"
import { SessionStorageError } from "@mtools/storage"

const STORAGE_KEY = "@mtools/annotator-session"

const parseSession = (raw: string): PersistedAnnotatorSession | null => {
  try {
    const json: unknown = JSON.parse(raw)
    return Option.getOrNull(
      Schema.decodeUnknownOption(PersistedAnnotatorSession)(json),
    )
  } catch {
    return null
  }
}

export class AnnotatorSessionStore extends Context.Service<
  AnnotatorSessionStore,
  {
    readonly load: () => Effect.Effect<PersistedAnnotatorSession | null>
    readonly save: (
      image: ImageAsset,
      bbox: BoundingBox | null,
    ) => Effect.Effect<void, SessionStorageError | Schema.SchemaError>
    readonly clear: () => Effect.Effect<void, SessionStorageError>
  }
>()("@mtools/AnnotatorSessionStore") {
  static readonly layer = Layer.succeed(AnnotatorSessionStore, {
    load: () =>
      Effect.sync(() => {
        if (typeof sessionStorage === "undefined") {
          return null
        }

        const raw = sessionStorage.getItem(STORAGE_KEY)
        if (raw === null) {
          return null
        }

        return parseSession(raw)
      }),

    save: (image: ImageAsset, bbox: BoundingBox | null) =>
      Effect.gen(function* () {
        const encoded = yield* Schema.encodeUnknownEffect(
          PersistedAnnotatorSession,
        )({ image, bbox }).pipe(
          Effect.map((value) => JSON.stringify(value)),
        )

        yield* Effect.try({
          try: () => {
            sessionStorage.setItem(STORAGE_KEY, encoded)
          },
          catch: () =>
            new SessionStorageError({
              message: "Could not write to session storage",
            }),
        })
      }),

    clear: () =>
      Effect.try({
        try: () => {
          sessionStorage.removeItem(STORAGE_KEY)
        },
        catch: () =>
          new SessionStorageError({
            message: "Could not clear session storage",
          }),
      }),
  })
}
