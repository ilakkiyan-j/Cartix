/**
 * Cartix 3D Architecture Visualizer & Spline Scene Controller
 * Pipeline: WooCommerce -> Cartix MCP -> AI Agent
 */

(function () {
  'use strict';

  class CartixPipelineVisualizer {
    constructor(canvasId) {
      this.canvas = document.getElementById(canvasId);
      if (!this.canvas) return;

      this.ctx = this.canvas.getContext('2d');
      this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.mouse = { x: 0, y: 0, targetX: 0, targetY: 0, active: false };
      this.time = 0;
      this.packets = [];
      this.particles = [];
      this.activeHoverNode = null;

      this.initDimensions();
      this.initNodes();
      this.initParticles();
      this.bindEvents();
      this.animate();
    }

    initDimensions() {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.width = rect.width;
      this.height = rect.height;
      this.canvas.width = this.width * this.dpr;
      this.canvas.height = this.height * this.dpr;
      this.ctx.scale(this.dpr, this.dpr);
    }

    initNodes() {
      const cy = this.height * 0.5;
      const isMobile = this.width < 640;

      if (isMobile) {
        // Vertical stacked layout for small mobile screens
        this.nodes = [
          {
            id: 'woo',
            name: 'WooCommerce',
            sub: 'Store REST API',
            badge: 'DATA SOURCE',
            x: this.width * 0.5,
            y: this.height * 0.2,
            radius: 36,
            color: '#06b6d4',
            glow: 'rgba(6, 182, 212, 0.35)',
            items: ['Orders', 'Products', 'Inventory'],
          },
          {
            id: 'cartix',
            name: 'Cartix Core',
            sub: 'MCP Bridge',
            badge: 'SECURE CONNECTOR',
            x: this.width * 0.5,
            y: this.height * 0.5,
            radius: 52,
            color: '#6366f1',
            glow: 'rgba(99, 102, 241, 0.5)',
            items: ['Read-Only Auth', 'Rate Limiter', 'PII Masking', 'Retry/Jitter'],
          },
          {
            id: 'agent',
            name: 'AI Agent',
            sub: 'LLM Reasoning',
            badge: 'TOOL CONSUMER',
            x: this.width * 0.5,
            y: this.height * 0.8,
            radius: 36,
            color: '#10b981',
            glow: 'rgba(16, 185, 129, 0.35)',
            items: ['Claude', 'Cursor', 'Gemini'],
          },
        ];
      } else {
        // Horizontal cinematic layout
        this.nodes = [
          {
            id: 'woo',
            name: 'WooCommerce',
            sub: 'REST API v3',
            badge: 'DATA SOURCE',
            x: this.width * 0.18,
            y: cy,
            radius: 46,
            color: '#06b6d4',
            glow: 'rgba(6, 182, 212, 0.4)',
            items: ['Orders', 'Products', 'Inventory'],
          },
          {
            id: 'cartix',
            name: 'Cartix Core',
            sub: 'Model Context Protocol',
            badge: 'SECURE MCP CONNECTOR',
            x: this.width * 0.5,
            y: cy,
            radius: 64,
            color: '#818cf8',
            glow: 'rgba(99, 102, 241, 0.6)',
            items: ['Read-Only Enforcer', 'Token Bucket', 'PII Sanitizer', 'Retry Backoff'],
          },
          {
            id: 'agent',
            name: 'AI Agent',
            sub: 'LLM Client',
            badge: 'REASONING ENGINE',
            x: this.width * 0.82,
            y: cy,
            radius: 46,
            color: '#10b981',
            glow: 'rgba(16, 185, 129, 0.4)',
            items: ['Claude Desktop', 'Cursor MCP', 'Custom Agent'],
          },
        ];
      }
    }

    initParticles() {
      this.particles = [];
      const count = this.width < 640 ? 25 : 45;
      for (let i = 0; i < count; i++) {
        this.particles.push({
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          radius: Math.random() * 1.5 + 0.5,
          vx: (Math.random() - 0.5) * 0.25,
          vy: (Math.random() - 0.5) * 0.25,
          alpha: Math.random() * 0.4 + 0.1,
        });
      }
    }

    bindEvents() {
      window.addEventListener('resize', () => {
        this.initDimensions();
        this.initNodes();
      });

      this.canvas.addEventListener('mousemove', (e) => {
        const rect = this.canvas.getBoundingClientRect();
        this.mouse.x = e.clientX - rect.left;
        this.mouse.y = e.clientY - rect.top;
        this.mouse.active = true;

        // Check hover over nodes
        this.activeHoverNode = null;
        for (const node of this.nodes) {
          const dx = this.mouse.x - node.x;
          const dy = this.mouse.y - node.y;
          if (Math.hypot(dx, dy) < node.radius + 10) {
            this.activeHoverNode = node;
            this.canvas.style.cursor = 'pointer';
            break;
          }
        }
        if (!this.activeHoverNode) {
          this.canvas.style.cursor = 'default';
        }
      });

      this.canvas.addEventListener('mouseleave', () => {
        this.mouse.active = false;
        this.activeHoverNode = null;
      });
    }

    spawnPackets() {
      if (this.reducedMotion) return;
      if (Math.random() < 0.04 && this.packets.length < 12) {
        // Data packet from Woo -> Cartix
        this.packets.push({
          from: this.nodes[0],
          to: this.nodes[1],
          progress: 0,
          speed: 0.006 + Math.random() * 0.004,
          label: ['order #1042', 'stock: 45', 'product #87'][Math.floor(Math.random() * 3)],
          color: '#38bdf8',
        });
      }

      if (Math.random() < 0.04 && this.packets.length < 12) {
        // Tool call / Response from Cartix -> Agent
        this.packets.push({
          from: this.nodes[1],
          to: this.nodes[2],
          progress: 0,
          speed: 0.007 + Math.random() * 0.004,
          label: ['search_orders', 'get_inventory', 'sanitized_order'][Math.floor(Math.random() * 3)],
          color: '#a5b4fc',
        });
      }
    }

    drawConnection(nodeA, nodeB) {
      const ctx = this.ctx;
      ctx.beginPath();
      ctx.moveTo(nodeA.x, nodeA.y);
      ctx.lineTo(nodeB.x, nodeB.y);

      // Base line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Glowing dashed energy path
      ctx.save();
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.25)';
      ctx.lineWidth = 2;
      ctx.setLineDash([6, 12]);
      ctx.lineDashOffset = -this.time * 20;
      ctx.stroke();
      ctx.restore();
    }

    drawHexagon(x, y, r, color, glowColor, filled = false) {
      const ctx = this.ctx;
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i + (this.time * 0.2);
        const hx = x + r * Math.cos(angle);
        const hy = y + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();

      if (filled) {
        ctx.fillStyle = 'rgba(18, 24, 36, 0.9)';
        ctx.fill();
      }

      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 20;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    drawNode(node) {
      const ctx = this.ctx;
      const isHovered = this.activeHoverNode === node;
      const pulse = Math.sin(this.time * 2 + (node.id === 'cartix' ? 1 : 0)) * 3;
      const r = node.radius + (isHovered ? 4 : 0) + pulse;

      // Glow shadow
      ctx.save();
      ctx.shadowColor = node.glow;
      ctx.shadowBlur = isHovered ? 35 : 24;

      if (node.id === 'cartix') {
        // Hexagonal dominant core
        this.drawHexagon(node.x, node.y, r, node.color, node.glow, true);
        // Outer concentric ring
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + 14, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.2)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 8]);
        ctx.lineDashOffset = this.time * 15;
        ctx.stroke();
      } else {
        // Circular nodes
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(18, 24, 36, 0.85)';
        ctx.fill();
        ctx.strokeStyle = node.color;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.restore();

      // Node Typography
      ctx.save();
      ctx.textAlign = 'center';
      ctx.fillStyle = '#ffffff';
      ctx.font = `600 ${node.id === 'cartix' ? 13 : 11}px var(--font-sans)`;
      ctx.fillText(node.name, node.x, node.y - 4);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.55)';
      ctx.font = '10px var(--font-mono)';
      ctx.fillText(node.sub, node.x, node.y + 12);
      ctx.restore();
    }

    drawPackets() {
      const ctx = this.ctx;
      for (let i = this.packets.length - 1; i >= 0; i--) {
        const p = this.packets[i];
        p.progress += p.speed;

        if (p.progress >= 1) {
          this.packets.splice(i, 1);
          continue;
        }

        const currX = p.from.x + (p.to.x - p.from.x) * p.progress;
        const currY = p.from.y + (p.to.y - p.from.y) * p.progress;

        // Packet glow & head
        ctx.save();
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(currX, currY, 4, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        // Label above packet
        ctx.font = '9px var(--font-mono)';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.textAlign = 'center';
        ctx.fillText(p.label, currX, currY - 8);
        ctx.restore();
      }
    }

    drawParticles() {
      const ctx = this.ctx;
      for (const pt of this.particles) {
        pt.x += pt.vx;
        pt.y += pt.vy;
        if (pt.x < 0) pt.x = this.width;
        if (pt.x > this.width) pt.x = 0;
        if (pt.y < 0) pt.y = this.height;
        if (pt.y > this.height) pt.y = 0;

        ctx.beginPath();
        ctx.arc(pt.x, pt.y, pt.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(165, 180, 252, ${pt.alpha})`;
        ctx.fill();
      }
    }

    animate() {
      this.ctx.clearRect(0, 0, this.width, this.height);
      this.time += 0.016;

      this.drawParticles();

      // Connections
      this.drawConnection(this.nodes[0], this.nodes[1]);
      this.drawConnection(this.nodes[1], this.nodes[2]);

      // Packets
      this.spawnPackets();
      this.drawPackets();

      // Nodes
      for (const node of this.nodes) {
        this.drawNode(node);
      }

      requestAnimationFrame(() => this.animate());
    }
  }

  // Initialize visualizer on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    new CartixPipelineVisualizer('pipeline-canvas');
  });
})();
