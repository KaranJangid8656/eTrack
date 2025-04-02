"use client"

import { useEffect, useState } from "react"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  DollarSign,
  Plus,
  Wallet,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ExpenseChart } from "@/components/expense-chart"
import { ExpenseCategoryChart } from "@/components/expense-category-chart"
import { ExpenseDialog } from "@/components/expense-dialog"
import { formatCurrency } from "@/lib/utils"
import { useDb } from "@/lib/db"
import type { Expense } from "@/types/expense"

export default function DashboardPage() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [totalExpense, setTotalExpense] = useState(0)
  const [totalIncome, setTotalIncome] = useState(0)
  const [balance, setBalance] = useState(0)
  const { isReady, expenses: expenseOps } = useDb()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Get current user from session storage
    const userJson = sessionStorage.getItem("currentUser")
    if (userJson) {
      setCurrentUser(JSON.parse(userJson))
    }
  }, [])

  useEffect(() => {
    if (isReady && currentUser) {
      loadExpenses()
    }
  }, [isReady, currentUser])

  const loadExpenses = async () => {
    if (!currentUser) return

    setIsLoading(true)
    try {
      const userExpenses = await expenseOps.getExpenses(currentUser.id)
      setExpenses(userExpenses)
    } catch (error) {
      console.error("Error loading expenses:", error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Calculate totals
    let expenseTotal = 0
    let incomeTotal = 0

    expenses.forEach((expense) => {
      if (expense.type === "expense") {
        expenseTotal += expense.amount
      } else {
        incomeTotal += expense.amount
      }
    })

    setTotalExpense(expenseTotal)
    setTotalIncome(incomeTotal)
    setBalance(incomeTotal - expenseTotal)
  }, [expenses])

  const handleAddExpense = async (newExpense: Expense) => {
    if (!currentUser) return

    // Add user_id to expense
    const expenseWithUser = {
      ...newExpense,
      user_id: currentUser.id,
    }

    // Add expense to database
    const result = await expenseOps.addExpense(expenseWithUser)

    if (result.success) {
      // Refresh expenses
      loadExpenses()
      setIsDialogOpen(false)
    }
  }

  // Get recent transactions (last 5)
  const recentTransactions = [...expenses]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5)

  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center p-8">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col p-4 md:p-6 lg:p-8 w-full">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Track your finances at a glance</p>
        </div>
        <Button onClick={() => setIsDialogOpen(true)} size="default" className="md:w-auto w-full">
          <Plus className="mr-2 h-4 w-4" />
          Add Transaction
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="overflow-hidden border-border/40 shadow-md card-hover gradient-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Balance</CardTitle>
            <div className="h-8 w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Wallet className="h-4 w-4 text-blue-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(balance)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {balance >= 0 ? "You're doing great!" : "You're spending more than you earn"}
            </p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-border/40 shadow-md card-hover gradient-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Income</CardTitle>
            <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-500">{formatCurrency(totalIncome)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {expenses.filter((e) => e.type === "income").length} income transactions
            </p>
          </CardContent>
        </Card>
        <Card className="overflow-hidden border-border/40 shadow-md card-hover gradient-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Expenses</CardTitle>
            <div className="h-8 w-8 rounded-full bg-red-500/10 flex items-center justify-center">
              <TrendingDown className="h-4 w-4 text-red-500" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">{formatCurrency(totalExpense)}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {expenses.filter((e) => e.type === "expense").length} expense transactions
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="mt-8 grid gap-6 md:grid-cols-2">
        <Card className="col-span-1 border-border/40 shadow-md card-hover">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Expense Trend</CardTitle>
              <CardDescription>Your expense trend over time</CardDescription>
            </div>
            <BarChart3 className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="h-80">
            <ExpenseChart expenses={expenses} />
          </CardContent>
        </Card>
        <Card className="col-span-1 border-border/40 shadow-md card-hover">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Expense by Category</CardTitle>
              <CardDescription>Your expenses by category</CardDescription>
            </div>
            <PieChart className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent className="h-80">
            <ExpenseCategoryChart expenses={expenses} />
          </CardContent>
        </Card>
      </div>

      <Card className="mt-8 border-border/40 shadow-md card-hover">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Your most recent transactions</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentTransactions.length > 0 ? (
              recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between rounded-lg border border-border/40 p-4 transition-colors hover:bg-accent/50"
                >
                  <div className="flex items-center space-x-4">
                    <div
                      className={`rounded-full p-2 ${
                        transaction.type === "expense"
                          ? "bg-red-500/10 text-red-500"
                          : "bg-emerald-500/10 text-emerald-500"
                      }`}
                    >
                      {transaction.type === "expense" ? (
                        <ArrowDownIcon className="h-4 w-4" />
                      ) : (
                        <ArrowUpIcon className="h-4 w-4" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium">{transaction.description}</p>
                      <p className="text-sm text-muted-foreground">{transaction.category}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-medium ${transaction.type === "expense" ? "text-red-500" : "text-emerald-500"}`}
                    >
                      {transaction.type === "expense" ? "-" : "+"}
                      {formatCurrency(transaction.amount)}
                    </p>
                    <p className="text-sm text-muted-foreground">{new Date(transaction.date).toLocaleDateString()}</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <DollarSign className="h-16 w-16 mx-auto mb-4 opacity-20" />
                <p className="text-lg">No transactions yet</p>
                <p className="text-sm mt-1">Add your first transaction to get started</p>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="outline" className="w-full" onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Transaction
          </Button>
        </CardFooter>
      </Card>

      <ExpenseDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} onAddExpense={handleAddExpense} />
    </div>
  )
}

