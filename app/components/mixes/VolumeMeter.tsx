import { audioState } from '~/api/db/appState'
import { type Stem, type Track } from '~/api/handlers/dbHandlers'

const VolumeMeter = ({
  trackId,
  stemType
}: {
  trackId: Track['id']
  stemType?: Stem
}) => {
  if (!trackId) return null

  const volumeMeter = stemType
    ? audioState.useState(
        state => state[trackId]?.stems[stemType]?.volumeMeter
      ) || 0
    : audioState.useState(state => state[trackId]?.volumeMeter) || 0

  return (
    <div
      id={`volume-container_${trackId}${stemType || ''}`}
      className="relative h-0.5 m-0.25"
    >
      <div className="absolute top-0 left-0 w-full h-full z-1 bg-gradient-to-r from-green-500 via-yellow-400 to-red-500" />
      <div
        style={{
          width: `${100 - volumeMeter * 100}%`
        }}
        className="bg-default-50 h-full z-10 absolute top-0 right-0"
      />
    </div>
  )
}

export { VolumeMeter as default }
