/**
 * Type declarations for recharts library
 */

declare module 'recharts' {
  import { ComponentType, ReactNode } from 'react';

  export interface LineProps {
    type?: 'basis' | 'basisClosed' | 'basisOpen' | 'linear' | 'linearClosed' | 'natural' | 'monotoneX' | 'monotoneY' | 'monotone' | 'step' | 'stepBefore' | 'stepAfter';
    dataKey: string;
    stroke?: string;
    fill?: string;
    strokeWidth?: number;
    dot?: boolean | object | ReactNode | ComponentType<any>;
    activeDot?: boolean | object | ReactNode | ComponentType<any>;
    label?: boolean | object | ReactNode | ComponentType<any>;
    points?: any[];
    name?: string;
    yAxisId?: string | number;
    xAxisId?: string | number;
    connectNulls?: boolean;
    unit?: string | number;
    legendType?: 'line' | 'square' | 'rect' | 'circle' | 'cross' | 'diamond' | 'star' | 'triangle' | 'wye' | 'none';
    isAnimationActive?: boolean;
    animationBegin?: number;
    animationDuration?: number;
    animationEasing?: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear';
    onClick?: (data: any, index: number, e: React.MouseEvent) => void;
    onMouseDown?: (data: any, index: number, e: React.MouseEvent) => void;
    onMouseUp?: (data: any, index: number, e: React.MouseEvent) => void;
    onMouseMove?: (data: any, index: number, e: React.MouseEvent) => void;
    onMouseOver?: (data: any, index: number, e: React.MouseEvent) => void;
    onMouseOut?: (data: any, index: number, e: React.MouseEvent) => void;
    onMouseEnter?: (data: any, index: number, e: React.MouseEvent) => void;
    onMouseLeave?: (data: any, index: number, e: React.MouseEvent) => void;
    onClick?: (data: any, index: number, e: React.MouseEvent) => void;
  }

  export interface AreaProps {
    type?: 'basis' | 'basisClosed' | 'basisOpen' | 'linear' | 'linearClosed' | 'natural' | 'monotoneX' | 'monotoneY' | 'monotone' | 'step' | 'stepBefore' | 'stepAfter';
    dataKey: string;
    stroke?: string;
    fill?: string;
    fillOpacity?: number;
    strokeWidth?: number;
    dot?: boolean | object | ReactNode | ComponentType<any>;
    activeDot?: boolean | object | ReactNode | ComponentType<any>;
    label?: boolean | object | ReactNode | ComponentType<any>;
    points?: any[];
    name?: string;
    yAxisId?: string | number;
    xAxisId?: string | number;
    connectNulls?: boolean;
    unit?: string | number;
    legendType?: 'line' | 'square' | 'rect' | 'circle' | 'cross' | 'diamond' | 'star' | 'triangle' | 'wye' | 'none';
    isAnimationActive?: boolean;
    animationBegin?: number;
    animationDuration?: number;
    animationEasing?: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear';
    onClick?: (data: any, index: number, e: React.MouseEvent) => void;
    onMouseDown?: (data: any, index: number, e: React.MouseEvent) => void;
    onMouseUp?: (data: any, index: number, e: React.MouseEvent) => void;
    onMouseMove?: (data: any, index: number, e: React.MouseEvent) => void;
    onMouseOver?: (data: any, index: number, e: React.MouseEvent) => void;
    onMouseOut?: (data: any, index: number, e: React.MouseEvent) => void;
    onMouseEnter?: (data: any, index: number, e: React.MouseEvent) => void;
    onMouseLeave?: (data: any, index: number, e: React.MouseEvent) => void;
    onClick?: (data: any, index: number, e: React.MouseEvent) => void;
  }

  export interface BarProps {
    dataKey: string;
    fill?: string | ((props: any) => string);
    stroke?: string;
    strokeWidth?: number;
    fillOpacity?: number;
    strokeOpacity?: number;
    maxBarSize?: number;
    minPointSize?: number;
    shape?: ReactNode | ComponentType<any>;
    name?: string;
    yAxisId?: string | number;
    xAxisId?: string | number;
    unit?: string | number;
    legendType?: 'line' | 'square' | 'rect' | 'circle' | 'cross' | 'diamond' | 'star' | 'triangle' | 'wye' | 'none';
    isAnimationActive?: boolean;
    animationBegin?: number;
    animationDuration?: number;
    animationEasing?: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear';
    onClick?: (data: any, index: number, e: React.MouseEvent) => void;
    onMouseDown?: (data: any, index: number, e: React.MouseEvent) => void;
    onMouseUp?: (data: any, index: number, e: React.MouseEvent) => void;
    onMouseMove?: (data: any, index: number, e: React.MouseEvent) => void;
    onMouseOver?: (data: any, index: number, e: React.MouseEvent) => void;
    onMouseOut?: (data: any, index: number, e: React.MouseEvent) => void;
    onMouseEnter?: (data: any, index: number, e: React.MouseEvent) => void;
    onMouseLeave?: (data: any, index: number, e: React.MouseEvent) => void;
    onClick?: (data: any, index: number, e: React.MouseEvent) => void;
  }

  export interface ScatterProps {
    data?: any[];
    dataKey?: string;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    fillOpacity?: number;
    strokeOpacity?: number;
    line?: boolean | object | ReactNode | ComponentType<any>;
    lineType?: 'fitting' | 'joint';
    lineJointType?: 'basis' | 'basisClosed' | 'basisOpen' | 'linear' | 'linearClosed' | 'natural' | 'monotoneX' | 'monotoneY' | 'monotone' | 'step' | 'stepBefore' | 'stepAfter';
    shape?: ReactNode | ComponentType<any>;
    name?: string;
    yAxisId?: string | number;
    xAxisId?: string | number;
    zAxisId?: string | number;
    unit?: string | number;
    legendType?: 'line' | 'square' | 'rect' | 'circle' | 'cross' | 'diamond' | 'star' | 'triangle' | 'wye' | 'none';
    isAnimationActive?: boolean;
    animationBegin?: number;
    animationDuration?: number;
    animationEasing?: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear';
    onClick?: (data: any, index: number, e: React.MouseEvent) => void;
    onMouseDown?: (data: any, index: number, e: React.MouseEvent) => void;
    onMouseUp?: (data: any, index: number, e: React.MouseEvent) => void;
    onMouseMove?: (data: any, index: number, e: React.MouseEvent) => void;
    onMouseOver?: (data: any, index: number, e: React.MouseEvent) => void;
    onMouseOut?: (data: any, index: number, e: React.MouseEvent) => void;
    onMouseEnter?: (data: any, index: number, e: React.MouseEvent) => void;
    onMouseLeave?: (data: any, index: number, e: React.MouseEvent) => void;
    onClick?: (data: any, index: number, e: React.MouseEvent) => void;
  }

  export interface PieProps {
    data?: any[];
    dataKey?: string;
    nameKey?: string;
    valueKey?: string;
    cx?: number | string;
    cy?: number | string;
    startAngle?: number;
    endAngle?: number;
    minAngle?: number;
    paddingAngle?: number;
    innerRadius?: number | string;
    outerRadius?: number | string;
    cornerRadius?: number | string;
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    strokeOpacity?: number;
    fillOpacity?: number;
    activeIndex?: number | number[];
    activeShape?: object | ReactNode | ComponentType<any>;
    label?: boolean | object | ReactNode | ComponentType<any>;
    labelLine?: boolean | object | ReactNode | ComponentType<any>;
    legendType?: 'line' | 'square' | 'rect' | 'circle' | 'cross' | 'diamond' | 'star' | 'triangle' | 'wye' | 'none';
    isAnimationActive?: boolean;
    animationBegin?: number;
    animationDuration?: number;
    animationEasing?: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear';
    onClick?: (data: any, index: number, e: React.MouseEvent) => void;
    onMouseDown?: (data: any, index: number, e: React.MouseEvent) => void;
    onMouseUp?: (data: any, index: number, e: React.MouseEvent) => void;
    onMouseMove?: (data: any, index: number, e: React.MouseEvent) => void;
    onMouseOver?: (data: any, index: number, e: React.MouseEvent) => void;
    onMouseOut?: (data: any, index: number, e: React.MouseEvent) => void;
    onMouseEnter?: (data: any, index: number, e: React.MouseEvent) => void;
    onMouseLeave?: (data: any, index: number, e: React.MouseEvent) => void;
    onClick?: (data: any, index: number, e: React.MouseEvent) => void;
  }

  export interface CellProps {
    fill?: string;
    stroke?: string;
    strokeWidth?: number;
    strokeOpacity?: number;
    fillOpacity?: number;
  }

  export interface TooltipProps {
    content?: ReactNode | ComponentType<any>;
    viewBox?: {
      x?: number;
      y?: number;
      width?: number;
      height?: number;
    };
    active?: boolean;
    separator?: string;
    formatter?: (value: any, name: string, props: any) => ReactNode;
    labelFormatter?: (label: any) => ReactNode;
    wrapperStyle?: object;
    itemStyle?: object;
    labelStyle?: object;
    cursor?: boolean | object | ReactNode;
    coordinate?: {
      x?: number;
      y?: number;
    };
    position?: {
      x?: number;
      y?: number;
    };
    label?: string | number;
    payload?: Array<{
      name: string;
      value: any;
      payload?: any;
      dataKey?: string | number;
      fill?: string;
      stroke?: string;
      strokeWidth?: number;
      formatter?: (value: any, name: string, props: any) => ReactNode;
    }>;
    itemSorter?: (item: any) => number;
    filterNull?: boolean;
    useTranslate3d?: boolean;
    animationDuration?: number;
    animationEasing?: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear';
    isAnimationActive?: boolean;
  }

  export const Line: ComponentType<LineProps>;
  export const Area: ComponentType<AreaProps>;
  export const Bar: ComponentType<BarProps>;
  export const Scatter: ComponentType<ScatterProps>;
  export const Pie: ComponentType<PieProps>;
  export const Cell: ComponentType<CellProps>;
  export const Tooltip: ComponentType<TooltipProps>;
  export const LineChart: ComponentType<any>;
  export const BarChart: ComponentType<any>;
  export const PieChart: ComponentType<any>;
  export const ScatterChart: ComponentType<any>;
  export const ComposedChart: ComponentType<any>;
  export const ResponsiveContainer: ComponentType<any>;
  export const CartesianGrid: ComponentType<any>;
  export const XAxis: ComponentType<any>;
  export const YAxis: ComponentType<any>;
  export const ZAxis: ComponentType<any>;
  export const Legend: ComponentType<any>;
  export const ReferenceLine: ComponentType<any>;
  export const ReferenceDot: ComponentType<any>;
  export const ReferenceArea: ComponentType<any>;
  export const Brush: ComponentType<any>;
}
