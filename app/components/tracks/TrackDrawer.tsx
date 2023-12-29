import { Accordion, AccordionItem } from '@nextui-org/react'
import { appState } from '~/api/db/appState'
import TrackTable from '~/components//tracks/TrackTable'
import { ChevronIcon } from '~/components/icons'

const TrackDrawer = () => {
	const [openDrawer, setOpenDrawer] = appState.openDrawer()

	return (
		<Accordion
			isCompact
			hideIndicator
			className="absolute bottom-0 p-0"
			disableAnimation
		>
			<AccordionItem
				key="track-drawer"
				aria-label="track-drawer"
				onPress={() => setOpenDrawer(!openDrawer)}
				title={
					<ChevronIcon
						className={`text-3xl text-default-600 ${
							openDrawer ? 'rotate-90' : '-rotate-90'
						}`}
					/>
				}
				classNames={{
					base: 'border-t-1 border-primary-300',
					trigger: 'p-0',
					titleWrapper: 'flex-row justify-center'
				}}
			>
				<TrackTable />
			</AccordionItem>
		</Accordion>
	)
}

export { TrackDrawer as default }
