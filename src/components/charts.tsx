"use client";


import Image from 'next/image';
import React, { useEffect, useState } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis } from 'recharts';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    ChartConfig, ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent
} from '@/components/ui/chart';
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';

type ChartItem = {
  datetime: string;
  input: number;
  output: number;
  rx?: number;
  tx?: number;
};


function calculateDeltas(data: ChartItem[]): ChartItem[] {
  if (data.length === 0) return [];

  return data.map((item, index) => {
    if (index === 0) {
      return { ...item, rx: 0, tx: 0 };
    }

    const timeDiffMs =
      new Date(item.datetime).getTime() -
      new Date(data[index - 1].datetime).getTime();

    const seconds = timeDiffMs / 1000 || 1;

    return {
      ...item,
      rx: (item.input - data[index - 1].input) / seconds,
      tx: (item.output - data[index - 1].output) / seconds,
    };
  });
}


const chartConfig = {
  input: {
    label: "Input",
    color: "var(--chart-1)",
  },
  output: {
    label: "Output",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;


const INTERVAL_MS = 5000;

export function ChartAreaInteractive() {
  
  const [chartData, setChartData] = useState<ChartItem[]>([]);



  useEffect(() => {
    const intervalId = setInterval(async () => {
      try {
        const response = await fetch("/api/snmp");
        const data = await response.json();

        const newItem: ChartItem = data;

        setChartData((prevData) => {
          const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
          const newData = [...prevData, newItem].filter(
            (d) => new Date(d.datetime).getTime() >= tenMinutesAgo
          );
          return newData;
        });
      } catch (error) {
        console.error("Erro ao buscar dados SNMP:", error);
      }
    }, INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, []);

  const dataWithDeltas = calculateDeltas(chartData);

  return (
    <Card className="h-full flex flex-col justify-center">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row mb-auto">
        <div className="grid flex-1 gap-1">
          <CardTitle>
            <Image src="/logo.png" alt="logo" width={200} height={20} />
          </CardTitle>
          <CardDescription>
            A simple tool to track real-time upload and download traffic from
            your MikroTik router interfaces.
          </CardDescription>
        </div>
        
      </CardHeader>

      <CardContent className="flex-grow py-10 h-[350px]">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[350px] w-full py-20"
        >
          <AreaChart data={dataWithDeltas}>
            <defs>
              <linearGradient id="fillInput" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-input)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-input)"
                  stopOpacity={0.1}
                />
              </linearGradient>
              <linearGradient id="fillOutput" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--color-output)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--color-output)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="datetime"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleTimeString("en-US", { hour12: false });
              }}
            />
            <ChartTooltip />
            <ChartTooltipContent
              labelFormatter={(value) => {
                return new Date(value).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                  hour12: false,
                });
              }}
              formatter={(value, name) => {
                let label = name;
                if (name === "Input") label = "Input";
                else if (name === "Output") label = "Output";
                return [value, label];
              }}
              indicator="dot"
            />
            <Area
              dataKey="rx"
              type="natural"
              fill="url(#fillInput)"
              stroke="var(--color-input)"
            />
            <Area
              dataKey="tx"
              type="natural"
              fill="url(#fillOutput)"
              stroke="var(--color-output)"
            />
            <ChartLegend content={<ChartLegendContent />} />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
