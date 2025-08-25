import type { Preview } from '@storybook/react'
import '../src/app/globals.css'
import { ReactFlowProvider } from 'reactflow'

const preview: Preview = {
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => (
      <ReactFlowProvider>
        <Story />
      </ReactFlowProvider>
    ),
  ],
}

export default preview


