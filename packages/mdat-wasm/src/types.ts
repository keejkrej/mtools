export type MicroscopyFormat = "nd2" | "czi"

export type MicroscopySummary = {
  n_pos: number
  n_time: number
  n_chan: number
  n_z: number
  width: number
  height: number
}

export type OpenMicroscopyFileResult = {
  handle: number
  format: MicroscopyFormat
  name: string
  summary: MicroscopySummary
}

export type MicroscopyFrameCoords = {
  position: number
  time: number
  channel: number
  z: number
}

export type MicroscopyFrameResult = {
  width: number
  height: number
  pixels: Uint16Array
}
