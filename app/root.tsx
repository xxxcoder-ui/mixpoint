// this file establishes the root component that renders all subsequent / child routes
// it also injects top level styling, HTML meta tags, links, and javascript for browser rendering

import { H, HighlightInit } from '@highlight-run/remix/client'
import { NextUIProvider } from '@nextui-org/react'
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  isRouteErrorResponse,
  useLoaderData,
  useRouteError,
  useSearchParams
} from '@remix-run/react'
import { Analytics } from '@vercel/analytics/react'
import {
  type LinksFunction,
  type LoaderFunctionArgs,
  type MetaFunction,
  json
} from '@vercel/remix'
import { ThemeProvider as NextThemesProvider } from 'next-themes'
import { useEffect, useState } from 'react'
import { Toaster } from 'react-hot-toast'
import { createHead } from 'remix-island'
import { Appwrite, account } from '~/AppwriteService'
import { uiState } from '~/api/models/appState.client'
import ConfirmModal from '~/components/layout/ConfirmModal'
import { InitialLoader } from '~/components/layout/Loader'
import globalStyles from '~/global.css?url'
import tailwind from '~/tailwind.css?url'
import { errorHandler } from '~/utils/notifications'
import { Env } from './utils/env'

const getCookie = (cookieString: string, cookieName: string) => {
  const cookies = cookieString ? cookieString.split('; ') : []
  for (let i = 0; i < cookies.length; i++) {
    const [name, value] = cookies[i].split('=')
    if (name === cookieName) {
      return decodeURIComponent(value)
    }
  }
  return null
}

// this is used to inject environment variables into the browser and session cookie on the server
export async function loader({ request }: LoaderFunctionArgs) {
  const HIGHLIGHT_PROJECT_ID =
    process.env.HIGHLIGHT_PROJECT_ID || 'highlight-project-id'
  const APPWRITE_PROJECT_ID =
    process.env.APPWRITE_PROJECT_ID || 'appwrite-project-id'
  const ENVIRONMENT = process.env.VERCEL_ENV || 'development'

  // set Appwrite session on the server
  const sessionName = `a_session_${APPWRITE_PROJECT_ID.toLowerCase()}`

  const hash =
    getCookie(request.headers.get('Cookie') ?? '', sessionName) ??
    getCookie(request.headers.get('Cookie') ?? '', `${sessionName}_legacy`) ??
    ''

  Appwrite.setSession(hash)
  // end Appwrite session

  return json({
    ENV: {
      HIGHLIGHT_PROJECT_ID,
      APPWRITE_PROJECT_ID,
      ENVIRONMENT
    }
  })
}

// remix-island is needed to address React 18.2 hydration issues
// TODO - remove this once React 18.3 is released
export const Head = createHead(() => (
  <>
    <Meta />
    <Links />
  </>
))

export const meta: MetaFunction = () => [
  { title: 'Mixpoint' },
  { description: 'Mixpoint is multi-track audio mixing app for the browser' },
  { viewport: 'width=device-width, initial-scale=1' }
]

export const links: LinksFunction = () => [
  {
    rel: 'icon',
    type: 'image/svg+xml',
    href: '/media/favicon.svg',
    sizes: '32x32'
  },
  { rel: 'stylesheet', href: tailwind },
  { rel: 'stylesheet', href: globalStyles }
]

const ThemeLoader = () => {
  const { ENV } = useLoaderData<typeof loader>()
  const [searchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // initial loading screen timeout
    const timer = setTimeout(
      () => {
        setLoading(false)
      },
      Env === 'development' ? 0 : 500
    )

    const checkSession = async () => {
      try {
        // for magic links
        const userId = searchParams.get('userId')
        if (userId) {
          const secret = searchParams.get('secret')
          if (secret) await Appwrite.updateMagicLink(userId, secret)
        }

        const user = await Appwrite.getUser()

        if (user?.email) {
          H.identify(user.email, { id: user.$id })
          uiState.userEmail = user.email
        }
      } catch (err) {
        uiState.userEmail = ''
      }
    }

    checkSession()

    return () => {
      clearTimeout(timer)
    }
  }, [searchParams])

  return (
    <>
      <HighlightInit
        projectId={ENV.HIGHLIGHT_PROJECT_ID}
        manualStart={Env === 'development'}
        enableCanvasRecording={Env === 'production'}
        serviceName="Mixpoint"
        tracingOrigins={[
          // match mixpoint.dev and any subdomain except appwrite.mixpoint.dev
          /^(?!appwrite.)([a-zA-Z0-9-]*.)?mixpoint.dev$/
        ]}
        networkRecording={{
          enabled: true,
          recordHeadersAndBody: true
        }}
      />
      <script
        // biome-ignore lint/security/noDangerouslySetInnerHtml: https://remix.run/docs/en/main/guides/envvars#server-environment-variables
        dangerouslySetInnerHTML={{
          __html: `
						window.ENV = ${JSON.stringify(ENV)};
					`
        }}
      />
      <Analytics />
      <NextUIProvider>
        <NextThemesProvider attribute="class" defaultTheme="dark">
          {loading ? (
            <InitialLoader />
          ) : (
            <>
              <Outlet context={account} />
              <ConfirmModal />
            </>
          )}
          <Toaster toastOptions={{ duration: 5000 }} />
        </NextThemesProvider>
      </NextUIProvider>
    </>
  )
}

const App = () => (
  <>
    <ThemeLoader />
    <Scripts />
  </>
)

export const ErrorBoundary = (error: Error) => {
  const routeError = (useRouteError() as Error) || error

  errorHandler(routeError)

  const message = isRouteErrorResponse(routeError)
    ? routeError.data.message || routeError.data || routeError
    : routeError?.message || JSON.stringify(routeError) // if not route error, allow for Error or string

  return (
    <>
      {!isRouteErrorResponse(routeError) || Env === 'development' ? null : (
        <>
          <script src="https://unpkg.com/highlight.run" />
          <script
            // biome-ignore lint/security/noDangerouslySetInnerHtml: remix reccomends this for injecting variables
            dangerouslySetInnerHTML={{
              __html: `
							H.init('${process.env.HIGHLIGHT_PROJECT_ID}');
						`
            }}
          />
        </>
      )}
      <InitialLoader message={message || 'Something went wrong'} />
      <Scripts />
    </>
  )
}

export default App
