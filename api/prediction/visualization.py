"""
Visualization Module for Cryptocurrency Prediction and Trading

This module provides visualization tools for displaying prediction results,
trading performance, and market data analysis.
"""

import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
import plotly.graph_objects as go
import plotly.express as px
from plotly.subplots import make_subplots
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Tuple, Optional, Union, Any

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("visualization.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("visualization")

class PredictionVisualizer:
    """
    A class for visualizing cryptocurrency predictions and trading performance.
    """
    
    def __init__(self, output_dir='visualizations'):
        """
        Initialize the visualizer.
        
        Args:
            output_dir (str): Directory to save visualizations
        """
        self.output_dir = output_dir
        
        # Create output directory if it doesn't exist
        os.makedirs(output_dir, exist_ok=True)
        
        # Set default style
        sns.set(style="darkgrid")
        plt.rcParams['figure.figsize'] = (12, 8)
        plt.rcParams['font.size'] = 12
        
        logger.info(f"PredictionVisualizer initialized with output_dir={output_dir}")
    
    def plot_price_and_predictions(self, 
                                  df: pd.DataFrame, 
                                  predictions: np.ndarray = None,
                                  signals: np.ndarray = None,
                                  title: str = 'Price and Predictions',
                                  save_path: str = None,
                                  show_plot: bool = True) -> str:
        """
        Plot price data with predictions and trading signals.
        
        Args:
            df: DataFrame with price data (must have 'close' column and datetime index)
            predictions: Array of prediction values (optional)
            signals: Array of trading signals (1=buy, -1=sell, 0=hold) (optional)
            title: Plot title
            save_path: Path to save the plot (if None, auto-generated)
            show_plot: Whether to display the plot
            
        Returns:
            str: Path to the saved plot
        """
        try:
            # Create figure with secondary y-axis
            fig = make_subplots(specs=[[{"secondary_y": True}]])
            
            # Add price trace
            fig.add_trace(
                go.Scatter(x=df.index, y=df['close'], name="Price", line=dict(color='blue')),
                secondary_y=False,
            )
            
            # Add predictions if provided
            if predictions is not None and len(predictions) > 0:
                # Ensure predictions array length matches dataframe
                if len(predictions) != len(df):
                    logger.warning(f"Predictions length ({len(predictions)}) doesn't match dataframe length ({len(df)})")
                    # Use the last n rows where n is the length of predictions
                    pred_df = df.iloc[-len(predictions):]
                else:
                    pred_df = df
                
                fig.add_trace(
                    go.Scatter(x=pred_df.index, y=predictions, name="Predictions", line=dict(color='orange')),
                    secondary_y=True,
                )
            
            # Add buy/sell signals if provided
            if signals is not None and len(signals) > 0:
                # Ensure signals array length matches dataframe
                if len(signals) != len(df):
                    logger.warning(f"Signals length ({len(signals)}) doesn't match dataframe length ({len(df)})")
                    # Use the last n rows where n is the length of signals
                    signal_df = df.iloc[-len(signals):]
                else:
                    signal_df = df
                
                # Create buy and sell markers
                buy_signals = signal_df[signals == 1]
                sell_signals = signal_df[signals == -1]
                
                if not buy_signals.empty:
                    fig.add_trace(
                        go.Scatter(
                            x=buy_signals.index, 
                            y=buy_signals['close'], 
                            mode='markers',
                            name="Buy Signal", 
                            marker=dict(color='green', size=10, symbol='triangle-up')
                        ),
                        secondary_y=False,
                    )
                
                if not sell_signals.empty:
                    fig.add_trace(
                        go.Scatter(
                            x=sell_signals.index, 
                            y=sell_signals['close'], 
                            mode='markers',
                            name="Sell Signal", 
                            marker=dict(color='red', size=10, symbol='triangle-down')
                        ),
                        secondary_y=False,
                    )
            
            # Set titles
            fig.update_layout(
                title=title,
                xaxis_title="Date",
                legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1)
            )
            
            fig.update_yaxes(title_text="Price", secondary_y=False)
            if predictions is not None:
                fig.update_yaxes(title_text="Prediction Value", secondary_y=True)
            
            # Save plot if requested
            if save_path is None:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                save_path = os.path.join(self.output_dir, f"price_predictions_{timestamp}.html")
            
            fig.write_html(save_path)
            logger.info(f"Saved price and predictions plot to {save_path}")
            
            # Show plot if requested
            if show_plot:
                fig.show()
            
            return save_path
            
        except Exception as e:
            logger.error(f"Error plotting price and predictions: {e}")
            return None
    
    def plot_trading_performance(self,
                                performance_data: Dict[str, Any],
                                title: str = 'Trading Performance',
                                save_path: str = None,
                                show_plot: bool = True) -> str:
        """
        Plot trading performance metrics.
        
        Args:
            performance_data: Dictionary with performance metrics
            title: Plot title
            save_path: Path to save the plot (if None, auto-generated)
            show_plot: Whether to display the plot
            
        Returns:
            str: Path to the saved plot
        """
        try:
            # Extract data
            equity_curve = performance_data.get('equity_curve', [])
            dates = performance_data.get('dates', [])
            trades = performance_data.get('trades', [])
            
            if not equity_curve or not dates:
                logger.error("Missing equity curve or dates in performance data")
                return None
            
            # Create figure with secondary y-axis
            fig = make_subplots(rows=2, cols=1, shared_xaxes=True, 
                               vertical_spacing=0.1,
                               subplot_titles=('Equity Curve', 'Trade Results'))
            
            # Add equity curve
            fig.add_trace(
                go.Scatter(x=dates, y=equity_curve, name="Equity", line=dict(color='blue')),
                row=1, col=1
            )
            
            # Add trade results if available
            if trades:
                # Extract trade data
                trade_dates = [trade.get('close_time', trade.get('open_time')) for trade in trades]
                trade_profits = [trade.get('profit', 0) for trade in trades]
                trade_types = [trade.get('side', 'unknown') for trade in trades]
                
                # Create colors based on profit and trade type
                colors = ['green' if p > 0 else 'red' for p in trade_profits]
                
                # Add trade results
                fig.add_trace(
                    go.Bar(x=trade_dates, y=trade_profits, name="Trade P/L", marker_color=colors),
                    row=2, col=1
                )
            
            # Set titles
            fig.update_layout(
                title=title,
                xaxis_title="Date",
                showlegend=True,
                legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1)
            )
            
            # Add performance metrics as annotations
            metrics_text = []
            
            if 'total_return' in performance_data:
                metrics_text.append(f"Total Return: {performance_data['total_return']:.2f}%")
            
            if 'sharpe_ratio' in performance_data:
                metrics_text.append(f"Sharpe Ratio: {performance_data['sharpe_ratio']:.2f}")
            
            if 'win_rate' in performance_data:
                metrics_text.append(f"Win Rate: {performance_data['win_rate']:.2f}%")
            
            if 'profit_factor' in performance_data:
                metrics_text.append(f"Profit Factor: {performance_data['profit_factor']:.2f}")
            
            if 'max_drawdown' in performance_data:
                metrics_text.append(f"Max Drawdown: {performance_data['max_drawdown']:.2f}%")
            
            # Add metrics as annotations
            for i, text in enumerate(metrics_text):
                fig.add_annotation(
                    xref="paper", yref="paper",
                    x=0.01, y=0.99 - (i * 0.05),
                    text=text,
                    showarrow=False,
                    font=dict(size=12),
                    align="left",
                    bgcolor="rgba(255, 255, 255, 0.7)",
                    bordercolor="black",
                    borderwidth=1,
                    borderpad=4
                )
            
            # Save plot if requested
            if save_path is None:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                save_path = os.path.join(self.output_dir, f"trading_performance_{timestamp}.html")
            
            fig.write_html(save_path)
            logger.info(f"Saved trading performance plot to {save_path}")
            
            # Show plot if requested
            if show_plot:
                fig.show()
            
            return save_path
            
        except Exception as e:
            logger.error(f"Error plotting trading performance: {e}")
            return None
    
    def plot_model_training_history(self,
                                   history: Dict[str, List[float]],
                                   title: str = 'Model Training History',
                                   save_path: str = None,
                                   show_plot: bool = True) -> str:
        """
        Plot model training history.
        
        Args:
            history: Dictionary with training metrics
            title: Plot title
            save_path: Path to save the plot (if None, auto-generated)
            show_plot: Whether to display the plot
            
        Returns:
            str: Path to the saved plot
        """
        try:
            # Create figure with subplots
            fig = make_subplots(rows=1, cols=2, subplot_titles=('Loss', 'Metrics'))
            
            # Add loss curves
            if 'loss' in history:
                fig.add_trace(
                    go.Scatter(y=history['loss'], name="Training Loss", line=dict(color='blue')),
                    row=1, col=1
                )
            
            if 'val_loss' in history:
                fig.add_trace(
                    go.Scatter(y=history['val_loss'], name="Validation Loss", line=dict(color='red')),
                    row=1, col=1
                )
            
            # Add other metrics
            for metric, values in history.items():
                if metric not in ['loss', 'val_loss'] and 'val_' not in metric:
                    fig.add_trace(
                        go.Scatter(y=values, name=f"Training {metric}", line=dict(color='green')),
                        row=1, col=2
                    )
                    
                    # Add validation metric if available
                    val_metric = f"val_{metric}"
                    if val_metric in history:
                        fig.add_trace(
                            go.Scatter(y=history[val_metric], name=f"Validation {metric}", line=dict(color='orange')),
                            row=1, col=2
                        )
            
            # Set titles
            fig.update_layout(
                title=title,
                xaxis_title="Epoch",
                showlegend=True,
                legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1)
            )
            
            # Save plot if requested
            if save_path is None:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                save_path = os.path.join(self.output_dir, f"training_history_{timestamp}.html")
            
            fig.write_html(save_path)
            logger.info(f"Saved model training history plot to {save_path}")
            
            # Show plot if requested
            if show_plot:
                fig.show()
            
            return save_path
            
        except Exception as e:
            logger.error(f"Error plotting model training history: {e}")
            return None
    
    def plot_feature_importance(self,
                               feature_names: List[str],
                               importance_scores: List[float],
                               title: str = 'Feature Importance',
                               save_path: str = None,
                               show_plot: bool = True) -> str:
        """
        Plot feature importance scores.
        
        Args:
            feature_names: List of feature names
            importance_scores: List of importance scores
            title: Plot title
            save_path: Path to save the plot (if None, auto-generated)
            show_plot: Whether to display the plot
            
        Returns:
            str: Path to the saved plot
        """
        try:
            # Create DataFrame for plotting
            df = pd.DataFrame({
                'Feature': feature_names,
                'Importance': importance_scores
            })
            
            # Sort by importance
            df = df.sort_values('Importance', ascending=False)
            
            # Create plot
            fig = px.bar(
                df, 
                x='Importance', 
                y='Feature',
                orientation='h',
                title=title,
                labels={'Importance': 'Importance Score', 'Feature': 'Feature Name'},
                color='Importance',
                color_continuous_scale='Viridis'
            )
            
            # Update layout
            fig.update_layout(
                yaxis={'categoryorder': 'total ascending'},
                coloraxis_showscale=False
            )
            
            # Save plot if requested
            if save_path is None:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                save_path = os.path.join(self.output_dir, f"feature_importance_{timestamp}.html")
            
            fig.write_html(save_path)
            logger.info(f"Saved feature importance plot to {save_path}")
            
            # Show plot if requested
            if show_plot:
                fig.show()
            
            return save_path
            
        except Exception as e:
            logger.error(f"Error plotting feature importance: {e}")
            return None
    
    def create_dashboard(self,
                        data: Dict[str, Any],
                        title: str = 'Trading Dashboard',
                        save_path: str = None) -> str:
        """
        Create a comprehensive trading dashboard.
        
        Args:
            data: Dictionary with all necessary data
            title: Dashboard title
            save_path: Path to save the dashboard (if None, auto-generated)
            
        Returns:
            str: Path to the saved dashboard
        """
        try:
            # Extract data
            price_data = data.get('price_data')
            predictions = data.get('predictions')
            signals = data.get('signals')
            performance = data.get('performance')
            feature_importance = data.get('feature_importance')
            
            if price_data is None:
                logger.error("Missing price data for dashboard")
                return None
            
            # Create figure with subplots
            fig = make_subplots(
                rows=3, 
                cols=2,
                specs=[
                    [{"colspan": 2}, None],
                    [{"colspan": 2}, None],
                    [{"type": "indicator"}, {"type": "indicator"}]
                ],
                subplot_titles=(
                    'Price and Predictions', 
                    'Trading Performance',
                    'Win Rate', 
                    'Total Return'
                ),
                vertical_spacing=0.1
            )
            
            # Add price and predictions
            fig.add_trace(
                go.Scatter(x=price_data.index, y=price_data['close'], name="Price", line=dict(color='blue')),
                row=1, col=1
            )
            
            if predictions is not None:
                # Ensure predictions array length matches dataframe
                if len(predictions) != len(price_data):
                    # Use the last n rows where n is the length of predictions
                    pred_df = price_data.iloc[-len(predictions):]
                else:
                    pred_df = price_data
                
                fig.add_trace(
                    go.Scatter(x=pred_df.index, y=predictions, name="Predictions", line=dict(color='orange')),
                    row=1, col=1
                )
            
            # Add trading performance if available
            if performance:
                equity_curve = performance.get('equity_curve', [])
                dates = performance.get('dates', [])
                
                if equity_curve and dates:
                    fig.add_trace(
                        go.Scatter(x=dates, y=equity_curve, name="Equity", line=dict(color='green')),
                        row=2, col=1
                    )
            
            # Add indicator metrics
            if performance:
                # Win rate indicator
                win_rate = performance.get('win_rate', 0)
                fig.add_trace(
                    go.Indicator(
                        mode="gauge+number",
                        value=win_rate,
                        title={"text": "Win Rate (%)"},
                        gauge={
                            'axis': {'range': [0, 100]},
                            'bar': {'color': "green" if win_rate > 50 else "red"},
                            'steps': [
                                {'range': [0, 40], 'color': "red"},
                                {'range': [40, 60], 'color': "yellow"},
                                {'range': [60, 100], 'color': "green"}
                            ]
                        }
                    ),
                    row=3, col=1
                )
                
                # Total return indicator
                total_return = performance.get('total_return', 0)
                fig.add_trace(
                    go.Indicator(
                        mode="gauge+number",
                        value=total_return,
                        title={"text": "Total Return (%)"},
                        gauge={
                            'axis': {'range': [-50, 100]},
                            'bar': {'color': "green" if total_return > 0 else "red"},
                            'steps': [
                                {'range': [-50, 0], 'color': "red"},
                                {'range': [0, 20], 'color': "yellow"},
                                {'range': [20, 100], 'color': "green"}
                            ]
                        }
                    ),
                    row=3, col=2
                )
            
            # Set titles
            fig.update_layout(
                title=title,
                showlegend=True,
                height=900,
                legend=dict(orientation="h", yanchor="bottom", y=1.02, xanchor="right", x=1)
            )
            
            # Save dashboard if requested
            if save_path is None:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                save_path = os.path.join(self.output_dir, f"trading_dashboard_{timestamp}.html")
            
            fig.write_html(save_path)
            logger.info(f"Saved trading dashboard to {save_path}")
            
            return save_path
            
        except Exception as e:
            logger.error(f"Error creating dashboard: {e}")
            return None

# Example usage
if __name__ == "__main__":
    # This is just a demonstration of how to use the module
    print("Prediction Visualizer")
    print("Import this module to use the visualization tools in your trading system")
