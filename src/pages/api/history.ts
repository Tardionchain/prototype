import { NextApiRequest, NextApiResponse } from "next";
import { connectDB } from "@/backend/mongodb";
import mongoose from "mongoose";

// Define the schema for movement history
const MovementHistorySchema = new mongoose.Schema({
  x: Number,
  y: Number,
  facingDir: Number,
  speed: Number,
  targetDir: Number,
  targetSpeed: Number,
  speedChangeInterval: Number,
  affectedTransactions: [String],
  timestamp: { type: Date, default: Date.now },
});

// Create or get the model
const MovementHistory = mongoose.models.MovementHistory || 
  mongoose.model('MovementHistory', MovementHistorySchema);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    await connectDB();

    if (req.method === 'POST') {
      // Save new movement state
      const history = new MovementHistory(req.body);
      await history.save();
      return res.status(200).json(history);
    } 
    else if (req.method === 'GET') {
      // Get latest movement state
      const latestState = await MovementHistory.findOne()
        .sort({ timestamp: -1 })
        .limit(1);

      if (!latestState) {
        return res.status(200).json({
          x: window.innerWidth / 2,
          y: window.innerHeight / 2,
          facingDir: 0,
          speed: 0,
          targetDir: 0,
          targetSpeed: 0,
          speedChangeInterval: 0,
          affectedTransactions: [],
        });
      }

      return res.status(200).json(latestState);
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Error in history API:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
} 