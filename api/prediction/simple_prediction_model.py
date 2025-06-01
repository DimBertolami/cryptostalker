"""
Simple Prediction Model for Cryptocurrency Trading

This module implements a simple prediction model for cryptocurrency price movements
based on the reinforcement learning approach mentioned in the paper by Jiang, Xu, and Liang.
It provides a simplified implementation of the Deep Deterministic Policy Gradient (DDPG) algorithm.
"""

import numpy as np
import pandas as pd
import tensorflow as tf
from tensorflow.keras.models import Sequential, Model
from tensorflow.keras.layers import Dense, Input, Concatenate, BatchNormalization, Dropout
from tensorflow.keras.optimizers import Adam
import matplotlib.pyplot as plt
import os
import json
from datetime import datetime
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("prediction_model.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("prediction_model")

class SimpleDDPGModel:
    """
    A simplified implementation of the Deep Deterministic Policy Gradient (DDPG) algorithm
    for cryptocurrency price prediction and trading signal generation.
    """
    
    def __init__(self, state_dim=10, action_dim=1, save_dir='models/ddpg'):
        """
        Initialize the DDPG model.
        
        Args:
            state_dim (int): Dimension of the state space (number of features)
            action_dim (int): Dimension of the action space (1 for buy/sell/hold)
            save_dir (str): Directory to save model checkpoints
        """
        self.state_dim = state_dim
        self.action_dim = action_dim
        self.save_dir = save_dir
        self.batch_size = 64
        self.gamma = 0.99  # discount factor
        self.tau = 0.001   # target network update rate
        self.actor_lr = 0.0001
        self.critic_lr = 0.001
        self.memory_capacity = 10000
        self.memory = []
        self.memory_counter = 0
        
        # Create directory for saving models if it doesn't exist
        os.makedirs(self.save_dir, exist_ok=True)
        
        # Initialize actor and critic networks
        self.actor = self._build_actor()
        self.critic = self._build_critic()
        
        # Initialize target networks
        self.target_actor = self._build_actor()
        self.target_critic = self._build_critic()
        
        # Copy weights to target networks
        self.target_actor.set_weights(self.actor.get_weights())
        self.target_critic.set_weights(self.critic.get_weights())
        
        # Training history
        self.history = {
            'actor_loss': [],
            'critic_loss': [],
            'rewards': [],
            'portfolio_value': []
        }
        
        logger.info(f"DDPG model initialized with state_dim={state_dim}, action_dim={action_dim}")
    
    def _build_actor(self):
        """
        Build the actor network that predicts actions given states.
        
        Returns:
            tf.keras.Model: Actor model
        """
        inputs = Input(shape=(self.state_dim,))
        x = Dense(64, activation='relu')(inputs)
        x = BatchNormalization()(x)
        x = Dense(32, activation='relu')(x)
        x = BatchNormalization()(x)
        outputs = Dense(self.action_dim, activation='tanh')(x)  # tanh for [-1, 1] range
        
        model = Model(inputs=inputs, outputs=outputs)
        model.compile(optimizer=Adam(learning_rate=self.actor_lr))
        
        return model
    
    def _build_critic(self):
        """
        Build the critic network that predicts Q-values given states and actions.
        
        Returns:
            tf.keras.Model: Critic model
        """
        # State input
        state_input = Input(shape=(self.state_dim,))
        state_x = Dense(32, activation='relu')(state_input)
        state_x = BatchNormalization()(state_x)
        
        # Action input
        action_input = Input(shape=(self.action_dim,))
        action_x = Dense(32, activation='relu')(action_input)
        
        # Combine state and action
        concat = Concatenate()([state_x, action_x])
        x = Dense(64, activation='relu')(concat)
        x = BatchNormalization()(x)
        x = Dense(32, activation='relu')(x)
        outputs = Dense(1, activation='linear')(x)
        
        model = Model(inputs=[state_input, action_input], outputs=outputs)
        model.compile(optimizer=Adam(learning_rate=self.critic_lr), loss='mse')
        
        return model
    
    def remember(self, state, action, reward, next_state, done):
        """
        Store experience in replay memory.
        
        Args:
            state: Current state
            action: Action taken
            reward: Reward received
            next_state: Next state
            done: Whether the episode is done
        """
        experience = (state, action, reward, next_state, done)
        
        if self.memory_counter < self.memory_capacity:
            self.memory.append(experience)
        else:
            self.memory[self.memory_counter % self.memory_capacity] = experience
            
        self.memory_counter += 1
    
    def choose_action(self, state, add_noise=True):
        """
        Choose an action based on the current state.
        
        Args:
            state: Current state
            add_noise (bool): Whether to add exploration noise
            
        Returns:
            numpy.ndarray: Action to take
        """
        state = np.reshape(state, [1, self.state_dim])
        action = self.actor.predict(state)[0]
        
        if add_noise:
            noise = np.random.normal(0, 0.1, size=self.action_dim)
            action = np.clip(action + noise, -1, 1)
            
        return action
    
    def learn(self):
        """
        Update the networks based on stored experiences.
        
        Returns:
            tuple: (critic_loss, actor_loss)
        """
        if len(self.memory) < self.batch_size:
            return 0, 0
            
        # Sample a batch from memory
        indices = np.random.choice(min(self.memory_counter, self.memory_capacity), self.batch_size, replace=False)
        batch = [self.memory[i] for i in indices]
        
        states = np.array([experience[0] for experience in batch])
        actions = np.array([experience[1] for experience in batch])
        rewards = np.array([experience[2] for experience in batch])
        next_states = np.array([experience[3] for experience in batch])
        dones = np.array([experience[4] for experience in batch])
        
        # Train critic
        target_actions = self.target_actor.predict(next_states)
        target_q_values = self.target_critic.predict([next_states, target_actions])
        
        y = rewards + self.gamma * target_q_values * (1 - dones)
        critic_loss = self.critic.train_on_batch([states, actions], y)
        
        # Train actor
        actor_gradients = self._get_actor_gradients(states)
        self.actor.optimizer.apply_gradients(zip(actor_gradients, self.actor.trainable_variables))
        
        # Update target networks
        self._update_target_networks()
        
        # Calculate actor loss (for history)
        predicted_actions = self.actor.predict(states)
        actor_loss = -np.mean(self.critic.predict([states, predicted_actions]))
        
        # Store losses in history
        self.history['critic_loss'].append(critic_loss)
        self.history['actor_loss'].append(actor_loss)
        
        return critic_loss, actor_loss
    
    def _get_actor_gradients(self, states):
        """
        Get gradients for actor network.
        
        Args:
            states: Batch of states
            
        Returns:
            list: Gradients for actor network
        """
        with tf.GradientTape() as tape:
            actions = self.actor(states)
            q_values = self.critic([states, actions])
            actor_loss = -tf.reduce_mean(q_values)
            
        return tape.gradient(actor_loss, self.actor.trainable_variables)
    
    def _update_target_networks(self):
        """Update target networks with soft update."""
        # Update target actor
        actor_weights = self.actor.get_weights()
        target_actor_weights = self.target_actor.get_weights()
        
        for i in range(len(actor_weights)):
            target_actor_weights[i] = self.tau * actor_weights[i] + (1 - self.tau) * target_actor_weights[i]
            
        self.target_actor.set_weights(target_actor_weights)
        
        # Update target critic
        critic_weights = self.critic.get_weights()
        target_critic_weights = self.target_critic.get_weights()
        
        for i in range(len(critic_weights)):
            target_critic_weights[i] = self.tau * critic_weights[i] + (1 - self.tau) * target_critic_weights[i]
            
        self.target_critic.set_weights(target_critic_weights)
    
    def save_models(self, prefix=''):
        """
        Save actor and critic models.
        
        Args:
            prefix (str): Prefix for saved files
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        actor_path = os.path.join(self.save_dir, f"{prefix}actor_{timestamp}.h5")
        critic_path = os.path.join(self.save_dir, f"{prefix}critic_{timestamp}.h5")
        
        self.actor.save(actor_path)
        self.critic.save(critic_path)
        
        # Save training history
        history_path = os.path.join(self.save_dir, f"{prefix}history_{timestamp}.json")
        with open(history_path, 'w') as f:
            json.dump(self.history, f)
            
        logger.info(f"Models saved to {self.save_dir} with prefix {prefix}")
        
        return actor_path, critic_path, history_path
    
    def load_models(self, actor_path, critic_path):
        """
        Load actor and critic models.
        
        Args:
            actor_path (str): Path to actor model
            critic_path (str): Path to critic model
        """
        self.actor = tf.keras.models.load_model(actor_path)
        self.critic = tf.keras.models.load_model(critic_path)
        
        # Update target networks
        self.target_actor.set_weights(self.actor.get_weights())
        self.target_critic.set_weights(self.critic.get_weights())
        
        logger.info(f"Models loaded from {actor_path} and {critic_path}")
    
    def plot_training_history(self, save_path=None):
        """
        Plot training history.
        
        Args:
            save_path (str): Path to save the plot
            
        Returns:
            matplotlib.figure.Figure: Figure with plots
        """
        if not self.history['critic_loss']:
            logger.warning("No training history to plot")
            return None
            
        fig, (ax1, ax2, ax3) = plt.subplots(3, 1, figsize=(12, 15), sharex=True)
        
        # Plot critic loss
        ax1.plot(self.history['critic_loss'])
        ax1.set_title('Critic Loss')
        ax1.set_ylabel('Loss')
        ax1.grid(True)
        
        # Plot actor loss
        ax2.plot(self.history['actor_loss'])
        ax2.set_title('Actor Loss')
        ax2.set_ylabel('Loss')
        ax2.grid(True)
        
        # Plot rewards if available
        if self.history['rewards']:
            ax3.plot(self.history['rewards'])
            ax3.set_title('Rewards')
            ax3.set_ylabel('Reward')
            ax3.set_xlabel('Training Step')
            ax3.grid(True)
        
        plt.tight_layout()
        
        if save_path:
            plt.savefig(save_path, dpi=300, bbox_inches='tight')
            logger.info(f"Training history plot saved to {save_path}")
        
        return fig
    
        def train(self, historical_data, epochs=50, batch_size=64):
            """
            Train the DDPG model using historical market data.
            
            Args:
                historical_data: DataFrame containing OHLCV market data
                epochs: Number of training epochs (default: 50)
                batch_size: Size of mini-batches (default: 64)
                
            Returns:
                dict: Training history containing losses and metrics
            """
            # Reset training history
            self.history = {
                'actor_loss': [],
                'critic_loss': [],
                'rewards': [],
                'portfolio_value': []
            }
            
            try:
                # Preprocess data into state-action-reward sequences
                states, actions, rewards = self._preprocess_training_data(historical_data)
                
                for epoch in range(epochs):
                    epoch_actor_loss = []
                    epoch_critic_loss = []
                    
                    # Mini-batch training
                    for i in range(0, len(states), batch_size):
                        batch_states = states[i:i+batch_size]
                        batch_actions = actions[i:i+batch_size]
                        batch_rewards = rewards[i:i+batch_size]
                        
                        # Store experiences in replay buffer
                        for s, a, r in zip(batch_states, batch_actions, batch_rewards):
                            self.remember(s, a, r, s, False)  # Assuming non-terminal state
                        
                        # Train on batch
                        critic_loss, actor_loss = self.learn()
                        epoch_critic_loss.append(critic_loss)
                        epoch_actor_loss.append(actor_loss)
                    
                    # Calculate epoch averages
                    avg_critic_loss = np.mean(epoch_critic_loss)
                    avg_actor_loss = np.mean(epoch_actor_loss)
                    
                    # Store in history
                    self.history['critic_loss'].append(avg_critic_loss)
                    self.history['actor_loss'].append(avg_actor_loss)
                    
                    # Log progress
                    logger.info(
                        f"Epoch {epoch+1}/{epochs} - "
                        f"Critic Loss: {avg_critic_loss:.4f}, "
                        f"Actor Loss: {avg_actor_loss:.4f}"
                    )
                    
                    # Save model checkpoints
                    if (epoch + 1) % 10 == 0 or epoch == epochs - 1:
                        self.save_models(prefix=f"epoch_{epoch+1}_")
                
                return self.history
                
            except Exception as e:
                logger.error(f"Training error: {str(e)}")
                raise RuntimeError(f"Training failed: {str(e)}")
    
        def _preprocess_training_data(self, data):
            """
            Convert OHLCV data into state representations and rewards.
            
            Args:
                data: DataFrame with columns: ['open', 'high', 'low', 'close', 'volume']
                
            Returns:
                tuple: (states, actions, rewards)
            """
            try:
                prices = data['close'].values
                volumes = data['volume'].values
                
                states = []
                actions = []
                rewards = []
                
                # Create sliding window of states
                window_size = self.state_dim // 2  # Half for price, half for volume
                
                for i in range(window_size, len(prices)):
                    # Normalized price changes
                    price_changes = (prices[i-window_size:i] - prices[i-window_size-1]) / prices[i-window_size-1]
                    
                    # Normalized volumes
                    vol_changes = volumes[i-window_size:i] / np.max(volumes[i-window_size-1:i+1])
                    
                    # Combine into state vector
                    state = np.concatenate([price_changes, vol_changes])
                    
                    # Action: derived from price momentum
                    momentum = (prices[i] - prices[i-1]) / prices[i-1]
                    action = np.clip(momentum * 10, -1, 1)  # Scaled to [-1, 1]
                    
                    # Reward: logarithmic return
                    reward = np.log(prices[i] / prices[i-1])
                    
                    states.append(state)
                    actions.append([action])
                    rewards.append(reward)
                    
                return np.array(states), np.array(actions), np.array(rewards)
                
            except Exception as e:
                logger.error(f"Data preprocessing error: {str(e)}")
                raise RuntimeError(f"Failed to preprocess data: {str(e)}")

    def predict_signal(self, state):
        """
        Predict trading signal based on state.
        
        Args:
            state: Current market state
            
        Returns:
            int: Trading signal (1 for buy, -1 for sell, 0 for hold)
        """
        state = np.reshape(state, [1, self.state_dim])
        action = self.actor.predict(state)[0][0]
        
        # Convert continuous action to discrete signal
        if action > 0.3:
            return 1  # Buy
        elif action < -0.3:
            return -1  # Sell
        else:
            return 0  # Hold

# Example usage
if __name__ == "__main__":
    # This is just a demonstration of how to use the module
    print("Simple DDPG Model for Cryptocurrency Trading")
    print("Import this module to use the model in your trading system")
