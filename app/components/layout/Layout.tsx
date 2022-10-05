import { Sheet, Box, BoxProps } from '@mui/joy'
import { useLiveQuery, getState, putState } from '~/api/db'

const Root = (props: BoxProps) => {
  const leftNavOpen = useLiveQuery(() => getState('app', 'leftNavOpen'))
  return (
    <Box
      {...props}
      sx={{
        bgcolor: 'background.surface',
        display: 'grid',
        gridTemplateColumns: {
          xs: '1fr',
          sm: 'minmax(64px, 200px) minmax(450px, 1fr)',
          md: 'minmax(160px, 250px) minmax(600px, 1fr)',
        },
        gridTemplateRows: '64px 1fr',
        minHeight: '100vh',
        ...(leftNavOpen && {
          height: '100vh',
          overflow: 'hidden',
        }),
      }}
    />
  )
}

const Header = (props: BoxProps) => (
  <Box
    component="header"
    {...props}
    sx={[
      {
        p: 2,
        gap: 2,
        bgcolor: 'background.surface',
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gridColumn: '1 / -1',
        borderBottom: '1px solid',
        borderColor: 'divider',
        position: 'sticky',
        top: 0,
        zIndex: 1100,
      },
      ...(Array.isArray(props.sx) ? props.sx : [props.sx]),
    ]}
  />
)

// not currently used
const SidePane = (props: BoxProps) => (
  <Box
    {...props}
    sx={[
      {
        bgcolor: 'background.surface',
        borderRight: '1px solid',
        borderColor: 'divider',
        display: {
          xs: 'none',
          md: 'initial',
        },
      },
      ...(Array.isArray(props.sx) ? props.sx : [props.sx]),
    ]}
  />
)

const MainContent = (props: BoxProps) => (
  <Box
    component="main"
    {...props}
    sx={[{ p: 3 }, ...(Array.isArray(props.sx) ? props.sx : [props.sx])]}
  />
)

const LeftNav = (props: BoxProps) => (
  <Box
    component="nav"
    {...props}
    sx={[
      {
        p: 2,
        bgcolor: 'background.componentBg',
        borderRight: '1px solid',
        borderColor: 'divider',
        display: {
          xs: 'none',
          sm: 'initial',
        },
      },
      ...(Array.isArray(props.sx) ? props.sx : [props.sx]),
    ]}
  />
)

const MobileNav = ({
  onClose,
  ...props
}: BoxProps & { onClose?: React.MouseEventHandler<HTMLDivElement> }) => (
  <Box
    {...props}
    sx={[
      { position: 'fixed', zIndex: 1200, width: '100%', height: '100%' },
      ...(Array.isArray(props.sx) ? props.sx : [props.sx]),
    ]}
  >
    <Box
      role="button"
      onClick={() => putState('app', { leftNavOpen: false })}
      sx={{
        position: 'absolute',
        inset: 0,
        bgcolor: theme =>
          `rgba(${theme.vars.palette.neutral.darkChannel} / 0.8)`,
      }}
    />
    <Sheet
      sx={{
        minWidth: 256,
        width: 'max-content',
        height: '100%',
        p: 2,
        boxShadow: 'lg',
        bgcolor: 'background.surface',
      }}
    >
      {props.children}
    </Sheet>
  </Box>
)

export default {
  Root,
  SidePane,
  LeftNav,
  MobileNav,
  MainContent,
  Header,
}
