export interface ImageEntry {
  time: string
  path: string
}

export class PlImageQuery {
  static create(encDataPath: string, wasmPath: string): Promise<PlImageQuery>
  queryByDate(date: string): ImageEntry[]
  getRemainingQueries(): number
  isInitialized(): boolean
  getEntryCount(): number
}

export function buildOssUrl(path: string): string

export async function queryImagesByDate(
  encDataPath: string,
  wasmPath: string,
  date: string
): Promise<ImageEntry[]>
