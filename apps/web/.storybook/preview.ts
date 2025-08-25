import type { Preview } from '@storybook/react'
import React from 'react'
import '../src/app/globals.css'
import { ReactFlowProvider } from 'reactflow'

const preview: Preview = {
  parameters: {
    layout: 'centered',
  },
  decorators: [
    (Story) => React.createElement(ReactFlowProvider, null, React.createElement(Story)),
  ],
}

export default preview



