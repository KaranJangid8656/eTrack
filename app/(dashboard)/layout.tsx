"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/app-sidebar"
import { MobileNavbar } from "@/components/mobile-navbar"
import { SidebarProvider } from "@/components/ui/sidebar"
import { useDb } from "@/lib/db"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const { isReady } = useDb()

  useEffect(() => {
    // Check if user is logged in
    const currentUser = sessionStorage.getItem("currentUser")
    if (!currentUser && typeof window !== "undefined") {
      router.push("/login")
    } else {
      setIsLoading(false)
    }
  }, [router])

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full">
        {/* Desktop sidebar */}
        <AppSidebar />

        {/* Mobile navbar */}
        <MobileNavbar />

        <div className="flex-1 w-full dashboard-gradient">{children}</div>
      </div>
    </SidebarProvider>
  )
}

