"use client"

import { useId, useState } from "react"
import type { OpenMicroscopyFileResult } from "@mtools/mdat-wasm"
import type { ImageAsset, MicroscopyFrame } from "@mtools/contracts"
import { Button } from "@/components/ui/button"
import {
  clampAxisValue,
  FrameAxisSpinbox,
} from "@/components/frame-axis-spinbox"
import {
  displayNameFromFile,
  formatLabelFromName,
  loadMicroscopyFrameImage,
  positionLabelFromFormat,
} from "@/services/microscopy"

type MicroscopyFrameDialogProps = {
  opened: OpenMicroscopyFileResult
  initialCoords?: MicroscopyFrame
  submitLabel?: string
  onClose: () => void
  onOpen: (image: ImageAsset) => void
}

type AxisField = "position" | "time" | "channel" | "z"

type AxisCoords = Record<AxisField, number>

const AXIS_LABELS: Record<AxisField, string> = {
  position: "Position",
  time: "Time",
  channel: "Channel",
  z: "Z",
}

function axisMax(
  summary: OpenMicroscopyFileResult["summary"],
  axis: AxisField,
): number {
  const counts: Record<AxisField, number> = {
    position: summary.n_pos,
    time: summary.n_time,
    channel: summary.n_chan,
    z: summary.n_z,
  }
  return Math.max(counts[axis] - 1, 0)
}

function coordsFromFrame(
  summary: OpenMicroscopyFileResult["summary"],
  frame?: MicroscopyFrame,
): AxisCoords {
  return {
    position: clampAxisValue(frame?.position ?? 0, axisMax(summary, "position")),
    time: clampAxisValue(frame?.time ?? 0, axisMax(summary, "time")),
    channel: clampAxisValue(frame?.channel ?? 0, axisMax(summary, "channel")),
    z: clampAxisValue(frame?.z ?? 0, axisMax(summary, "z")),
  }
}

export function MicroscopyFrameDialog({
  opened,
  initialCoords,
  submitLabel = "Open frame",
  onClose,
  onOpen,
}: MicroscopyFrameDialogProps) {
  const { summary } = opened
  const fieldIdPrefix = useId()
  const [coords, setCoords] = useState<AxisCoords>(() =>
    coordsFromFrame(summary, initialCoords),
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const formatLabel = formatLabelFromName(opened.name)
  const positionLabel = positionLabelFromFormat(opened.format)
  const summaryText = `P=${summary.n_pos} · T=${summary.n_time} · C=${summary.n_chan} · Z=${summary.n_z} · ${summary.width}×${summary.height}`

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)

    try {
      const image = await loadMicroscopyFrameImage(opened, coords)
      onOpen(image)
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
            {displayNameFromFile(opened.name)}
            {formatLabel ? ` · ${formatLabel}` : null}
          </p>
        </div>

        <p className="mt-4 font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
          {summaryText}
        </p>

        <div className="mt-5 grid grid-cols-2 gap-3">
          {(["position", "time", "channel", "z"] as const).map((axis) => (
            <FrameAxisSpinbox
              id={`${fieldIdPrefix}-${axis}`}
              key={axis}
              label={axis === "position" ? positionLabel : AXIS_LABELS[axis]}
              max={axisMax(summary, axis)}
              onChange={(value) => {
                setCoords((current) => ({
                  ...current,
                  [axis]: value,
                }))
              }}
              value={coords[axis]}
            />
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
            onClick={onClose}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            className="min-w-[7.5rem]"
            disabled={loading}
            onClick={() => {
              void handleSubmit()
            }}
            type="button"
          >
            {loading ? "Loading…" : submitLabel}
          </Button>
        </div>
      </div>
    </div>
  )
}
