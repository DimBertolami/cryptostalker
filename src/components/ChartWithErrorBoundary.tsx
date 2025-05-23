import React, { ErrorInfo } from 'react';
import { Line } from 'react-chartjs-2';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Chart error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div>Error loading chart</div>;
    }

    return this.props.children;
  }
}

export const ChartWithErrorBoundary: React.FC<{ data: any; options: any }> = ({ 
  data, 
  options 
}) => {
  return (
    <ErrorBoundary 
      fallback={<div className="text-red-500">Failed to load chart data</div>}
    >
      <Line data={data} options={options} />
    </ErrorBoundary>
  );
};