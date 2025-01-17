import { Button, Tooltip } from '@nextui-org/react'
import { GithubIcon } from '~/components/icons'
import DarkModeButton from '~/components/layout/DarkModeButton'
import LoginButton from '~/components/layout/LoginButton.client'
import Logo from '~/components/layout/MixpointLogo'
import SettingsButton from '~/components/layout/SettingsButton'

const Header = () => (
  <div className="p-4 flex flex-row bg-primary-50 justify-between items-center border-b border-default sticky z-10">
    <Logo />
    <div className="flex flex-row gap-x-2">
      <LoginButton />
      <Tooltip color="default" size="sm" content="Discuss on GitHub">
        <Button
          isIconOnly
          variant="light"
          color="primary"
          aria-label="Discuss on Github"
          radius="sm"
          size="sm"
          className="border-1 border-primary-300 rounded text-primary-700"
          onClick={() =>
            window.open('https://github.com/jgentes/mixpoint/discussions')
          }
        >
          <GithubIcon className="h-5" />
        </Button>
      </Tooltip>
      <DarkModeButton />
      <SettingsButton />
    </div>
  </div>
)

export { Header as default }
