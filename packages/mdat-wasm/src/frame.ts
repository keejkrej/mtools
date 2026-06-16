import type { MicroscopyFrameCoords, MicroscopyFrameResult } from "./types"

export function microscopyFrameToDataUrl(
  frame: Pick<MicroscopyFrameResult, "pixels" | "width" | "height">,
): string {
  const { pixels, width, height } = frame
  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height

  const context = canvas.getContext("2d")
  if (!context) {
    throw new Error("Could not create canvas context for microscopy frame")
  }

  const imageData = context.createImageData(width, height)
  let max = 0
  for (let index = 0; index < pixels.length; index += 1) {
    if (pixels[index] > max) {
      max = pixels[index]
    }
  }

  const scale = max > 0 ? 255 / max : 1
  for (let index = 0; index < pixels.length; index += 1) {
    const value = Math.min(255, Math.round(pixels[index] * scale))
    const offset = index * 4
    imageData.data[offset] = value
    imageData.data[offset + 1] = value
    imageData.data[offset + 2] = value
    imageData.data[offset + 3] = 255
  }

  context.putImageData(imageData, 0, 0)
  return canvas.toDataURL("image/png")
}

export function formatMicroscopyLabel(
  fileName: string,
  coords: MicroscopyFrameCoords,
): string {
  return `${fileName} · P${coords.position} T${coords.time} C${coords.channel} Z${coords.z}`
}

export function isMicroscopyFileName(name: string): boolean {
  const lower = name.toLowerCase()
  return lower.endsWith(".nd2") || lower.endsWith(".czi")
}
