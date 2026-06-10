"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, XAxis, YAxis } from "recharts";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatSEKCompact } from "@/lib/format";

const config = {
  utfall: { label: "Ackumulerat utfall", color: "var(--chart-2)" },
} satisfies ChartConfig;

export interface CostPoint {
  month: string; // t.ex. "jan 26"
  utfall: number;
}

export function CostChart({ data, budget }: { data: CostPoint[]; budget: number }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Kostnadsutveckling</CardTitle>
        <CardDescription>
          Ackumulerat utfall per månad (attesterade och betalda fakturor). Streckad linje =
          budget.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            Inga attesterade fakturor att visa ännu.
          </p>
        ) : (
          <ChartContainer config={config} className="h-56 w-full">
            <LineChart data={data} margin={{ left: 8, right: 16 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
              <YAxis
                tickFormatter={(v: number) => formatSEKCompact(v)}
                tickLine={false}
                axisLine={false}
                fontSize={11}
                width={76}
                domain={[0, (max: number) => Math.max(max, budget) * 1.05]}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              {budget > 0 ? (
                <ReferenceLine
                  y={budget}
                  stroke="var(--chart-3)"
                  strokeDasharray="6 4"
                  label={{
                    value: "Budget",
                    position: "insideTopRight",
                    fontSize: 11,
                    fill: "var(--muted-foreground)",
                  }}
                />
              ) : null}
              <Line
                type="monotone"
                dataKey="utfall"
                stroke="var(--color-utfall)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
}
