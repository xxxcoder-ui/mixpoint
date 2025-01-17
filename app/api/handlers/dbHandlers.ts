// This file provides a few helper functions for interacting with the database
import { useLiveQuery } from 'dexie-react-hooks'
import { audioEvents } from '~/api/handlers/audioEvents.client'
import { getPermission } from '~/api/handlers/fileHandlers'
import {
  EFFECTS,
  type Effect,
  type Mix,
  type MixSet,
  type Mixpoint,
  STEMS,
  type Stem,
  type Track,
  type TrackCache,
  db
} from '~/api/models/appModels'
import { audioState, mixState } from '~/api/models/appState.client'
import { errorHandler } from '~/utils/notifications'

const CACHE_LIMIT = 25

const storeTrackCache = async ({
  id,
  file,
  stems
}: {
  id: TrackCache['id']
  file?: TrackCache['file']
  stems?: TrackCache['stems']
}) => {
  // Retrieve any existing cache data
  const cache = await db.trackCache.get(id)
  if (!file) file = cache?.file
  if (cache?.stems) stems = { ...cache.stems, ...stems }

  // Enforce database limit
  const count = await db.trackCache.count()
  if (count > CACHE_LIMIT) {
    const oldest = await db.trackCache.orderBy('id').first()
    if (oldest) db.trackCache.delete(oldest.id)
  }

  await db.trackCache.put({ id, file, stems })
}

const updateTrack = async (
  trackId: Track['id'],
  keyvals: Partial<Track>
): Promise<Track> => {
  if (!trackId) throw errorHandler('No track id provided')

  const track = await db.tracks.get(trackId)
  if (!track) throw errorHandler('No track found, try re-adding it.')

  const updatedTrack = { ...track, ...keyvals }

  await db.tracks.put(updatedTrack)

  return updatedTrack
}

type TrackIdOptional = Omit<Track, 'id'> & Partial<Pick<Track, 'id'>>

const putTracks = async (tracks: TrackIdOptional[]): Promise<Track[]> => {
  const bulkTracks: Omit<Track, 'id'>[] = []

  for (let track of tracks) {
    if (!track) continue

    // if this is a new file, check for existing track with same name and size
    if (!track.id) {
      // if below line changes, potentially remove [name+size] index
      const dup = await db.tracks.get({ name: track.name, size: track.size })
      // if we found the track in the database already, set the primary key
      if (dup) track = { ...dup, ...track }
    }

    track.lastModified = new Date()

    // push into bulk array if it's not already there
    if (!bulkTracks.some(t => t.name === track?.name && t.size === track?.size))
      bulkTracks.push(track)
  }

  const updatedTracks = await db.tracks.bulkPut(bulkTracks as Track[], {
    allKeys: true
  })
  return (await db.tracks.bulkGet(updatedTracks)) as Track[]
}

const removeTracks = async (ids: Track['id'][]): Promise<void> => {
  await db.tracks.bulkDelete(ids)

  // Ensure we delete the file cache when a track is deleted
  await db.trackCache.bulkDelete(ids)
}
// const addMix = async (
//   trackIds: Track['id'][],
//   mixPoints: MixPoint[]
// ): Promise<number> =>
//   await db.mixes.add({ trackIds, mixPoints })

// Dirty tracks need analysis to determine bpm and duration
const getDirtyTracks = async (): Promise<Track[]> =>
  await db.tracks.filter(t => !t.bpm).toArray()

const getMix = async (id: number): Promise<Mix | undefined> =>
  await db.mixes.get(id)

const removeMix = async (id: number): Promise<void> => await db.mixes.delete(id)

const getTrackName = async (trackId: Track['id']) => {
  if (!trackId) return null

  const { name } = (await db.tracks.get(trackId)) || {}

  return name?.slice(0, -4) || 'Loading...'
}

const putMixpoint = async (
  name: string,
  effect: { [key in Effect]: number }[],
  mixpointId?: number
) => {
  if (!effect) return errorHandler('No effect provided')

  const effects: { [timecode: number]: { [key in Effect]: number } } = {}

  for (const [index, effectObj] of effect.entries()) {
    effects[index] = effectObj
  }

  if (!mixpointId) {
    if (!name) {
      return errorHandler('No name provided')
    }

    return await db.mixpoints.put({
      name,
      effects
    })
  }

  const currentMixpoint = await db.mixpoints.get(mixpointId)
  if (!currentMixpoint) return errorHandler(`Mixpoint ${mixpointId} not found`)

  const newEffects = { ...currentMixpoint.effects, ...effects }

  const newMixpoint = {
    ...currentMixpoint,
    ...{ name: name || currentMixpoint.name, effects: newEffects }
  }

  await db.mixpoints.put(newMixpoint, mixpointId)
}

const deleteMixpoint = async (mixpointId: number) => {
  await db.mixpoints.delete(mixpointId)
}

const addToMix = async (trackId: Track['id'], trackSlot?: 0 | 1) => {
  const file = await getPermission(trackId)
  if (!file) return

  const tracks = mixState.tracks

  // tracks should retain their position (ie. [0, 1])
  // is there a track in first position? if not, put this track there
  const index = trackSlot ?? tracks[0] ? 1 : 0

  // if there's already a track in this position, remove it first
  if (tracks[index]) {
    await audioEvents.ejectTrack(Number(tracks[index]))
  }

  audioState[trackId] = {}

  mixState.tracks[index] = trackId
  mixState.trackState[trackId] = {}
}

export type { Track, Mix, Mixpoint, MixSet, TrackCache, Effect, Stem }
export {
  db,
  STEMS,
  EFFECTS,
  useLiveQuery,
  updateTrack,
  putTracks,
  removeTracks,
  getDirtyTracks,
  putMixpoint,
  deleteMixpoint,
  getMix,
  removeMix,
  addToMix,
  getTrackName,
  storeTrackCache
}
