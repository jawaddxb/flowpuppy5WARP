export interface ScheduleSpec {
  type: 'interval' | 'cron'
  value: string
}

export interface AgentSpec {
  name: string
  inputs?: { schedule?: ScheduleSpec }
  sources?: {
    prices?: { type: 'api' | 'scrape'; endpoint?: string }
    weather?: { type: 'openweather' | 'api'; location?: string }
  }
  analysis?: { merge?: boolean; computeSavings?: boolean }
  decision?: { rules: Array<{ when: string; action: 'CHARGE' | 'SELL' | 'HOLD' | string }> }
  actions?: {
    controlStorage?: { type: 'http'; method: 'GET' | 'POST'; endpoint: string }
    notification?: { type: 'email'; to: string; subjectTpl?: string }
  }
}



