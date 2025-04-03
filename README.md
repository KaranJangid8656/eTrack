# Expense Tracker: Technical Implementation Details

## Tech Stack Overview

The Expense Tracker application is built using a modern web development stack:

| Technology         | Purpose               | Implementation                                |
|-------------------|----------------------|----------------------------------------------|
| **Next.js 14**    | Framework            | App Router, client/server components        |
| **React 18**      | UI Library           | Functional components, hooks                 |
| **TypeScript**    | Type Safety          | Static typing throughout the codebase       |
| **Tailwind CSS**  | Styling              | Utility-first CSS approach                   |
| **shadcn/ui**     | UI Components        | Pre-built accessible components              |
| **IndexedDB**     | Client-side Storage  | Browser database for data persistence       |
| **React Hook Form** | Form Management   | Form validation and state management        |
| **Zod**           | Schema Validation    | Type-safe form validation                    |
| **Recharts**      | Data Visualization   | Interactive charts and graphs               |
| **Lucide React**  | Icons                | Consistent icon system                      |

This stack ensures a scalable, maintainable, and performant expense tracking application, leveraging modern best practices in web development.

## Detailed Implementation Breakdown

### 1. Client-Side Database with IndexedDB

```typescript
// lib/db.ts
class IndexedDBWrapper {
  private db: IDBDatabase | null = null;
  private ready: boolean = false;
  private dbReadyPromise: Promise<boolean>;
  private dbReadyResolve!: (value: boolean) => void;

  constructor() {
    // Initialize promise for database readiness
    this.dbReadyPromise = new Promise((resolve) => {
      this.dbReadyResolve = resolve;
    });

    // Only initialize in browser environment
    if (typeof window !== "undefined") {
      this.initDatabase();
    }
  }

  private initDatabase() {
    const request = window.indexedDB.open("ExpenseTrackerDB", 1);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      // Create users store
      if (!db.objectStoreNames.contains("users")) {
        const userStore = db.createObjectStore("users", { keyPath: "id" });
        userStore.createIndex("email", "email", { unique: true });
      }
      
      // Create expenses store
      if (!db.objectStoreNames.contains("expenses")) {
        const expenseStore = db.createObjectStore("expenses", { keyPath: "id" });
        expenseStore.createIndex("user_id", "user_id", { unique: false });
        expenseStore.createIndex("date", "date", { unique: false });
        expenseStore.createIndex("category", "category", { unique: false });
        expenseStore.createIndex("type", "type", { unique: false });
      }
      
      // Create budgets store
      if (!db.objectStoreNames.contains("budgets")) {
        const budgetStore = db.createObjectStore("budgets", { keyPath: "id" });
        budgetStore.createIndex("user_id", "user_id", { unique: false });
        budgetStore.createIndex("category", "category", { unique: false });
      }
    };

    request.onsuccess = (event) => {
      this.db = (event.target as IDBOpenDBRequest).result;
      this.ready = true;
      this.dbReadyResolve(true);
    };

    request.onerror = (event) => {
      console.error("IndexedDB error:", (event.target as IDBOpenDBRequest).error);
      this.dbReadyResolve(false);
    };
  }

  // Wait for database to be ready
  async waitForDB(): Promise<boolean> {
    return this.dbReadyPromise;
  }

  // CRUD operations
  async add<T>(storeName: string, item: T): Promise<T> {
    await this.waitForDB();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database not initialized"));
        return;
      }
      
      const transaction = this.db.transaction(storeName, "readwrite");
      const store = transaction.objectStore(storeName);
      const request = store.add(item);
      
      request.onsuccess = () => resolve(item);
      request.onerror = () => reject(request.error);
    });
  }

  async get<T>(storeName: string, id: string): Promise<T | null> {
    await this.waitForDB();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database not initialized"));
        return;
      }
      
      const transaction = this.db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.get(id);
      
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async getAll<T>(storeName: string, indexName?: string, query?: IDBKeyRange): Promise<T[]> {
    await this.waitForDB();
    
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error("Database not initialized"));
        return;
      }
      
      const transaction = this.db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      
      let request: IDBRequest;
      if (indexName) {
        const index = store.index(indexName);
        request = query ? index.getAll(query) : index.getAll();
      } else {
        request = store.getAll();
      }
      
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

// Singleton instance
let dbInstance: IndexedDBWrapper | null = null;

export function getDbInstance(): IndexedDBWrapper {
  if (typeof window !== "undefined" && !dbInstance) {
    dbInstance = new IndexedDBWrapper();
  }
  
  // For SSR, return a dummy instance that will be replaced on client
  if (!dbInstance) {
    dbInstance = new IndexedDBWrapper();
  }
  
  return dbInstance;
}
```


### 2. Database Context Provider

```typescript
// lib/db-context.tsx
import React, { createContext, useContext, useMemo } from "react";
import { getDbInstance } from "./db";

function useDatabase() {
  const db = useMemo(() => getDbInstance(), []);
  
  const users = {
    getAll: async () => db.getAll<User>("users"),
    getById: async (id: string) => db.get<User>("users", id),
    getByEmail: async (email: string) => {
      const users = await db.getAll<User>("users");
      return users.find(user => user.email === email) || null;
    },
    create: async (user: Omit<User, "id" | "created_at">) => {
      const id = crypto.randomUUID();
      const newUser = { ...user, id, created_at: new Date().toISOString() };
      return db.add<User>("users", newUser);
    }
  };
  
  return { users };
}

const DatabaseContext = createContext<ReturnType<typeof useDatabase> | null>(null);

export function DatabaseProvider({ children }: { children: React.ReactNode }) {
  const db = useDatabase();
  
  return React.createElement(
    DatabaseContext.Provider,
    { value: db },
    children
  );
}

export function useDb() {
  const context = useContext(DatabaseContext);
  if (!context) {
    throw new Error("useDb must be used within a DatabaseProvider");
  }
  return context;
}
```

**How it works:**

- The `useDatabase` hook creates a set of domain-specific methods for each entity (users, expenses, budgets)
- The `DatabaseContext` provides these methods throughout the application
- `React.createElement` is used instead of JSX to avoid parsing issues during server-side rendering
- The `useDb` hook provides a convenient way to access database operations in components


### 3. Next.js App Router Implementation

```typescript
// app/layout.tsx
import { Metadata } from "next";
import { Inter } from 'next/font/google';
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { DatabaseProvider } from "@/lib/db-context";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Expense Tracker",
  description: "Track your expenses and manage your budget",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <DatabaseProvider>{children}</DatabaseProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
```

```typescript
// app/(dashboard)/layout.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { MobileNavbar } from "@/components/mobile-navbar";
import { SidebarProvider } from "@/components/ui/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const currentUser = sessionStorage.getItem("currentUser");
    if (!currentUser && typeof window !== "undefined") {
      router.push("/login");
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-screen">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <MobileNavbar />
          <main className="flex-1 p-4 md:p-6 pt-16 md:pt-6">{children}</main>
        </div>
      </div>
    </SidebarProvider>
  );
}
```

**How it works:**

- The `RootLayout` sets up the application with the `ThemeProvider` and `DatabaseProvider`
- The `DashboardLayout` implements a protected route pattern with authentication check
- Next.js App Router uses folder-based routing with nested layouts
- The `"use client"` directive marks components that should be rendered on the client
- Route groups (folders in parentheses) organize routes without affecting URL structure

### 4. Authentication System

```typescript
// app/(auth)/login/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useDb } from "@/lib/db-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function LoginPage() {
  const router = useRouter();
  const { users } = useDb();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const user = await users.getUserByCredentials(formData.email, formData.password);
      
      if (user) {
        // Store user in session storage
        sessionStorage.setItem("currentUser", JSON.stringify(user));
        router.push("/dashboard");
      } else {
        setError("Invalid email or password");
      }
    } catch (err) {
      setError("An error occurred. Please try again.");
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold">Login</CardTitle>
          <CardDescription>
            Enter your credentials to access your account
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="name@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link
                  href="#"
                  className="text-sm text-primary underline-offset-4 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Logging in..." : "Login"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="text-primary underline-offset-4 hover:underline"
            >
              Register
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
```
**How it works:**

- The login page uses a form to collect user credentials
- The `useDb` hook provides access to user-related database operations
- Authentication state is stored in `sessionStorage` for persistence across page refreshes
- After successful login, the user is redirected to the dashboard
- Error handling provides feedback for invalid credentials or system errors


### 5. Expense Management

```typescript
// app/(dashboard)/expenses/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useDb } from "@/lib/db-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ExpenseDialog } from "@/components/expense-dialog";
import { ExpenseList } from "@/components/expense-list";
import { ExpenseFilters } from "@/components/expense-filters";
import { Plus, Filter } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";

export default function ExpensesPage() {
  const { expenses } = useDb();
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [filters, setFilters] = useState({
    startDate: null as Date | null,
    endDate: null as Date | null,
    category: "",
    type: "",
    minAmount: "",
    maxAmount: "",
  });

  useEffect(() => {
    // Get current user from session storage
    const userJson = sessionStorage.getItem("currentUser");
    if (userJson) {
      setCurrentUser(JSON.parse(userJson));
    }
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadExpenses();
    }
  }, [currentUser]);

  const loadExpenses = async () => {
    if (!currentUser) return;
    
    setIsLoading(true);
    try {
      const userExpenses = await expenses.getByUserId(currentUser.id);
      // Sort by date (newest first)
      const sortedExpenses = userExpenses.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      setAllExpenses(sortedExpenses);
      setFilteredExpenses(sortedExpenses);
    } catch (error) {
      console.error("Failed to load expenses:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddExpense = async (expense: Omit<Expense, "id">) => {
    try {
      await expenses.create(expense);
      loadExpenses();
      setIsDialogOpen(false);
    } catch (error) {
      console.error("Failed to add expense:", error);
    }
  };

  const handleUpdateExpense = async (expense: Expense) => {
    try {
      await expenses.update(expense);
      loadExpenses();
    } catch (error) {
      console.error("Failed to update expense:", error);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      await expenses.delete(id);
      loadExpenses();
    } catch (error) {
      console.error("Failed to delete expense:", error);
    }
  };

  const applyFilters = () => {
    let result = [...allExpenses];
    
    if (filters.startDate) {
      result = result.filter(expense => 
        new Date(expense.date) >= filters.startDate!
      );
    }
    
    if (filters.endDate) {
      result = result.filter(expense => 
        new Date(expense.date) <= filters.endDate!
      );
    }
    
    if (filters.category) {
      result = result.filter(expense => 
        expense.category === filters.category
      );
    }
    
    if (filters.type) {
      result = result.filter(expense => 
        expense.type === filters.type
      );
    }
    
    if (filters.minAmount) {
      const min = parseFloat(filters.minAmount);
      result = result.filter(expense => expense.amount >= min);
    }
    
    if (filters.maxAmount) {
      const max = parseFloat(filters.maxAmount);
      result = result.filter(expense => expense.amount <= max);
    }
    
    setFilteredExpenses(result);
    setIsFilterOpen(false);
  };

  const resetFilters = () => {
    setFilters({
      startDate: null,
      endDate: null,
      category: "",
      type: "",
      minAmount: "",
      maxAmount: "",
    });
    setFilteredExpenses(allExpenses);
    setIsFilterOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Expenses</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsFilterOpen(true)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Button 
            onClick={() => setIsDialogOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Expense
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transaction History</CardTitle>
          <CardDescription>
            View and manage your expenses and income
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <ExpenseList 
              expenses={filteredExpenses} 
              onUpdate={handleUpdateExpense}
              onDelete={handleDeleteExpense}
            />
          )}
        </CardContent>
      </Card>

      <ExpenseDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen}
        onSubmit={handleAddExpense}
        userId={currentUser?.id || ""}
      />

      <ExpenseFilters
        open={isFilterOpen}
        onOpenChange={setIsFilterOpen}
        filters={filters}
        setFilters={setFilters}
        onApply={applyFilters}
        onReset={resetFilters}
        categories={Array.from(new Set(allExpenses.map(e => e.category)))}
      />
    </div>
  );
}
```

**How it works:**

- The expenses page manages CRUD operations for user expenses
- It uses the `useDb` hook to access expense-related database operations
- State management with React hooks handles loading states, filters, and dialog visibility
- The component implements filtering functionality for expenses
- Optimistic UI updates refresh the list after operations
  

### 6. Form Handling with React Hook Form and Zod

```typescript
// components/expense-dialog.tsx
"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon } from 'lucide-react';
import { cn } from "@/lib/utils";

// Form schema with Zod validation
const formSchema = z.object({
  description: z.string().min(1, "Description is required"),
  amount: z.coerce.number().min(0.01, "Amount must be greater than 0"),
  date: z.date(),
  category: z.string().min(1, "Category is required"),
  type: z.enum(["income", "expense"]),
});

// Predefined categories
const categories = [
  "Food & Dining",
  "Transportation",
  "Housing",
  "Utilities",
  "Entertainment",
  "Shopping",
  "Healthcare",
  "Education",
  "Travel",
  "Personal Care",
  "Gifts & Donations",
  "Investments",
  "Salary",
  "Freelance",
  "Business",
  "Other"
];

interface ExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Omit<Expense, "id">) => void;
  userId: string;
  expense?: Expense;
}

export function ExpenseDialog({ 
  open, 
  onOpenChange, 
  onSubmit, 
  userId,
  expense 
}: ExpenseDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Initialize form with React Hook Form and Zod resolver
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: expense ? {
      description: expense.description,
      amount: expense.amount,
      date: new Date(expense.date),
      category: expense.category,
      type: expense.type,
    } : {
      description: "",
      amount: 0,
      date: new Date(),
      category: "",
      type: "expense",
    },
  });

  const handleSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    try {
      // Format the expense data
      const expenseData: Omit<Expense, "id"> = {
        user_id: userId,
        description: values.description,
        amount: values.amount,
        date: values.date.toISOString(),
        category: values.category,
        type: values.type,
      };
      
      // If editing an existing expense, include the ID
      if (expense) {
        onSubmit({ ...expenseData, id: expense.id });
      } else {
        onSubmit(expenseData);
      }
      
      // Reset form after submission
      form.reset({
        description: "",
        amount: 0,
        date: new Date(),
        category: "",
        type: "expense",
      });
    } catch (error) {
      console.error("Error submitting form:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{expense ? "Edit" : "Add"} Transaction</DialogTitle>
          <DialogDescription>
            {expense 
              ? "Update the details of your transaction." 
              : "Enter the details of your transaction."}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Input placeholder="Grocery shopping" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="amount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Amount</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      placeholder="0.00" 
                      step="0.01" 
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="date"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Date</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP")
                          ) : (
                            <span>Pick a date</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="expense">Expense</SelectItem>
                      <SelectItem value="income">Income</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : expense ? "Update" : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```


**How it works:**

- The form uses React Hook Form with Zod for validation
- Each form field is wrapped in a `FormField` component from shadcn/ui
- The form handles both creating new expenses and editing existing ones
- Date selection uses a calendar popover for better user experience
- Categories are predefined but could be made dynamic based on user preferences

### 7. Data Visualization with Recharts

```typescript
// components/expense-chart.tsx
"use client";

import { useMemo } from "react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Legend
} from "recharts";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format, subDays, startOfDay } from "date-fns";

interface ExpenseChartProps {
  expenses: Expense[];
  days?: number;
}

export function ExpenseChart({ expenses, days = 30 }: ExpenseChartProps) {
  // Process data for the chart
  const chartData = useMemo(() => {
    // Create date range for the last N days
    const dateRange: Record<string, { date: string; income: number; expense: number }> = {};
    const today = startOfDay(new Date());
    
    for (let i = days - 1; i >= 0; i--) {
      const date = subDays(today, i);
      const dateStr = format(date, "MMM dd");
      dateRange[dateStr] = {
        date: dateStr,
        income: 0,
        expense: 0
      };
    }
    
    // Fill in actual expense data
    expenses.forEach(expense => {
      const expenseDate = new Date(expense.date);
      // Only include expenses within the date range
      if (expenseDate >= subDays(today, days - 1) && expenseDate <= today) {
        const dateStr = format(expenseDate, "MMM dd");
        
        // Initialize if date doesn't exist (shouldn't happen with our date range)
        if (!dateRange[dateStr]) {
          dateRange[dateStr] = {
            date: dateStr,
            income: 0,
            expense: 0
          };
        }
        
        // Add amount to the appropriate type
        if (expense.type === "income") {
          dateRange[dateStr].income += expense.amount;
        } else {
          dateRange[dateStr].expense += expense.amount;
        }
      }
    });
    
    // Convert to array and sort by date
    return Object.values(dateRange);
  }, [expenses, days]);
  
  // Calculate totals for the period
  const totals = useMemo(() => {
    return chartData.reduce(
      (acc, day) => {
        acc.income += day.income;
        acc.expense += day.expense;
        return acc;
      },
      { income: 0, expense: 0 }
    );
  }, [chartData]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Financial Overview</CardTitle>
        <CardDescription>
          Your income and expenses for the last {days} days
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="p-4 rounded-lg bg-muted">
            <p className="text-sm font-medium">Total Income</p>
            <p className="text-2xl font-bold text-green-500">
              ${totals.income.toFixed(2)}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-muted">
            <p className="text-sm font-medium">Total Expenses</p>
            <p className="text-2xl font-bold text-red-500">
              ${totals.expense.toFixed(2)}
            </p>
          </div>
          <div className="p-4 rounded-lg bg-muted">
            <p className="text-sm font-medium">Net Balance</p>
            <p className={`text-2xl font-bold ${
              totals.income - totals.expense >= 0 
                ? "text-green-500" 
                : "text-red-500"
            }`}>
              ${(totals.income - totals.expense).toFixed(2)}
            </p>
          </div>
        </div>
        
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
              <XAxis 
                dataKey="date" 
                tick={{ fontSize: 12 }} 
                tickMargin={10}
              />
              <YAxis 
                tick={{ fontSize: 12 }} 
                tickFormatter={(value) => `$${value}`}
              />
              <Tooltip 
                formatter={(value) => [`$${Number(value).toFixed(2)}`, undefined]}
                labelFormatter={(label) => `Date: ${label}`}
              />
              <Legend />
              <Area
                type="monotone"
                dataKey="income"
                stackId="1"
                stroke="#10b981"
                fill="url(#colorIncome)"
                name="Income"
              />
              <Area
                type="monotone"
                dataKey="expense"
                stackId="2"
                stroke="#ef4444"
                fill="url(#colorExpense)"
                name="Expense"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
```

**How it works:**

- The chart uses Recharts to visualize income and expenses over time
- `useMemo` optimizes performance by only recalculating data when dependencies change
- Date manipulation with date-fns creates a consistent date range
- The component shows both the chart and summary statistics
- Gradient fills and custom styling enhance the visual appeal

### 8. Mobile Navigation

```typescrpit
// components/mobile-navbar.tsx
"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Home, DollarSign, PieChart, Settings, Database, Menu, X, LogOut } from 'lucide-react';
import { cn } from "@/lib/utils";

export function MobileNavbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    // Get current user from session storage
    const userJson = sessionStorage.getItem("currentUser");
    if (userJson) {
      setCurrentUser(JSON.parse(userJson));
    }
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem("currentUser");
    window.location.href = "/login";
  };

  // Close menu when route changes
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const navItems = [
    {
      title: "Dashboard",
      href: "/dashboard",
      icon: Home,
    },
    {
      title: "Expenses",
      href: "/expenses",
      icon: DollarSign,
    },
    {
      title: "Budgets",
      href: "/budgets",
      icon: PieChart,
    },
    {
      title: "Data Explorer",
      href: "/data-explorer",
      icon: Database,
    },
    {
      title: "Settings",
      href: "/settings",
      icon: Settings,
    },
  ];

  return (
    <>
      {/* Mobile navbar - only visible on small screens */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b">
        <div className="flex items-center justify-between p-4">
          <h1 className="text-xl font-bold">Expense Tracker</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(!isOpen)}
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </div>
      
      {/* Mobile menu overlay */}
      {isOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-background/80 backdrop-blur-sm">
          <div className="fixed inset-y-0 right-0 w-full max-w-xs bg-background p-6 shadow-lg">
            <div className="flex flex-col h-full">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-lg font-semibold">Menu</h2>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>
              
              {/* User info */}
              {currentUser && (
                <div className="py-4 mb-4 border-b">
                  <p className="font-medium">{currentUser.name}</p>
                  <p className="text-sm text-muted-foreground">{currentUser.email}</p>
                </div>
              )}
              
              {/* Navigation links */}
              <nav className="space-y-1 flex-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "flex items-center py-3 px-3 rounded-md text-sm font-medium",
                      pathname === item.href
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted"
                    )}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.title}
                  </Link>
                ))}
              </nav>
              
              {/* Logout button */}
              <Button
                variant="ghost"
                className="mt-auto justify-start text-red-500 hover:text-red-600 hover:bg-red-500/10"
                onClick={handleLogout}
              >
                <LogOut className="mr-3 h-5 w-5" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

**How it works:**

- The mobile navbar is only visible on small screens (using Tailwind's responsive classes)
- It provides a hamburger menu that opens a full-screen overlay
- Navigation links are dynamically generated and highlight the current route
- The component includes user information and a logout button
- The menu automatically closes when navigating to a new route


## Complete Tech Stack Breakdown

### 1. Next.js 14 (App Router)

- **Purpose**: Framework for building React applications with server-side rendering and static site generation
- **Where Used**: Throughout the application for routing, layouts, and page structure
- **Key Features Used**:

- App Router for file-based routing
- Route groups for organizing routes without affecting URL structure
- Client and server components for optimal rendering strategies
- Layout components for consistent UI across routes





### 2. React 18

- **Purpose**: UI library for building component-based interfaces
- **Where Used**: All UI components and interactive elements
- **Key Features Used**:

- Hooks (useState, useEffect, useMemo, useContext) for state management
- Context API for global state (database access)
- Functional components for modern React patterns





### 3. TypeScript

- **Purpose**: Static type checking for JavaScript
- **Where Used**: Throughout the codebase for type safety
- **Key Features Used**:

- Interfaces for data models (User, Expense, Budget)
- Type annotations for function parameters and return values
- Generic types for database operations





### 4. Tailwind CSS

- **Purpose**: Utility-first CSS framework
- **Where Used**: All styling throughout the application
- **Key Features Used**:

- Responsive design utilities (md:hidden, flex-col, etc.)
- Dark mode support
- Custom color schemes and animations





### 5. shadcn/ui

- **Purpose**: High-quality UI components built with Radix UI and Tailwind
- **Where Used**: All UI components (buttons, cards, dialogs, etc.)
- **Key Features Used**:

- Form components with validation
- Dialog and popover components for modals
- Card components for content organization





### 6. IndexedDB

- **Purpose**: Browser-based database for client-side storage
- **Where Used**: All data persistence (users, expenses, budgets)
- **Key Features Used**:

- Object stores for different data types
- Indexes for efficient querying
- Transaction-based operations for data integrity





### 7. React Hook Form

- **Purpose**: Form validation and handling
- **Where Used**: All forms (login, registration, expense, budget)
- **Key Features Used**:

- Form validation with Zod
- Field-level validation
- Form state management





### 8. Zod

- **Purpose**: TypeScript-first schema validation
- **Where Used**: Form validation schemas
- **Key Features Used**:

- Type inference for form data
- Custom validation rules
- Error messages





### 9. Recharts

- **Purpose**: Composable charting library for React
- **Where Used**: Dashboard and analytics visualizations
- **Key Features Used**:

- Area charts for time-series data
- Pie charts for category breakdowns
- Responsive containers for adaptive sizing





### 10. Lucide React

- **Purpose**: Icon library
- **Where Used**: Throughout the UI for visual elements
- **Key Features Used**:

- Navigation icons
- Action icons
- Status indicators





### 11. date-fns

- **Purpose**: Date manipulation library
- **Where Used**: Date formatting, calculations, and manipulations
- **Key Features Used**:

- Date formatting for display
- Date range calculations
- Date comparisons





## How It All Works Together

1. **User Authentication Flow**:

1. User enters credentials in the login form
2. Form validation with React Hook Form and Zod
3. Credentials checked against IndexedDB user store
4. User session stored in sessionStorage
5. Protected routes check for authentication



2. **Data Management Flow**:

1. IndexedDB wrapper provides CRUD operations
2. Database context makes operations available throughout the app
3. Components use the context to read and write data
4. UI updates reactively when data changes



3. **Expense Tracking Flow**:

1. User adds expense via form dialog
2. Data validated with React Hook Form and Zod
3. Expense saved to IndexedDB
4. UI updates to show the new expense
5. Charts and summaries recalculate



4. **Responsive Design Strategy**:

1. Mobile-first approach with Tailwind CSS
2. Different navigation for mobile (navbar) and desktop (sidebar)
3. Responsive layouts adapt to screen size
4. Components optimize for different device capabilities



5. **Performance Optimization**:

1. `useMemo` for expensive calculations
2. Conditional rendering for device-specific components
3. Lazy loading for better initial load times
4. Client-side caching with IndexedDB





This comprehensive tech stack provides a modern, responsive, and feature-rich expense tracking application that works entirely in the browser without requiring a backend server.
