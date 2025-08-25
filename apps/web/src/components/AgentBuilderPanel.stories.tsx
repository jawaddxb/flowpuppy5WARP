import type { Meta, StoryObj } from '@storybook/react'
import AgentBuilderPanel from './AgentBuilderPanel'

const meta: Meta<typeof AgentBuilderPanel> = {
  title: 'AgentBuilder/Panel',
  component: AgentBuilderPanel,
}
export default meta
type Story = StoryObj<typeof AgentBuilderPanel>

export const Default: Story = {
  args: {
    connections: [
      { key: 'webscrape', name: 'Connect Webscraping', status: 'missing' },
      { key: 'openweather', name: 'Connect OpenWeather API', status: 'missing' },
      { key: 'google', name: 'Connect Google', status: 'missing' },
    ],
  },
}



