"use client"

import React from "react"

import { useEffect, useState } from "react"
import { createContext, useContext } from "react"

// IndexedDB database wrapper
class IndexedDBWrapper {
  private db: IDBDatabase | null = null
  private ready = false
  private readyCallbacks: (() => void)[] = []

  constructor() {
    // Only initialize IndexedDB on the client side
    if (typeof window !== "undefined") {
      this.initDatabase()
    }
  }

  private initDatabase() {
    if (typeof window === "undefined" || !window.indexedDB) {
      console.warn("IndexedDB not available")
      return
    }

    const request = window.indexedDB.open("ExpenseTrackerDB", 1)

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains("users")) {
        db.createObjectStore("users", { keyPath: "id" })
      }

      if (!db.objectStoreNames.contains("expenses")) {
        db.createObjectStore("expenses", { keyPath: "id" })
      }

      if (!db.objectStoreNames.contains("budgets")) {
        db.createObjectStore("budgets", { keyPath: "id" })
      }
    }

    request.onsuccess = (event) => {
      this.db = (event.target as IDBOpenDBRequest).result
      this.ready = true

      // Check if we need to insert sample data
      this.getUserCount().then((count) => {
        if (count === 0) {
          this.insertSampleData()
        }
      })

      // Call all ready callbacks
      this.readyCallbacks.forEach((callback) => callback())
      this.readyCallbacks = []
    }

    request.onerror = (event) => {
      console.error("Database error:", (event.target as IDBOpenDBRequest).error)
    }
  }

  isReady(): boolean {
    return this.ready
  }

  onReady(callback: () => void) {
    if (this.ready) {
      callback()
    } else {
      this.readyCallbacks.push(callback)
    }
  }

  // Generic method to add an item to a store
  add<T>(storeName: string, item: T): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database not initialized"))
        return
      }

      const transaction = this.db.transaction(storeName, "readwrite")
      const store = transaction.objectStore(storeName)
      const request = store.add(item)

      request.onsuccess = () => resolve(item)
      request.onerror = () => reject(request.error)
    })
  }

  // Generic method to update an item in a store
  update<T>(storeName: string, item: T): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database not initialized"))
        return
      }

      const transaction = this.db.transaction(storeName, "readwrite")
      const store = transaction.objectStore(storeName)
      const request = store.put(item)

      request.onsuccess = () => resolve(item)
      request.onerror = () => reject(request.error)
    })
  }

  // Generic method to get an item from a store
  get<T>(storeName: string, id: string): Promise<T | null> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database not initialized"))
        return
      }

      const transaction = this.db.transaction(storeName, "readonly")
      const store = transaction.objectStore(storeName)
      const request = store.get(id)

      request.onsuccess = () => resolve(request.result || null)
      request.onerror = () => reject(request.error)
    })
  }

  // Generic method to delete an item from a store
  delete(storeName: string, id: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database not initialized"))
        return
      }

      const transaction = this.db.transaction(storeName, "readwrite")
      const store = transaction.objectStore(storeName)
      const request = store.delete(id)

      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  }

  // Generic method to get all items from a store
  getAll<T>(storeName: string): Promise<T[]> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database not initialized"))
        return
      }

      const transaction = this.db.transaction(storeName, "readonly")
      const store = transaction.objectStore(storeName)
      const request = store.getAll()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  // Get user count
  getUserCount(): Promise<number> {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database not initialized"))
        return
      }

      const transaction = this.db.transaction("users", "readonly")
      const store = transaction.objectStore("users")
      const request = store.count()

      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  }

  // Insert sample data
  async insertSampleData() {
    try {
      // Sample user
      const user = {
        id: "user1",
        name: "Demo User",
        email: "demo@example.com",
        password: "password",
        created_at: new Date().toISOString(),
      }

      await this.add("users", user)

      // Sample expenses
      const sampleExpenses = [
        {
          id: "exp1",
          user_id: "user1",
          description: "Groceries",
          amount: 85.75,
          date: "2023-04-15",
          category: "Food",
          type: "expense",
        },
        {
          id: "exp2",
          user_id: "user1",
          description: "Salary",
          amount: 3000,
          date: "2023-04-01",
          category: "Salary",
          type: "income",
        },
        {
          id: "exp3",
          user_id: "user1",
          description: "Rent",
          amount: 1200,
          date: "2023-04-05",
          category: "Housing",
          type: "expense",
        },
        {
          id: "exp4",
          user_id: "user1",
          description: "Freelance Work",
          amount: 500,
          date: "2023-04-20",
          category: "Freelance",
          type: "income",
        },
        {
          id: "exp5",
          user_id: "user1",
          description: "Dinner",
          amount: 45.5,
          date: "2023-04-18",
          category: "Food",
          type: "expense",
        },
      ]

      for (const expense of sampleExpenses) {
        await this.add("expenses", expense)
      }

      // Sample budgets
      const sampleBudgets = [
        {
          id: "budget1",
          user_id: "user1",
          category: "Food",
          amount: 400,
        },
        {
          id: "budget2",
          user_id: "user1",
          category: "Housing",
          amount: 1500,
        },
        {
          id: "budget3",
          user_id: "user1",
          category: "Transportation",
          amount: 200,
        },
      ]

      for (const budget of sampleBudgets) {
        await this.add("budgets", budget)
      }

      console.log("Sample data inserted successfully")
    } catch (error) {
      console.error("Error inserting sample data:", error)
    }
  }
}

// Create a singleton instance
let dbInstance: IndexedDBWrapper | null = null

// Get the database instance (lazy initialization)
function getDbInstance() {
  if (typeof window !== "undefined" && !dbInstance) {
    dbInstance = new IndexedDBWrapper()
  }
  return dbInstance
}

// Database operations hook
export function useDatabase() {
  const [isReady, setIsReady] = useState(false)
  const [instance, setInstance] = useState<IndexedDBWrapper | null>(null)

  useEffect(() => {
    // Only run on client side
    if (typeof window !== "undefined") {
      const db = getDbInstance()
      setInstance(db)

      if (db && db.isReady()) {
        setIsReady(true)
      } else if (db) {
        db.onReady(() => {
          setIsReady(true)
        })
      }
    }
  }, [])

  // User operations
  const userOperations = {
    // Get user by email and password
    getUserByCredentials: async (email: string, password: string) => {
      try {
        if (!instance) return null
        const users = await instance.getAll<any>("users")
        return users.find((user) => user.email === email && user.password === password) || null
      } catch (error) {
        console.error("Error getting user:", error)
        return null
      }
    },

    // Create a new user
    createUser: async (name: string, email: string, password: string) => {
      try {
        if (!instance) return { success: false, message: "Database not initialized" }

        // Check if user already exists
        const users = await instance.getAll<any>("users")
        const exists = users.some((user) => user.email === email)

        if (exists) {
          return { success: false, message: "Email already in use" }
        }

        // Create new user
        const id = `user_${Date.now()}`
        const user = {
          id,
          name,
          email,
          password,
          created_at: new Date().toISOString(),
        }

        await instance.add("users", user)

        return { success: true, user }
      } catch (error) {
        console.error("Error creating user:", error)
        return { success: false, message: "Failed to create user" }
      }
    },

    // Update user
    updateUser: async (id: string, name: string, email: string) => {
      try {
        if (!instance) return { success: false, message: "Database not initialized" }

        const user = await instance.get<any>("users", id)

        if (!user) {
          return { success: false, message: "User not found" }
        }

        const updatedUser = {
          ...user,
          name,
          email,
        }

        await instance.update("users", updatedUser)

        return { success: true, user: updatedUser }
      } catch (error) {
        console.error("Error updating user:", error)
        return { success: false, message: "Failed to update user" }
      }
    },
  }

  // Expense operations
  const expenseOperations = {
    // Get all expenses for a user
    getExpenses: async (userId: string) => {
      try {
        if (!instance) return []

        const allExpenses = await instance.getAll<any>("expenses")
        return allExpenses
          .filter((expense) => expense.user_id === userId)
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      } catch (error) {
        console.error("Error getting expenses:", error)
        return []
      }
    },

    // Add a new expense
    addExpense: async (expense: any) => {
      try {
        if (!instance) return { success: false, message: "Database not initialized" }

        const id = expense.id || `exp_${Date.now()}`
        const newExpense = {
          ...expense,
          id,
        }

        await instance.add("expenses", newExpense)

        return { success: true, expense: newExpense }
      } catch (error) {
        console.error("Error adding expense:", error)
        return { success: false, message: "Failed to add expense" }
      }
    },

    // Update an expense
    updateExpense: async (expense: any) => {
      try {
        if (!instance) return { success: false, message: "Database not initialized" }

        const existingExpense = await instance.get<any>("expenses", expense.id)

        if (!existingExpense || existingExpense.user_id !== expense.user_id) {
          return { success: false, message: "Expense not found" }
        }

        await instance.update("expenses", expense)

        return { success: true, expense }
      } catch (error) {
        console.error("Error updating expense:", error)
        return { success: false, message: "Failed to update expense" }
      }
    },

    // Delete an expense
    deleteExpense: async (id: string, userId: string) => {
      try {
        if (!instance) return { success: false, message: "Database not initialized" }

        const expense = await instance.get<any>("expenses", id)

        if (!expense || expense.user_id !== userId) {
          return { success: false, message: "Expense not found" }
        }

        await instance.delete("expenses", id)

        return { success: true }
      } catch (error) {
        console.error("Error deleting expense:", error)
        return { success: false, message: "Failed to delete expense" }
      }
    },
  }

  // Budget operations
  const budgetOperations = {
    // Get all budgets for a user
    getBudgets: async (userId: string) => {
      try {
        if (!instance) return []

        const allBudgets = await instance.getAll<any>("budgets")
        return allBudgets.filter((budget) => budget.user_id === userId)
      } catch (error) {
        console.error("Error getting budgets:", error)
        return []
      }
    },

    // Add a new budget
    addBudget: async (budget: any) => {
      try {
        if (!instance) return { success: false, message: "Database not initialized" }

        const id = budget.id || `budget_${Date.now()}`
        const newBudget = {
          ...budget,
          id,
        }

        await instance.add("budgets", newBudget)

        return { success: true, budget: newBudget }
      } catch (error) {
        console.error("Error adding budget:", error)
        return { success: false, message: "Failed to add budget" }
      }
    },

    // Update a budget
    updateBudget: async (budget: any) => {
      try {
        if (!instance) return { success: false, message: "Database not initialized" }

        const existingBudget = await instance.get<any>("budgets", budget.id)

        if (!existingBudget || existingBudget.user_id !== budget.user_id) {
          return { success: false, message: "Budget not found" }
        }

        await instance.update("budgets", budget)

        return { success: true, budget }
      } catch (error) {
        console.error("Error updating budget:", error)
        return { success: false, message: "Failed to update budget" }
      }
    },

    // Delete a budget
    deleteBudget: async (id: string, userId: string) => {
      try {
        if (!instance) return { success: false, message: "Database not initialized" }

        const budget = await instance.get<any>("budgets", id)

        if (!budget || budget.user_id !== userId) {
          return { success: false, message: "Budget not found" }
        }

        await instance.delete("budgets", id)

        return { success: true }
      } catch (error) {
        console.error("Error deleting budget:", error)
        return { success: false, message: "Failed to delete budget" }
      }
    },
  }

  // Analytics operations
  const analyticsOperations = {
    // Get expense summary by category
    getExpensesByCategory: async (userId: string, type = "expense") => {
      try {
        const expenses = await expenseOperations.getExpenses(userId)
        const filteredExpenses = expenses.filter((expense) => expense.type === type)

        // Group by category
        const categories: Record<string, number> = {}

        filteredExpenses.forEach((expense) => {
          if (!categories[expense.category]) {
            categories[expense.category] = 0
          }
          categories[expense.category] += expense.amount
        })

        // Convert to array
        return Object.entries(categories)
          .map(([category, total]) => ({ category, total }))
          .sort((a, b) => b.total - a.total)
      } catch (error) {
        console.error("Error getting expenses by category:", error)
        return []
      }
    },

    // Get expense summary by month
    getExpensesByMonth: async (userId: string) => {
      try {
        const expenses = await expenseOperations.getExpenses(userId)

        // Group by month
        const months: Record<string, { expense_total: number; income_total: number }> = {}

        expenses.forEach((expense) => {
          const month = expense.date.substring(0, 7) // YYYY-MM

          if (!months[month]) {
            months[month] = { expense_total: 0, income_total: 0 }
          }

          if (expense.type === "expense") {
            months[month].expense_total += expense.amount
          } else {
            months[month].income_total += expense.amount
          }
        })

        // Convert to array
        return Object.entries(months)
          .map(([month, totals]) => ({ month, ...totals }))
          .sort((a, b) => a.month.localeCompare(b.month))
      } catch (error) {
        console.error("Error getting expenses by month:", error)
        return []
      }
    },

    // Get budget vs actual spending
    getBudgetVsActual: async (userId: string) => {
      try {
        const budgets = await budgetOperations.getBudgets(userId)
        const expenses = await expenseOperations.getExpenses(userId)

        // Current month
        const currentMonth = new Date().toISOString().slice(0, 7)

        // Filter expenses for current month
        const currentMonthExpenses = expenses.filter(
          (expense) => expense.date.startsWith(currentMonth) && expense.type === "expense",
        )

        // Calculate actual spending by category
        const actualByCategory: Record<string, number> = {}

        currentMonthExpenses.forEach((expense) => {
          if (!actualByCategory[expense.category]) {
            actualByCategory[expense.category] = 0
          }
          actualByCategory[expense.category] += expense.amount
        })

        // Combine with budgets
        return budgets.map((budget) => ({
          category: budget.category,
          budget_amount: budget.amount,
          actual_amount: actualByCategory[budget.category] || 0,
        }))
      } catch (error) {
        console.error("Error getting budget vs actual:", error)
        return []
      }
    },
  }

  return {
    isReady,
    users: userOperations,
    expenses: expenseOperations,
    budgets: budgetOperations,
    analytics: analyticsOperations,
  }
}

// Context for database access
const DatabaseContext = createContext<ReturnType<typeof useDatabase> | null>(null)

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const db = useDatabase()

  // Use React.createElement instead of JSX to avoid parsing issues
  return React.createElement(DatabaseContext.Provider, { value: db }, children)
}

export function useDb() {
  const context = useContext(DatabaseContext)
  if (!context) {
    throw new Error("useDb must be used within a DatabaseProvider")
  }
  return context
}

