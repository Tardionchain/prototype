import { useEffect, useRef, useState } from "react";
import BRAIN, { initializeWeights } from "@/lib/connectome";
import { circle, IKChain } from "@/lib/IK";
import { NeuronState, ITransaction } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { AlignJustify, Loader2 } from "lucide-react";
import axios from "axios";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";

const shortenHash = (hash: string): string => {
  if (!hash) return "";
  return `${hash.slice(0, 4)}...${hash.slice(-4)}`;
};

const TardiSimulation = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [neuronStates, setNeuronStates] = useState<NeuronState[]>([]);
  const neuronNamesRef = useRef<string[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<ITransaction[]>(
    [],
  );
  const [isLoadingRecent, setIsLoadingRecent] = useState(true); // Separate loading state for /api/recent

  useEffect(() => {
    const setupSimulation = async () => {
      await initializeWeights().then(() => {
        setIsLoadingRecent(false); // Stop loading for the second API
      }); // Ensure weights are initialized before simulation
      if (Object.keys(BRAIN.weights || {}).length === 0) {
        console.error("Weights are empty. Simulation cannot proceed.");
        return;
      }
      let facingDir = 0;
      let targetDir = 0;
      let speed = 0;
      let targetSpeed = 0;
      let speedChangeInterval = 0;

      BRAIN.setup();
      if (Object.keys(BRAIN.connectome || {}).length === 0) {
        console.error("BRAIN.connectome is empty. Simulation cannot proceed.");
        return;
      }
      neuronNamesRef.current = Object.keys(BRAIN.connectome || {});
      if (neuronNamesRef.current.length > 0) {
        console.log("Neuron names:", neuronNamesRef.current);
      } else {
        console.warn("BRAIN.connectome is empty.");
      }

      const updateBrain = async () => {
        axios
          .get("/api/recent")
          .then((res) => {
            setRecentTransactions(res.data);
          })
          .catch((error) => {
            console.error("Error fetching recent transactions:", error);
          })
          .finally(async () => {
            await initializeWeights();
            BRAIN.setup();
          });
        BRAIN.update();

        const updatedNeurons = neuronNamesRef.current.map((ps) => {
          const neuron = BRAIN.postSynaptic[ps]?.[BRAIN.thisState] || 0;
          return {
            name: ps,
            backgroundColor: "#55FF55",
            opacity: Math.min(1, neuron / 50),
          };
        });
        setNeuronStates(updatedNeurons);

        const scalingFactor = 20;
        const newDir = (BRAIN.accumleft - BRAIN.accumright) / scalingFactor;
        targetDir = facingDir + newDir * Math.PI;
        targetSpeed =
          (Math.abs(BRAIN.accumleft) + Math.abs(BRAIN.accumright)) /
          (scalingFactor * 5);
        speedChangeInterval = (targetSpeed - speed) / (scalingFactor * 1.5);
      };

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");

      const target = {
        x: window.innerWidth / 2,
        y: window.innerHeight / 2,
      };

      const chain = new IKChain(48, 1);

      const update = () => {
        speed += speedChangeInterval;

        const facingMinusTarget = facingDir - targetDir;
        let angleDiff = facingMinusTarget;

        if (Math.abs(facingMinusTarget) > 180) {
          if (facingDir > targetDir) {
            angleDiff = -1 * (360 - facingDir + targetDir);
          } else {
            angleDiff = 360 - targetDir + facingDir;
          }
        }

        if (angleDiff > 0) {
          facingDir -= 0.1;
        } else if (angleDiff < 0) {
          facingDir += 0.1;
        }

        target.x += Math.cos(facingDir) * speed;
        target.y -= Math.sin(facingDir) * speed;

        if (target.x < 0) {
          target.x = 0;
          BRAIN.stimulateNoseTouchNeurons = true;
        } else if (target.x > window.innerWidth) {
          target.x = window.innerWidth;
          BRAIN.stimulateNoseTouchNeurons = true;
        }

        if (target.y < 0) {
          target.y = 0;
          BRAIN.stimulateNoseTouchNeurons = true;
        } else if (target.y > window.innerHeight) {
          target.y = window.innerHeight;
          BRAIN.stimulateNoseTouchNeurons = true;
        }

        setTimeout(() => {
          BRAIN.stimulateHungerNeurons = true;
          BRAIN.stimulateNoseTouchNeurons = false;
          BRAIN.stimulateFoodSenseNeurons = false;
        }, 2000);

        chain.update(target);
      };

      const draw = () => {
        if (!ctx) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        circle(ctx, target.x, target.y, 5, "rgba(255,255,255,0.1)");

        let link = chain.links[0];
        let p1 = link.head;
        let p2 = link.tail;

        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.strokeStyle = "white";
        ctx.lineWidth = 32;
        ctx.lineJoin = "round";
        ctx.lineCap = "round";

        for (let i = 0, n = chain.links.length; i < n; ++i) {
          link = chain.links[i];
          p1 = link.head;
          p2 = link.tail;
          ctx.lineTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
        }

        ctx.stroke();
      };

      const resize = () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      };

      window.addEventListener("resize", resize);
      resize();

      BRAIN.randExcite();
      const brainInterval = setInterval(updateBrain, 500);
      const animationInterval = setInterval(() => {
        update();
        draw();
      }, 1000 / 60);

      return () => {
        clearInterval(brainInterval);
        clearInterval(animationInterval);
        window.removeEventListener("resize", resize);
      };
    };

    setupSimulation();
  }, []);

  return (
    <div className="flex flex-col overflow-hidden relative h-screen">
      {isLoadingRecent && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/20">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      )}
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
                {recentTransactions.map((tx, index) => {
                  const timeAgo = tx.blockTime
                    ? Math.floor((Date.now() - tx.blockTime * 1000) / 1000) < 60
                      ? `${Math.floor((Date.now() - tx.blockTime * 1000) / 1000)}s ago`
                      : Math.floor((Date.now() - tx.blockTime * 1000) / 60000) <
                          60
                        ? `${Math.floor((Date.now() - tx.blockTime * 1000) / 60000)}m ago`
                        : `${Math.floor((Date.now() - tx.blockTime * 1000) / 3600000)}h ago`
                    : "Pending";

                  const amount = (Number(tx.amount) / 1e9).toFixed(2);

                  return (
                    <tr
                      key={index}
                      className="text-xs text-gray-300 cursor-pointer"
                      onClick={() =>
                        window.open(
                          `https://solscan.io/tx/${tx.signature}`,
                          "_blank",
                        )
                      }
                    >
                      <td className="py-1">{timeAgo}</td>
                      <td className="py-1">
                        <span className="bg-black px-2 py-0.5 rounded-full">
                          {shortenHash(tx.from)}
                        </span>
                      </td>
                      <td className="text-right py-1">{amount}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      <Drawer>
        <DrawerTrigger asChild>
          <Button
            variant="outline"
            className="absolute bottom-4 left-1/2 transform -translate-x-1/2"
          >
            Open Brain 🧠
          </Button>
        </DrawerTrigger>
        <DrawerContent>
          <div className="mx-auto w-full max-w-2xl">
            <DrawerHeader>
              <DrawerTitle>Tardi brain activities</DrawerTitle>
              <DrawerDescription>post-synaptic neurons</DrawerDescription>
            </DrawerHeader>
            <div className="p-4 pb-0">
              <div className="h-fit w-full transition-all flex gap-0 flex-wrap">
                {neuronStates.map(({ name, backgroundColor, opacity }) => (
                  <div key={name}>
                    <span
                      id={name}
                      className="brainNode"
                      style={{
                        display: "block",
                        border: "1px solid #000",
                        padding: "5px",
                        backgroundColor,
                        opacity,
                      }}
                    ></span>
                  </div>
                ))}
              </div>
            </div>
            <DrawerFooter>
              <DrawerClose asChild>
                <Button variant="outline">Close</Button>
              </DrawerClose>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>

      <canvas ref={canvasRef} style={{ display: "block", flex: 1 }} />
    </div>
  );
};

export default TardiSimulation;
