import type { Metadata, Viewport } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { Toaster } from '@/components/ui/sonner'
import { ThemeProvider } from '@/components/theme-provider'
import './globals.css'
import { SessionProvider } from '@/components/session-provider'
import { AtlineSplash } from '@/components/atline-splash'

export const metadata: Metadata = {
  formatDetection: {
    telephone: false,
    date: false,
    address: false,
    email: false,
  },
  title: 'Atline — Ton coach MLM',
  description:
    'Atline accompagne les distributeurs MLM : contacts, contenu Nova, réseau et coaching Atlas. App mobile française.',
  generator: 'v0.app',
  applicationName: 'Atline',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico' },
    ],
    apple: '/apple-touch-icon.v6.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Atline',
  },
}

export const viewport: Viewport = {
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f5f4f1' },
    { media: '(prefers-color-scheme: dark)',  color: '#0e0f14' },
  ],
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr" suppressHydrationWarning style={{ backgroundColor: '#f5f4f1' }}>
      <head>
        {/* Splash une seule fois par session : au refresh, l'attribut est posé avant le 1er paint (CSS le masque) */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var k='atl_splash_seen';if(sessionStorage.getItem(k)){document.documentElement.setAttribute('data-atl-splash-seen','1')}else{sessionStorage.setItem(k,'1')}}catch(e){}",
          }}
        />
      </head>
      <body className="font-sans antialiased">
        <ThemeProvider attribute="class" defaultTheme="light" disableTransitionOnChange>
          <SessionProvider>
          {children}
          </SessionProvider>
          <Toaster position="top-center" />
          <AtlineSplash />
          {process.env.NODE_ENV === 'production' && <Analytics />}
        </ThemeProvider>
      </body>
    </html>
  )
}
