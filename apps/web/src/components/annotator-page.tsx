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
import { MicroscopyInspectOverlay } from "@/components/microscopy-inspect-overlay"
import { TimecodeStrip } from "@/components/copy-bbox-button"
import { Button } from "@/components/ui/button"
import {
  clearAnnotatorSession,
  loadAnnotatorSession,
  loadImageFile,
  revokeImageUrl,
  saveAnnotatorSession,
} from "@/services/annotator"
import {
  closeInspectedMicroscopyFile,
  inspectMicroscopyFile,
  isMicroscopyFileName,
} from "@/services/microscopy"
import { cn } from "@/lib/utils"
import type { ImageAsset, MicroscopyFrame } from "@mtools/contracts"
import type { OpenMicroscopyFileResult } from "@mtools/mdat-wasm"

type MicroscopyDialogMode = "open" | "change"

export function AnnotatorPage() {
  const [state, dispatch] = useReducer(annotatorReducer, initialAnnotatorState)
  const [sessionReady, setSessionReady] = useState(false)
  const [inspectedMicroscopy, setInspectedMicroscopy] =
    useState<OpenMicroscopyFileResult | null>(null)
  const [inspectingMicroscopyFileName, setInspectingMicroscopyFileName] =
    useState<string | null>(null)
  const [microscopyDialogMode, setMicroscopyDialogMode] =
    useState<MicroscopyDialogMode>("open")
  const [microscopyInitialCoords, setMicroscopyInitialCoords] =
    useState<MicroscopyFrame | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const microscopyRequestRef = useRef(0)
  const microscopySourceFileRef = useRef<File | null>(null)

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

  const resetFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const openFilePicker = () => {
    fileInputRef.current?.click()
  }

  const cancelMicroscopyFlow = async (
    opened?: OpenMicroscopyFileResult | null,
    options?: { resetInput?: boolean },
  ) => {
    microscopyRequestRef.current += 1
    setInspectingMicroscopyFileName(null)
    setMicroscopyInitialCoords(null)
    setMicroscopyDialogMode("open")

    if (opened) {
      await closeInspectedMicroscopyFile(opened)
    }

    setInspectedMicroscopy(null)

    if (options?.resetInput !== false) {
      resetFileInput()
    }
  }

  const openMicroscopyFile = async (
    file: File,
    options?: {
      initialCoords?: MicroscopyFrame
      mode?: MicroscopyDialogMode
    },
  ) => {
    const requestId = microscopyRequestRef.current + 1
    microscopyRequestRef.current = requestId
    microscopySourceFileRef.current = file
    setMicroscopyDialogMode(options?.mode ?? "open")
    setMicroscopyInitialCoords(options?.initialCoords ?? null)
    setInspectedMicroscopy(null)
    setInspectingMicroscopyFileName(file.name)

    try {
      const opened = await inspectMicroscopyFile(file)
      if (requestId !== microscopyRequestRef.current) {
        await closeInspectedMicroscopyFile(opened)
        return
      }
      setInspectingMicroscopyFileName(null)
      setInspectedMicroscopy(opened)
    } catch (error) {
      if (requestId !== microscopyRequestRef.current) {
        return
      }
      setInspectingMicroscopyFileName(null)
      const message =
        error instanceof Error
          ? error.message
          : "Could not inspect microscopy file"
      dispatch({ type: "image-error", message })
      resetFileInput()
    }
  }

  const handleOpenImage = async (file: File | undefined) => {
    if (!file) {
      return
    }

    if (isMicroscopyFileName(file.name)) {
      await openMicroscopyFile(file)
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
    microscopySourceFileRef.current = null
    await clearAnnotatorSession()
    dispatch({ type: "clear-image" })
    if (fileInputRef.current) {
      fileInputRef.current.value = ""
    }
  }

  const handleMicroscopyFrameOpen = async (image: ImageAsset) => {
    if (state.image) {
      await revokeImageUrl(state.image.url)
    }
    setInspectedMicroscopy(null)
    setMicroscopyInitialCoords(null)

    if (microscopyDialogMode === "change") {
      dispatch({ type: "microscopy-frame-loaded", image })
      return
    }

    dispatch({ type: "image-loaded", image })
    resetFileInput()
  }

  const reopenMicroscopyFramePicker = () => {
    const sourceFile = microscopySourceFileRef.current
    const frame = state.image?.frame
    if (!sourceFile || !frame) {
      return
    }

    void openMicroscopyFile(sourceFile, {
      initialCoords: frame,
      mode: "change",
    })
  }

  const canChangeMicroscopyFrame = Boolean(
    state.image?.frame && microscopySourceFileRef.current,
  )

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
        <div className="mx-auto grid max-w-6xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4 px-5 py-4 sm:px-8">
          <div className="flex min-w-0 items-baseline gap-3">
            <h1 className="font-display text-xl leading-normal sm:text-2xl">
              mTools
            </h1>
            <span className="hidden truncate font-mono text-[11px] tracking-[0.18em] text-muted-foreground uppercase sm:inline">
              roi marker
            </span>
          </div>

          <div className="flex min-w-0 justify-center px-2">
            {state.image ? (
              canChangeMicroscopyFrame ? (
                <Button
                  aria-label="Change frame coordinates"
                  className="h-auto min-w-0 max-w-full truncate px-2 py-1 font-mono text-xs text-muted-foreground hover:bg-transparent hover:text-foreground"
                  onClick={reopenMicroscopyFramePicker}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  {state.image.name}
                  <span className="mx-1.5 text-border">·</span>
                  {state.image.width}×{state.image.height}
                </Button>
              ) : (
                <p className="max-w-full truncate text-center font-mono text-xs text-muted-foreground">
                  {state.image.name}
                  <span className="mx-1.5 text-border">·</span>
                  {state.image.width}×{state.image.height}
                </p>
              )
            ) : null}
          </div>

          <div className="flex shrink-0 items-center justify-end gap-2">
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

        <div className="mb-4 min-h-0 flex-1">
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
      </main>

      {inspectingMicroscopyFileName ? (
        <MicroscopyInspectOverlay
          fileName={inspectingMicroscopyFileName}
          onCancel={() => {
            void cancelMicroscopyFlow()
          }}
        />
      ) : null}

      {inspectedMicroscopy ? (
        <MicroscopyFrameDialog
          initialCoords={microscopyInitialCoords ?? undefined}
          key={`${inspectedMicroscopy.handle}-${microscopyDialogMode}`}
          opened={inspectedMicroscopy}
          onClose={() => {
            void cancelMicroscopyFlow(inspectedMicroscopy, {
              resetInput: microscopyDialogMode === "open",
            })
          }}
          onOpen={(image) => {
            void handleMicroscopyFrameOpen(image)
          }}
          submitLabel={
            microscopyDialogMode === "change" ? "Apply frame" : "Open frame"
          }
        />
      ) : null}
    </div>
  )
}
