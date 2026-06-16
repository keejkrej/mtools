import type { BoundingBox } from "@mtools/contracts"

export function normalizeBoundingBox(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): BoundingBox {
  const x = Math.min(startX, endX)
  const y = Math.min(startY, endY)
  const width = Math.abs(endX - startX)
  const height = Math.abs(endY - startY)

  return { x, y, width, height }
}

export function clampBoundingBox(
  box: BoundingBox,
  maxWidth: number,
  maxHeight: number,
): BoundingBox {
  const x = Math.max(0, Math.min(box.x, maxWidth))
  const y = Math.max(0, Math.min(box.y, maxHeight))
  const width = Math.max(0, Math.min(box.width, maxWidth - x))
  const height = Math.max(0, Math.min(box.height, maxHeight - y))

  return { x, y, width, height }
}

export function imagePointFromClient(
  clientX: number,
  clientY: number,
  rect: DOMRect,
  imageWidth: number,
  imageHeight: number,
): { x: number; y: number } {
  const scaleX = imageWidth / rect.width
  const scaleY = imageHeight / rect.height

  return {
    x: (clientX - rect.left) * scaleX,
    y: (clientY - rect.top) * scaleY,
  }
}

export function displayBoxFromImageBox(
  box: BoundingBox,
  rect: DOMRect,
  imageWidth: number,
  imageHeight: number,
): BoundingBox {
  const scaleX = rect.width / imageWidth
  const scaleY = rect.height / imageHeight

  return {
    x: box.x * scaleX,
    y: box.y * scaleY,
    width: box.width * scaleX,
    height: box.height * scaleY,
  }
}
