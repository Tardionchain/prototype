import { Point } from "./types";

export function circle(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  c?: string,
) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2, false);
  ctx.closePath();
  if (c) {
    ctx.fillStyle = c;
    ctx.fill();
  } else {
    ctx.strokeStyle = "rgba(255,255,255,0.1)";
    ctx.stroke();
  }
}

class IKSegment {
  size: number;
  head: Point;
  tail: Point;

  constructor(size: number, head?: Point, tail?: Point) {
    this.size = size;
    this.head = head || { x: 0, y: 0 };
    this.tail = tail || { x: this.head.x + size, y: this.head.y + size };
  }

  update() {
    const dx = this.head.x - this.tail.x;
    const dy = this.head.y - this.tail.y;

    const dist = Math.sqrt(dx * dx + dy * dy);
    let force = 0.5 - (this.size / dist) * 0.5;
    const strength = 0.998;

    force *= 0.99;

    const fx = force * dx;
    const fy = force * dy;

    this.tail.x += fx * strength * 2.0;
    this.tail.y += fy * strength * 2.0;
    this.head.x -= fx * (1.0 - strength) * 2.0;
    this.head.y -= fy * (1.0 - strength) * 2.0;
  }
}

export class IKChain {
  links: IKSegment[];
  legs: IKSegment[][];
  bodyWidth: number;

  constructor(size: number, interval: number) {
    // Main body segments
    this.links = new Array(size);
    this.bodyWidth = 32; // Reduced from 48 to 24
    let point = { x: 0, y: 0 };

    // Create main body segments
    for (let i = 0, n = this.links.length; i < n; ++i) {
      const link = (this.links[i] = new IKSegment(interval, point));
      link.head.x = Math.random() * 200;
      link.head.y = Math.random() * 200;
      link.tail.x = Math.random() * 200;
      link.tail.y = Math.random() * 200;
      point = link.tail;
    }

    // Create 8 legs (4 pairs)
    this.legs = [];
    const legSegments = 3; // Each leg has 3 segments
    const legInterval = interval * 0.5; // Reduced from 0.7 to 0.5 to make legs shorter

    for (let i = 0; i < 8; i++) {
      const leg: IKSegment[] = [];
      for (let j = 0; j < legSegments; j++) {
        const legSegment = new IKSegment(legInterval);
        leg.push(legSegment);
      }
      this.legs.push(leg);
    }
  }

  update(target: Point) {
    // Update main body
    const link = this.links[0];
    link.head.x = target.x;
    link.head.y = target.y;

    for (let i = 0; i < this.links.length; ++i) {
      this.links[i].update();
    }

    // Update legs
    const legSpacing = this.links.length / 8; // Space legs evenly along body
    for (let i = 0; i < 8; i++) {
      const bodyIndex = Math.floor(i * legSpacing);
      const bodySegment = this.links[bodyIndex];
      const isLeftSide = i % 2 === 0;
      
      // Calculate leg attachment point
      const attachX = bodySegment.head.x + (isLeftSide ? -this.bodyWidth/2 : this.bodyWidth/2);
      const attachY = bodySegment.head.y;
      
      // Update leg segments
      const leg = this.legs[i];
      leg[0].head.x = attachX;
      leg[0].head.y = attachY;
      
      // Add some natural movement to legs
      const time = Date.now() / 1000;
      const offset = i * (Math.PI / 4);
      const legMovement = Math.sin(time * 2 + offset) * 3;
      
      leg[0].tail.x = attachX + (isLeftSide ? -10 : 10);
      leg[0].tail.y = attachY + legMovement;
      
      // Update rest of leg segments
      for (let j = 0; j < leg.length; j++) {
        leg[j].update();
        if (j < leg.length - 1) {
          leg[j + 1].head = leg[j].tail;
        }
      }
    }
  }

  draw(ctx: CanvasRenderingContext2D) {
    // Draw body
    ctx.beginPath();
    ctx.strokeStyle = "white";
    ctx.lineWidth = this.bodyWidth;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";

    // Draw main body
    let prevPoint = this.links[0].head;
    ctx.moveTo(prevPoint.x, prevPoint.y);

    this.links.forEach(link => {
      const { head, tail } = link;
      ctx.lineTo(head.x, head.y);
      ctx.lineTo(tail.x, tail.y);
      prevPoint = tail;
    });

    ctx.stroke();

    // Draw legs
    ctx.lineWidth = this.bodyWidth * 0.35;
    this.legs.forEach(leg => {
      ctx.beginPath();
      ctx.moveTo(leg[0].head.x, leg[0].head.y);
      leg.forEach(segment => {
        ctx.lineTo(segment.tail.x, segment.tail.y);
      });
      ctx.stroke();
    });
  }
}
