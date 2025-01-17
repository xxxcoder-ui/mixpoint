import { H } from '@highlight-run/remix/client'
import {
  STEMS,
  type Stem,
  type Track,
  db,
  storeTrackCache
} from '~/api/handlers/dbHandlers'
import { getStemsDirHandle } from '~/api/handlers/fileHandlers'
import { audioState } from '~/api/models/appState.client'
import { errorHandler } from '~/utils/notifications'

const STEMPROXY = 'https://stems.mixpoint.dev'

type StemsArray = {
  name: string
  type: Stem
  file: Blob
}[]

const stemAudio = async (trackId: Track['id']) => {
  // retrieve file from cache
  const { file } = (await db.trackCache.get(trackId)) || {}
  if (!file) throw errorHandler('No file found for track, try re-adding it.')

  const ENDPOINT_URL = `${STEMPROXY}/${encodeURIComponent(file.name)}`
  const FILENAME = file.name.substring(0, file.name.lastIndexOf('.'))
  const ENDPOINT_URL_NOEXT = `${STEMPROXY}/${FILENAME}`

  // ensure we have access to a directory to save the stems
  const dirHandle = await getStemsDirHandle()
  if (!dirHandle) {
    // this would be due to denial of permission (ie. clicked cancel)
    throw errorHandler('Permission to the file or folder was denied.')
  }

  H.track('Track Stemmed')

  audioState[trackId].stemState = 'uploadingFile'
  audioState[trackId].stemTimer = 100

  const handleErr = (msg?: string) => {
    audioState[trackId].stemState = 'error'
    throw errorHandler(`Error generating stems: ${msg}`)
  }

  const sendFile = async () => {
    const formData = new FormData()
    formData.append('file', file)

    try {
      await fetch(ENDPOINT_URL, {
        method: 'PUT',
        body: formData
      })
    } catch (e) {
      return handleErr('Error uploading file for stem processing')
    }

    // set timer for processing stems
    const { size } = (await db.tracks.get(trackId)) || {}
    // 0.03 seconds per MB
    audioState[trackId].stemTimer = ((size || 1) / 1000) * 0.02

    return // started
  }

  const checkForStems = async (): Promise<StemsArray> => {
    return new Promise((resolve, reject) => {
      const waitForStems = async (): Promise<void> => {
        const res = await fetch(ENDPOINT_URL, {
          method: 'HEAD'
        })

        if (res.status === 202) {
          setTimeout(waitForStems, 10000) // Retry after 10 seconds
          return
        }
        if (res.status === 500) reject(handleErr('Error generating stems'))
        if (res.status === 200) {
          try {
            const stems = await Promise.all(
              STEMS.map(async stem => {
                const res = await fetch(`${ENDPOINT_URL_NOEXT}/${stem}.mp3`)

                if (res.ok)
                  return {
                    name: `${FILENAME} - ${stem}.mp3`,
                    type: stem,
                    file: await res.blob()
                  }
                throw new Error(await res?.text())
              })
            )

            resolve(stems)
          } catch (error) {
            reject(error)
          }
        } else return handleErr(`Unexpected server response: ${res.status}`)
      }

      waitForStems()
    })
  }

  // send file to stemproxy and wait for stems
  await sendFile()

  audioState[trackId].stemState = 'processingStems'

  // wait for stems to be generated
  const stems: StemsArray = await checkForStems()

  audioState[trackId].stemState = 'downloadingStems'

  // create a new dir with name of audio file
  let stemsDirHandle: FileSystemDirectoryHandle
  try {
    stemsDirHandle = await dirHandle.getDirectoryHandle(`${FILENAME} - stems`, {
      create: true
    })
  } catch (e) {
    throw errorHandler('Error creating directory for stems.')
  }

  for (const { name, type, file } of stems) {
    const stemFile = await stemsDirHandle.getFileHandle(name, {
      create: true
    })

    const writable = await stemFile.createWritable()
    try {
      await writable.write(file)
      await writable.close()
    } catch (error) {
      throw errorHandler(`Error storing stem file: ${error}`)
    }

    // store stem in cache
    await storeTrackCache({
      id: trackId,
      stems: { [type]: { file } }
    })
  }
  // give a couple of seconds before trying to render the stem waveform
  audioState[trackId].stemState = 'ready'
}

export { stemAudio }
