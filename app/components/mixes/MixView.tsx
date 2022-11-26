import { Box } from '@mui/joy'
import { Fragment } from 'react'
import { getState, useLiveQuery } from '~/api/dbHandlers'
import OverviewCard from '~/components/mixes/OverviewCard'
import TrackCard from '~/components/mixes/TrackCard'
import { MixControl } from '~/components/tracks/Controls'

const MixView = () => {
  const { tracks = [] } = useLiveQuery(() => getState('mix')) || {}

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        p: 2,
      }}
    >
      {tracks.map((id, i) => (
        <TrackCard trackId={id} key={i} />
      ))}
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          gap: 15,
        }}
      >
        {tracks.map((id, i) => (
          <Fragment key={i}>
            <OverviewCard trackId={id} />
            {tracks.length > 1 && i === 0 ? (
              <MixControl tracks={tracks} />
            ) : null}
          </Fragment>
        ))}
      </div>
      <audio
        controls
        style={{ position: 'fixed', right: 0 }}
        id="eqAudio"
        src="/media/examples_player_audio_rave_digger.mp3"
      />
      <canvas height="200" width="200" id="eqCanvas" />
    </Box>
  )
}

export { MixView as default }
