import type { Meta, StoryObj } from '@storybook/react'
import AddActionMenu from './AddActionMenu'

const meta: Meta<typeof AddActionMenu> = {
  title: 'AgentBuilder/AddActionMenu',
  component: AddActionMenu,
}
export default meta
type Story = StoryObj<typeof AddActionMenu>

export const Default: Story = {
  args: {
    groups: [
      { id: 'Top', title: 'Top', items: [
        { id: 'gmail', title: 'Gmail', subtitle: 'Send or reply to email' },
        { id: 'condition', title: 'Condition', subtitle: 'Branch flow based on a condition' },
        { id: 'loop', title: 'Enter Loop', subtitle: 'Iterate over items' },
        { id: 'http', title: 'HTTP', subtitle: 'Call an API' },
      ] },
      { id: 'Apps', title: 'Apps', items: [ { id:'sheets', title: 'Google Sheets' }, { id:'drive', title:'Google Drive' } ] },
      { id: 'Chat', title: 'Chat', items: [ { id:'slack', title: 'Slack' } ] },
      { id: 'AI', title: 'AI', items: [ { id:'agent', title: 'Agent Step' }, { id:'kb', title: 'Knowledge Base' } ] },
      { id: 'Logic', title: 'Logic', items: [ { id:'condition', title: 'Condition' }, { id:'loop', title:'Enter Loop' } ] },
      { id: 'Scrapers', title: 'Scrapers', items: [ { id:'webscrape', title:'Web Scraping' } ] },
      { id: 'By FlowPuppy', title: 'By FlowPuppy', items: [ { id:'runCode', title:'Run Code' } ] },
    ],
  },
}



