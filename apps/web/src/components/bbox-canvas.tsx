"use client"

import { useRef, useState } from "react"
import { ImagePlusIcon } from "lucide-react"
import type { AnnotatorState } from "@/atoms/annotator"
import { activeBoundingBox } from "@/atoms/annotator"
import { imagePointFromClient } from "@mtools/utils"
import { cn } from "@/lib/utils"

type BboxCanvasProps = {
  state: AnnotatorState
  onOpenImage: () => void
  onDropImage: (file: File) => void
  onDrawStart: (x: number, y: number) => void
  onDrawMove: (x: number, y: number) => void
  onDrawEnd: () => void
}

function imageFileFromTransfer(transfer: DataTransfer): File | undefined {
  return [...transfer.files].find((file) => file.type.startsWith("image/"))
}

export function BboxCanvas({
  state,
  onOpenImage,
  onDropImage,
  onDrawStart,
  onDrawMove,
  onDrawEnd,
}: BboxCanvasProps) {
  const surfaceRef = useRef<HTMLDivElement>(null)
  const dragDepthRef = useRef(0)
  const [isDraggingOver, setIsDraggingOver] = useState(false)

  const image = state.image
  const box = activeBoundingBox(state)

  const pointFromEvent = (clientX: number, clientY: number) => {
    const rect = surfaceRef.current?.getBoundingClientRect()
    if (!rect || !image) {
      return null
    }
    return imagePointFromClient(
      clientX,
      clientY,
      rect,
      image.width,
      image.height,
    )
  }

  const handleDragEnter = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    dragDepthRef.current += 1
    if (event.dataTransfer.types.includes("Files")) {
      setIsDraggingOver(true)
    }
  }

  const handleDragLeave = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    dragDepthRef.current -= 1
    if (dragDepthRef.current <= 0) {
      dragDepthRef.current = 0
      setIsDraggingOver(false)
    }
  }

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.dataTransfer.dropEffect = "copy"
  }

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    dragDepthRef.current = 0
    setIsDraggingOver(false)

    const file = imageFileFromTransfer(event.dataTransfer)
    if (file) {
      onDropImage(file)
    }
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!image) {
      return
    }
    event.currentTarget.setPointerCapture(event.pointerId)
    const point = pointFromEvent(event.clientX, event.clientY)
    if (point) {
      onDrawStart(point.x, point.y)
    }
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!state.draft) {
      return
    }
    const point = pointFromEvent(event.clientX, event.clientY)
    if (point) {
      onDrawMove(point.x, point.y)
    }
  }

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!state.draft) {
      return
    }
    event.currentTarget.releasePointerCapture(event.pointerId)
    onDrawEnd()
  }

  return (
    <div className="relative flex h-full min-h-0 w-full items-center justify-center">
      <div className="film-perf absolute inset-y-3 -left-3 w-2 rounded-l-sm opacity-70" />
      <div className="film-perf absolute inset-y-3 -right-3 w-2 rounded-r-sm opacity-70" />

      <div
        ref={surfaceRef}
        className={cn(
          "relative border border-table-edge",
          image
            ? "inline-flex h-full max-w-full cursor-crosshair overflow-hidden bg-table-matte touch-none shadow-[inset_0_0_0_1px_rgb(255_255_255/0.03)]"
            : "table-well h-full w-full",
          isDraggingOver && "border-primary ring-2 ring-primary/30",
        )}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {isDraggingOver ? (
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center bg-primary/10"
          >
            <span className="rounded-sm border border-primary/40 bg-background/80 px-4 py-2 font-mono text-xs tracking-[0.14em] text-primary uppercase">
              Drop image
            </span>
          </div>
        ) : null}

        {image ? (
          <>
            <img
              alt={image.name}
              className="block h-full max-w-full select-none object-contain"
              draggable={false}
              src={image.url}
            />
            {box && box.width > 0 && box.height > 0 ? (
              <div
                aria-hidden
                className="pointer-events-none absolute"
                style={{
                  left: `${(box.x / image.width) * 100}%`,
                  top: `${(box.y / image.height) * 100}%`,
                  width: `${(box.width / image.width) * 100}%`,
                  height: `${(box.height / image.height) * 100}%`,
                }}
              >
                <div className="absolute inset-0 border border-roi bg-roi/10" />
                <span className="absolute -top-px -left-px size-2 border-t-2 border-l-2 border-roi" />
                <span className="absolute -top-px -right-px size-2 border-t-2 border-r-2 border-roi" />
                <span className="absolute -bottom-px -left-px size-2 border-b-2 border-l-2 border-roi" />
                <span className="absolute -right-px -bottom-px size-2 border-r-2 border-b-2 border-roi" />
              </div>
            ) : null}
          </>
        ) : (
          <button
            className="flex h-full w-full flex-col items-center justify-center gap-5 overflow-visible px-8 text-center transition-colors hover:bg-white/[0.02] focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            onClick={onOpenImage}
            type="button"
          >
            <span className="flex size-14 shrink-0 items-center justify-center rounded-sm border border-border bg-muted/80 text-muted-foreground">
              <ImagePlusIcon aria-hidden />
            </span>
            <span className="flex max-w-xs shrink-0 flex-col gap-2 overflow-visible py-1">
              <span className="text-lg leading-8 text-foreground/90">
                Place an image on the table
              </span>
              <span className="text-sm leading-relaxed text-muted-foreground">
                Click, drag and drop, or use Open image above. Then drag to mark
                a region.
              </span>
            </span>
          </button>
        )}
      </div>
    </div>
  )
}
