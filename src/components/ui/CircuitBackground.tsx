import { useEffect, useRef } from "react";

interface Node {
  x: number;
  y: number;
  vx: number;
  vy: number;
  connections: number[];
  pulseOffset: number;
  size: number;
}

interface Pulse {
  fromIdx: number;
  toIdx: number;
  progress: number;
  speed: number;
  color: string;
}

export function CircuitBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let nodes: Node[] = [];
    let pulses: Pulse[] = [];

    const COLORS = {
      node: "rgba(var(--color-primary-rgb), 0.35)",
      nodeGlow: "rgba(var(--color-primary-rgb), 0.12)",
      line: "rgba(var(--color-primary-rgb), 0.08)",
      pulseBlue: "var(--color-primary-dark)",
      pulsePurple: "var(--color-purple)",
      pulseGreen: "var(--color-success)",
    };

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas!.getBoundingClientRect();
      canvas!.width = rect.width * dpr;
      canvas!.height = rect.height * dpr;
      ctx!.scale(dpr, dpr);
      initNodes(rect.width, rect.height);
    }

    function initNodes(w: number, h: number) {
      const count = Math.floor((w * h) / 18000); // density based on area
      const nodeCount = Math.max(20, Math.min(count, 80));
      nodes = [];
      pulses = [];

      for (let i = 0; i < nodeCount; i++) {
        nodes.push({
          x: Math.random() * w,
          y: Math.random() * h,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          connections: [],
          pulseOffset: Math.random() * Math.PI * 2,
          size: 1.5 + Math.random() * 2,
        });
      }

      // Build connections (nearest neighbors)
      const maxDist = Math.min(w, h) * 0.25;
      for (let i = 0; i < nodes.length; i++) {
        const dists: { idx: number; d: number }[] = [];
        for (let j = 0; j < nodes.length; j++) {
          if (i === j) continue;
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < maxDist) dists.push({ idx: j, d });
        }
        dists.sort((a, b) => a.d - b.d);
        nodes[i].connections = dists.slice(0, 3).map((d) => d.idx);
      }
    }

    function spawnPulse() {
      if (nodes.length < 2) return;
      const fromIdx = Math.floor(Math.random() * nodes.length);
      const conns = nodes[fromIdx].connections;
      if (conns.length === 0) return;
      const toIdx = conns[Math.floor(Math.random() * conns.length)];

      const colors = [COLORS.pulseBlue, COLORS.pulsePurple, COLORS.pulseGreen];
      pulses.push({
        fromIdx,
        toIdx,
        progress: 0,
        speed: 0.008 + Math.random() * 0.012,
        color: colors[Math.floor(Math.random() * colors.length)],
      });
    }

    let time = 0;

    function draw() {
      const rect = canvas!.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;

      ctx!.clearRect(0, 0, w, h);
      time += 0.016;

      // Spawn pulses
      if (Math.random() < 0.06) spawnPulse();

      // Move nodes slightly
      for (const node of nodes) {
        node.x += node.vx;
        node.y += node.vy;

        // Bounce off edges
        if (node.x < 0 || node.x > w) node.vx *= -1;
        if (node.y < 0 || node.y > h) node.vy *= -1;
        node.x = Math.max(0, Math.min(w, node.x));
        node.y = Math.max(0, Math.min(h, node.y));
      }

      // Connections (circuit lines) removed per user request

      // Draw nodes (junction dots)
      for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const pulse = Math.sin(time * 2 + node.pulseOffset) * 0.5 + 0.5;
        const size = node.size + pulse * 1;

        // Glow
        ctx!.beginPath();
        ctx!.arc(node.x, node.y, size + 4, 0, Math.PI * 2);
        ctx!.fillStyle = COLORS.nodeGlow;
        ctx!.fill();

        // Dot
        ctx!.beginPath();
        ctx!.arc(node.x, node.y, size, 0, Math.PI * 2);
        ctx!.fillStyle = COLORS.node;
        ctx!.fill();
      }

      // Draw and update pulses
      for (let p = pulses.length - 1; p >= 0; p--) {
        const pulse = pulses[p];
        pulse.progress += pulse.speed;

        if (pulse.progress > 1) {
          pulses.splice(p, 1);
          continue;
        }

        const a = nodes[pulse.fromIdx];
        const b = nodes[pulse.toIdx];
        if (!a || !b) { pulses.splice(p, 1); continue; }

        // Interpolate along the L-path
        let px: number, py: number;
        const t = pulse.progress;
        const midX = (a.x + b.x) / 2;

        if (Math.abs(a.x - b.x) > Math.abs(a.y - b.y)) {
          if (t < 0.33) {
            const lt = t / 0.33;
            px = a.x + (midX - a.x) * lt;
            py = a.y;
          } else if (t < 0.66) {
            const lt = (t - 0.33) / 0.33;
            px = midX;
            py = a.y + (b.y - a.y) * lt;
          } else {
            const lt = (t - 0.66) / 0.34;
            px = midX + (b.x - midX) * lt;
            py = b.y;
          }
        } else {
          const midY = (a.y + b.y) / 2;
          if (t < 0.33) {
            const lt = t / 0.33;
            px = a.x;
            py = a.y + (midY - a.y) * lt;
          } else if (t < 0.66) {
            const lt = (t - 0.33) / 0.33;
            px = a.x + (b.x - a.x) * lt;
            py = midY;
          } else {
            const lt = (t - 0.66) / 0.34;
            px = b.x;
            py = midY + (b.y - midY) * lt;
          }
        }

        // Pulse glow
        const gradient = ctx!.createRadialGradient(px, py, 0, px, py, 12);
        gradient.addColorStop(0, pulse.color);
        gradient.addColorStop(1, "transparent");
        ctx!.beginPath();
        ctx!.arc(px, py, 12, 0, Math.PI * 2);
        ctx!.fillStyle = gradient;
        ctx!.fill();

        // Pulse dot
        ctx!.beginPath();
        ctx!.arc(px, py, 3, 0, Math.PI * 2);
        ctx!.fillStyle = pulse.color;
        ctx!.fill();
      }

      animId = requestAnimationFrame(draw);
    }

    resize();
    draw();

    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      cancelAnimationFrame(animId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="tl-circuit-bg"
      aria-hidden="true"
    />
  );
}
