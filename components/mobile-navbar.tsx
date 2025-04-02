"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Menu, X, Home, CreditCard, PieChart, Settings, Database, LogOut, DollarSign } from "lucide-react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"

export function MobileNavbar() {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = () => {
    sessionStorage.removeItem("currentUser")
    router.push("/login")
    setIsOpen(false)
  }

  const menuItems = [
    {
      title: "Dashboard",
      icon: Home,
      href: "/dashboard",
    },
    {
      title: "Expenses",
      icon: CreditCard,
      href: "/expenses",
    },
    {
      title: "Budgets",
      icon: PieChart,
      href: "/budgets",
    },
    {
      title: "Data Explorer",
      icon: Database,
      href: "/sql-explorer",
    },
    {
      title: "Settings",
      icon: Settings,
      href: "/settings",
    },
  ]

  return (
    <>
      {/* Mobile navbar - only visible on small screens */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b border-border/40 h-16 px-4">
        <div className="flex items-center justify-between h-full">
          <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
            <DollarSign className="h-6 w-6 text-primary" />
            <span className="text-lg">Expense Tracker</span>
          </Link>
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(!isOpen)} aria-label="Toggle menu">
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile menu overlay */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="fixed right-0 top-0 h-full w-3/4 max-w-xs bg-background border-l border-border/40 shadow-xl p-4 pt-20"
            onClick={(e) => e.stopPropagation()}
          >
            <nav className="flex flex-col gap-2">
              {menuItems.map((item) => (
                <Link
                  key={item.title}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${
                    pathname === item.href ? "bg-primary/10 text-primary font-medium" : "hover:bg-accent/50"
                  }`}
                  onClick={() => setIsOpen(false)}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.title}</span>
                </Link>
              ))}
              <Button
                variant="ghost"
                className="flex items-center justify-start gap-3 px-4 py-3 mt-4 text-red-500 hover:text-red-600 hover:bg-red-500/10"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5" />
                <span>Logout</span>
              </Button>
            </nav>
          </div>
        </div>
      )}

      {/* Add padding to the top of the page to account for the fixed navbar */}
      <div className="md:hidden h-16"></div>
    </>
  )
}

