import { useEffect, useRef, useState, useCallback, memo } from "react";
import { BRAIN, initializeWeights } from "@/lib/connectome";
import { circle, IKChain } from "@/lib/IK";
import { NeuronState, ITransaction } from "@/lib/types";
import { movementStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { AlignJustify } from "lucide-react";
import axios from "axios";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const STIMULATION_DELAY = 1000;
const SPEED_DAMPING = 0.99;
const MIN_SPEED = 1;
const MAX_SPEED = 10;
const VELOCITY_SMOOTHING = 0.8;
const BOUNCE_REDUCTION = 0.9;

const shortenHash = (hash: string): string => {
  if (!hash) return "";
  return `${hash.slice(0, 4)}...${hash.slice(-4)}`;
};

interface AnimationState {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  facingDir: number;
  targetDir: number;
  speed: number;
  targetSpeed: number;
  speedChangeInterval: number;
}

const TardiSimulation = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const neuronNamesRef = useRef<string[]>([]);
  const [neurons, setNeurons] = useState<Array<{ name: string; backgroundColor: string }>>([]);
  const [recentTransactions, setRecentTransactions] = useState<ITransaction[]>([]);
  const [loadingState, setLoadingState] = useState({
    position: true,
    brain: true,
    transactions: true
  });
  const [isInitialized, setIsInitialized] = useState(false);
  const chainRef = useRef<IKChain | null>(null);
  const targetRef = useRef({ x: 0, y: 0 });
  const [apiStatus, setApiStatus] = useState({
    lastUpdate: Date.now(),
    latency: 0,
    lastTransaction: null as ITransaction | null,
    error: null as string | null,
  });
  console.log(neurons)
  // Check if everything is loaded
  const isFullyLoaded = !Object.values(loadingState).some(state => state);

  // Movement state with initial zero position
  const movementRef = useRef<AnimationState>({
    x: 0,
    y: 0,
    velocityX: 0,
    velocityY: 0,
    facingDir: 0,
    targetDir: 0,
    speed: 0,
    targetSpeed: 0,
    speedChangeInterval: 0
  });

  // Initialize BRAIN weights and fetch recent transactions
  useEffect(() => {
    const init = async () => {
      try {
        // Fetch last known position first
        const posResponse = await axios.get('/api/sync');
        if (posResponse.data) {
          const lastPos = posResponse.data;
          // Restore position and movement state
          const initialX = lastPos.x ?? window.innerWidth / 2;
          const initialY = lastPos.y ?? window.innerHeight / 2;
          
          movementRef.current = {
            x: initialX,
            y: initialY,
            velocityX: lastPos.velocityX ?? 0,
            velocityY: lastPos.velocityY ?? 0,
            facingDir: lastPos.facingDir ?? 0,
            targetDir: lastPos.targetDir ?? 0,
            speed: lastPos.speed ?? 0,
            targetSpeed: lastPos.targetSpeed ?? 0,
            speedChangeInterval: lastPos.speedChangeInterval ?? 0
          };
          
          // Update target position to match
          targetRef.current = { x: initialX, y: initialY };
        }
        setLoadingState(prev => ({ ...prev, position: false }));

        // Initialize BRAIN weights
        await initializeWeights();
        setLoadingState(prev => ({ ...prev, brain: false }));
        
        // Fetch recent transactions
        const txResponse = await axios.get('/api/recent');
        if (txResponse.data) {
          setRecentTransactions(txResponse.data);
        }
        setLoadingState(prev => ({ ...prev, transactions: false }));

        setIsInitialized(true);
      } catch (error) {
        console.error('Initialization error:', error);
        setApiStatus(prev => ({
          ...prev,
          error: 'Failed to initialize simulation'
        }));
        // If we fail to load position, set a default one
        if (loadingState.position) {
          const initialX = window.innerWidth / 2;
          const initialY = window.innerHeight / 2;
          movementRef.current = {
            ...movementRef.current,
            x: initialX,
            y: initialY
          };
          targetRef.current = { x: initialX, y: initialY };
          setLoadingState(prev => ({ ...prev, position: false }));
        }
      }
    };
    
    init();
    
    return () => {
      // Cleanup
      BRAIN.stimulateHungerNeurons = false;
      BRAIN.stimulateNoseTouchNeurons = false;
      BRAIN.stimulateFoodSenseNeurons = false;
    };
  }, []);

  // Set up periodic position syncing
  useEffect(() => {
    if (!isInitialized) return;

    const syncInterval = setInterval(() => {
      const movement = movementRef.current;
      movementStore.updatePosition({
        x: movement.x,
        y: movement.y,
        velocityX: movement.velocityX,
        velocityY: movement.velocityY,
        facingDir: movement.facingDir,
        targetDir: movement.targetDir,
        speed: movement.speed,
        targetSpeed: movement.targetSpeed,
        speedChangeInterval: movement.speedChangeInterval
      });
    }, 1000); // Sync every second

    return () => clearInterval(syncInterval);
  }, [isInitialized]);

  useEffect(() => {
    if (!isInitialized || !isFullyLoaded) return;

    BRAIN.setup();

    const updateBrain = () => {
      BRAIN.update();
      const scalingFactor = 10; // Reduced for faster response
      const movement = movementRef.current;
      
      // Calculate new direction and speed
      const newDir = (BRAIN.accumleft - BRAIN.accumright) / scalingFactor;
      movement.targetDir = movement.facingDir + newDir * Math.PI;
      movement.targetSpeed = (Math.abs(BRAIN.accumleft) + Math.abs(BRAIN.accumright)) / (scalingFactor * 2);
      movement.speedChangeInterval = (movement.targetSpeed - movement.speed) / (scalingFactor * 0.5);
      
      // Update speed
      movement.speed += movement.speedChangeInterval;
      movement.speed = Math.max(MIN_SPEED, Math.min(MAX_SPEED, movement.speed));
      
      // Handle angle wrapping
      const facingMinusTarget = movement.facingDir - movement.targetDir;
      let angleDiff = facingMinusTarget;
      if (Math.abs(facingMinusTarget) > 180) {
        if (movement.facingDir > movement.targetDir) {
          angleDiff = -1 * (360 - movement.facingDir + movement.targetDir);
        } else {
          angleDiff = 360 - movement.targetDir + movement.facingDir;
        }
      }
      
      // Apply turning with increased rate
      if (angleDiff > 0) {
        movement.facingDir -= 0.3; // Increased for faster turning
      } else if (angleDiff < 0) {
        movement.facingDir += 0.3; // Increased for faster turning
      }
      
      // Update target position and velocities
      const target = targetRef.current;
      const newVelocityX = Math.cos(movement.facingDir) * movement.speed * 3;
      const newVelocityY = -Math.sin(movement.facingDir) * movement.speed * 3;
      
      // Apply velocity smoothing
      movement.velocityX = movement.velocityX * VELOCITY_SMOOTHING + newVelocityX * (1 - VELOCITY_SMOOTHING);
      movement.velocityY = movement.velocityY * VELOCITY_SMOOTHING + newVelocityY * (1 - VELOCITY_SMOOTHING);
      
      // Update positions
      target.x += movement.velocityX;
      target.y += movement.velocityY;
      movement.x = target.x;
      movement.y = target.y;
      
      // Handle wall collisions
      const canvas = canvasRef.current;
      if (!canvas) return;
      
      if (target.x < 0) {
        target.x = 0;
        movement.x = 0;
        movement.velocityX *= -BOUNCE_REDUCTION;
        movement.targetDir = Math.PI - movement.facingDir;
        BRAIN.stimulateNoseTouchNeurons = true;
      } else if (target.x > canvas.width) {
        target.x = canvas.width;
        movement.x = canvas.width;
        movement.velocityX *= -BOUNCE_REDUCTION;
        movement.targetDir = Math.PI - movement.facingDir;
        BRAIN.stimulateNoseTouchNeurons = true;
      }
      
      if (target.y < 0) {
        target.y = 0;
        movement.y = 0;
        movement.velocityY *= -BOUNCE_REDUCTION;
        movement.targetDir = -movement.facingDir;
        BRAIN.stimulateNoseTouchNeurons = true;
      } else if (target.y > canvas.height) {
        target.y = canvas.height;
        movement.y = canvas.height;
        movement.velocityY *= -BOUNCE_REDUCTION;
        movement.targetDir = -movement.facingDir;
        BRAIN.stimulateNoseTouchNeurons = true;
      }
      
      // Apply speed damping
      movement.speed *= SPEED_DAMPING;
    };

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    const chain = new IKChain(48, 1);
    chainRef.current = chain;

    const draw = () => {
      if (!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      circle(ctx, targetRef.current.x, targetRef.current.y, 5, "rgba(255,255,255,0.1)");

      if (chain) {
        ctx.beginPath();
        ctx.strokeStyle = "white";
        ctx.lineWidth = 40;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";

        let prevPoint = chain.links[0].head;
        ctx.moveTo(prevPoint.x, prevPoint.y);

        chain.links.forEach(link => {
          const { head, tail } = link;
          ctx.lineTo(head.x, head.y);
          ctx.lineTo(tail.x, tail.y);
          prevPoint = tail;
        });

        ctx.stroke();
      }

      // Update chain
      chain.update(targetRef.current);

      // Update neuron states
      if (neuronNamesRef.current.length) {
        const updatedNeurons = neuronNamesRef.current.map((name) => ({
          name,
          backgroundColor: getNeuronColor(name)
        }));
        setNeurons(updatedNeurons);
      }
    };

    const resize = () => {
      if (!canvasRef.current) return;
      canvasRef.current.width = window.innerWidth;
      canvasRef.current.height = window.innerHeight;
    };

    window.addEventListener("resize", resize);
    resize();

    BRAIN.randExcite();

    const brainInterval = setInterval(updateBrain, 50); // Increased frequency
    const animationInterval = setInterval(() => {
      draw();
    }, 1000 / 60);

    const stimulationInterval = setInterval(() => {
      BRAIN.stimulateHungerNeurons = true;
      BRAIN.stimulateNoseTouchNeurons = false;
      BRAIN.stimulateFoodSenseNeurons = false;
    }, STIMULATION_DELAY);

    return () => {
      clearInterval(brainInterval);
      clearInterval(animationInterval);
      clearInterval(stimulationInterval);
      window.removeEventListener("resize", resize);
    };
  }, [isInitialized, isFullyLoaded]);

  const formatTimeAgo = useCallback((blockTime: number | undefined) => {
    if (!blockTime) return "Pending";
    const seconds = Math.floor((Date.now() - blockTime * 1000) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    return `${Math.floor(minutes / 60)}h ago`;
  }, []);

  // Add polling for recent transactions and update API status
  useEffect(() => {
    if (!isInitialized) return;

    const updateStatus = async () => {
      try {
        const startTime = Date.now();
        const [txResponse, posResponse] = await Promise.all([
          axios.get('/api/recent'),
          axios.get('/api/sync')
        ]);

        const latency = Date.now() - startTime;

        if (txResponse.data?.length > 0) {
          setRecentTransactions(txResponse.data);
          // Update latest transaction in status
          setApiStatus(prev => ({
            ...prev,
            lastUpdate: Date.now(),
            latency,
            lastTransaction: txResponse.data[0]
          }));
        }

        if (posResponse.data) {
          const lastPos = posResponse.data;
          // Update movement store with latest position
          movementStore.updatePosition({
            x: lastPos.x,
            y: lastPos.y,
            velocityX: lastPos.velocityX || 0,
            velocityY: lastPos.velocityY || 0,
            facingDir: lastPos.facingDir || 0,
            targetDir: lastPos.targetDir || 0,
            speed: lastPos.speed || 0,
            targetSpeed: lastPos.targetSpeed || 0,
            speedChangeInterval: lastPos.speedChangeInterval || 0
          });
        }
      } catch (error) {
        console.error('Status update error:', error);
        setApiStatus(prev => ({
          ...prev,
          error: 'Failed to update status'
        }));
      }
    };

    // Initial update
    updateStatus();

    // Poll for updates every 2 seconds
    const statusInterval = setInterval(updateStatus, 2000);

    return () => clearInterval(statusInterval);
  }, [isInitialized]);

  // Update position display in real-time
  useEffect(() => {
    if (!isInitialized) return;

    const updatePositionDisplay = () => {
      setApiStatus(prev => ({
        ...prev,
        lastUpdate: Date.now()
      }));
    };

    // Update position display every 100ms
    const displayInterval = setInterval(updatePositionDisplay, 100);

    return () => clearInterval(displayInterval);
  }, [isInitialized]);

  useEffect(() => {
    if (!neuronNamesRef.current.length) return;
    
    const updatedNeurons = neuronNamesRef.current.map((name) => ({
      name,
      backgroundColor: getNeuronColor(name)
    }));
    setNeurons(updatedNeurons);
  }, [neuronNamesRef.current.length]);

  return (
    <div className="flex flex-col overflow-hidden relative h-screen">
      {!isFullyLoaded ? (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-black gap-4">
          <div className="text-white text-lg">Loading simulation...</div>
          <div className="flex flex-col gap-2 text-sm text-gray-400">
            <div>Position: {loadingState.position ? "Loading..." : "Ready ✓"}</div>
            <div>Brain: {loadingState.brain ? "Loading..." : "Ready ✓"}</div>
            <div>Transactions: {loadingState.transactions ? "Loading..." : "Ready ✓"}</div>
          </div>
          {apiStatus.error && (
            <div className="text-red-400 mt-4">
              Error: {apiStatus.error}
            </div>
          )}
        </div>
      ) : (
        <>
          {/* API Status Display */}
          <div className="fixed left-8 top-8 bg-black/80 p-4 rounded-lg text-xs text-white z-50">
            <div className="flex flex-col gap-2">
              <div className="flex justify-between">
                <span>Last Update:</span>
                <span>{formatTimeAgo(Math.floor(apiStatus.lastUpdate / 1000))}</span>
              </div>
              <div className="flex justify-between">
                <span>Latency:</span>
                <span>{apiStatus.latency}ms</span>
              </div>
              {apiStatus.lastTransaction && (
                <div className="flex flex-col gap-1 border-t border-white/20 pt-2 mt-1">
                  <div className="flex justify-between">
                    <span>Latest TX:</span>
                    <span>{shortenHash(apiStatus.lastTransaction.signature)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Amount:</span>
                    <span>{(Number(apiStatus.lastTransaction.amount) / 1e9).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Time:</span>
                    <span>{formatTimeAgo(apiStatus.lastTransaction.blockTime)}</span>
                  </div>
                </div>
              )}
              {apiStatus.error && (
                <div className="text-red-400 border-t border-white/20 pt-2 mt-1">
                  Error: {apiStatus.error}
                </div>
              )}
              <div className="flex flex-col gap-1 border-t border-white/20 pt-2 mt-1">
                <div className="flex justify-between">
                  <span>Position:</span>
                  <span>
                    {Math.round(movementRef.current.x)}, {Math.round(movementRef.current.y)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Velocity:</span>
                  <span>
                    {movementRef.current.velocityX.toFixed(2)}, {movementRef.current.velocityY.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Speed:</span>
                  <span>{movementRef.current.speed.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <Sheet>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                className="flex gap-4 right-8 w-fit absolute top-8"
              >
                Recent Inputs <AlignJustify />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>recent inputs</SheetTitle>
              </SheetHeader>
              <ScrollArea className="h-[80vh] mt-4 w-full rounded-md border p-4">
                <table className="w-full">
                  <thead>
                    <tr className="text-xs text-gray-200">
                      <th className="text-left pb-2">Time</th>
                      <th className="text-left pb-2">From</th>
                      <th className="text-right pb-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="w-full">
                    {recentTransactions.map((tx, index) => (
                      <tr
                        key={tx.signature || index}
                        className="text-xs text-gray-300 cursor-pointer"
                        onClick={() => window.open(`https://solscan.io/tx/${tx.signature}`, "_blank")}
                      >
                        <td className="py-1">{formatTimeAgo(tx.blockTime)}</td>
                        <td className="py-1">
                          <span className="bg-black px-2 py-0.5 rounded-full">
                            {shortenHash(tx.from)}
                          </span>
                        </td>
                        <td className="text-right py-1">
                          {(Number(tx.amount) / 1e9).toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            </SheetContent>
          </Sheet>

          <canvas ref={canvasRef} style={{ display: "block", flex: 1 }} />
        </>
      )}
    </div>
  );
};

export default TardiSimulation;
