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

  constructor(size: number, interval: number) {
    this.links = new Array(size);
    let point = { x: 0, y: 0 };

    for (let i = 0, n = this.links.length; i < n; ++i) {
      const link = (this.links[i] = new IKSegment(interval, point));
      link.head.x = Math.random() * 500;
      link.head.y = Math.random() * 500;
      link.tail.x = Math.random() * 500;
      link.tail.y = Math.random() * 500;
      point = link.tail;
    }
  }

  update(target: Point) {
    const link = this.links[0];

    link.head.x = target.x;
    link.head.y = target.y;

    for (let i = 0, n = this.links.length; i < n; ++i) {
      this.links[i].update();
    }
  }
}
