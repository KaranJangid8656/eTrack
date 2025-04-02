"use client"

import { useEffect, useState } from "react"
import { Database, Download, RefreshCw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useDb } from "@/lib/db"
import { useToast } from "@/hooks/use-toast"

export default function DataExplorerPage() {
  const [activeTab, setActiveTab] = useState("expenses")
  const [searchTerm, setSearchTerm] = useState("")
  const [filterType, setFilterType] = useState("all")
  const [filterCategory, setFilterCategory] = useState("all")
  const [data, setData] = useState<any[]>([])
  const [filteredData, setFilteredData] = useState<any[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const { isReady, expenses: expenseOps, budgets: budgetOps } = useDb()
  const { toast } = useToast()
  const [currentUser, setCurrentUser] = useState<any>(null)

  useEffect(() => {
    // Get current user from session storage
    if (typeof window !== "undefined") {
      const userJson = sessionStorage.getItem("currentUser")
      if (userJson) {
        setCurrentUser(JSON.parse(userJson))
      }
    }
  }, [])

  useEffect(() => {
    if (isReady && currentUser) {
      loadData()
    }
  }, [isReady, currentUser, activeTab])

  useEffect(() => {
    if (data.length > 0) {
      applyFilters()
    }
  }, [data, searchTerm, filterType, filterCategory])

  const loadData = async () => {
    if (!currentUser) return

    setIsLoading(true)

    try {
      if (activeTab === "expenses") {
        const expenses = await expenseOps.getExpenses(currentUser.id)
        setData(expenses)

        // Extract unique categories
        const uniqueCategories = Array.from(new Set(expenses.map((expense: any) => expense.category)))
        setCategories(uniqueCategories as string[])
      } else if (activeTab === "budgets") {
        const budgets = await budgetOps.getBudgets(currentUser.id)
        setData(budgets)

        // Extract unique categories
        const uniqueCategories = Array.from(new Set(budgets.map((budget: any) => budget.category)))
        setCategories(uniqueCategories as string[])
      }
    } catch (error) {
      console.error(`Error loading ${activeTab}:`, error)
      toast({
        title: "Error",
        description: `Failed to load ${activeTab}`,
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...data]

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter((item) => {
        if (activeTab === "expenses") {
          return (
            item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            item.category.toLowerCase().includes(searchTerm.toLowerCase())
          )
        } else {
          return item.category.toLowerCase().includes(searchTerm.toLowerCase())
        }
      })
    }

    // Apply type filter (expenses only)
    if (activeTab === "expenses" && filterType !== "all") {
      filtered = filtered.filter((item) => item.type === filterType)
    }

    // Apply category filter
    if (filterCategory !== "all") {
      filtered = filtered.filter((item) => item.category === filterCategory)
    }

    setFilteredData(filtered)
  }

  const exportData = () => {
    if (typeof window === "undefined") return

    const dataToExport = filteredData.length > 0 ? filteredData : data
    const jsonString = JSON.stringify(dataToExport, null, 2)
    const blob = new Blob([jsonString], { type: "application/json" })
    const url = URL.createObjectURL(blob)

    const a = document.createElement("a")
    a.href = url
    a.download = `${activeTab}_export.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "Export successful",
      description: `${activeTab} data has been exported to JSON`,
    })
  }

  return (
    <div className="flex flex-col p-4 md:p-6 lg:p-8 w-full">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Data Explorer</h1>
          <p className="text-muted-foreground mt-1">Explore and analyze your financial data</p>
        </div>
        <Button onClick={exportData} variant="outline" disabled={isLoading || !isReady || data.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export Data
        </Button>
      </div>

      <Tabs defaultValue="expenses" value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="budgets">Budgets</TabsTrigger>
        </TabsList>

        <Card className="border-border/40 shadow-md card-hover">
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center">
                  <Database className="h-5 w-5 mr-2" />
                  {activeTab === "expenses" ? "Expense Data" : "Budget Data"}
                </CardTitle>
                <CardDescription>
                  {filteredData.length} {activeTab} found
                </CardDescription>
              </div>
              <Button variant="ghost" size="sm" onClick={loadData} disabled={isLoading || !isReady}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-4 mb-6">
              <div className="flex-1">
                <Input
                  placeholder={`Search ${activeTab}...`}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>

              {activeTab === "expenses" && (
                <div className="w-full md:w-[180px]">
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filter by type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                      <SelectItem value="expense">Expense</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="w-full md:w-[200px]">
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-muted/50">
                    {activeTab === "expenses" ? (
                      <>
                        <th className="border border-border p-2 text-left font-medium">ID</th>
                        <th className="border border-border p-2 text-left font-medium">Description</th>
                        <th className="border border-border p-2 text-left font-medium">Amount</th>
                        <th className="border border-border p-2 text-left font-medium">Date</th>
                        <th className="border border-border p-2 text-left font-medium">Category</th>
                        <th className="border border-border p-2 text-left font-medium">Type</th>
                      </>
                    ) : (
                      <>
                        <th className="border border-border p-2 text-left font-medium">ID</th>
                        <th className="border border-border p-2 text-left font-medium">Category</th>
                        <th className="border border-border p-2 text-left font-medium">Amount</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {filteredData.length > 0 ? (
                    filteredData.map((item) => (
                      <tr key={item.id} className="hover:bg-muted/30">
                        {activeTab === "expenses" ? (
                          <>
                            <td className="border border-border p-2">{item.id}</td>
                            <td className="border border-border p-2">{item.description}</td>
                            <td className="border border-border p-2">${item.amount.toFixed(2)}</td>
                            <td className="border border-border p-2">{new Date(item.date).toLocaleDateString()}</td>
                            <td className="border border-border p-2">{item.category}</td>
                            <td className="border border-border p-2">{item.type}</td>
                          </>
                        ) : (
                          <>
                            <td className="border border-border p-2">{item.id}</td>
                            <td className="border border-border p-2">{item.category}</td>
                            <td className="border border-border p-2">${item.amount.toFixed(2)}</td>
                          </>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={activeTab === "expenses" ? 6 : 3} className="border border-border p-4 text-center">
                        {isLoading ? (
                          <div className="flex justify-center items-center">
                            <RefreshCw className="h-5 w-5 animate-spin mr-2" />
                            Loading data...
                          </div>
                        ) : (
                          <>
                            No {activeTab} found.
                            {searchTerm || filterType !== "all" || filterCategory !== "all"
                              ? " Try adjusting your filters."
                              : ""}
                          </>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {filteredData.length} of {data.length} {activeTab}
            </div>
          </CardFooter>
        </Card>
      </Tabs>
    </div>
  )
}

