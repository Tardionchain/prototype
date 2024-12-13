import { useEffect, useRef } from "react";
import BRAIN from "@/lib/connectome";
import { circle, IKChain } from "@/lib/IK";

const TardiSimulation = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let facingDir = 0;
    let targetDir = 0;
    let speed = 0;
    let targetSpeed = 0;
    let speedChangeInterval = 0;

    BRAIN.setup();

    const updateBrain = () => {
      BRAIN.update();
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
  }, []);

  return <canvas ref={canvasRef} style={{ display: "block" }} />;
};

export default TardiSimulation;
