// this file provides top level error and catch boundaries, plus notification handling
import { VariantType, useSnackbar } from 'notistack'
import { useEffect } from 'react'

import { isRouteErrorResponse, useRouteError } from '@remix-run/react'

import InitialLoader from '~/components/InitialLoader'
import Layout from '~/components/layout/Layout'

const boundaryHandler = (message: string, variant: VariantType = 'error') => {
	const { enqueueSnackbar } = useSnackbar()
	enqueueSnackbar(message, { variant })
	return <InitialLoader message={message} />
}

// exporting this automatically uses it to capture errors
const ErrorBoundary = () => {
	const error = useRouteError() as Error
	console.error('error boundary: ', error)
	if (isRouteErrorResponse(error)) {
		return boundaryHandler(error.data.message, 'warning')
	}

	boundaryHandler(error.message || JSON.stringify(error))
}

const Boundary = () => {
	const { enqueueSnackbar } = useSnackbar()

	useEffect(() => {
		const notify = (e: CustomEventInit) =>
			enqueueSnackbar(e.detail.message, { variant: e.detail.variant })

		window.addEventListener('notify', notify)

		return () => window.removeEventListener('notify', notify)
	}, [enqueueSnackbar])

	return <Layout />
}

export { Boundary as default, ErrorBoundary }
