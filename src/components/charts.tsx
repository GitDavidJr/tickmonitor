"use client";

import * as React from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

// @ts-ignore
import * as snmp from "net-snmp";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const description = "An interactive area chart";

//formato do item q precisa retornar na função
type ChartItem = {
  datetime: string;
  input: number;
  output: number;
  inputDelta?: number;
  outputDelta?: number;
};

//calcula a diferença entre os valores
function calculateDeltas(data: ChartItem[]): ChartItem[] {
  if (data.length === 0) return [];

  return data.map((item, index) => {
    if (index === 0) {
      return { ...item, inputDelta: 0, outputDelta: 0 };
    }

    const timeDiffMs =
      new Date(item.datetime).getTime() -
      new Date(data[index - 1].datetime).getTime();

    const seconds = timeDiffMs / 1000 || 1;

    return {
      ...item,
      inputDelta: (item.input - data[index - 1].input) / seconds,
      outputDelta: (item.output - data[index - 1].output) / seconds,
    };
  });
}

//configuração de lines do grafico
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

//intervalo de tempo para atualização
const INTERVAL_MS = 10000;

export function ChartAreaInteractive() {
  //estado do grafico com inicio com a função que falei q poderia substituir pela informação do banco de dados
  const [chartData, setChartData] = React.useState<ChartItem[]>([]);

  const [timeRange, setTimeRange] = React.useState("10m");

  React.useEffect(() => {
    const intervalId = setInterval(async () => {
      try {
        const session = snmp.createSession("192.168.89.1", "public");
          const oids = [
            "1.3.6.1.2.1.2.2.1.10.3",  // input
            "1.3.6.1.2.1.2.2.1.16.3",  // output
          ];
        
          
            const result = await new Promise<{ input: number; output: number }>((resolve, reject) => {
              session.get(oids, (error: any, varbinds: any[]) => {
                session.close();
                if (error) return reject(error);
                const input = varbinds[0].value as number;
                const output = varbinds[1].value as number;
                resolve({ input, output });
              });
            });
        
            const datetime = new Date().toISOString().slice(0, 19);
        
            console.log("result", result);
        
            const response = {
              datetime,
              ...result,
            }

        const newItem: ChartItem = response; 

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

  // Filtra dados conforme o timeRange selecionado
  const now = Date.now();
  const filteredData = chartData.filter((item) => {
    const date = new Date(item.datetime).getTime();

    let timeLimit = 10 * 60 * 1000; // padrão: 10 minutos

    if (timeRange === "1h") {
      timeLimit = 60 * 60 * 1000;
    } else if (timeRange === "1d") {
      timeLimit = 24 * 60 * 60 * 1000;
    } else if (timeRange === "7d") {
      timeLimit = 7 * 24 * 60 * 60 * 1000;
    }

    return now - date <= timeLimit;
  });

  const dataWithDeltas = calculateDeltas(filteredData);

  return (
    <Card className="h-full flex flex-col justify-center">
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row mb-auto">
        <div className="grid flex-1 gap-1">
          <CardTitle>Tick Monitor</CardTitle>
          <CardDescription>
            A simple tool to track real-time upload and download traffic from
            your MikroTik router interfaces.
          </CardDescription>
        </div>
        <Select value={timeRange} onValueChange={setTimeRange}>
          <SelectTrigger
            className="hidden w-[160px] rounded-lg sm:ml-auto sm:flex"
            aria-label="Select a value"
          >
            <SelectValue placeholder="Select time range" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="10m" className="rounded-lg">
              Last 10 minutes
            </SelectItem>
            <SelectItem value="1h" className="rounded-lg">
              Last hour
            </SelectItem>
            <SelectItem value="1d" className="rounded-lg">
              Last day
            </SelectItem>
            <SelectItem value="7d" className="rounded-lg">
              Last week
            </SelectItem>
          </SelectContent>
        </Select>
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
                return date.toLocaleTimeString("en-US", { hour12: false }); // HH:mm:ss
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
              dataKey="inputDelta"
              type="natural"
              fill="url(#fillInput)"
              stroke="var(--color-input)"
            />
            <Area
              dataKey="outputDelta"
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
