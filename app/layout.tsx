import type React from "react"
import type { Metadata } from "next"
import { GeistSans } from "geist/font/sans"
import { GeistMono } from "geist/font/mono"
import { Analytics } from "@vercel/analytics/next"
import { AppProvider } from "@/lib/app-context"
import { Suspense } from "react"
import "./globals.css"

export const metadata: Metadata = {
  title: "羽球分队管理系统",
  description: "智能羽毛球分队管理应用",
  generator: "v0.app",
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
