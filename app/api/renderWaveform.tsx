import { Card } from '@mui/joy'
import { SxProps } from '@mui/joy/styles/types'
import { useEffect } from 'react'
import { RegionParams } from 'wavesurfer.js/src/plugin/regions'
import { setAudioState } from '~/api/appState'
import { audioEvent, loadAudioEvents } from '~/api/audioEvents'
import { db, getTrackState, Track, TrackState } from '~/api/dbHandlers'
import { errorHandler } from '~/utils/notifications'
import { convertToSecs } from '~/utils/tableOps'
import { analyzeTracks } from './audioHandlers'
import { getPermission } from './fileHandlers'

// Only load WaveSurfer on the client
let WaveSurfer: typeof import('wavesurfer.js'),
  PlayheadPlugin: typeof import('wavesurfer.js/src/plugin/playhead').default,
  CursorPlugin: typeof import('wavesurfer.js/src/plugin/cursor').default,
  RegionsPlugin: typeof import('wavesurfer.js/src/plugin/regions').default,
  MinimapPlugin: typeof import('wavesurfer.js/src/plugin/minimap').default
if (typeof document !== 'undefined') {
  WaveSurfer = require('wavesurfer.js')
  PlayheadPlugin = require('wavesurfer.js/src/plugin/playhead').default
  CursorPlugin = require('wavesurfer.js/src/plugin/cursor').default
  RegionsPlugin = require('wavesurfer.js/src/plugin/regions').default
  MinimapPlugin = require('wavesurfer.js/src/plugin/minimap').default
}

const calcRegions = async (
  track: Track,
  partialTrackState: Partial<TrackState> = {}
): Promise<{
  duration: Track['duration']
  adjustedBpm: TrackState['adjustedBpm']
  skipLength: number
  beatResolution: TrackState['beatResolution']
  regions: RegionParams[]
  mixpoint: TrackState['mixpoint']
}> => {
  let { duration, offset, adjustedOffset, bpm } = track

  // isNaN check here to allow for zero values
  const valsMissing = !duration || isNaN(Number(bpm)) || isNaN(Number(offset))

  if (valsMissing) {
    const analyzedTracks = await analyzeTracks([track])
    ;({ duration, bpm, offset } = analyzedTracks[0])
  }

  if (!duration) throw errorHandler(`Please try adding ${track.name} again.`)

  const prevTrackState = await getTrackState(track.id)
  const TrackState = { ...prevTrackState, ...partialTrackState }
  let { adjustedBpm, beatResolution = 0.25, mixpoint } = TrackState

  const beatInterval = 60 / (adjustedBpm || bpm || 1)
  let startPoint = adjustedOffset || offset || 0
  const skipLength = beatInterval * (1 / beatResolution)

  // Work backward from initialPeak to start of track (zerotime) based on bpm
  while (startPoint - beatInterval > 0) startPoint -= beatInterval

  // Now that we have zerotime, move forward with regions based on the bpm
  const regions = []

  for (let time = startPoint; time < duration; time += skipLength) {
    regions.push({
      start: time,
      end: time + skipLength,
      color: 'rgba(255, 255, 255, 0)',
      drag: false,
      resize: false,
      showTooltip: false,
    })
  }
  return {
    duration,
    adjustedBpm,
    skipLength,
    regions,
    beatResolution,
    mixpoint,
  }
}

const Waveform = ({
  trackId,
  sx,
}: {
  trackId: Track['id']
  sx: SxProps
}): JSX.Element | null => {
  if (!trackId) throw errorHandler('No track to initialize.')

  useEffect(() => {
    // Retrieve track, file and region data, then set state in waveProps
    const getAudio = async () => {
      const track = await db.tracks.get(trackId)
      if (!track) throw errorHandler('Could not retrieve track from database.')

      const file = await getPermission(track)
      if (!file) throw errorHandler(`Please try adding ${track.name} again.`)

      setAudioState.analyzing(prev =>
        prev.includes(trackId) ? prev : [...prev, trackId]
      )

      const {
        duration,
        adjustedBpm,
        skipLength,
        regions,
        beatResolution,
        mixpoint,
      } = await calcRegions(track)

      const waveform = WaveSurfer.create({
        container: `#zoomview-container_${trackId}`,
        scrollParent: true,
        fillParent: false,
        pixelRatio: 1,
        barWidth: 2,
        barHeight: 0.9,
        barGap: 1,
        cursorColor: 'secondary.mainChannel',
        interact: false,
        skipLength,
        //@ts-ignore - author hasn't updated types for gradients
        waveColor: [
          'rgb(200, 165, 49)',
          'rgb(200, 165, 49)',
          'rgb(200, 165, 49)',
          'rgb(205, 124, 49)',
          'rgb(205, 124, 49)',
        ],
        progressColor: 'rgba(0, 0, 0, 0.25)',
        plugins: [
          PlayheadPlugin.create({
            returnOnPause: false,
            draw: true,
          }),
          CursorPlugin.create({
            showTime: true,
            opacity: '1',
            customShowTimeStyle: {
              color: '#eee',
              padding: '0 4px',
              'font-size': '10px',
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
            },
          }),
          RegionsPlugin.create({
            regions,
          }),
          MinimapPlugin.create({
            container: `#overview-container_${trackId}`,
            waveColor: [
              'rgba(145, 145, 145, 0.8)',
              'rgba(145, 145, 145, 0.8)',
              'rgba(145, 145, 145, 0.8)',
              'rgba(145, 145, 145, 0.5)',
              'rgba(145, 145, 145, 0.5)',
            ],
            progressColor: 'rgba(0, 0, 0, 0.25)',
            interact: true,
            scrollParent: false,
            hideScrollbar: true,
            pixelRatio: 1,
          }),
        ],
      })

      await loadAudioEvents({ trackId, waveform })

      if (file) waveform.loadBlob(file)

      waveform.zoom(beatResolution == 1 ? 80 : beatResolution == 0.5 ? 40 : 20)

      if (adjustedBpm)
        waveform.setPlaybackRate(adjustedBpm / (track?.bpm || adjustedBpm))

      // Configure wavesurfer event listeners
      waveform.on('ready', () => {
        setAudioState.analyzing(prev => prev.filter(id => id !== trackId))

        // Set playhead to mixpoint if it exists
        const currentPlayhead = mixpoint
          ? convertToSecs(mixpoint)
          : regions?.[0].start

        if (currentPlayhead) {
          waveform.playhead.setPlayheadTime(currentPlayhead)
          waveform.seekAndCenter(1 / (duration! / currentPlayhead))
        }
      })

      waveform.on('region-click', region => {
        if (waveform.isPlaying()) return waveform.pause()

        // Time gets inconsistent at 14 digits so need to round here
        const time = waveform.getCurrentTime().toFixed(3)
        const clickInsideOfPlayheadRegion =
          waveform.playhead.playheadTime.toFixed(3) == region.start.toFixed(3)
        const cursorIsAtPlayhead =
          time == waveform.playhead.playheadTime.toFixed(3)

        if (cursorIsAtPlayhead && clickInsideOfPlayheadRegion) {
          waveform.play()
        } else if (clickInsideOfPlayheadRegion) {
          // Take the user back to playhead
          waveform.seekAndCenter(
            1 / (duration! / waveform.playhead.playheadTime)
          )
        } else {
          // Move playhead to new region (seek is somewhat disorienting)
          waveform.playhead.setPlayheadTime(region.start)
        }
      })

      let volumeMeterInterval: ReturnType<typeof setInterval> | number // placeholder for setInterval

      const createVolumeMeter = () => {
        const analyzer = waveform.backend.analyser
        const bufferLength = analyzer.frequencyBinCount
        const dataArray = new Uint8Array(bufferLength)

        const caclculateVolume = () => {
          analyzer.getByteFrequencyData(dataArray)

          let sum = 0
          for (const amplitude of dataArray) {
            sum += amplitude * amplitude
          }

          const volume = Math.sqrt(sum / dataArray.length)
          if (trackId)
            audioEvent.emit(trackId, 'volumeMeter', {
              volume,
            })
        }

        waveform.on('play', () => {
          // Slow down sampling to 10ms
          if (volumeMeterInterval > -1) clearInterval(volumeMeterInterval)
          volumeMeterInterval = setInterval(() => caclculateVolume(), 10)
        })

        waveform.on('pause', () => {
          clearInterval(volumeMeterInterval)
          // Set to zero on pause
          audioEvent.emit(trackId, 'volumeMeter', {
            volume: 0,
          })
        })
      }

      createVolumeMeter()
    }

    getAudio()
  }, [trackId])

  return (
    <Card
      id={`zoomview-container_${trackId}`}
      sx={{
        ...sx,
        zIndex: 1,
      }}
      onWheel={e => audioEvent.emit(trackId, 'scroll', { up: e.deltaY > 0 })}
    />
  )
}

export { Waveform, calcRegions }
