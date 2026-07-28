import type { Metadata } from 'next'
import { Inter, DM_Sans } from 'next/font/google'
import './globals.css'
import ThemeScript from '../components/theme-script'

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] })
const dmSans = DM_Sans({ variable: '--font-dm-sans', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Launch Analytics | Painel Executivo',
  description: 'Painel de controle executivo para lançamentos digitais',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${dmSans.variable} light`} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-screen" style={{ background: 'var(--bg-app)', color: 'var(--text-1)' }}>
        {children}
      </body>
    </html>
  )
}
