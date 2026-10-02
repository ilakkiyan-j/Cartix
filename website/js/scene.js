/**
 * Cartix Interactive 3D MCP Protocol Inspector & Stage Controller
 * Drives the 3D perspective tilt, live scenario switching, and real-time telemetry streaming
 */

(function () {
  'use strict';

  const INSPECTOR_SCENARIOS = {
    orders: {
      title: 'Orders & Delay Analysis',
      wooMethod: 'GET',
      wooPath: '/wc/v3/orders',
      wooPayload: `<span class="token-key">"status"</span>: <span class="token-str">"pending"</span>,<br><span class="token-key">"limit"</span>: <span class="token-num">20</span>, <span class="token-key">"page"</span>: <span class="token-num">1</span>`,
      toolName: 'search_orders()',
      agentReason: '"Found 3 pending orders. 2 orders (#1002, #1005) delayed >24h awaiting merchant fulfillment."',
      beam1: 'raw_order.json',
      beam2: 'sanitized_ctx',
      latency: '11ms',
      logs: [
        { tag: '[MCP:search_orders]', text: 'Agent queried pending orders → Cartix redacted PII and filtered 2 delayed records', latency: '11ms' },
        { tag: '[CARTIX:RATE_LIMIT]', text: 'Token bucket consumed 1/20 token • Upstream burst capacity: 95%', latency: '3ms' },
        { tag: '[WOO:FETCH_OK]', text: 'HTTPS GET /wp-json/wc/v3/orders returned 3 records with HTTP 200', latency: '8ms' },
        { tag: '[AGENT:REASON]', text: 'Computed timestamp delta on created_at: Order #1002 delayed by 31.4 hours', latency: '14ms' },
      ]
    },
    inventory: {
      title: 'Stock Alert & Inventory Scan',
      wooMethod: 'GET',
      wooPath: '/wc/v3/products',
      wooPayload: `<span class="token-key">"low_stock_only"</span>: <span class="token-str">true</span>,<br><span class="token-key">"threshold"</span>: <span class="token-num">5</span>, <span class="token-key">"limit"</span>: <span class="token-num">20</span>`,
      toolName: 'get_inventory()',
      agentReason: '"5 products out of stock. Stockout alert: Wireless Mechanical Keyboard (ID #87) blocks pending order #1004."',
      beam1: 'stock_levels.json',
      beam2: 'stockout_alerts',
      latency: '14ms',
      logs: [
        { tag: '[MCP:get_inventory]', text: 'Catalog scanned with rule: stock_quantity <= 5 → 5 stockouts flagged', latency: '14ms' },
        { tag: '[CARTIX:FILTER]', text: 'Applied deterministic low_stock rule: outofstock status identified', latency: '4ms' },
        { tag: '[WOO:CATALOG]', text: 'Retrieved 20 products across categories with normalized inventory count', latency: '10ms' },
        { tag: '[AGENT:CORRELATE]', text: 'Cross-referenced order #1004 items with stockout ID #87 → flagged to merchant', latency: '16ms' },
      ]
    },
    security: {
      title: 'PII Redaction & Security Guard',
      wooMethod: 'GET',
      wooPath: '/wc/v3/orders/1004',
      wooPayload: `<span class="token-key">"order_id"</span>: <span class="token-num">1004</span>,<br><span class="token-key">"mask_pii"</span>: <span class="token-str">true</span>, <span class="token-key">"read_only"</span>: <span class="token-str">true</span>`,
      toolName: 'get_order()',
      agentReason: '"Retrieved order #1004 line items safely. Customer email (j***@corp.com) and shipping address masked from LLM."',
      beam1: 'raw_sensitive.json',
      beam2: 'zero_pii_payload',
      latency: '9ms',
      logs: [
        { tag: '[MCP:get_order]', text: 'Customer email, phone, billing address scrubbed before LLM context ingestion', latency: '9ms' },
        { tag: '[CARTIX:SCRUB]', text: 'Masked regex: [\\w.-]+@[\\w.-]+ → j***@corp.com • Stripped billing street', latency: '3ms' },
        { tag: '[CARTIX:IMMUTABLE]', text: 'Write guard verified: Refund & update mutations rejected at MCP boundary', latency: '2ms' },
        { tag: '[AGENT:CLEAN_CTX]', text: 'Zero PII passed to LLM inference window • Privacy guarantees enforced', latency: '12ms' },
      ]
    }
  };

  class CartixInspectorController {
    constructor() {
      this.card = document.getElementById('inspector-card');
      this.wooCodeBox = document.getElementById('woo-code-box');
      this.cartixToolCallout = document.getElementById('cartix-tool-callout');
      this.agentInsightText = document.getElementById('agent-insight-text');
      this.beamChip1 = document.getElementById('beam-chip-1');
      this.beamChip2 = document.getElementById('beam-chip-2');
      this.telemetryLogItem = document.getElementById('telemetry-log-item');
      this.telemetryLatencyVal = document.getElementById('telemetry-latency-val');

      this.currentScenario = 'orders';
      this.logIndex = 0;
      this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      this.init3DParallax();
      this.initTabs();
      this.startTelemetryLoop();
    }

    init3DParallax() {
      if (!this.card) return;

      const onMouseMove = (e) => {
        if (this.reducedMotion) return;
        const rect = this.card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -5.5;
        const rotateY = ((x - centerX) / centerX) * 5.5;

        this.card.style.transform = `perspective(1200px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.008, 1.008, 1.008)`;
        this.card.style.setProperty('--mouse-x', `${((x / rect.width) * 100).toFixed(1)}%`);
        this.card.style.setProperty('--mouse-y', `${((y / rect.height) * 100).toFixed(1)}%`);
      };

      const onMouseLeave = () => {
        this.card.style.transform = 'perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
        this.card.style.setProperty('--mouse-x', '50%');
        this.card.style.setProperty('--mouse-y', '30%');
      };

      this.card.addEventListener('mousemove', onMouseMove);
      this.card.addEventListener('mouseleave', onMouseLeave);
    }

    initTabs() {
      const tabBtns = document.querySelectorAll('.inspector-tab-btn');
      tabBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
          const scenarioKey = btn.getAttribute('data-scenario');
          if (!scenarioKey || !INSPECTOR_SCENARIOS[scenarioKey]) return;

          tabBtns.forEach((b) => b.classList.remove('active'));
          btn.classList.add('active');

          this.switchScenario(scenarioKey);
        });
      });
    }

    switchScenario(key) {
      this.currentScenario = key;
      this.logIndex = 0;
      const data = INSPECTOR_SCENARIOS[key];

      // Morph Woo Box
      if (this.wooCodeBox) {
        this.wooCodeBox.style.opacity = '0';
        setTimeout(() => {
          this.wooCodeBox.innerHTML = `
            <div class="code-line"><span class="code-method">${data.wooMethod}</span> <span class="code-path">${data.wooPath}</span></div>
            <div class="code-payload">${data.wooPayload}</div>
          `;
          this.wooCodeBox.style.opacity = '1';
        }, 120);
      }

      // Morph Cartix Callout
      if (this.cartixToolCallout) {
        this.cartixToolCallout.style.opacity = '0';
        setTimeout(() => {
          this.cartixToolCallout.innerHTML = `
            <span class="tool-label">Active Schema</span>
            <code class="tool-name">${data.toolName}</code>
          `;
          this.cartixToolCallout.style.opacity = '1';
        }, 120);
      }

      // Morph Agent Insight
      if (this.agentInsightText) {
        this.agentInsightText.style.opacity = '0';
        setTimeout(() => {
          this.agentInsightText.textContent = data.agentReason;
          this.agentInsightText.style.opacity = '1';
        }, 120);
      }

      // Morph Beam Chips
      if (this.beamChip1) this.beamChip1.innerHTML = `<span>${data.beam1}</span>`;
      if (this.beamChip2) this.beamChip2.innerHTML = `<span>${data.beam2}</span>`;

      // Update Telemetry
      this.updateTelemetry();
    }

    updateTelemetry() {
      if (!this.telemetryLogItem || !this.telemetryLatencyVal) return;
      const data = INSPECTOR_SCENARIOS[this.currentScenario];
      const log = data.logs[this.logIndex % data.logs.length];

      this.telemetryLogItem.style.opacity = '0';
      setTimeout(() => {
        this.telemetryLogItem.innerHTML = `
          <span class="log-badge-cyan">${log.tag}</span>
          <span class="log-text">${log.text}</span>
        `;
        this.telemetryLatencyVal.textContent = log.latency;
        this.telemetryLogItem.style.opacity = '1';
      }, 100);
    }

    startTelemetryLoop() {
      setInterval(() => {
        if (!document.hidden) {
          this.logIndex++;
          this.updateTelemetry();
        }
      }, 3200);
    }
  }

  // Initialize on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    new CartixInspectorController();
  });
})();
