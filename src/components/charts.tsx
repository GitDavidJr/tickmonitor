"use client";

import Image from 'next/image';
import React, { useEffect, useState } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
// Removido Tooltip diretamente de 'recharts'
// import { Tooltip } from 'recharts'; // <--- REMOVIDO AQUI!

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
    rx?: number; // Bytes per second
    tx?: number; // Bytes per second
};

// Função auxiliar para formatar valores com base na unidade, precisão e remover zeros finais
function formatValue(value: number, unitType: "bits" | "bytes"): { value: number; unit: string; displayValue: string } {
    let multiplier = 1;
    let units: string[] = [];

    if (unitType === "bits") {
        multiplier = 8; // Convertendo de Bytes para bits
        units = ["bps", "Kbps", "Mbps", "Gbps"];
    } else { // bytes
        units = ["Bps", "KBps", "MBps", "GBps"];
    }

    let scaledValue = value * multiplier;
    let unitIndex = 0;

    const base = unitType === "bits" ? 1000 : 1024; // 1000 para bits (padrão de rede), 1024 para bytes (armazenamento)

    while (scaledValue >= base && unitIndex < units.length - 1) {
        scaledValue /= base;
        unitIndex++;
    }
    
    let displayValue: string;
    if (scaledValue === 0) {
        displayValue = "0"; // Garante que 0 seja exibido como 0
    } else if (Number.isInteger(scaledValue)) {
        displayValue = scaledValue.toString(); // Se for um inteiro, exibe sem decimais (ex: "50")
    } else if (scaledValue < 10) {
        // Para números pequenos (<10), permite até 3 casas decimais para maior precisão
        displayValue = scaledValue.toFixed(3);
        // Remove zeros finais após o ponto decimal (ex: "1.230" -> "1.23")
        displayValue = displayValue.replace(/\.?0+$/, '');
    } else {
        // Para números maiores, usa 2 casas decimais
        displayValue = scaledValue.toFixed(2);
        // Remove zeros finais após o ponto decimal (ex: "12.50" -> "12.5")
        displayValue = displayValue.replace(/\.?0+$/, '');
    }

    return { value: scaledValue, unit: units[unitIndex], displayValue: displayValue };
}

// Funções de formatação específicas para o tooltip (usam displayValue)
function formatBytesPerSecond(bytesPerSecond: number): string {
    const { displayValue, unit } = formatValue(bytesPerSecond, "bytes");
    return `${displayValue} ${unit}`;
}

function formatBitsPerSecond(bytesPerSecond: number): string {
    const { displayValue, unit } = formatValue(bytesPerSecond, "bits");
    return `${displayValue} ${unit}`;
}

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
            // Removido Math.floor() para manter a precisão total antes da formatação final
            rx: (item.input - data[index - 1].input) / seconds, 
            tx: (item.output - data[index - 1].output) / seconds,
        };
    });
}

const chartConfig = {
    rx: {
        label: "Input",
        color: "var(--chart-1)",
    },
    tx: {
        label: "Output",
        color: "var(--chart-2)",
    },
} satisfies ChartConfig;

const INTERVAL_MS = 1000;

export function ChartAreaInteractive() {
    const [chartData, setChartData] = useState<ChartItem[]>([]);
    const [unitDisplayMode, setUnitDisplayMode] = useState<"auto_bps" | "auto_Bps">("auto_bps");

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

    const handleUnitChange = (value: "auto_bps" | "auto_Bps") => {
        setUnitDisplayMode(value);
    };

    // Função para formatar os ticks do eixo Y usando a nova lógica de precisão
    const formatYAxisTick = (value: number) => {
        if (unitDisplayMode === "auto_bps") {
            const { displayValue, unit } = formatValue(value, "bits");
            // Remove 'ps' da unidade para rótulos mais limpos (ex: "100 M", "1 G")
            return `${displayValue} ${unit.replace('ps', '')}`; 
        } else {
            const { displayValue, unit } = formatValue(value, "bytes");
            // Remove 'ps' da unidade para rótulos mais limpos (ex: "100 MB", "1 GB")
            return `${displayValue} ${unit.replace('ps', '')}`;
        }
    };

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
                <div className="flex gap-2">
                    <Select value={unitDisplayMode} onValueChange={handleUnitChange}>
                        <SelectTrigger
                            className="w-[160px] text-xs"
                            aria-label="Select a unit"
                        >
                            <SelectValue placeholder="Selecione a Unidade" />
                        </SelectTrigger>
                        <SelectContent className="w-[160px]">
                            <SelectItem value="auto_bps">Auto (bits/s)</SelectItem>
                            <SelectItem value="auto_Bps">Auto (Bytes/s)</SelectItem>
                        </SelectContent>
                    </Select>
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
                                    stopColor="var(--color-rx)"
                                    stopOpacity={0.8}
                                />
                                <stop
                                    offset="95%"
                                    stopColor="var(--color-rx)"
                                    stopOpacity={0.1}
                                />
                            </linearGradient>
                            <linearGradient id="fillOutput" x1="0" y1="0" x2="0" y2="1">
                                <stop
                                    offset="5%"
                                    stopColor="var(--color-tx)"
                                    stopOpacity={0.8}
                                />
                                <stop
                                    offset="95%"
                                    stopColor="var(--color-tx)"
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
                        <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={formatYAxisTick}
                            width={80}
                        />
                        {/* Removido o Tooltip duplicado e use ChartTooltip com ChartTooltipContent */}
                        <ChartTooltip content={
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
                                    let formattedValue;
                                    if (unitDisplayMode === "auto_bps") {
                                        formattedValue = formatBitsPerSecond(value as number);
                                    } else {
                                        formattedValue = formatBytesPerSecond(value as number);
                                    }
                                    const label = chartConfig[name as keyof typeof chartConfig]?.label || name;
                                    return [formattedValue, label];
                                }}
                                indicator="dot"
                            />
                        } />
                        
                        <Area
                            dataKey="rx"
                            type="natural"
                            fill="url(#fillInput)"
                            stroke="var(--color-rx)"
                        />
                        <Area
                            dataKey="tx"
                            type="natural"
                            fill="url(#fillOutput)"
                            stroke="var(--color-tx)"
                        />
                        <ChartLegend content={<ChartLegendContent />} />
                    </AreaChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}