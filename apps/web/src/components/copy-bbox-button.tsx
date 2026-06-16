"use client"

import { CheckIcon, CopyIcon } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { copyBoundingBox } from "@/services/annotator"
import type { BoundingBox } from "@mtools/contracts"
import { cn } from "@/lib/utils"

type CopyBboxButtonProps = {
  box: BoundingBox
  asJson?: boolean
  className?: string
}

export function CopyBboxButton({
  box,
  asJson = false,
  className,
}: CopyBboxButtonProps) {
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState(false)

  const handleCopy = async () => {
    setError(false)
    try {
      await copyBoundingBox(box, asJson)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setError(true)
      window.setTimeout(() => setError(false), 2000)
    }
  }

  const label = copied ? "Copied" : error ? "Failed" : asJson ? "JSON" : "Copy xywh"

  return (
    <Button
      aria-label={`Copy bounding box as ${asJson ? "JSON" : "xywh"}`}
      className={cn("h-8 font-mono text-xs tracking-wide uppercase", className)}
      onClick={handleCopy}
      size="sm"
      type="button"
      variant={error ? "destructive" : copied ? "secondary" : "outline"}
    >
      {copied ? (
        <CheckIcon data-icon="inline-start" />
      ) : (
        <CopyIcon data-icon="inline-start" />
      )}
      {label}
    </Button>
  )
}

type TimecodeStripProps = {
  displayBox: BoundingBox | null
  copyBox: BoundingBox | null
  drawing: boolean
  imageLoaded: boolean
  onClearBox?: () => void
}

export function TimecodeStrip({
  displayBox,
  copyBox,
  drawing,
  imageLoaded,
  onClearBox,
}: TimecodeStripProps) {
  const fields = [
    { key: "x", label: "x", value: displayBox ? Math.round(displayBox.x) : "—" },
    { key: "y", label: "y", value: displayBox ? Math.round(displayBox.y) : "—" },
    {
      key: "w",
      label: "w",
      value: displayBox ? Math.round(displayBox.width) : "—",
    },
    {
      key: "h",
      label: "h",
      value: displayBox ? Math.round(displayBox.height) : "—",
    },
  ] as const

  const actionHint = drawing
    ? "Drawing region…"
    : imageLoaded
      ? "Drag on image"
      : "Load image first"

  return (
    <div className="border border-border bg-card">
      <div className="grid grid-cols-2 divide-y divide-border sm:grid-cols-4 sm:divide-x sm:divide-y-0 lg:flex lg:min-h-[4.5rem] lg:items-stretch">
        {fields.map((field) => (
          <div
            className="flex min-w-0 flex-col justify-center px-4 py-3 sm:border-border lg:flex-1 lg:border-r"
            key={field.key}
          >
            <span className="font-mono text-[10px] tracking-[0.2em] text-muted-foreground uppercase">
              {field.label}
            </span>
            <span
              className={cn(
                "mt-1 flex h-7 items-center font-mono text-xl tabular-nums tracking-tight",
                displayBox ? "text-foreground" : "text-muted-foreground/50",
              )}
            >
              {field.value}
            </span>
          </div>
        ))}

        <div className="col-span-2 flex min-h-14 items-center justify-between gap-2 border-t border-border px-4 py-3 sm:col-span-4 lg:min-w-0 lg:flex-1 lg:border-t-0 lg:border-l">
          <div className="flex h-8 min-w-[5.625rem] items-center">
            {onClearBox ? (
              <Button
                className="h-8 font-mono text-xs tracking-wide uppercase"
                onClick={onClearBox}
                size="sm"
                type="button"
                variant="outline"
              >
                Clear box
              </Button>
            ) : (
              <span className="font-mono text-xs text-muted-foreground">
                {actionHint}
              </span>
            )}
          </div>

          <div className="flex h-8 items-center gap-2">
            {copyBox ? (
              <>
                <CopyBboxButton box={copyBox} />
                <CopyBboxButton asJson box={copyBox} />
              </>
            ) : (
              <>
                <span aria-hidden className="inline-block h-8 w-[6.75rem]" />
                <span aria-hidden className="inline-block h-8 w-[4.25rem]" />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
