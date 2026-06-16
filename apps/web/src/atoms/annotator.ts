import type { BoundingBox, ImageAsset } from "@mtools/contracts"
import { clampBoundingBox, normalizeBoundingBox } from "@mtools/utils"

export type DrawDraft = {
  startX: number
  startY: number
  currentX: number
  currentY: number
}

export type AnnotatorState = {
  image: ImageAsset | null
  bbox: BoundingBox | null
  draft: DrawDraft | null
  error: string | null
}

export const initialAnnotatorState: AnnotatorState = {
  image: null,
  bbox: null,
  draft: null,
  error: null,
}

export type AnnotatorAction =
  | { type: "image-loaded"; image: ImageAsset }
  | { type: "restore-session"; image: ImageAsset; bbox: BoundingBox | null }
  | { type: "image-error"; message: string }
  | { type: "clear-image" }
  | { type: "draw-start"; x: number; y: number }
  | { type: "draw-move"; x: number; y: number }
  | { type: "draw-end" }
  | { type: "clear-bbox" }

export function annotatorReducer(
  state: AnnotatorState,
  action: AnnotatorAction,
): AnnotatorState {
  switch (action.type) {
    case "image-loaded":
      return {
        image: action.image,
        bbox: null,
        draft: null,
        error: null,
      }
    case "restore-session":
      return {
        image: action.image,
        bbox: action.bbox,
        draft: null,
        error: null,
      }
    case "image-error":
      return {
        ...state,
        error: action.message,
      }
    case "clear-image":
      return initialAnnotatorState
    case "draw-start":
      if (!state.image) {
        return state
      }
      return {
        ...state,
        draft: {
          startX: action.x,
          startY: action.y,
          currentX: action.x,
          currentY: action.y,
        },
        bbox: null,
        error: null,
      }
    case "draw-move":
      if (!state.draft) {
        return state
      }
      return {
        ...state,
        draft: {
          ...state.draft,
          currentX: action.x,
          currentY: action.y,
        },
      }
    case "draw-end": {
      if (!state.draft || !state.image) {
        return { ...state, draft: null }
      }

      const raw = normalizeBoundingBox(
        state.draft.startX,
        state.draft.startY,
        state.draft.currentX,
        state.draft.currentY,
      )

      const bbox =
        raw.width < 2 || raw.height < 2
          ? null
          : clampBoundingBox(raw, state.image.width, state.image.height)

      return {
        ...state,
        draft: null,
        bbox,
      }
    }
    case "clear-bbox":
      return {
        ...state,
        bbox: null,
        draft: null,
      }
  }
}

export function draftBoundingBox(draft: DrawDraft): BoundingBox {
  return normalizeBoundingBox(
    draft.startX,
    draft.startY,
    draft.currentX,
    draft.currentY,
  )
}

export function activeBoundingBox(state: AnnotatorState): BoundingBox | null {
  if (state.draft) {
    return draftBoundingBox(state.draft)
  }
  return state.bbox
}
