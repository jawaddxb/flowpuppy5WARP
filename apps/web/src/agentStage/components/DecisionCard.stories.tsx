import type { Meta, StoryObj } from '@storybook/react'
import DecisionCard from './DecisionCard'
import { ReactFlowProvider } from 'reactflow'

const meta: Meta<typeof DecisionCard> = {
  title: 'Canvas/DecisionCard',
  component: DecisionCard,
  decorators: [
    (Story) => (
      <ReactFlowProvider>
        <div style={{ padding: 16, background: '#fff' }}>
          <Story />
        </div>
      </ReactFlowProvider>
    ),
  ],
}

export default meta
type Story = StoryObj<typeof DecisionCard>

export const WithChips: Story = {
  args: {
    id: 'n2',
    data: { branches: ['Yes','No'] },
  } as any,
}


