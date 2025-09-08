import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { AppProvider } from "@/lib/app-context"
import { validateEnvironmentVariables } from "@/lib/security"
import { Suspense } from "react"
import "./globals.css"

export const metadata: Metadata = {
  title: "羽球分隊管理系統",
  description: "智慧羽毛球分隊管理應用",
  generator: "v0.app",
  other: {
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
  },
}

// Initialize security validation
if (typeof window === 'undefined') {
  try {
    validateEnvironmentVariables()
  } catch (error) {
    console.error('Environment validation failed:', error)
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <Suspense fallback={null}>
          <AppProvider>{children}</AppProvider>
        </Suspense>
        <Analytics />
      </body>
    </html>
  )
}
