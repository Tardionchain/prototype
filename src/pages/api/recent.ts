import type { NextApiRequest, NextApiResponse } from "next";
import { Transaction, connectDB } from "@/backend/mongodb";

export const revalidate = 60; // Revalidate every 60 seconds
export const dynamic = "force-dynamic";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    // Ensure the database is connected before querying
    await connectDB();

    // Fetch transactions
    const transactions = await Transaction.find()
      .sort({ blockTime: -1 })
      .limit(50)
      .lean();

    // Send response
    res.status(200).json(transactions);
  } catch (error: unknown) {
    // Handle errors and send appropriate response
    res.status(500).json({ error: "Internal Server Error", details: error });
  }
}
