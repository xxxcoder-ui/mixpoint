import { Add, Delete, PriorityHigh, SearchRounded } from '@mui/icons-material'
import {
  Button,
  Card,
  Checkbox,
  IconButton,
  TextField,
  Typography,
} from '@mui/joy'
import {
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  Toolbar,
  Tooltip,
} from '@mui/material'
import { alpha } from '@mui/material/styles'
import { visuallyHidden } from '@mui/utils'
import { superstate } from '@superstate/core'
import { useSuperState } from '@superstate/react'
import { ChangeEvent, MouseEvent, useMemo } from 'react'
import { dirtyTrackState } from '~/api/audio'
import { AppState, Track } from '~/api/db'
import { browseFile } from '~/api/fileHandlers'
import { createColumnDefinitions } from './tableColumns'

// Broadcast search query
const searchState = superstate<string | number>('')

// Toolbar is on top of the table, includes search, info, and button bar
const EnhancedTableToolbar = (props: { numSelected: number }) => {
  useSuperState(searchState)
  useSuperState(dirtyTrackState)

  const { numSelected } = props

  return (
    <Toolbar
      sx={{
        pl: { sm: 2 },
        pr: { xs: 1, sm: 2 },
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        gridColumn: '1 / -1',
        borderBottom: '1px solid',
        borderColor: 'divider',
        position: 'sticky',
        ...(numSelected > 0 && {
          bgcolor: theme =>
            alpha(
              theme.palette.primary.main,
              theme.palette.action.activatedOpacity
            ),
        }),
      }}
    >
      {numSelected > 0 ? (
        <Typography component="div">{numSelected} selected</Typography>
      ) : (
        <Typography id="tableTitle" component="div">
          Tracks
        </Typography>
      )}
      <TextField
        size="sm"
        variant="soft"
        placeholder="Search..."
        startDecorator={<SearchRounded color="primary" />}
        onChange={e => searchState.set(e.target.value)}
        value={searchState.now()}
        endDecorator={
          <IconButton variant="outlined" size="sm" color="neutral">
            <Typography fontWeight="lg" fontSize="sm" textColor="text.tertiary">
              /
            </Typography>
          </IconButton>
        }
        sx={{
          fontWeight: 'thin',
          flexBasis: '500px',
          mx: 2,
          display: {
            xs: 'none',
            sm: 'flex',
          },
        }}
      />
      {numSelected == 0 ? (
        <>
          {!dirtyTrackState.now().length ? null : (
            <div style={{ alignSelf: 'center' }}>
              <PriorityHigh style={{ marginRight: '5px' }} />
              {`BPM needed for ${dirtyTrackState.now().length} Track${
                dirtyTrackState.now().length === 1 ? '' : 's'
              }`}
            </div>
          )}
          <div style={{ alignSelf: 'center' }}>
            <Button size="sm" variant="soft" onClick={browseFile}>
              <Add />
              Add Track
            </Button>
          </div>
        </>
      ) : (
        <Tooltip title="Delete">
          <IconButton>
            <Delete />
          </IconButton>
        </Tooltip>
      )}
    </Toolbar>
  )
}

// Table header includes column headers, select all, and sort buttons
const EnhancedTableHead = (props: {
  numSelected: number
  onRequestSort: (event: MouseEvent<unknown>, property: keyof Track) => void
  onSelectAllClick: (event: ChangeEvent<HTMLInputElement>) => void
  sortDirection: AppState['sortDirection']
  sortOrderBy: AppState['sortOrderBy']
  rowCount: number
}) => {
  const {
    onSelectAllClick,
    sortDirection,
    sortOrderBy,
    numSelected,
    rowCount,
    onRequestSort,
  } = props

  // Build table columns (once)
  const columnDefs = useMemo(() => createColumnDefinitions(), [])

  const createSort =
    (property: keyof Track) => (event: MouseEvent<unknown>) => {
      onRequestSort(event, property)
    }

  return (
    <TableHead>
      <TableRow>
        <TableCell padding="none" sx={{ padding: '7px 12px 0 16px' }}>
          <Checkbox
            color="primary"
            indeterminate={numSelected > 0 && numSelected < rowCount}
            checked={rowCount > 0 && numSelected === rowCount}
            onChange={onSelectAllClick}
            title="Select all"
          />
        </TableCell>
        {columnDefs.map((column, i) => (
          <TableCell
            key={i}
            align={column.align}
            padding={column.padding}
            sx={{ ...column.sx }}
            sortDirection={sortOrderBy === column.dbKey ? sortDirection : false}
          >
            <TableSortLabel
              active={sortOrderBy === column.dbKey}
              direction={sortOrderBy === column.dbKey ? sortDirection : 'asc'}
              onClick={createSort(column.dbKey)}
            >
              {column.label}
              {sortOrderBy === column.dbKey ? (
                <Card component="span" sx={visuallyHidden}>
                  {sortDirection === 'desc'
                    ? 'sorted descending'
                    : 'sorted ascending'}
                </Card>
              ) : null}
            </TableSortLabel>
          </TableCell>
        ))}
      </TableRow>
    </TableHead>
  )
}

export { searchState, EnhancedTableToolbar, EnhancedTableHead }