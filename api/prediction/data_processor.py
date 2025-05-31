"""
Data Processor for Cryptocurrency Prediction Models

This module handles data preparation, feature engineering, and preprocessing
for cryptocurrency prediction models.
"""

import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler, MinMaxScaler
import talib
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("data_processor.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("data_processor")

class CryptoDataProcessor:
    """
    A class for processing cryptocurrency data for prediction models.
    """
    
    def __init__(self, sequence_length=60, test_size=0.2, val_size=0.2, random_state=42):
        """
        Initialize the data processor.
        
        Args:
            sequence_length (int): Length of input sequences
            test_size (float): Proportion of data to use for testing
            val_size (float): Proportion of training data to use for validation
            random_state (int): Random seed for reproducibility
        """
        self.sequence_length = sequence_length
        self.test_size = test_size
        self.val_size = val_size
        self.random_state = random_state
        self.price_scaler = StandardScaler()
        self.feature_scaler = StandardScaler()
        self.target_scaler = None  # Will be set based on target type
        
        logger.info(f"CryptoDataProcessor initialized with sequence_length={sequence_length}")
    
    def add_technical_indicators(self, df):
        """
        Add technical indicators to the dataframe.
        
        Args:
            df (pd.DataFrame): DataFrame with OHLCV data
            
        Returns:
            pd.DataFrame: DataFrame with added technical indicators
        """
        # Make a copy to avoid modifying the original
        df = df.copy()
        
        # Ensure we have the required columns
        required_columns = ['open', 'high', 'low', 'close', 'volume']
        missing_columns = [col for col in required_columns if col not in df.columns]
        
        if missing_columns:
            logger.error(f"Missing required columns: {missing_columns}")
            raise ValueError(f"DataFrame must contain columns: {required_columns}")
        
        # Convert column names to lowercase if needed
        df.columns = [col.lower() for col in df.columns]
        
        # Add basic indicators
        try:
            # Moving Averages
            df['ma7'] = talib.SMA(df['close'], timeperiod=7)
            df['ma25'] = talib.SMA(df['close'], timeperiod=25)
            df['ma99'] = talib.SMA(df['close'], timeperiod=99)
            
            # Exponential Moving Averages
            df['ema12'] = talib.EMA(df['close'], timeperiod=12)
            df['ema26'] = talib.EMA(df['close'], timeperiod=26)
            
            # MACD
            macd, macd_signal, macd_hist = talib.MACD(
                df['close'], fastperiod=12, slowperiod=26, signalperiod=9
            )
            df['macd'] = macd
            df['macd_signal'] = macd_signal
            df['macd_hist'] = macd_hist
            
            # RSI
            df['rsi'] = talib.RSI(df['close'], timeperiod=14)
            
            # Bollinger Bands
            upper, middle, lower = talib.BBANDS(
                df['close'], timeperiod=20, nbdevup=2, nbdevdn=2, matype=0
            )
            df['bb_upper'] = upper
            df['bb_middle'] = middle
            df['bb_lower'] = lower
            
            # Stochastic Oscillator
            slowk, slowd = talib.STOCH(
                df['high'], df['low'], df['close'],
                fastk_period=14, slowk_period=3, slowk_matype=0,
                slowd_period=3, slowd_matype=0
            )
            df['stoch_k'] = slowk
            df['stoch_d'] = slowd
            
            # Average Directional Index
            df['adx'] = talib.ADX(df['high'], df['low'], df['close'], timeperiod=14)
            
            # Commodity Channel Index
            df['cci'] = talib.CCI(df['high'], df['low'], df['close'], timeperiod=14)
            
            # On-Balance Volume
            df['obv'] = talib.OBV(df['close'], df['volume'])
            
            # Average True Range
            df['atr'] = talib.ATR(df['high'], df['low'], df['close'], timeperiod=14)
            
            # Williams %R
            df['willr'] = talib.WILLR(df['high'], df['low'], df['close'], timeperiod=14)
            
            # Rate of Change
            df['roc'] = talib.ROC(df['close'], timeperiod=10)
            
            # Money Flow Index
            df['mfi'] = talib.MFI(df['high'], df['low'], df['close'], df['volume'], timeperiod=14)
            
            # Percentage price oscillator
            df['ppo'] = talib.PPO(df['close'], fastperiod=12, slowperiod=26, matype=0)
            
        except Exception as e:
            logger.error(f"Error adding technical indicators: {e}")
            raise
        
        # Calculate price changes
        df['price_change'] = df['close'].pct_change()
        df['price_change_1d'] = df['close'].pct_change(periods=24)  # Assuming hourly data
        df['price_change_1w'] = df['close'].pct_change(periods=168)  # 7 days * 24 hours
        
        # Volume changes
        df['volume_change'] = df['volume'].pct_change()
        df['volume_ma7'] = talib.SMA(df['volume'], timeperiod=7)
        df['volume_ma25'] = talib.SMA(df['volume'], timeperiod=25)
        
        # Volatility
        df['volatility'] = df['close'].rolling(window=30).std()
        
        # Drop NaN values
        df = df.dropna()
        
        logger.info(f"Added technical indicators to DataFrame. Shape: {df.shape}")
        
        return df
    
    def create_target(self, df, target_type='binary', horizon=24):
        """
        Create target variable for prediction.
        
        Args:
            df (pd.DataFrame): DataFrame with OHLCV and indicators
            target_type (str): Type of target ('binary', 'regression', or 'classification')
            horizon (int): Prediction horizon in periods
            
        Returns:
            pd.DataFrame: DataFrame with added target variable
        """
        df = df.copy()
        
        # Future price
        future_price = df['close'].shift(-horizon)
        
        if target_type == 'binary':
            # Binary classification: 1 if price goes up, 0 if it goes down
            df['target'] = (future_price > df['close']).astype(int)
            self.target_scaler = None  # No scaling for binary targets
            
        elif target_type == 'regression':
            # Regression: predict future return
            df['target'] = (future_price - df['close']) / df['close']
            self.target_scaler = StandardScaler()
            df['target'] = self.target_scaler.fit_transform(df[['target']])
            
        elif target_type == 'classification':
            # Multi-class classification: -1 for significant down, 0 for sideways, 1 for significant up
            returns = (future_price - df['close']) / df['close']
            threshold = returns.std() * 0.5  # Half standard deviation as threshold
            
            conditions = [
                (returns < -threshold),  # Significant down
                (returns > threshold),    # Significant up
            ]
            choices = [-1, 1]
            df['target'] = np.select(conditions, choices, default=0)
            self.target_scaler = None  # No scaling for categorical targets
            
        else:
            raise ValueError(f"Invalid target_type: {target_type}. Must be 'binary', 'regression', or 'classification'")
        
        # Drop rows with NaN targets
        df = df.dropna(subset=['target'])
        
        logger.info(f"Created {target_type} target with horizon={horizon}. Shape: {df.shape}")
        
        return df
    
    def prepare_sequences(self, df, features, target_col='target'):
        """
        Prepare sequence data for time series models.
        
        Args:
            df (pd.DataFrame): DataFrame with features and target
            features (list): List of feature column names
            target_col (str): Name of the target column
            
        Returns:
            tuple: X_sequences, y_targets
        """
        X, y = [], []
        
        for i in range(len(df) - self.sequence_length):
            X.append(df[features].iloc[i:i+self.sequence_length].values)
            y.append(df[target_col].iloc[i+self.sequence_length])
        
        return np.array(X), np.array(y)
    
    def scale_features(self, df, features, fit=True):
        """
        Scale features using StandardScaler.
        
        Args:
            df (pd.DataFrame): DataFrame with features
            features (list): List of feature column names
            fit (bool): Whether to fit the scaler or just transform
            
        Returns:
            pd.DataFrame: DataFrame with scaled features
        """
        df = df.copy()
        
        # Scale price columns separately
        price_columns = [col for col in ['open', 'high', 'low', 'close'] if col in features]
        other_columns = [col for col in features if col not in price_columns]
        
        if price_columns:
            if fit:
                df[price_columns] = self.price_scaler.fit_transform(df[price_columns])
            else:
                df[price_columns] = self.price_scaler.transform(df[price_columns])
        
        if other_columns:
            if fit:
                df[other_columns] = self.feature_scaler.fit_transform(df[other_columns])
            else:
                df[other_columns] = self.feature_scaler.transform(df[other_columns])
        
        return df
    
    def prepare_data(self, df, features, target_col='target', scale=True):
        """
        Prepare data for training and testing.
        
        Args:
            df (pd.DataFrame): DataFrame with features and target
            features (list): List of feature column names
            target_col (str): Name of the target column
            scale (bool): Whether to scale the features
            
        Returns:
            tuple: X_train, X_val, X_test, y_train, y_val, y_test
        """
        # Make a copy to avoid modifying the original
        df = df.copy()
        
        # Split data into train, validation, and test sets
        test_size_samples = int(len(df) * self.test_size)
        val_size_samples = int((len(df) - test_size_samples) * self.val_size)
        
        test_df = df.iloc[-test_size_samples:]
        val_df = df.iloc[-(test_size_samples + val_size_samples):-test_size_samples]
        train_df = df.iloc[:-(test_size_samples + val_size_samples)]
        
        logger.info(f"Data split - Train: {len(train_df)}, Val: {len(val_df)}, Test: {len(test_df)}")
        
        # Scale features if requested
        if scale:
            train_df = self.scale_features(train_df, features, fit=True)
            val_df = self.scale_features(val_df, features, fit=False)
            test_df = self.scale_features(test_df, features, fit=False)
        
        # Prepare sequences
        X_train, y_train = self.prepare_sequences(train_df, features, target_col)
        X_val, y_val = self.prepare_sequences(val_df, features, target_col)
        X_test, y_test = self.prepare_sequences(test_df, features, target_col)
        
        logger.info(f"Prepared sequences - X_train: {X_train.shape}, y_train: {y_train.shape}")
        logger.info(f"Prepared sequences - X_val: {X_val.shape}, y_val: {y_val.shape}")
        logger.info(f"Prepared sequences - X_test: {X_test.shape}, y_test: {y_test.shape}")
        
        return X_train, X_val, X_test, y_train, y_val, y_test
    
    def inverse_transform_target(self, y_scaled):
        """
        Inverse transform scaled target values.
        
        Args:
            y_scaled: Scaled target values
            
        Returns:
            numpy.ndarray: Original scale target values
        """
        if self.target_scaler is None:
            return y_scaled
            
        # Reshape for inverse transform if needed
        if len(y_scaled.shape) == 1:
            y_scaled = y_scaled.reshape(-1, 1)
            
        return self.target_scaler.inverse_transform(y_scaled)

# Example usage
if __name__ == "__main__":
    # This is just a demonstration of how to use the module
    print("Crypto Data Processor for Prediction Models")
    print("Import this module to use the data processor in your trading system")
