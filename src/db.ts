import Dexie, { type EntityTable } from 'dexie'

export interface StoredTrack {
  id: string
  name: string
  data: Blob
  duration: number
  addedAt: number
  /** ID de vídeo de YouTube (11 caracteres), opcional */
  youtubeVideoId?: string
}

class MusicDB extends Dexie {
  tracks!: EntityTable<StoredTrack, 'id'>

  constructor() {
    super('KiraGamersMusic')
    this.version(1).stores({
      tracks: 'id, addedAt',
    })
    this.version(2).stores({
      tracks: 'id, addedAt',
    })
  }
}

export const db = new MusicDB()

export async function getAllTracksOrdered(): Promise<StoredTrack[]> {
  return db.tracks.orderBy('addedAt').toArray()
}

export async function addTrackFromFile(file: File): Promise<string> {
  const id = crypto.randomUUID()
  await db.tracks.add({
    id,
    name: file.name.replace(/\.[^/.]+$/, ''),
    data: file,
    duration: 0,
    addedAt: Date.now(),
  })
  return id
}

export async function removeTrack(id: string): Promise<void> {
  await db.tracks.delete(id)
}

export async function getTrackBlob(id: string): Promise<Blob | undefined> {
  const row = await db.tracks.get(id)
  return row?.data
}

export async function updateTrackDuration(id: string, duration: number): Promise<void> {
  await db.tracks.update(id, { duration })
}

export async function updateTrackYoutubeVideoId(
  id: string,
  youtubeVideoId: string | undefined,
): Promise<void> {
  await db.tracks.update(id, { youtubeVideoId })
}
