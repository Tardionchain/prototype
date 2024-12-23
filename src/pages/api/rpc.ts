import { createHash } from "crypto";
import { Transaction as TransactionModel, connectDB } from "@/backend/mongodb";
import type { NextApiRequest, NextApiResponse } from "next";
import { neurons } from "@/lib/neurons";
import { weights as baseWeights } from "@/lib/constants";

type WeightMap = Record<string, Record<string, number>>;

interface Transaction {
  _id: unknown;
  signature: string;
  amount: number;
  blockTime: number;
  from: string;
  __v: number;
}

const MAX_TRANSACTIONS = 10;

// Categorize neurons based on their type and role
const NEURON_CATEGORIES = {
  // Movement command neurons
  forward: neurons.filter((n) => n.startsWith("AVB") || n.startsWith("PVC")),
  backward: neurons.filter((n) => n.startsWith("AVA") || n.startsWith("AVD")),
  turn: neurons.filter((n) => n.startsWith("RIV") || n.startsWith("SMD")),

  // Motor neurons
  motorA: neurons.filter((n) => n.startsWith("VA") || n.startsWith("DA")),
  motorB: neurons.filter((n) => n.startsWith("VB") || n.startsWith("DB")),
  motorD: neurons.filter((n) => n.startsWith("DD") || n.startsWith("VD")),

  // Muscles
  dorsalMuscles: neurons.filter(
    (n) => n.startsWith("MDL") || n.startsWith("MDR"),
  ),
  ventralMuscles: neurons.filter(
    (n) => n.startsWith("MVL") || n.startsWith("MVR"),
  ),

  // Sensory and interneurons
  sensory: neurons.filter(
    (n) =>
      n.startsWith("ADF") ||
      n.startsWith("ASE") ||
      n.startsWith("AWC") ||
      n.startsWith("ALM") ||
      n.startsWith("AVM") ||
      n.startsWith("PLM"),
  ),
  interneurons: neurons.filter(
    (n) =>
      !n.startsWith("MD") &&
      !n.startsWith("MV") &&
      !n.startsWith("VA") &&
      !n.startsWith("DA") &&
      !n.startsWith("VB") &&
      !n.startsWith("DB") &&
      !n.startsWith("DD") &&
      !n.startsWith("VD") &&
      !n.startsWith("AVB") &&
      !n.startsWith("PVC") &&
      !n.startsWith("AVA") &&
      !n.startsWith("AVD") &&
      !n.startsWith("RIV") &&
      !n.startsWith("SMD"),
  ),
} as const;

function hexToNormalizedFloat(hex: string, baseWeight: number): number {
  if (!hex) return baseWeight;
  const intValue = parseInt(hex.substring(0, 12), 16);
  const maxHex = parseInt("f".repeat(12), 16);

  // Create a more dynamic range around the base weight
  const variation = (intValue / maxHex) * 2 - 4; // -1 to 1
  const scaledVariation =
    Math.sign(variation) * Math.pow(Math.abs(variation), 0.75);

  // Scale variation based on base weight to maintain proportions
  const variationScale = Math.abs(baseWeight) * 0.5 + 0.5;
  return baseWeight + scaledVariation * variationScale;
}

function hashSignature(signature: string): string {
  return createHash("sha256").update(signature).digest("hex");
}

type NeuronRole =
  | "forward"
  | "backward"
  | "turn"
  | "motorA"
  | "motorB"
  | "motorD"
  | "dorsalMuscle"
  | "ventralMuscle"
  | "sensory"
  | "interneuron";

function getNeuronRole(neuron: string): NeuronRole {
  if (NEURON_CATEGORIES.forward.includes(neuron)) return "forward";
  if (NEURON_CATEGORIES.backward.includes(neuron)) return "backward";
  if (NEURON_CATEGORIES.turn.includes(neuron)) return "turn";
  if (NEURON_CATEGORIES.motorA.includes(neuron)) return "motorA";
  if (NEURON_CATEGORIES.motorB.includes(neuron)) return "motorB";
  if (NEURON_CATEGORIES.motorD.includes(neuron)) return "motorD";
  if (NEURON_CATEGORIES.dorsalMuscles.includes(neuron)) return "dorsalMuscle";
  if (NEURON_CATEGORIES.ventralMuscles.includes(neuron)) return "ventralMuscle";
  if (NEURON_CATEGORIES.sensory.includes(neuron)) return "sensory";
  return "interneuron";
}

function getWeightModifier(
  sourceRole: NeuronRole,
  targetRole: NeuronRole,
  hash: string,
): number {
  const hashValue =
    parseInt(hash.substring(0, 8), 16) / parseInt("f".repeat(8), 16);

  // Command neurons to motor neurons
  if (
    (sourceRole === "forward" || sourceRole === "backward") &&
    (targetRole === "motorA" || targetRole === "motorB")
  ) {
    return 1.4 + hashValue * 0.6; // 1.4 - 2.0 range for command to motor
  }

  // Motor neurons to muscles
  if (
    (sourceRole === "motorA" ||
      sourceRole === "motorB" ||
      sourceRole === "motorD") &&
    (targetRole === "dorsalMuscle" || targetRole === "ventralMuscle")
  ) {
    return 1.3 + hashValue * 0.7; // 1.3 - 2.0 range for motor to muscle
  }

  // Sensory to command
  if (
    sourceRole === "sensory" &&
    (targetRole === "forward" || targetRole === "backward")
  ) {
    return 1.2 + hashValue * 0.6; // 1.2 - 1.8 range for sensory to command
  }

  // Turn command to muscles
  if (
    sourceRole === "turn" &&
    (targetRole === "dorsalMuscle" || targetRole === "ventralMuscle")
  ) {
    return 1.1 + hashValue * 0.7; // 1.1 - 1.8 range for turn to muscle
  }

  // Same type connections
  if (sourceRole === targetRole) {
    return 0.9 + hashValue * 0.3; // 0.9 - 1.2 range for same type
  }

  // Interneuron connections
  if (sourceRole === "interneuron" || targetRole === "interneuron") {
    return 0.8 + hashValue * 0.4; // 0.8 - 1.2 range for interneurons
  }

  return 0.7 + hashValue * 0.5; // 0.7 - 1.2 range for other connections
}

async function generateDynamicWeights(transactions: Transaction[]): Promise<WeightMap> {
  const weights: WeightMap = JSON.parse(JSON.stringify(baseWeights));

  if (!transactions.length) return weights;

  const recentTransactions = transactions
    .sort((a, b) => b.blockTime - a.blockTime)
    .slice(0, MAX_TRANSACTIONS);

  for (const tx of recentTransactions) {
    if (!tx.signature || !tx.amount || !tx.blockTime) continue;

    const hash = hashSignature(tx.signature);
    const recencyIndex = recentTransactions.indexOf(tx);
    const recencyMultiplier = Math.pow(0.9, recencyIndex); // Slower decay
    const normalizedAmount = Math.min(
      Math.max(Number(tx.amount) / 1e9, 0.1),
      10,
    );
    const timeSinceTransaction = Date.now() - tx.blockTime * 1000;
    const timeMultiplier = Math.pow(
      Math.max(0, 1 - timeSinceTransaction / (3600 * 1000)),
      0.5,
    );

    for (const sourceNeuron in weights) {
      const connections = weights[sourceNeuron];
      const sourceRole = getNeuronRole(sourceNeuron);

      for (const targetNeuron in connections) {
        const baseWeight = connections[targetNeuron];
        const targetRole = getNeuronRole(targetNeuron);

        const neuronHash = createHash("sha256")
          .update(hash + sourceNeuron + targetNeuron)
          .digest("hex");

        const weightModifier = getWeightModifier(
          sourceRole,
          targetRole,
          neuronHash,
        );
        const dynamicComponent = hexToNormalizedFloat(neuronHash, baseWeight);
        const transactionEffect =
          normalizedAmount * recencyMultiplier * timeMultiplier;

        // Combine all factors with non-linear scaling
        const finalWeight =
          baseWeight +
          (dynamicComponent - baseWeight) * weightModifier * 0.3 +
          Math.sign(baseWeight) * transactionEffect * weightModifier * 0.2;

        // Store with higher precision
        weights[sourceNeuron][targetNeuron] = Math.max(
          -1,
          Math.min(4, finalWeight),
        );
      }
    }
  }

  return weights;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    await connectDB();
    const transactions = (await TransactionModel.find()
      .sort({ blockTime: -1 })
      .limit(MAX_TRANSACTIONS)
      .lean()
      .exec()) as Transaction[];

    if (!transactions.length) {
      console.warn("No transactions found");
      return res.status(200).json(baseWeights);
    }

    const weights = await generateDynamicWeights(transactions);
    res.status(200).json(weights);
  } catch (error) {
    console.error("Error in /api/rpc:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
