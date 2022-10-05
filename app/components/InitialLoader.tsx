import { styled } from '@mui/joy'
import { CircularProgress } from '@mui/material'
import { Warning } from '@mui/icons-material'
import Logo from '~/components/MixpointLogo'

const LoaderWrapDiv = styled('div')`
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 12px;
  position: fixed;
  z-index: 99999;
  background-color: 'background.appBody';
  transition: opacity 200ms cubic-bezier(0.215, 0.61, 0.355, 1);
`

const LoaderDiv = styled('div')`
  min-width: 190px;
  max-width: 30%;
`

const LoaderRow = styled('div')`
  font-family: 'Roboto Mono', Menlo, Courier, monospace;
  line-height: 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
`

const LoaderSubtext = styled('span')(({ theme }) => ({
  color: theme.palette.text.primary,
}))

export default function InitialLoader({ message }: { message?: string }) {
  return (
    <LoaderWrapDiv>
      <LoaderDiv>
        <LoaderRow style={{ paddingBottom: '4px' }}>
          <Logo />
          {message ? (
            <Warning color="action" sx={{ pt: '4px' }} />
          ) : (
            <CircularProgress color="primary" size="18px" />
          )}
        </LoaderRow>
        <LoaderRow style={{ borderTop: '1px solid #e2e2e2' }}>
          <LoaderSubtext>{message || 'Please Wait. Loading...'}</LoaderSubtext>
        </LoaderRow>
      </LoaderDiv>
    </LoaderWrapDiv>
  )
}