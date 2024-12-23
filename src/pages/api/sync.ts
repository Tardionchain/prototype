import { NextApiRequest, NextApiResponse } from 'next';
import mongoose from 'mongoose';

// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/tardi';

let isConnected = false;
let connectionPromise: Promise<typeof mongoose> | null = null;

const connectDB = async () => {
  try {
    if (isConnected) return;
    
    if (!connectionPromise) {
      connectionPromise = mongoose.connect(MONGODB_URI, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      });
    }
    
    await connectionPromise;
    isConnected = true;
  } catch (error) {
    console.error('MongoDB connection error:', error);
    connectionPromise = null;
    throw error;
  }
};

// Define Movement Schema
const MovementSchema = new mongoose.Schema({
  x: { type: Number, required: true },
  y: { type: Number, required: true },
  velocityX: { type: Number, required: true, default: 0 },
  velocityY: { type: Number, required: true, default: 0 },
  facingDir: { type: Number, required: true, default: 0 },
  targetDir: { type: Number, required: true, default: 0 },
  speed: { type: Number, required: true, default: 0 },
  targetSpeed: { type: Number, required: true, default: 0 },
  speedChangeInterval: { type: Number, required: true, default: 0 },
  timestamp: { type: Number, required: true, default: () => Date.now() },
  transaction: { type: String }
}, { 
  timestamps: true,
  strict: true
});

const Movement = mongoose.models.Movement || mongoose.model('Movement', MovementSchema);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    await connectDB();

    if (req.method === 'GET') {
      // Get latest position
      const latestMovement = await Movement.findOne()
        .sort({ timestamp: -1 })
        .select('x y velocityX velocityY timestamp transaction')
        .lean()
        .exec();

      if (!latestMovement) {
        return res.status(200).json({
          x: 0, y: 0, velocityX: 0, velocityY: 0,
          timestamp: Date.now()
        });
      }

      return res.status(200).json(latestMovement);
    } else if (req.method === 'POST') {
      const { x, y, velocityX = 0, velocityY = 0 } = req.body;

      // Validate input
      if (typeof x !== 'number' || typeof y !== 'number' ||
          typeof velocityX !== 'number' || typeof velocityY !== 'number') {
        return res.status(400).json({ 
          message: 'Invalid input: x, y, velocityX, and velocityY must be numbers' 
        });
      }

      // Save new position
      const movement = new Movement({
        x, y, velocityX, velocityY,
        timestamp: Date.now()
      });

      await movement.save();

      // Clean up old records (keep last 1000) - do this in the background
      Movement.countDocuments().then(count => {
        if (count > 1000) {
          Movement.find()
            .sort({ timestamp: -1 })
            .skip(999)
            .limit(1)
            .then(oldestToKeep => {
              if (oldestToKeep.length > 0) {
                Movement.deleteMany({ timestamp: { $lt: oldestToKeep[0].timestamp } })
                  .catch(err => console.error('Error cleaning up old records:', err));
              }
            })
            .catch(err => console.error('Error finding oldest record:', err));
        }
      }).catch(err => console.error('Error counting documents:', err));

      return res.status(200).json(movement.toObject());
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (error) {
    console.error('Error in sync endpoint:', error);
    // Check if it's a MongoDB connection error
    if (error instanceof Error && error.name === 'MongooseServerSelectionError') {
      return res.status(503).json({ message: 'Database connection error' });
    }
    return res.status(500).json({ message: 'Internal server error' });
  }
} 