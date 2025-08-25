import type { Meta, StoryObj } from '@storybook/react'

function SimBanner() {
  return (
    <div className="px-2 py-1 rounded bg-amber-50 text-amber-700 border border-amber-300 text-xs inline-block">Simulated</div>
  )
}

const meta: Meta<typeof SimBanner> = {
  title: 'Builder/SimulatedBanner',
  component: SimBanner,
}
export default meta
type Story = StoryObj<typeof SimBanner>

export const Default: Story = { args: {} }


