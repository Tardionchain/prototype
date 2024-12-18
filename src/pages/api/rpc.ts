import { createHash } from "crypto";
import { Transaction, connectDB } from "@/backend/mongodb";
import type { NextApiRequest, NextApiResponse } from "next";
import { neurons } from "@/lib/neurons"; // Assuming this contains the full neuron list

// Function to normalize a hexadecimal segment to integer values
function hexToNormalizedInteger(hex: string): number {
  if (!hex) return 0;
  const intValue = parseInt(hex, 16);
  const maxHex = Math.pow(16, hex.length) - 1;
  return (intValue / maxHex) * 2 - 1; // Normalize to [-1, 1]
}

// Function to hash a transaction signature
function hashSignature(signature: string): string {
  return createHash("sha256").update(signature).digest("hex");
}

// Function to process weights dynamically
export function generateDynamicWeights(
  neurons: string[],
  transactions: { signature: string }[],
): Record<string, Record<string, number>> {
  const weights: Record<string, Record<string, number>> = {};

  neurons.forEach((preSynapticNeuron) => {
    weights[preSynapticNeuron] = {};

    neurons.forEach((postSynapticNeuron) => {
      if (preSynapticNeuron !== postSynapticNeuron) {
        weights[preSynapticNeuron][postSynapticNeuron] = 0; // Initialize weights to 0
      }
    });
  });

  transactions.forEach(({ signature }) => {
    neurons.forEach((preSynapticNeuron) => {
      neurons.forEach((postSynapticNeuron) => {
        if (preSynapticNeuron !== postSynapticNeuron) {
          const combinedHashInput = `${signature}-${preSynapticNeuron}-${postSynapticNeuron}`;
          const combinedHash = hashSignature(combinedHashInput);
          const segment = combinedHash.substring(0, 8);
          weights[preSynapticNeuron][postSynapticNeuron] +=
            hexToNormalizedInteger(segment);
        }
      });
    });
  });

  // Format weights to match the desired output template
  const formattedWeights: Record<string, Record<string, number>> = {};

  Object.keys(weights).forEach((preSynapticNeuron) => {
    const connections = Object.entries(weights[preSynapticNeuron])
      .filter(([_, weight]) => weight !== 0) // Remove zero-weight connections
      .reduce(
        (obj, [postSynapticNeuron, weight]) => {
          obj[postSynapticNeuron] = weight;
          return obj;
        },
        {} as Record<string, number>,
      );

    if (Object.keys(connections).length > 0) {
      formattedWeights[preSynapticNeuron] = connections;
    }
  });

  return formattedWeights;
}

// API handler
export default async function brainWeights(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    await connectDB(); // Connect to the database

    // Fetch transactions from the database
    const transactions = await Transaction.find({})
      .sort({ blockTime: 1 })
      .limit(100)
      .lean();

    if (!transactions.length) {
      return res.status(200).json({ message: "No transactions found." });
    }

    // Generate dynamic weights
    const weights = generateDynamicWeights(neurons, transactions);

    res.status(200).json(weights); // Respond with the updated weights
  } catch (error) {
    console.error("Error in brainWeights API:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
