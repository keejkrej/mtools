import init, {
  close_microscopy_file,
  open_microscopy_file,
  read_microscopy_frame,
} from "../wasm/mdat_wasm.js"
import type {
  MicroscopyFrameCoords,
  MicroscopyFrameResult,
  OpenMicroscopyFileResult,
} from "./types"

export type {
  MicroscopyFormat,
  MicroscopyFrameCoords,
  MicroscopyFrameResult,
  MicroscopySummary,
  OpenMicroscopyFileResult,
} from "./types"

export {
  formatMicroscopyLabel,
  isMicroscopyFileName,
  microscopyFrameToDataUrl,
} from "./frame"

let initPromise: Promise<void> | null = null

export async function initMdatWasm(): Promise<void> {
  if (!initPromise) {
    initPromise = init().then(() => undefined)
  }
  await initPromise
}

export async function openMicroscopyFile(
  name: string,
  bytes: Uint8Array,
): Promise<OpenMicroscopyFileResult> {
  await initMdatWasm()
  return open_microscopy_file(name, bytes) as OpenMicroscopyFileResult
}

export async function readMicroscopyFrame(
  handle: number,
  coords: MicroscopyFrameCoords,
): Promise<MicroscopyFrameResult> {
  await initMdatWasm()
  const frame = read_microscopy_frame(
    handle,
    coords.position,
    coords.time,
    coords.channel,
    coords.z,
  ) as MicroscopyFrameResult
  return {
    width: frame.width,
    height: frame.height,
    pixels: frame.pixels,
  }
}

export async function closeMicroscopyFile(handle: number): Promise<void> {
  await initMdatWasm()
  close_microscopy_file(handle)
}
