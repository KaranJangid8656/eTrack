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

