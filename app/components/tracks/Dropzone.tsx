import { useState } from 'react'
import { useSnapshot } from 'valtio'
import { processTracks } from '~/api/handlers/audioHandlers.client'
import { addToMix } from '~/api/handlers/dbHandlers'
import { browseFile } from '~/api/handlers/fileHandlers'
import { uiState } from '~/api/models/appState.client'
import { UploadFolderIcon } from '~/components/icons'
import { ProgressBar } from '~/components/layout/Loader'

const itemsDropped = async (items: DataTransferItemList, trackSlot?: 0 | 1) => {
  const handleArray: (FileSystemFileHandle | FileSystemDirectoryHandle)[] = []
  const itemQueue = []

  for (const fileOrDirectory of items) {
    if (fileOrDirectory.kind === 'file') {
      itemQueue.push(
        fileOrDirectory
          .getAsFileSystemHandle()
          .then(
            handle =>
              handle &&
              handleArray.push(
                handle as FileSystemFileHandle | FileSystemDirectoryHandle
              )
          )
      )
    }
  }

  // Must use a promise queue with DataTransferItemList
  // https://stackoverflow.com/q/55658851/1058302
  await Promise.all(itemQueue)
  const tracks = await processTracks(handleArray)
  if (tracks[0]) addToMix(tracks[0].id, trackSlot)
}

const Dropzone = ({
  className,
  trackSlot
}: { className?: string; trackSlot?: 0 | 1 }) => {
  const { dropZoneLoader } = useSnapshot(uiState)
  const [dragOver, setDragOver] = useState(false)

  return dropZoneLoader ? (
    <div className="relative w-1/2 top-1/2 -mt-0.5 m-auto">
      <ProgressBar />
    </div>
  ) : (
    <div
      id="dropzone"
      className={`border-2 border-dashed cursor-pointer border-default-500 p-2 text-center rounded flex justify-center items-center duration-0 ${
        dragOver
          ? 'border-primary-500 bg-primary-500 bg-opacity-10'
          : 'bg-default-50'
      } hover:border-primary-500 active:border-primary-500 hover:bg-primary-500 hover:bg-opacity-10 active:bg-primary-500 active:bg-opacity-10 ${className}`}
      onClick={() => browseFile(trackSlot)}
      onKeyDown={e => {
        if (e.key === 'Enter') {
          browseFile(trackSlot)
        }
      }}
      onDrop={e => {
        e.preventDefault()
        itemsDropped(e.dataTransfer.items, trackSlot)
        setDragOver(false)
      }}
      onDragOver={e => {
        e.stopPropagation()
        e.preventDefault()
        setDragOver(true)
      }}
      onDragEnter={() => setDragOver(true)}
      onDragLeave={() => setDragOver(false)}
    >
      <div>
        <UploadFolderIcon className="text-default-600 text-4xl m-auto" />
        <div className="text-md font-semibold text-default-600">Add Tracks</div>
        <div className="text-sm text-default-600">Drag or click here</div>
      </div>
    </div>
  )
}

export { Dropzone as default, itemsDropped }
