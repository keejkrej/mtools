"use client"

import { ImageIcon, Trash2Icon } from "lucide-react"
import { useEffect, useReducer, useRef, useState } from "react"
import {
  activeBoundingBox,
  annotatorReducer,
  initialAnnotatorState,
} from "@/atoms/annotator"
import { BboxCanvas } from "@/components/bbox-canvas"
import { MicroscopyFrameDialog } from "@/components/microscopy-frame-dialog"
import { TimecodeStrip } from "@/components/copy-bbox-button"
import { Button } from "@/components/ui/button"
import {
  clearAnnotatorSession,
  loadAnnotatorSession,
  loadImageFile,
  revokeImageUrl,
  saveAnnotatorSession,
} from "@/services/annotator"
import { isMicroscopyFileName } from "@/services/microscopy"
import { cn } from "@/lib/utils"

export function AnnotatorPage() {
  const [state, dispatch] = useReducer(annotatorReducer, initialAnnotatorState)
  const [sessionReady, setSessionReady] = useState(false)
  const [pendingMicroscopyFile, setPendingMicroscopyFile] = useState<File | null>(
    null,
  )
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void loadAnnotatorSession().then((session) => {
      if (session?.image) {
        dispatch({
          type: "restore-session",
          image: session.image,
          bbox: session.bbox,
        })
      }
      setSessionReady(true)
    })
  }, [])

  useEffect(() => {
    if (!sessionReady) {
      return
    }

    if (state.image) {
      void saveAnnotatorSession(state.image, state.bbox).catch(() => {
        dispatch({
          type: "image-error",
          message: "Session storage is full — image may not persist on reload",
        })
      })
      return
    }

    void clearAnnotatorSession()
  }, [sessionReady, state.image, state.bbox])

  const openFilePicker = () => {
    fileInputRef.current?.click()
  }

  const handleOpenImage = async (file: File | undefined) => {
    if (!file) {
      return
    }

    if (isMicroscopyFileName(file.name)) {
      setPendingMicroscopyFile(file)
      return
    }

    if (state.image) {
      await revokeImageUrl(state.image.url)
    }

    try {
      const image = await loadImageFile(file)
      dispatch({ type: "image-loaded", image })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not open that image"
      dispatch({ type: "image-error", message })
    }
  }

  const handleClear = async () => {
    if (state.image) {
      await revokeImageUrl(state.image.url)
    }
    await clearAnnotatorSession()
    dispatch({ type: "clear-image" })
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const liveBox = activeBoundingBox(state)
  const status = state.draft
    ? "drawing"
    : state.bbox
      ? "ready"
      : state.image
        ? "idle"
        : "empty"

  return (
    <div className="flex h-svh flex-col overflow-hidden">
      <input
        accept="image/*,.nd2,.czi"
        className="sr-only"
        id="image-file"
        onChange={(event) => {
          void handleOpenImage(event.target.files?.[0])
        }}
        ref={fileInputRef}
        type="file"
      />

      <header className="z-10 shrink-0 border-b border-border/80 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div className="flex min-w-0 items-baseline gap-3">
            <h1 className="font-display text-xl leading-normal sm:text-2xl">
              mTools
            </h1>
            <span className="hidden truncate font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase sm:inline">
              roi marker
            </span>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {state.image ? (
              <p className="mr-2 hidden max-w-[14rem] truncate font-mono text-xs text-muted-foreground lg:block">
                {state.image.name}
                <span className="mx-1.5 text-border">·</span>
                {state.image.width}×{state.image.height}
              </p>
            ) : null}

            <Button onClick={openFilePicker} size="sm" type="button">
              <ImageIcon data-icon="inline-start" />
              Open image
            </Button>
            <Button
              disabled={!state.image}
              onClick={() => {
                void handleClear()
              }}
              size="sm"
              type="button"
              variant="outline"
            >
              <Trash2Icon data-icon="inline-start" />
              Clear
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-0 px-5 py-6 sm:px-8">
        {state.error ? (
          <p
            className="mb-4 border border-destructive/30 bg-destructive/10 px-4 py-3 font-mono text-sm text-destructive"
            role="alert"
          >
            {state.error}
          </p>
        ) : null}

        <div className="mb-3 flex items-center justify-between gap-4">
          <p className="font-mono text-[11px] tracking-[0.16em] text-muted-foreground uppercase">
            Light table
          </p>
          <span
            className={cn(
              "font-mono text-[11px] tracking-[0.14em] uppercase",
              status === "drawing" && "text-primary",
              status === "ready" && "text-foreground",
              (status === "idle" || status === "empty") && "text-muted-foreground",
            )}
          >
            {status === "drawing"
              ? "Marking region"
              : status === "ready"
                ? "Region set"
                : status === "idle"
                  ? "Ready to mark"
                  : "Awaiting image"}
          </span>
        </div>

        <div className="min-h-0 flex-1">
          <BboxCanvas
            onDrawEnd={() => dispatch({ type: "draw-end" })}
            onDrawMove={(x, y) => dispatch({ type: "draw-move", x, y })}
            onDrawStart={(x, y) => dispatch({ type: "draw-start", x, y })}
            onDropImage={(file) => {
              void handleOpenImage(file)
            }}
            onOpenImage={openFilePicker}
            state={state}
          />
        </div>

        <div className="mt-0">
          <TimecodeStrip
            copyBox={state.bbox}
            displayBox={state.draft ? liveBox : state.bbox}
            drawing={Boolean(state.draft)}
            imageLoaded={Boolean(state.image)}
            onClearBox={
              state.bbox
                ? () => {
                    dispatch({ type: "clear-bbox" })
                  }
                : undefined
            }
          />
        </div>

        <p className="mt-4 shrink-0 text-center text-xs text-muted-foreground">
          Coordinates are in original image pixels — x, y, width, height.
          Session restores on reload within this tab.
        </p>
      </main>

      <MicroscopyFrameDialog
        file={pendingMicroscopyFile}
        onClose={() => {
          setPendingMicroscopyFile(null)
        }}
        onOpen={(image) => {
          if (state.image) {
            void revokeImageUrl(state.image.url)
          }
          dispatch({ type: "image-loaded", image })
        }}
      />
    </div>
  )
}
