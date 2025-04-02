"use client"

import { useMemo } from "react"
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts"

import { Card } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import type { Expense } from "@/types/expense"

interface ExpenseCategoryChartProps {
  expenses: Expense[]
}

export function ExpenseCategoryChart({ expenses }: ExpenseCategoryChartProps) {
  const chartData = useMemo(() => {
    // Only include expenses (not income)
    const expensesOnly = expenses.filter((expense) => expense.type === "expense")

    // Group expenses by category
    const groupedByCategory = expensesOnly.reduce(
      (acc, expense) => {
        const { category, amount } = expense

        if (!acc[category]) {
          acc[category] = 0
        }

        acc[category] += amount

        return acc
      },
      {} as Record<string, number>,
    )

    // Convert to array
    return Object.entries(groupedByCategory)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [expenses])

  // Colors for the pie chart
  const COLORS = [
    "#3b82f6", // blue
    "#10b981", // green
    "#f97316", // orange
    "#8b5cf6", // purple
    "#ec4899", // pink
    "#06b6d4", // cyan
    "#f43f5e", // rose
    "#84cc16", // lime
    "#14b8a6", // teal
    "#6366f1", // indigo
  ]

  if (chartData.length === 0) {
    return (
      <Card className="flex h-full items-center justify-center p-6">
        <p className="text-muted-foreground">No expense data to display</p>
      </Card>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          outerRadius={90}
          innerRadius={40}
          fill="#8884d8"
          dataKey="value"
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          animationDuration={750}
          animationBegin={0}
          paddingAngle={2}
        >
          {chartData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={COLORS[index % COLORS.length]}
              stroke="rgba(255,255,255,0.1)"
              strokeWidth={1}
            />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => formatCurrency(value)}
          contentStyle={{
            backgroundColor: "rgba(17, 24, 39, 0.8)",
            borderColor: "rgba(255,255,255,0.1)",
            borderRadius: "0.5rem",
            color: "white",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

