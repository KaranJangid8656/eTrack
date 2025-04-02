"use client"

import { useMemo } from "react"
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { Card } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import type { Expense } from "@/types/expense"

interface ExpenseChartProps {
  expenses: Expense[]
}

export function ExpenseChart({ expenses }: ExpenseChartProps) {
  const chartData = useMemo(() => {
    // Group expenses by date
    const groupedByDate = expenses.reduce(
      (acc, expense) => {
        const date = new Date(expense.date).toISOString().split("T")[0]

        if (!acc[date]) {
          acc[date] = {
            income: 0,
            expense: 0,
          }
        }

        if (expense.type === "income") {
          acc[date].income += expense.amount
        } else {
          acc[date].expense += expense.amount
        }

        return acc
      },
      {} as Record<string, { income: number; expense: number }>,
    )

    // Convert to array and sort by date
    return Object.entries(groupedByDate)
      .map(([date, values]) => ({
        date,
        income: values.income,
        expense: values.expense,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }, [expenses])

  if (chartData.length === 0) {
    return (
      <Card className="flex h-full items-center justify-center p-6">
        <p className="text-muted-foreground">No data to display</p>
      </Card>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart
        data={chartData}
        margin={{
          top: 10,
          right: 30,
          left: 0,
          bottom: 0,
        }}
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
          tickFormatter={(date) => new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
          stroke="rgba(255,255,255,0.5)"
        />
        <YAxis tickFormatter={(value) => formatCurrency(value).replace(/\.00$/, "")} stroke="rgba(255,255,255,0.5)" />
        <Tooltip
          formatter={(value: number) => formatCurrency(value)}
          labelFormatter={(label) => new Date(label).toLocaleDateString()}
          contentStyle={{
            backgroundColor: "rgba(17, 24, 39, 0.8)",
            borderColor: "rgba(255,255,255,0.1)",
            borderRadius: "0.5rem",
            color: "white",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
          }}
        />
        <Area
          type="monotone"
          dataKey="income"
          stackId="1"
          stroke="#10b981"
          fill="url(#colorIncome)"
          name="Income"
          strokeWidth={2}
        />
        <Area
          type="monotone"
          dataKey="expense"
          stackId="2"
          stroke="#ef4444"
          fill="url(#colorExpense)"
          name="Expense"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

