/**
 * Cartix Protocol Studio - Interactive Workbench Controller
 * Controls 3D mouse parallax tilt, scenario switching, synchronized pane headers, and live telemetry stream
 */

(function () {
  'use strict';

  const STUDIO_SCENARIOS = {
    products: {
      requestTitle: 'AI Tool Call: search_products',
      methodBadge: 'tools/call: search_products',
      agentPrompt: '"Find wireless mechanical keyboards with high customer ratings and check current pricing."',
      mcpPayload: `{\n  "jsonrpc": "2.0",\n  "id": "call_98a72",\n  "method": "tools/call",\n  "params": {\n    "name": "search_products",\n    "arguments": {\n      "query": "mechanical keyboard",\n      "limit": 5\n    }\n  }\n}`,
      responseTitle: 'Normalized Merchant Data',
      responseStatus: '200 OK • 11ms',
      guards: [
        'Zod Schema Validated',
        'Rate Limit: 98/100',
        'Zero Mutation Enforced'
      ],
      mcpResponse: `{\n  "status": "success",\n  "total_results": 2,\n  "data": [\n    {\n      "id": 87,\n      "name": "Keychron Q1 Pro Wireless",\n      "sku": "KEY-Q1P-RGB",\n      "price": "$199.00",\n      "stock_status": "instock"\n    },\n    {\n      "id": 92,\n      "name": "NuPhy Air75 V2",\n      "sku": "NUP-AIR75-V2",\n      "price": "$119.95",\n      "stock_status": "instock"\n    }\n  ]\n}`,
      footerTool: 'MCP:search_products',
      footerMsg: 'Agent tool call executed cleanly → 2 products normalized with 0 token overhead',
      latency: '11.8ms',
      piiLeaks: '0'
    },
    orders: {
      requestTitle: 'AI Tool Call: get_order (Protected Context)',
      methodBadge: 'tools/call: get_order',
      agentPrompt: '"Retrieve customer shipping status for order #1004 and check for delivery exceptions."',
      mcpPayload: `{\n  "jsonrpc": "2.0",\n  "id": "call_98a73",\n  "method": "tools/call",\n  "params": {\n    "name": "get_order",\n    "arguments": {\n      "order_id": 1004,\n      "mask_pii": true\n    }\n  }\n}`,
      responseTitle: 'PII-Scrubbed Order Record',
      responseStatus: '200 OK • 9ms',
      guards: [
        'PII Regex: j***@corp.com',
        'Billing Address Stripped',
        'Zero Leakage Guarantee'
      ],
      mcpResponse: `{\n  "status": "success",\n  "order": {\n    "id": 1004,\n    "status": "processing",\n    "customer": {\n      "email": "j***@corp.com",\n      "pii_masked": true\n    },\n    "total": "$249.00",\n    "currency": "USD",\n    "items_count": 2,\n    "line_items": [\n      { "product_id": 87, "qty": 1, "sku": "KEY-Q1P-RGB" }\n    ]\n  }\n}`,
      footerTool: 'MCP:get_order',
      footerMsg: 'PII filter scrubbed email and billing street before passing to LLM context',
      latency: '9.2ms',
      piiLeaks: '0'
    },
    inventory: {
      requestTitle: 'AI Tool Call: get_inventory (Anomaly Scan)',
      methodBadge: 'tools/call: get_inventory',
      agentPrompt: '"Scan our store catalog for low-stock SKUs and flag any critical stockout risks."',
      mcpPayload: `{\n  "jsonrpc": "2.0",\n  "id": "call_98a74",\n  "method": "tools/call",\n  "params": {\n    "name": "get_inventory",\n    "arguments": {\n      "low_stock_only": true,\n      "threshold": 5\n    }\n  }\n}`,
      responseTitle: 'Inventory Anomaly Feed',
      responseStatus: '200 OK • 14ms',
      guards: [
        'Threshold Filter (<= 5 units)',
        'Catalog Scanned: 154 SKUs',
        'Read-Only Verified'
      ],
      mcpResponse: `{\n  "status": "success",\n  "low_stock_count": 2,\n  "alerts": [\n    {\n      "product_id": 87,\n      "name": "Keychron Q1 Pro RGB",\n      "stock_quantity": 2,\n      "risk_level": "CRITICAL"\n    },\n    {\n      "product_id": 104,\n      "name": "Coiled Aviator Cable",\n      "stock_quantity": 0,\n      "risk_level": "OUT_OF_STOCK"\n    }\n  ]\n}`,
      footerTool: 'MCP:get_inventory',
      footerMsg: 'Low stock scan detected 2 critical anomalies • Prepared merchant alert summary',
      latency: '14.1ms',
      piiLeaks: '0'
    }
  };

  class CartixStudioController {
    constructor() {
      this.window = document.getElementById('studio-window');
      
      // Request Pane Elements
      this.requestPaneTitle = document.getElementById('request-pane-title');
      this.requestMethodBadge = document.getElementById('request-method-badge');
      this.agentPromptText = document.getElementById('agent-prompt-text');
      this.mcpPayloadCode = document.getElementById('mcp-payload-code');

      // Response Pane Elements
      this.responsePaneTitle = document.getElementById('response-pane-title');
      this.responseStatusBadge = document.getElementById('response-status-badge');
      this.guardLabel1 = document.getElementById('guard-label-1');
      this.guardLabel2 = document.getElementById('guard-label-2');
      this.guardLabel3 = document.getElementById('guard-label-3');
      this.mcpResponseCode = document.getElementById('mcp-response-code');

      // Telemetry Elements
      this.footerToolPill = document.getElementById('footer-tool-pill');
      this.footerTelemetryMsg = document.getElementById('footer-telemetry-msg');
      this.footerLatencyVal = document.getElementById('footer-latency-val');
      this.footerPiiVal = document.getElementById('footer-pii-val');

      this.currentScenario = 'products';
      this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

      this.init3DParallax();
      this.initTabs();
    }

    init3DParallax() {
      if (!this.window) return;

      const onMouseMove = (e) => {
        if (this.reducedMotion) return;
        const rect = this.window.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;

        const rotateX = ((y - centerY) / centerY) * -4.5;
        const rotateY = ((x - centerX) / centerX) * 4.5;

        this.window.style.transform = `perspective(1200px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.005, 1.005, 1.005)`;
        this.window.style.setProperty('--mouse-x', `${((x / rect.width) * 100).toFixed(1)}%`);
        this.window.style.setProperty('--mouse-y', `${((y / rect.height) * 100).toFixed(1)}%`);
      };

      const onMouseLeave = () => {
        this.window.style.transform = 'perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
        this.window.style.setProperty('--mouse-x', '50%');
        this.window.style.setProperty('--mouse-y', '30%');
      };

      this.window.addEventListener('mousemove', onMouseMove);
      this.window.addEventListener('mouseleave', onMouseLeave);
    }

    initTabs() {
      const tabBtns = document.querySelectorAll('.studio-tab-btn');
      tabBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
          const scenarioKey = btn.getAttribute('data-scenario');
          if (!scenarioKey || !STUDIO_SCENARIOS[scenarioKey] || scenarioKey === this.currentScenario) return;

          tabBtns.forEach((b) => {
            b.classList.remove('active');
            b.setAttribute('aria-selected', 'false');
          });

          btn.classList.add('active');
          btn.setAttribute('aria-selected', 'true');

          this.switchScenario(scenarioKey);
        });
      });
    }

    switchScenario(key) {
      this.currentScenario = key;
      const data = STUDIO_SCENARIOS[key];
      if (!data) return;

      // Smooth cross-fade of dynamic elements
      const fadeElements = [
        this.requestPaneTitle,
        this.requestMethodBadge,
        this.agentPromptText,
        this.mcpPayloadCode,
        this.responsePaneTitle,
        this.responseStatusBadge,
        this.guardLabel1,
        this.guardLabel2,
        this.guardLabel3,
        this.mcpResponseCode,
        this.footerToolPill,
        this.footerTelemetryMsg
      ];

      fadeElements.forEach((el) => {
        if (el) el.style.opacity = '0.3';
      });

      setTimeout(() => {
        // Update Request Pane
        if (this.requestPaneTitle) this.requestPaneTitle.textContent = data.requestTitle;
        if (this.requestMethodBadge) this.requestMethodBadge.textContent = data.methodBadge;
        if (this.agentPromptText) this.agentPromptText.textContent = data.agentPrompt;
        if (this.mcpPayloadCode) this.mcpPayloadCode.textContent = data.mcpPayload;

        // Update Response Pane
        if (this.responsePaneTitle) this.responsePaneTitle.textContent = data.responseTitle;
        if (this.responseStatusBadge) this.responseStatusBadge.textContent = data.responseStatus;
        if (this.guardLabel1 && data.guards[0]) this.guardLabel1.textContent = data.guards[0];
        if (this.guardLabel2 && data.guards[1]) this.guardLabel2.textContent = data.guards[1];
        if (this.guardLabel3 && data.guards[2]) this.guardLabel3.textContent = data.guards[2];
        if (this.mcpResponseCode) this.mcpResponseCode.textContent = data.mcpResponse;

        // Update Footer Telemetry
        if (this.footerToolPill) this.footerToolPill.textContent = data.footerTool;
        if (this.footerTelemetryMsg) this.footerTelemetryMsg.textContent = data.footerMsg;
        if (this.footerLatencyVal) this.footerLatencyVal.textContent = `Latency: ${data.latency}`;
        if (this.footerPiiVal) this.footerPiiVal.textContent = `PII Leaks: ${data.piiLeaks}`;

        fadeElements.forEach((el) => {
          if (el) el.style.opacity = '1';
        });
      }, 100);
    }
  }

  // Initialize on DOM ready
  document.addEventListener('DOMContentLoaded', () => {
    new CartixStudioController();
  });
})();
