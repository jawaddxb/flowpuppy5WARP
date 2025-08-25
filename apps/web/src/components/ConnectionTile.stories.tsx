import type { Meta, StoryObj } from '@storybook/react'
import { ConnectionTile } from './ConnectionTile'

const meta: Meta<typeof ConnectionTile> = {
  title: 'Builder/ConnectionTile',
  component: ConnectionTile,
}

export default meta
type Story = StoryObj<typeof ConnectionTile>

export const Connected: Story = {
  args: {
    id: 'gmail',
    name: 'Gmail',
    icon: 'gmail',
    status: 'connected',
  } as any,
}

export const Missing: Story = {
  args: {
    id: 'openweather',
    name: 'OpenWeather',
    icon: 'weather',
    status: 'missing' as any,
  } as any,
}

export const Skipped: Story = {
  args: {
    id: 'gmail',
    name: 'Gmail',
    icon: 'gmail',
    status: 'skipped' as any,
  } as any,
}

export const ErrorState: Story = {
  args: {
    id: 'slack',
    name: 'Slack',
    icon: 'slack',
    status: 'error' as any,
  } as any,
}


