import { Context, Effect, Layer, Schema } from "effect"

export class SessionStorageError extends Schema.TaggedErrorClass<SessionStorageError>()(
  "SessionStorageError",
  {
    message: Schema.String,
  },
) {}

export class SessionStorage extends Context.Service<
  SessionStorage,
  {
    readonly getItem: (key: string) => Effect.Effect<string | null, SessionStorageError>
    readonly setItem: (
      key: string,
      value: string,
    ) => Effect.Effect<void, SessionStorageError>
    readonly removeItem: (key: string) => Effect.Effect<void, SessionStorageError>
  }
>()("@mtools/SessionStorage") {
  static readonly layer = Layer.sync(SessionStorage, () => {
    if (typeof sessionStorage === "undefined") {
      return {
        getItem: () => Effect.succeed(null),
        setItem: () => Effect.void,
        removeItem: () => Effect.void,
      }
    }

    return {
      getItem: (key: string) =>
        Effect.try({
          try: () => sessionStorage.getItem(key),
          catch: () =>
            new SessionStorageError({
              message: "Could not read from session storage",
            }),
        }),

      setItem: (key: string, value: string) =>
        Effect.try({
          try: () => {
            sessionStorage.setItem(key, value)
          },
          catch: () =>
            new SessionStorageError({
              message: "Could not write to session storage",
            }),
        }),

      removeItem: (key: string) =>
        Effect.try({
          try: () => {
            sessionStorage.removeItem(key)
          },
          catch: () =>
            new SessionStorageError({
              message: "Could not clear session storage",
            }),
        }),
    }
  })
}
