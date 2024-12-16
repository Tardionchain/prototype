import { createHash } from "crypto";
import { Transaction, connectDB } from "@/backend/mongodb";
import type { NextApiRequest, NextApiResponse } from "next";
import { neurons } from "@/lib/neurons"; // Assuming this contains the full neuron list

// Function to generate initial dynamic weights
function generateDynamicWeights(
  neurons: string[],
): Record<string, Record<string, number>> {
  const weights: Record<string, Record<string, number>> = {};

  neurons.forEach((preSynapticNeuron) => {
    weights[preSynapticNeuron] = {};

    neurons.forEach((postSynapticNeuron) => {
      if (preSynapticNeuron !== postSynapticNeuron) {
        // Assign random weight between -1 and 1
        weights[preSynapticNeuron][postSynapticNeuron] = Math.random() * 2 - 1;
      }
    });
  });

  return weights;
}

// Function to hash a transaction signature
function hashSignature(signature: string): string {
  return createHash("sha256").update(signature).digest("hex");
}

// Function to normalize a hexadecimal segment to [-1, 1]
function hexToNormalizedNumber(hex: string): number {
  if (!hex) return 0; // Return 0 for empty input

  const intValue = parseInt(hex, 16);
  const maxHex = Math.pow(16, hex.length) - 1;
  return (intValue / maxHex) * 2 - 1; // Normalize to [-1, 1]
}

// Function to process a single transaction and update weights
export function processTransaction(
  weights: Record<string, Record<string, number>>,
  signature: string,
) {
  Object.keys(weights).forEach((preSynapticNeuron) => {
    const postSynapticConnections = weights[preSynapticNeuron];

    Object.keys(postSynapticConnections).forEach((postSynapticNeuron) => {
      // Combine the signature and neuron pair to create a unique input for hashing
      const combinedHashInput = `${signature}-${preSynapticNeuron}-${postSynapticNeuron}`;
      const combinedHash = hashSignature(combinedHashInput);

      // Use a segment of the combined hash to generate the weight
      const segment = combinedHash.substring(0, 8); // Use the first 8 characters of the hash
      postSynapticConnections[postSynapticNeuron] =
        hexToNormalizedNumber(segment);
    });
  });
}

// API handler
export default async function brainWeights(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    // Connect to the database
    await connectDB();

    // Generate initial weights
    const weights = generateDynamicWeights(neurons);

    // Fetch transactions from the database
    const transactions = await Transaction.find({})
      .sort({ blockTime: 1 })
      .limit(100)
      .lean();

    // Group transactions into bundles
    const transactionBundleSize = 50;
    const transactionGroups = [];
    for (let i = 0; i < transactions.length; i += transactionBundleSize) {
      const group = transactions.slice(i, i + transactionBundleSize);
      if (group.length > 0) {
        transactionGroups.push(group);
      }
    }

    // Update weights based on transaction groups
    for (const group of transactionGroups) {
      for (const transaction of group) {
        processTransaction(weights, transaction.signature);
      }
    }

    // Respond with the updated weights
    res.status(200).json(weights);
  } catch (error) {
    console.error("Error in brainWeights API:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
}
