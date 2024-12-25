# Project Overview

This project simulates a neural network-based system that processes transactions and updates neuron weights dynamically based on recent activity. The system is designed to visualize neuron states and their interactions, providing insights into how different types of neurons contribute to movement and sensory processing.

## Key Components

### 1. **Neurons Categories**

The project categorizes neurons into various types based on their roles in the neural network. The categories include:

- **Movement Command Neurons**: Responsible for forward, backward, and turning commands.
- **Motor Neurons**: Control muscle movements.
- **Muscle Neurons**: Represent the muscles that execute movements.
- **Sensory Neurons**: Process sensory information.
- **Interneurons**: Facilitate communication between different types of neurons.

The neuron types are defined in `src/lib/neurons.ts`, and their categorization is handled in `src/pages/api/rpc.ts`.

### 2. **Dynamic Weight Generation**

The core functionality of the project revolves around dynamically generating weights for neuron connections based on recent transactions. This is done in the following steps:

- **Transaction Fetching**: The system fetches recent transactions from the database using the `/api/recent` endpoint.
- **Weight Calculation**: The `generateDynamicWeights` function computes the weights based on the transaction data. It considers factors such as:
  - The amount of the transaction.
  - The recency of the transaction.
  - The roles of the source and target neurons.
  
  The weights are adjusted using a combination of base weights and dynamic components derived from transaction hashes.

### 3. **Neural Network Simulation**

The `BRAIN` object in `src/lib/connectome.ts` simulates the neural network. It includes methods for:

- **Stimulating Neurons**: The `randExcite` method randomly stimulates neurons to create dynamic behavior.
- **Updating States**: The `update` method processes the current state of the neurons and applies the weights to determine the output.
- **Motor Control**: The `motorcontrol` method calculates the left and right muscle activations based on the accumulated signals from the neurons.

### 4. **API Endpoints**

The project exposes several API endpoints to interact with the neural network:

- **/api/rpc**: Fetches and generates dynamic weights based on recent transactions.
- **/api/recent**: Retrieves the latest transactions from the database.
- **/api/sync**: Synchronizes the current position and movement data, allowing for real-time updates.

### 5. **Movement Store**

The `MovementStore` class in `src/lib/store.ts` manages the position and movement data. It includes methods for:

- **Updating Position**: The `updatePosition` method sends the current position to the server and handles retries in case of failures.
- **Getting Current Position**: The `getCurrentPosition` method retrieves the latest position from the server.
- **Setting Up Sync**: The `setupSync` method establishes a regular interval to fetch the current position.

### 6. **Visualization**

The frontend component in `src/pages/index.tsx` visualizes the neuron states and their interactions. It uses a canvas to draw the neurons and their connections, updating in real-time based on the simulated neural activity.
