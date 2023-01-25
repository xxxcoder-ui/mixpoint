// This file handles application state that is not persisted through page refreshes, therefore not in IndexedDB. appState is different from Prefs in that it isn't persistent.

import { ButtonProps } from '@mui/joy'
import createStore from 'teaful'
import { Player } from 'tone'
import { Stem, Track } from '~/api/db/dbHandlers'

// AudioState captures whether audio is being analyzed, processed, or played
const {
  getStore: getAudioState,
  useStore: audioState,
  setStore: setAudioState,
} = createStore<{
  [trackId: number]: AudioState
}>({})

type AudioState = Partial<{
  waveform: WaveSurfer
  playing: boolean
  nudged: 'forward' | 'backward' | undefined
  time: number
  volumeMeter: number
  volumeMeterInterval: ReturnType<typeof setInterval> | number
  stems: Stems
  stemState: StemState
}>

type Stems = Partial<{
  [key in Stem]: Partial<{
    player: Player
    volume: number
    volumeMeter: number
    mute: boolean
  }>
}>

type StemState =
  | 'selectStemDir'
  | 'grantStemDirAccess'
  | 'getStems'
  | 'processingStems'
  | 'convertingStems'
  | 'ready'

// TableState captures the state of the table, such as search value, which which rows are selected and track drawer open/closed state
const {
  getStore: getTableState,
  useStore: tableState,
  setStore: setTableState,
} = createStore<{
  search: string | number
  selected: Track['id'][]
  rowsPerPage: number
  page: number
  showButton: number | null
  openDrawer: boolean
  processing: boolean
  analyzing: Track['id'][]
}>({
  search: '',
  selected: [],
  rowsPerPage: 10,
  page: 0,
  showButton: null,
  openDrawer: false,
  processing: false,
  analyzing: [],
})

// ModalState is a generic handler for various modals, usually when doing something significant like deleting tracks
const { useStore: modalState, setStore: setModalState } = createStore<
  Partial<{
    openState: boolean
    headerText: string
    bodyText: string
    confirmColor: ButtonProps['color']
    confirmText: string
    onConfirm: Function
    onCancel: Function
  }>
>({
  openState: false,
})

// NotificationState is an alert handler
const { useStore: notificationState } = createStore<{
  message: string | null
  variant: 'success' | 'error' | 'warning' | 'info'
}>({
  message: '',
  variant: 'error',
})

export type { AudioState, Stems, StemState }
export {
  getAudioState,
  audioState,
  setAudioState,
  tableState,
  getTableState,
  setTableState,
  modalState,
  setModalState,
  notificationState,
}