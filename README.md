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



