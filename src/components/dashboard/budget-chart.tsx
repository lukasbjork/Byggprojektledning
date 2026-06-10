"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatSEKCompact } from "@/lib/format";

const config = {
  budget: { label: "Budget", color: "var(--chart-1)" },
  utfall: { label: "Utfall", color: "var(--chart-2)" },
} satisfies ChartConfig;

export interface BudgetChartRow {
  name: string;
  budget: number;
  utfall: number;
}

export function BudgetChart({ data }: { data: BudgetChartRow[] }) {
  return (
    <ChartContainer config={config} className="h-64 w-full">
      <BarChart data={data} margin={{ left: 8, right: 8 }}>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis dataKey="name" tickLine={false} axisLine={false} fontSize={11} interval={0} />
        <YAxis
          tickFormatter={(v: number) => formatSEKCompact(v)}
          tickLine={false}
          axisLine={false}
          fontSize={11}
          width={76}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="budget" fill="var(--color-budget)" radius={[3, 3, 0, 0]} />
        <Bar dataKey="utfall" fill="var(--color-utfall)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
}
