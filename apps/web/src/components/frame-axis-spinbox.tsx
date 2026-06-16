"use client"

import { ChevronDownIcon, ChevronUpIcon } from "lucide-react"
import { cn } from "@/lib/utils"

type FrameAxisSpinboxProps = {
  id?: string
  label: string
  value: number
  max: number
  onChange: (value: number) => void
}

export function clampAxisValue(value: number, max: number): number {
  if (!Number.isFinite(value) || value < 0) {
    return 0
  }
  return Math.min(Math.floor(value), Math.max(max, 0))
}

export function FrameAxisSpinbox({
  id,
  label,
  value,
  max,
  onChange,
}: FrameAxisSpinboxProps) {
  const clamped = clampAxisValue(value, max)
  const rangeLabel = max === 0 ? "0" : `0–${max}`

  const setValue = (next: number) => {
    onChange(clampAxisValue(next, max))
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label
          className="font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase"
          htmlFor={id}
        >
          {label}
        </label>
        <span className="font-mono text-[10px] text-muted-foreground/70">
          {rangeLabel}
        </span>
      </div>

      <div className="flex rounded-lg border border-input bg-background shadow-xs/5 ring-ring/24 has-focus-within:border-ring has-focus-within:ring-[3px] dark:bg-input/32">
        <input
          className="h-8.5 min-w-0 flex-1 rounded-l-[calc(var(--radius-lg)-1px)] bg-transparent px-3 font-mono text-sm tabular-nums outline-none [appearance:textfield] sm:h-7.5 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          id={id}
          inputMode="numeric"
          max={max}
          min={0}
          onChange={(event) => {
            const parsed = Number.parseInt(event.target.value, 10)
            setValue(Number.isNaN(parsed) ? 0 : parsed)
          }}
          step={1}
          type="number"
          value={clamped}
        />
        <div className="flex flex-col border-l border-input">
          <button
            aria-label={`Increase ${label}`}
            className={cn(
              "flex flex-1 items-center justify-center px-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40",
              "rounded-tr-[calc(var(--radius-lg)-1px)]",
            )}
            disabled={clamped >= max}
            onClick={() => {
              setValue(clamped + 1)
            }}
            type="button"
          >
            <ChevronUpIcon className="size-3.5" />
          </button>
          <button
            aria-label={`Decrease ${label}`}
            className={cn(
              "flex flex-1 items-center justify-center border-t border-input px-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:pointer-events-none disabled:opacity-40",
              "rounded-br-[calc(var(--radius-lg)-1px)]",
            )}
            disabled={clamped <= 0}
            onClick={() => {
              setValue(clamped - 1)
            }}
            type="button"
          >
            <ChevronDownIcon className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
