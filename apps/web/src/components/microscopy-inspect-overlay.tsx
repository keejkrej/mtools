"use client"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { displayNameFromFile, formatLabelFromName } from "@/services/microscopy"

type MicroscopyInspectOverlayProps = {
  fileName: string
  onCancel: () => void
}

export function MicroscopyInspectOverlay({
  fileName,
  onCancel,
}: MicroscopyInspectOverlayProps) {
  const formatLabel = formatLabelFromName(fileName)

  return (
    <div
      aria-busy="true"
      aria-live="polite"
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
    >
      <div className="flex w-full max-w-sm flex-col items-center gap-4 border border-border bg-background p-6 shadow-xl">
        <Spinner className="size-5 text-muted-foreground" />
        <div className="space-y-1 text-center">
          <p className="font-mono text-xs text-muted-foreground">
            Reading metadata
          </p>
          <p className="font-mono text-xs text-foreground">
            {displayNameFromFile(fileName)}
            {formatLabel ? ` · ${formatLabel}` : null}
          </p>
        </div>
        <Button onClick={onCancel} size="sm" type="button" variant="outline">
          Cancel
        </Button>
      </div>
    </div>
  )
}
