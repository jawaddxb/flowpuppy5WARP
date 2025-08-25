import './globals.css'
import type { Metadata } from 'next'
import AppShell from '../components/AppShell'
import { I18nProvider } from '../components/I18nProvider'
import AuthProvider from '../components/AuthProvider'

export const metadata: Metadata = {
  title: 'FlowPuppy',
  description: 'AI-powered workflow creation and mini-app generation',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <I18nProvider>
            <AppShell>
              {children}
            </AppShell>
          </I18nProvider>
        </AuthProvider>
      </body>
    </html>
  )
}

