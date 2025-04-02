"use client"

import { useEffect, useState } from "react"
import { ArrowDownIcon, ArrowUpIcon, Edit, Plus, Search, Trash, MoreHorizontal, Filter } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ExpenseDialog } from "@/components/expense-dialog"
import { formatCurrency } from "@/lib/utils"
import type { Expense } from "@/types/expense"
import { useToast } from "@/hooks/use-toast"

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [typeFilter, setTypeFilter] = useState("all")
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [showFilters, setShowFilters] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    // Load expenses from local storage
    const storedExpenses = localStorage.getItem("expenses")
    if (storedExpenses) {
      setExpenses(JSON.parse(storedExpenses))
    }
  }, [])

  useEffect(() => {
    // Apply filters
    let filtered = [...expenses]

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(
        (expense) =>
          expense.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
          expense.category.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    }

    // Filter by type
    if (typeFilter !== "all") {
      filtered = filtered.filter((expense) => expense.type === typeFilter)
    }

    // Filter by category
    if (categoryFilter !== "all") {
      filtered = filtered.filter((expense) => expense.category === categoryFilter)
    }

    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    setFilteredExpenses(filtered)
  }, [expenses, searchQuery, typeFilter, categoryFilter])

  const handleAddExpense = (newExpense: Expense) => {
    let updatedExpenses

    if (editingExpense) {
      // Update existing expense
      updatedExpenses = expenses.map((expense) => (expense.id === editingExpense.id ? newExpense : expense))
      toast({
        title: "Expense updated",
        description: "Your expense has been updated successfully",
      })
    } else {
      // Add new expense
      updatedExpenses = [...expenses, newExpense]
      toast({
        title: "Expense added",
        description: "Your expense has been added successfully",
      })
    }

    setExpenses(updatedExpenses)
    localStorage.setItem("expenses", JSON.stringify(updatedExpenses))
    setIsDialogOpen(false)
    setEditingExpense(null)
  }

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense)
    setIsDialogOpen(true)
  }

  const handleDeleteExpense = (id: string) => {
    const updatedExpenses = expenses.filter((expense) => expense.id !== id)
    setExpenses(updatedExpenses)
    localStorage.setItem("expenses", JSON.stringify(updatedExpenses))
    toast({
      title: "Expense deleted",
      description: "Your expense has been deleted successfully",
    })
  }

  // Get unique categories for filter
  const categories = Array.from(new Set(expenses.map((expense) => expense.category)))

  return (
    <div className="flex flex-col p-4 md:p-6 w-full">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Expenses</h1>
        <Button
          onClick={() => {
            setEditingExpense(null)
            setIsDialogOpen(true)
          }}
          size="sm"
          className="md:w-auto w-full"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Transaction
        </Button>
      </div>

      <Card className="mt-6 border-border/40 shadow-md">
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
            <div>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>View and manage all your transactions</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="md:w-auto w-full"
            >
              <Filter className="mr-2 h-4 w-4" />
              {showFilters ? "Hide Filters" : "Show Filters"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className={`flex flex-col space-y-4 ${showFilters ? "block" : "hidden md:block"}`}>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions..."
                className="pl-10"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-full md:w-[150px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="income">Income</SelectItem>
                  <SelectItem value="expense">Expense</SelectItem>
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
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

          <div className="mt-6 rounded-md border border-border/40 overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="hidden md:table-cell">Category</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.length > 0 ? (
                    filteredExpenses.map((expense) => (
                      <TableRow key={expense.id} className="hover:bg-accent/50 transition-colors">
                        <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                        <TableCell className="font-medium">{expense.description}</TableCell>
                        <TableCell className="hidden md:table-cell">{expense.category}</TableCell>
                        <TableCell>
                          <div className="flex items-center">
                            <div
                              className={`mr-2 rounded-full p-1 ${
                                expense.type === "expense"
                                  ? "bg-red-500/10 text-red-500"
                                  : "bg-emerald-500/10 text-emerald-500"
                              }`}
                            >
                              {expense.type === "expense" ? (
                                <ArrowDownIcon className="h-3 w-3" />
                              ) : (
                                <ArrowUpIcon className="h-3 w-3" />
                              )}
                            </div>
                            <span className="capitalize hidden md:inline">{expense.type}</span>
                          </div>
                        </TableCell>
                        <TableCell
                          className={`text-right font-medium ${
                            expense.type === "expense" ? "text-red-500" : "text-emerald-500"
                          }`}
                        >
                          {expense.type === "expense" ? "-" : "+"}
                          {formatCurrency(expense.amount)}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Open menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleEditExpense(expense)}>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeleteExpense(expense.id)}>
                                <Trash className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center">
                        No transactions found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </CardContent>
      </Card>

      <ExpenseDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onAddExpense={handleAddExpense}
        expense={editingExpense}
      />
    </div>
  )
}

