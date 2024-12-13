export type tardigradeHistory = {
  x: number;
  y: number;
  direction: string;
  affectedTransactions: string[];
  index: number;
  timestamp: number;
};

export interface NeuronState {
  name: string;
  backgroundColor: string;
  opacity: number;
}

export interface ITransaction extends Document {
  signature: string;
  from: string;
  to: string;
  amount: string;
  slot: number;
  blockTime: number | null;
  activity_type: string;
}

export interface IKSegment {
  size: number;
  head: { x: number; y: number };
  tail: { x: number; y: number };
  update: () => void;
}

export type NeuronWeights = {
  [neuron: string]: {
    [connectedNeuron: string]: number;
  };
};

export interface IKChain {
  links: IKSegment[];
  update: (target: { x: number; y: number }) => void;
}

export interface Point {
  x: number;
  y: number;
}

export interface Weights {
  [key: string]: {
    [key: string]: number;
  };
}

export interface PostSynaptic {
  [key: string]: [number, number];
}

export interface Connectome {
  [key: string]: () => void;
}
