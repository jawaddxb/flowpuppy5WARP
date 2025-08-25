import type { Meta, StoryObj } from '@storybook/react'
import GenericNode from './GenericNode'
import { ReactFlowProvider } from 'reactflow'

const meta: Meta<typeof GenericNode> = {
  title: 'Canvas/NodeCard/Generic',
  component: GenericNode,
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
type Story = StoryObj<typeof GenericNode>

export const Default: Story = {
  args: {
    id: 'n1',
    data: { label: 'HTTP Request', subtitle: 'GET https://api.example.com' },
  } as any,
}



