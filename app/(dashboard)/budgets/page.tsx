"use client"

import { useEffect, useState } from "react"
import { Plus, Edit, Trash, PieChart } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { BudgetDialog } from "@/components/budget-dialog"
import { formatCurrency } from "@/lib/utils"
import type { Budget } from "@/types/budget"
import type { Expense } from "@/types/expense"
import { useToast } from "@/hooks/use-toast"

export default function BudgetsPage() {
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    // Load budgets from local storage
    const storedBudgets = localStorage.getItem("budgets")
    if (storedBudgets) {
      setBudgets(JSON.parse(storedBudgets))
    }

    // Load expenses from local storage
    const storedExpenses = localStorage.getItem("expenses")
    if (storedExpenses) {
      setExpenses(JSON.parse(storedExpenses))
    }
  }, [])

  const handleAddBudget = (newBudget: Budget) => {
    let updatedBudgets

    if (editingBudget) {
      // Update existing budget
      updatedBudgets = budgets.map((budget) => (budget.id === editingBudget.id ? newBudget : budget))
      toast({
        title: "Budget updated",
        description: "Your budget has been updated successfully",
      })
    } else {
      // Add new budget
      updatedBudgets = [...budgets, newBudget]
      toast({
        title: "Budget added",
        description: "Your budget has been added successfully",
      })
    }

    setBudgets(updatedBudgets)
    localStorage.setItem("budgets", JSON.stringify(updatedBudgets))
    setIsDialogOpen(false)
    setEditingBudget(null)
  }

  const handleEditBudget = (budget: Budget) => {
    setEditingBudget(budget)
    setIsDialogOpen(true)
  }

  const handleDeleteBudget = (id: string) => {
    const updatedBudgets = budgets.filter((budget) => budget.id !== id)
    setBudgets(updatedBudgets)
    localStorage.setItem("budgets", JSON.stringify(updatedBudgets))
    toast({
      title: "Budget deleted",
      description: "Your budget has been deleted successfully",
    })
  }

  // Calculate spent amount for each budget
  const calculateSpentAmount = (category: string) => {
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()

    return expenses
      .filter(
        (expense) =>
          expense.category === category &&
          expense.type === "expense" &&
          new Date(expense.date).getMonth() === currentMonth &&
          new Date(expense.date).getFullYear() === currentYear,
      )
      .reduce((total, expense) => total + expense.amount, 0)
  }

  return (
    <div className="flex flex-col p-4 md:p-6 w-full">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">Budgets</h1>
        <Button
          onClick={() => {
            setEditingBudget(null)
            setIsDialogOpen(true)
          }}
          size="sm"
          className="md:w-auto w-full"
        >
          <Plus className="mr-2 h-4 w-4" />
          Add Budget
        </Button>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {budgets.length > 0 ? (
          budgets.map((budget) => {
            const spentAmount = calculateSpentAmount(budget.category)
            const percentage = Math.min(Math.round((spentAmount / budget.amount) * 100), 100)
            const isOverBudget = spentAmount > budget.amount

            return (
              <Card
                key={budget.id}
                className="overflow-hidden border-border/40 shadow-md transition-all hover:shadow-lg"
              >
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <PieChart className="h-4 w-4 text-primary" />
                      <CardTitle className="text-base">{budget.category}</CardTitle>
                    </div>
                    <div className="flex space-x-1">
                      <Button variant="ghost" size="icon" onClick={() => handleEditBudget(budget)} className="h-8 w-8">
                        <Edit className="h-4 w-4" />
                        <span className="sr-only">Edit</span>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteBudget(budget.id)}
                        className="h-8 w-8"
                      >
                        <Trash className="h-4 w-4" />
                        <span className="sr-only">Delete</span>
                      </Button>
                    </div>
                  </div>
                  <CardDescription>Monthly budget</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {formatCurrency(spentAmount)} of {formatCurrency(budget.amount)}
                      </span>
                      <span
                        className={`text-sm font-medium ${isOverBudget ? "text-red-500" : "text-muted-foreground"}`}
                      >
                        {percentage}%
                      </span>
                    </div>
                    <Progress
                      value={percentage}
                      className={isOverBudget ? "bg-red-200" : ""}
                      indicatorClassName={isOverBudget ? "bg-red-500" : ""}
                    />
                    <div className="text-sm text-muted-foreground">
                      {isOverBudget
                        ? `Over budget by ${formatCurrency(spentAmount - budget.amount)}`
                        : `${formatCurrency(budget.amount - spentAmount)} remaining`}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        ) : (
          <Card className="col-span-full border-border/40 shadow-md">
            <CardHeader>
              <CardTitle>No Budgets</CardTitle>
              <CardDescription>You haven't set any budgets yet.</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Your First Budget
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <BudgetDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onAddBudget={handleAddBudget}
        budget={editingBudget}
      />
    </div>
  )
}

