// This file initializes Dexie (indexDB), defines the schema and creates tables
// Be sure to create MIGRATIONS for any changes to SCHEMA!
import Dexie from 'dexie'
import type { Key } from 'react'

// eventually allow the user to change these
const STATE_ROW_LIMIT = 100

// from https://dexie.org/docs/Typescript

class MixpointDb extends Dexie {
  tracks: Dexie.Table<Track, number>
  mixpoints: Dexie.Table<Mixpoint, number>
  mixes: Dexie.Table<Mix, number>
  sets: Dexie.Table<MixSet, number>
  setPrefs: Dexie.Table<SetPrefs>
  userPrefs: Dexie.Table<UserPrefs>
  trackCache: Dexie.Table<TrackCache>

  constructor() {
    super('MixpointDb')
    this.version(3).stores({
      tracks: '++id, name, bpm, [name+size]',
      mixpoints: '++id',
      mixes: '++id, tracks',
      sets: '++id, mixes',
      mixPrefs: 'date',
      setPrefs: 'date',
      userPrefs: 'date',
      trackCache: 'id',
    })
    // example migration:
    //
    // this.version(2).upgrade(tx => {
    //   tx.table('userPrefs')
    //     .toCollection()
    //     .modify(userPref => {
    //       if (userPref.sortDirection === 'asc')
    //         userPref.sortDirection = 'ascending'
    //       if (userPref.sortDirection === 'desc')
    //         userPref.sortDirection = 'descending'
    //     })
    // })

    this.tracks = this.table('tracks')
    this.mixpoints = this.table('mixpoints')
    this.mixes = this.table('mixes')
    this.sets = this.table('sets')
    this.setPrefs = this.table('setPrefs')
    this.userPrefs = this.table('userPrefs')
    this.trackCache = this.table('trackCache')
  }
}

const db = new MixpointDb()

// Core data models (tracks, mixes, sets)

type Track = {
  id: number
  name: string
  size: number
  type: string // type of file as returned from fileHandle
  fileHandle?: FileSystemFileHandle
  dirHandle?: FileSystemDirectoryHandle
  lastModified?: Date
  duration?: number
  bpm?: number
  sampleRate?: number
  offset?: number // first beat as determined by bpm analysis
  adjustedOffset?: number
  mixpoints?: {
    to: { [trackid: number]: Set<Mixpoint['id']> }
    from: { [trackid: number]: Set<Mixpoint['id']> }
  }
  mixes?: Set<number>
  sets?: Set<number>
}

const EFFECTS = ['gain', 'linear-ramp', 'exp-ramp'] as const
type Effect = (typeof EFFECTS)[number]

// a mixpoint is a point in a track where the user can add transition effects
type Mixpoint = {
  id?: number // id always exists but add/put complains if it's not there and in this type definition
  name: string
  effects: {
    [timecode: number]: { [key in Effect]: number } // timecode is a percentage of the track duration
  }
}

// a mix is a representation of the transition between tracks

type Mix = {
  id: number
  from: Track['id']
  to: Track['id']
  status: string // Todo: define good | bad | unknown?
  effects: {
    timestamp: number
    duration: number
  }[]
}

// would have used "Set" but it's protected in JS, so named it MixSet instead

type MixSet = {
  id: number
  mixIds: Mix['id'][]
}

// The TrackCache provides a cache for file data. This allows the app to render
// waveforms without prompting the user for permission to read the file from
// disk, which cannot be done without interacting with the page first.
// Each file is a few megabytes, so the cache must be limited.
const STEMS = ['drums', 'bass', 'vocals', 'other'] as const
type Stem = (typeof STEMS)[number]

type TrackCache = {
  id: Track['id']
  file?: File
  stems?: Partial<{
    [key in Stem]: { file?: File }
  }>
}

// State tables

// Each row in a state table is a full representation of state at that point in time
// This allows easy undo/redo of state changes by using timestamps (primary key)
// State tables are limited to STATE_ROW_LIMIT rows (arbitrarily 100)

type SetPrefs = Partial<{
  date: Date
  setId: MixSet['id']
}>

type UserPrefs = Partial<{
  date: Date
  sortDirection: 'ascending' | 'descending'
  sortColumn: Key
  visibleColumns: Set<Key> // track table visible columns
  stemsDirHandle: FileSystemDirectoryHandle // local folder on file system to store stems
}>

// For state getter and setter
type StoreTypes = {
  set: SetPrefs
  user: UserPrefs
}

// db hooks to limit the number of rows in a state table
const createHooks = (table: keyof StoreTypes) => {
  db[`${table}Prefs`].hook('creating', async () => {
    const count = await db[`${table}Prefs`].count()
    if (count > STATE_ROW_LIMIT) {
      const oldest = await db[`${table}Prefs`].orderBy('date').first()
      if (oldest) db[`${table}Prefs`].delete(oldest.date)
    }
  })
}

const tables = ['set', 'user'] as const
for (const table of tables) {
  createHooks(table)
}

// Avoid having two files export same type names
export type {
  Track as __Track,
  Mix as __Mix,
  Mixpoint as __Mixpoint,
  Effect as __Effect,
  MixSet as __MixSet,
  SetPrefs as __SetPrefs,
  UserPrefs as __UserPrefs,
  StoreTypes as __StoreTypes,
  TrackCache as __TrackCache,
  Stem as __Stem,
}
export { db as __db, STEMS as __STEMS, EFFECTS as __EFFECTS }
