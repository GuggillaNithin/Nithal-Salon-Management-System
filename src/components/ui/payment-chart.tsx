'use client';

import React from 'react';
import {
  BarChart,
  LinearYAxis,
  LinearYAxisTickSeries,
  LinearXAxis,
  LinearXAxisTickSeries,
  LinearXAxisTickLabel,
  BarSeries,
  Bar,
  GridlineSeries,
  Gridline,
} from 'reaviz';

export interface PaymentCategoryData {
  key: string;
  data: number;
}

const chartColors = ['#5B14C5', '#9152EE', '#40E5D1', '#A840E8', '#4C86FF', '#0D4ED2', '#40D3F4'];

interface PaymentChartWidgetProps {
  data: PaymentCategoryData[];
}

export function PaymentChartWidget({ data }: PaymentChartWidgetProps) {
  return (
    <div className="flex flex-col w-full h-[250px] overflow-hidden transition-colors duration-300">
      <BarChart
        height={250}
        data={data}
        yAxis={
          <LinearYAxis
            axisLine={null}
            tickSeries={<LinearYAxisTickSeries line={null} label={null} />}
          />
        }
        xAxis={
          <LinearXAxis
            type="category"
            tickSeries={
              <LinearXAxisTickSeries
                label={
                  <LinearXAxisTickLabel
                    padding={10}
                    rotation={-45}
                    format={(text: string) => (text.length > 8 ? `${text.slice(0, 8)}...` : text)}
                    fill="#9A9AAF" 
                  />
                }
                tickSize={10}
              />
            }
          />
        }
        series={
          <BarSeries
            bar={
              <Bar
                glow={{
                  blur: 20,
                  opacity: 0.5,
                }}
                gradient={null}
              />
            }
            colorScheme={chartColors}
            padding={0.2}
          />
        }
        gridlines={
          <GridlineSeries
            line={<Gridline strokeColor="#7E7E8F75" />} 
          />
        }
      />
    </div>
  );
}
