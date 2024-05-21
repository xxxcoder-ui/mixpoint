// This file handles application state that may be persisted to local storage.
import type { ButtonProps } from '@nextui-org/react'
import type { Key } from 'react'
import { proxy, snapshot } from 'valtio'
import { devtools, proxySet, watch } from 'valtio/utils'
import type WaveSurfer from 'wavesurfer.js'
import { type Stem, type Track, db } from '~/api/handlers/dbHandlers'
import type { MixState, UserState } from '~/api/models/__dbSchema'
import { Env } from '~/utils/env'

// AudioState captures ephemeral state of a mix, while persistent state is stored in IndexedDB
const audioState = proxy<{
  [trackId: Track['id']]: AudioState
}>({})

type AudioState = Partial<{
  waveform: WaveSurfer // must be a valtio ref()
  playing: boolean
  time: number
  gainNode?: GainNode // gain controls actual loudness of track, must be a ref()
  analyserNode?: AnalyserNode // analyzerNode is used for volumeMeter, must be a ref()
  volume: number // volume is the crossfader value
  volumeMeter?: number // value between 0 and 1
  stems: Stems
  stemState: StemState
  stemTimer: number
}>

type Stems = {
  [key in Stem]: Partial<{
    waveform: WaveSurfer // must be a valtio ref()
    gainNode?: GainNode // gain controls actual loudness of stem, must be a ref()
    analyserNode?: AnalyserNode // analyzerNode is used for volumeMeter, must be a ref()
    volume: number // volume is the crossfader value
    volumeMeter: number
    mute: boolean
  }>
}

type StemState =
  | 'selectStemDir'
  | 'grantStemDirAccess'
  | 'getStems'
  | 'uploadingFile'
  | 'processingStems'
  | 'downloadingStems'
  | 'ready'
  | 'error'

// ModalState is a generic handler for various modals, usually when doing something significant like deleting tracks
type ModalState = Partial<{
  openState: boolean
  headerText: string
  bodyText: string
  confirmColor: ButtonProps['color']
  confirmText: string
  onConfirm: () => void
  onCancel: () => void
}>

// App captures the state of various parts of the app, mostly the table, such as search value, which which rows are selected and track drawer open/closed state
const uiState = proxy<{
  search: string | number
  selected: Set<Key> // NextUI table uses string keys
  rowsPerPage: number
  page: number
  showButton: number | null
  openDrawer: boolean
  dropZoneLoader: boolean
  processing: boolean
  analyzing: Set<Track['id']>
  stemsAnalyzing: Set<Track['id']>
  syncTimer: ReturnType<typeof requestAnimationFrame> | undefined
  audioContext?: AudioContext
  userEmail: string // email address
  modal: ModalState
}>({
  search: '',
  selected: proxySet(),
  rowsPerPage: 10,
  page: 1,
  showButton: null,
  openDrawer: false,
  dropZoneLoader: false,
  processing: false,
  analyzing: proxySet(),
  stemsAnalyzing: proxySet(),
  syncTimer: undefined,
  userEmail: '',
  modal: { openState: false },
})

// Pull latest persistent state from Dexie and populate Valtio store
let seeded = false
const initialMixState = (await db.appState.get('mixState')) as MixState
const mixState = proxy<MixState>(
  initialMixState || { tracks: [], trackState: {} }
)

watch(async get => {
  get(mixState)
  //@ts-ignore dexie typescript failure
  if (seeded) db.appState.put(snapshot(mixState), 'mixState')
})

const initialUserState = (await db.appState.get('userState')) as UserState
const userState = proxy<UserState>(initialUserState || {})

watch(async get => {
  get(userState)
  //@ts-ignore dexie typescript failure
  if (seeded) db.appState.put(snapshot(userState), 'userState')
})

seeded = true

if (Env === 'development') {
  devtools(uiState, { name: 'uiState', enable: true })
  devtools(mixState, { name: 'mixState', enable: true })
  devtools(userState, { name: 'userState', enable: true })
  // audioState waveforms cause memory issues in devtools
}

const initAudioState = async () => {
  // Start audioState init (if we have a mix in localstorage (valtio))
  const tracks = mixState.tracks

  if (tracks?.length) {
    for (const trackId of tracks) {
      audioState[Number(trackId)] = {}
    }
  }
}

initAudioState()

export { uiState, audioState, mixState, userState }
export type { AudioState, StemState, Stems, MixState }
