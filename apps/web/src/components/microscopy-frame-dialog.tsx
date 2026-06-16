"use client"

import { useEffect, useRef, useState } from "react"
import {
  closeMicroscopyFile,
  type OpenMicroscopyFileResult,
} from "@mtools/mdat-wasm"
import type { ImageAsset } from "@mtools/contracts"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  inspectMicroscopyFile,
  loadMicroscopyFrameImage,
} from "@/services/microscopy"

type MicroscopyFrameDialogProps = {
  file: File | null
  onClose: () => void
  onOpen: (image: ImageAsset) => void
}

type AxisField = "position" | "time" | "channel" | "z"

const AXIS_LABELS: Record<AxisField, string> = {
  position: "Position",
  time: "Time",
  channel: "Channel",
  z: "Z",
}

function clampIndex(value: number, maxExclusive: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0
  }
  return Math.min(Math.floor(value), Math.max(maxExclusive - 1, 0))
}

export function MicroscopyFrameDialog({
  file,
  onClose,
  onOpen,
}: MicroscopyFrameDialogProps) {
  const [opened, setOpened] = useState<OpenMicroscopyFileResult | null>(null)
  const openedRef = useRef<OpenMicroscopyFileResult | null>(null)
  const [coords, setCoords] = useState({
    position: "0",
    time: "0",
    channel: "0",
    z: "0",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const closeOpenedHandle = async () => {
    const current = openedRef.current
    openedRef.current = null
    setOpened(null)
    if (current) {
      await closeMicroscopyFile(current.handle)
    }
  }

  useEffect(() => {
    openedRef.current = opened
  }, [opened])

  useEffect(() => {
    if (!file) {
      return
    }

    let cancelled = false
    setLoading(true)
    setError(null)

    void inspectMicroscopyFile(file)
      .then((result) => {
        if (cancelled) {
          void closeMicroscopyFile(result.handle)
          return
        }
        openedRef.current = result
        setOpened(result)
      })
      .catch((cause) => {
        if (!cancelled) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not inspect microscopy file",
          )
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
      void closeOpenedHandle()
    }
  }, [file])

  if (!file) {
    return null
  }

  const summary = opened?.summary
  const positionLabel =
    opened?.format === "czi" ? "Scene (S)" : AXIS_LABELS.position

  const handleClose = () => {
    void closeOpenedHandle().finally(onClose)
  }

  const handleSubmit = async () => {
    if (!opened || !summary) {
      return
    }

    setLoading(true)
    setError(null)

    try {
      const image = await loadMicroscopyFrameImage(opened, {
        position: clampIndex(Number(coords.position), summary.n_pos),
        time: clampIndex(Number(coords.time), summary.n_time),
        channel: clampIndex(Number(coords.channel), summary.n_chan),
        z: clampIndex(Number(coords.z), summary.n_z),
      })
      openedRef.current = null
      setOpened(null)
      onOpen(image)
      onClose()
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Could not read microscopy frame",
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm">
      <div
        className="w-full max-w-lg border border-border bg-background p-6 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="microscopy-frame-title"
      >
        <div className="space-y-1">
          <h2
            id="microscopy-frame-title"
            className="font-display text-xl leading-normal"
          >
            Choose frame coordinates
          </h2>
          <p className="font-mono text-xs text-muted-foreground">
            {file.name}
            {opened ? ` · ${opened.format.toUpperCase()}` : null}
          </p>
        </div>

        {summary ? (
          <p className="mt-4 font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
            P={summary.n_pos} · T={summary.n_time} · C={summary.n_chan} · Z=
            {summary.n_z} · {summary.width}×{summary.height}
          </p>
        ) : null}

        <div className="mt-5 grid grid-cols-2 gap-3">
          {(["position", "time", "channel", "z"] as const).map((axis) => (
            <label key={axis} className="space-y-1.5">
              <span className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
                {axis === "position" ? positionLabel : AXIS_LABELS[axis]}
              </span>
              <Input
                inputMode="numeric"
                min={0}
                max={
                  summary
                    ? {
                        position: summary.n_pos - 1,
                        time: summary.n_time - 1,
                        channel: summary.n_chan - 1,
                        z: summary.n_z - 1,
                      }[axis]
                    : undefined
                }
                nativeInput
                onChange={(event) => {
                  setCoords((current) => ({
                    ...current,
                    [axis]: event.target.value,
                  }))
                }}
                value={coords[axis]}
              />
            </label>
          ))}
        </div>

        {error ? (
          <p className="mt-4 font-mono text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}

        <div className="mt-6 flex justify-end gap-2">
          <Button
            disabled={loading}
            onClick={() => {
              void handleClose()
            }}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            disabled={loading || !opened}
            onClick={() => {
              void handleSubmit()
            }}
            type="button"
          >
            {loading ? "Loading…" : "Open frame"}
          </Button>
        </div>
      </div>
    </div>
  )
}
