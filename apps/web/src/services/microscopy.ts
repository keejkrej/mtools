import type { ImageAsset } from "@mtools/contracts"
import {
  closeMicroscopyFile,
  formatMicroscopyLabel,
  isMicroscopyFileName,
  microscopyFrameToDataUrl,
  openMicroscopyFile,
  readMicroscopyFrame,
  type MicroscopyFormat,
  type MicroscopyFrameCoords,
  type OpenMicroscopyFileResult,
} from "@mtools/mdat-wasm"

export { isMicroscopyFileName }

export function formatLabelFromName(name: string): "ND2" | "CZI" | null {
  const lower = name.toLowerCase()
  if (lower.endsWith(".nd2")) {
    return "ND2"
  }
  if (lower.endsWith(".czi")) {
    return "CZI"
  }
  return null
}

export function displayNameFromFile(name: string): string {
  const lower = name.toLowerCase()
  if (lower.endsWith(".nd2") || lower.endsWith(".czi")) {
    return name.slice(0, -4)
  }
  return name
}

export function positionLabelFromFormat(format: MicroscopyFormat): string {
  return format === "czi" ? "Scene (S)" : "Position"
}

export async function inspectMicroscopyFile(
  file: File,
): Promise<OpenMicroscopyFileResult> {
  const bytes = new Uint8Array(await file.arrayBuffer())
  return openMicroscopyFile(file.name, bytes)
}

export async function closeInspectedMicroscopyFile(
  opened: OpenMicroscopyFileResult,
): Promise<void> {
  await closeMicroscopyFile(opened.handle)
}

export async function loadMicroscopyFrameImage(
  opened: OpenMicroscopyFileResult,
  coords: MicroscopyFrameCoords,
): Promise<ImageAsset> {
  try {
    const frame = await readMicroscopyFrame(opened.handle, coords)
    const url = microscopyFrameToDataUrl(frame)
    return {
      url,
      name: formatMicroscopyLabel(opened.name, coords),
      width: frame.width,
      height: frame.height,
      frame: {
        format: opened.format,
        position: coords.position,
        time: coords.time,
        channel: coords.channel,
        z: coords.z,
      },
    }
  } finally {
    await closeMicroscopyFile(opened.handle)
  }
}
