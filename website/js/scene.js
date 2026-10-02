/**
 * Cartix 3D Interactive Architecture Pipeline & Telemetry Controller
 * Visualizes: WooCommerce Store (Data) <-> Cartix MCP Core (Sanitize/Rate Limit) <-> AI Agent (Reasoning)
 */

(function () {
  'use strict';

  // Live Scenario Simulation Datasets
  const SCENARIOS = {
    orders: {
      name: 'Order Inspection & Delay Analysis',
      packets: [
        { from: 2, to: 1, label: 'search_orders(status="pending")', color: '#818cf8', dir: 'left' },
        { from: 1, to: 0, label: 'GET /wc/v3/orders?status=pending', color: '#06b6d4', dir: 'left' },
        { from: 0, to: 1, label: 'Raw JSON (3 Orders + Customer PII)', color: '#06b6d4', dir: 'right' },
        { from: 1, to: 2, label: 'Sanitized Output (PII Masked, 2 Delayed >24h)', color: '#10b981', dir: 'right' },
      ],
      logs: [
        { tag: '[AGENT:INVOKE]', text: 'Agent requests pending orders awaiting fulfillment', latency: '2ms' },
        { tag: '[CARTIX:GUARD]', text: 'Rate limiter verified (19/20 tokens) • Auth OK', latency: '4ms' },
        { tag: '[WOO:FETCH]', text: 'HTTPS GET /wp-json/wc/v3/orders returned 3 items', latency: '8ms' },
        { tag: '[CARTIX:PII]', text: 'Redacted emails, customer addresses, stripped metadata', latency: '11ms' },
        { tag: '[AGENT:REASON]', text: 'Agent detected 2 orders delayed > 24 hours (#1002, #1005)', latency: '14ms' },
      ]
    },
    inventory: {
      name: 'Inventory Health & Stockout Scan',
      packets: [
        { from: 2, to: 1, label: 'get_inventory(low_stock_only=true)', color: '#818cf8', dir: 'left' },
        { from: 1, to: 0, label: 'GET /wc/v3/products?stock_status=outofstock', color: '#06b6d4', dir: 'left' },
        { from: 0, to: 1, label: 'Catalog Stock Status Payload', color: '#06b6d4', dir: 'right' },
        { from: 1, to: 2, label: 'Low Stock Matrix (5 Out of Stock)', color: '#f59e0b', dir: 'right' },
      ],
      logs: [
        { tag: '[AGENT:INVOKE]', text: 'Agent scans store for depleted inventory items', latency: '3ms' },
        { tag: '[CARTIX:FILTER]', text: 'Applied deterministic rule: stock_quantity <= 5', latency: '6ms' },
        { tag: '[WOO:FETCH]', text: 'Retrieved 20 products from WooCommerce catalog', latency: '9ms' },
        { tag: '[CARTIX:NORM]', text: 'Normalized pricing, SKUs, and variation metadata', latency: '12ms' },
        { tag: '[AGENT:ALERT]', text: 'Agent flagged 5 stockouts affecting pending order #1004', latency: '15ms' },
      ]
    },
    security: {
      name: 'PII Scrubbing & Zero-Mutation Guard',
      packets: [
        { from: 2, to: 1, label: 'get_order(order_id=1004)', color: '#818cf8', dir: 'left' },
        { from: 1, to: 0, label: 'GET /wc/v3/orders/1004', color: '#06b6d4', dir: 'left' },
        { from: 0, to: 1, label: 'Contains Credit Card Token, Billing Addr', color: '#f43f5e', dir: 'right' },
        { from: 1, to: 2, label: 'Clean Line Items • Zero PII Exposed', color: '#10b981', dir: 'right' },
      ],
      logs: [
        { tag: '[AGENT:INVOKE]', text: 'Agent requests specific order payload for reasoning', latency: '2ms' },
        { tag: '[CARTIX:AUTH]', text: 'Read-only key verified • Write operations blocked', latency: '5ms' },
        { tag: '[CARTIX:SANITIZE]', text: 'Masked email (j***@corp.com), hashed phone, stripped IP', latency: '9ms' },
        { tag: '[CARTIX:GUARD]', text: 'Blocked sensitive financial tokens from LLM context', latency: '12ms' },
        { tag: '[AGENT:COMPLETE]', text: 'Safe line-item context delivered to agent context', latency: '14ms' },
      ]
    }
  };

  class Cartix3DPipelineVisualizer {
    constructor() {
      this.card = document.getElementById('pipeline-card');
      this.canvas = document.getElementById('pipeline-canvas');
      this.telemetryEl = document.getElementById('pipeline-telemetry');
      if (!this.canvas) return;

      this.ctx = this.canvas.getContext('2d');
      this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      this.activeScenario = 'orders';
      this.time = 0;
      this.logIndex = 0;
      this.logTimer = 0;
      this.packets = [];
      this.particles = [];
      this.nodes = [];

      this.initDimensions();
      this.initNodes();
      this.initParticles();
      this.bind3DTilt();
      this.bindScenarioTriggers();
      this.startPacketCycle();
      this.animate();
    }

    initDimensions() {
      const rect = this.canvas.parentElement.getBoundingClientRect();
      this.dpr = Math.min(window.devicePixelRatio || 1, 2);
      this.width = rect.width || 600;
      this.height = rect.height || 360;
      this.canvas.width = this.width * this.dpr;
      this.canvas.height = this.height * this.dpr;
      this.ctx.scale(this.dpr, this.dpr);
    }

    initNodes() {
      const isMobile = this.width < 640;
      const cy = this.height * 0.48;

      if (isMobile) {
        this.nodes = [
          {
            id: 'woo',
            title: 'WooCommerce',
            sub: 'Store REST API',
            badge: 'DATA SOURCE',
            x: this.width * 0.5,
            y: this.height * 0.18,
            radius: 34,
            color: '#06b6d4',
            glow: 'rgba(6, 182, 212, 0.45)',
          },
          {
            id: 'cartix',
            title: 'Cartix MCP',
            sub: 'Secure Connector',
            badge: 'MCP PROTOCOL',
            x: this.width * 0.5,
            y: this.height * 0.50,
            radius: 46,
            color: '#6366f1',
            glow: 'rgba(99, 102, 241, 0.65)',
          },
          {
            id: 'agent',
            title: 'AI Agent',
            sub: 'LLM Reasoning',
            badge: 'REASONING',
            x: this.width * 0.5,
            y: this.height * 0.82,
            radius: 34,
            color: '#10b981',
            glow: 'rgba(16, 185, 129, 0.45)',
          },
        ];
      } else {
        this.nodes = [
          {
            id: 'woo',
            title: 'WooCommerce Store',
            sub: 'REST API v3 (Read-Only)',
            badge: 'COMMERCE SOURCE',
            x: this.width * 0.18,
            y: cy,
            radius: 44,
            color: '#06b6d4',
            glow: 'rgba(6, 182, 212, 0.45)',
          },
          {
            id: 'cartix',
            title: 'Cartix MCP Core',
            sub: 'PII Sanitizer • Rate Limiter',
            badge: 'SECURE MCP BRIDGE',
            x: this.width * 0.50,
            y: cy,
            radius: 58,
            color: '#6366f1',
            glow: 'rgba(99, 102, 241, 0.7)',
          },
          {
            id: 'agent',
            title: 'AI Agent Terminal',
            sub: 'LLM Reasoning Loop',
            badge: 'TOOL CONSUMER',
            x: this.width * 0.82,
            y: cy,
            radius: 44,
            color: '#10b981',
            glow: 'rgba(16, 185, 129, 0.45)',
          },
        ];
      }
    }

    initParticles() {
      this.particles = [];
      const count = this.width < 640 ? 20 : 36;
      for (let i = 0; i < count; i++) {
        this.particles.push({
          x: Math.random() * this.width,
          y: Math.random() * this.height,
          radius: Math.random() * 1.5 + 0.5,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          alpha: Math.random() * 0.4 + 0.1,
        });
      }
    }

    bind3DTilt() {
      if (!this.card) return;

      const handleMove = (e) => {
        if (this.reducedMotion) return;
        const rect = this.card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const tiltX = ((y - centerY) / centerY) * -7;
        const tiltY = ((x - centerX) / centerX) * 7;

        this.card.style.transform = `perspective(1000px) rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg) scale3d(1.01, 1.01, 1.01)`;
        this.card.style.setProperty('--mouse-x', `${((x / rect.width) * 100).toFixed(1)}%`);
        this.card.style.setProperty('--mouse-y', `${((y / rect.height) * 100).toFixed(1)}%`);
      };

      const handleLeave = () => {
        this.card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
        this.card.style.setProperty('--mouse-x', '50%');
        this.card.style.setProperty('--mouse-y', '30%');
      };

      this.card.addEventListener('mousemove', handleMove);
      this.card.addEventListener('mouseleave', handleLeave);

      window.addEventListener('resize', () => {
        this.initDimensions();
        this.initNodes();
      });
    }

    bindScenarioTriggers() {
      const btns = document.querySelectorAll('.scenario-btn');
      btns.forEach((btn) => {
        btn.addEventListener('click', () => {
          const scenarioKey = btn.getAttribute('data-scenario');
          if (!scenarioKey || !SCENARIOS[scenarioKey]) return;

          btns.forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');

          this.activeScenario = scenarioKey;
          this.logIndex = 0;
          this.packets = [];
          this.triggerPacketBurst();
          this.updateTelemetry();
        });
      });
    }

    triggerPacketBurst() {
      const scenario = SCENARIOS[this.activeScenario];
      scenario.packets.forEach((p, idx) => {
        setTimeout(() => {
          const fromNode = this.nodes[p.from];
          const toNode = this.nodes[p.to];
          if (fromNode && toNode) {
            this.packets.push({
              from: fromNode,
              to: toNode,
              progress: 0,
              speed: 0.012 + Math.random() * 0.004,
              label: p.label,
              color: p.color,
            });
          }
        }, idx * 450);
      });
    }

    startPacketCycle() {
      setInterval(() => {
        if (!document.hidden && this.packets.length < 8) {
          this.triggerPacketBurst();
        }
      }, 4000);
    }

    updateTelemetry() {
      if (!this.telemetryEl) return;
      const scenario = SCENARIOS[this.activeScenario];
      const log = scenario.logs[this.logIndex % scenario.logs.length];

      this.telemetryEl.innerHTML = `
        <div class="telemetry-event" style="animation: fadeIn 0.25s ease;">
          <span class="telemetry-tag">${log.tag}</span>
          <span class="telemetry-msg">${log.text}</span>
        </div>
        <span class="telemetry-latency">${log.latency}</span>
      `;
    }

    drawConnection(nodeA, nodeB) {
      const ctx = this.ctx;
      ctx.beginPath();
      ctx.moveTo(nodeA.x, nodeA.y);
      ctx.lineTo(nodeB.x, nodeB.y);

      // Base line
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Animated glowing data beam
      ctx.save();
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.35)';
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 14]);
      ctx.lineDashOffset = -this.time * 24;
      ctx.stroke();
      ctx.restore();
    }

    drawHexagon(x, y, r, color, glowColor) {
      const ctx = this.ctx;
      ctx.save();
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i + (this.time * 0.15);
        const hx = x + r * Math.cos(angle);
        const hy = y + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(hx, hy);
        else ctx.lineTo(hx, hy);
      }
      ctx.closePath();

      ctx.fillStyle = 'rgba(18, 24, 36, 0.92)';
      ctx.fill();

      ctx.shadowColor = glowColor;
      ctx.shadowBlur = 24;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.restore();
    }

    drawNode(node) {
      const ctx = this.ctx;
      const pulse = Math.sin(this.time * 2.5 + (node.id === 'cartix' ? 1.2 : 0)) * 2.5;
      const r = node.radius + pulse;

      ctx.save();
      ctx.shadowColor = node.glow;
      ctx.shadowBlur = node.id === 'cartix' ? 32 : 20;

      if (node.id === 'cartix') {
        // Hexagonal dominant core
        this.drawHexagon(node.x, node.y, r, node.color, node.glow);

        // Concentric outer pulsing ring
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + 16, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(99, 102, 241, 0.25)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 9]);
        ctx.lineDashOffset = this.time * 18;
        ctx.stroke();
      } else {
        // Rounded node
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(18, 24, 36, 0.9)';
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
      ctx.font = `700 ${node.id === 'cartix' ? 13 : 11}px 'Plus Jakarta Sans', sans-serif`;
      ctx.fillText(node.title, node.x, node.y - 4);

      ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.font = `500 ${node.id === 'cartix' ? 9.5 : 8.5}px 'JetBrains Mono', monospace`;
      ctx.fillText(node.sub, node.x, node.y + 12);

      // Node Pill Badge
      ctx.fillStyle = node.color;
      ctx.font = `700 7.5px 'JetBrains Mono', monospace`;
      ctx.fillText(`• ${node.badge} •`, node.x, node.y + (node.id === 'cartix' ? 26 : 22));
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

        // Glowing packet bullet
        ctx.save();
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 14;
        ctx.beginPath();
        ctx.arc(currX, currY, 4.5, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();

        // Packet tag label
        ctx.font = `600 8.5px 'JetBrains Mono', monospace`;
        ctx.fillStyle = '#f8fafc';
        ctx.textAlign = 'center';
        ctx.fillText(p.label, currX, currY - 9);
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

      // Update telemetry periodically
      this.logTimer += 0.016;
      if (this.logTimer > 2.2) {
        this.logTimer = 0;
        this.logIndex++;
        this.updateTelemetry();
      }

      this.drawParticles();

      // Connections between nodes
      if (this.nodes.length >= 3) {
        this.drawConnection(this.nodes[0], this.nodes[1]);
        this.drawConnection(this.nodes[1], this.nodes[2]);
      }

      this.drawPackets();

      // Nodes
      for (const node of this.nodes) {
        this.drawNode(node);
      }

      requestAnimationFrame(() => this.animate());
    }
  }

  // Initialize visualizer on DOM load
  document.addEventListener('DOMContentLoaded', () => {
    new Cartix3DPipelineVisualizer();
  });
})();
