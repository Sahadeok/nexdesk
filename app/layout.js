import { TenantProvider } from '../lib/tenant-context'
import './globals.css'

export const metadata = {
  title: 'NexDesk — AI-Powered IT Support',
  description: 'Enterprise IT Support Management with AI Auto-Resolution',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'NexDesk',
  },
}

export const viewport = {
  themeColor: '#0a0e1a',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link href="https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;1,9..40,400&display=swap" rel="stylesheet" />
      </head>
      <body>
        <TenantProvider>
          {children}
        </TenantProvider>
        <script
          dangerouslySetInnerHTML={{
             __html: `if ('serviceWorker' in navigator) { window.addEventListener('load', function() { navigator.serviceWorker.register('/sw.js'); }); }`
          }}
        />
      </body>
    </html>
  )
}

