# Agensi Marketplace Product Listing

## Product Name
**Cartix — WooCommerce Read-Only Agent Skill**

---

## One-Line Summary
Enable AI agents to safely query, inspect, and reason over WooCommerce orders, products, and inventory via a secure, read-only MCP connector.

---

## Detailed Marketplace Description
Cartix bridges the gap between autonomous AI agents and WooCommerce e-commerce stores. Designed for merchants, e-commerce operations teams, and AI agent developers, this skill teaches supported AI agents (such as Claude Desktop, Cursor, Agent Studio, and custom MCP clients) how to interact with your store using five structured, strictly read-only tools.

Rather than giving an AI agent direct, unrestricted API access or risking accidental order modifications, Cartix enforces a hardened security boundary:
- **Strict Read-Only Enforcement**: Cartix exposes no write, update, cancel, or refund operations.
- **Customer Privacy Protection**: Sensitive customer personal data (customer names, emails, billing/shipping physical addresses, and phone numbers) is automatically stripped before reaching the AI agent.
- **Reliable Operation**: Built-in exponential backoff, jitter, and automatic HTTP 429 rate-limit handling prevent disruptions during heavy store traffic.
- **Context-Efficient Reasoning**: Normalizes verbose WooCommerce payloads into compact, token-friendly schemas with bounded pagination (up to 100 records per query).

This skill package contains the complete agent steering instructions (`SKILL.md`), setup guides, configuration templates, tool schemas, and operational troubleshooting documents to connect your local Cartix server in minutes.

---

## Target Audience
- **WooCommerce Store Owners & Managers**: Looking to query daily sales, pending orders, and inventory deficits using conversational AI.
- **E-Commerce Customer Support & Ops Leads**: Seeking an automated agent assistant to track order fulfillment delays and identify stockouts without manual dashboard navigation.
- **AI Agent Engineers & Agencies**: Building specialized retail and e-commerce workflows on platforms like Claude Desktop, Cursor, and Agent Studio.

---

## Key Features
- **5 Focused MCP Tools**: Direct coverage of orders, product catalog, and store inventory.
- **Deterministic Low-Stock Detection**: Automatic identification of out-of-stock items and products at or below their low-stock threshold (<= 5).
- **Zero Customer Data Leakage**: Eliminates customer PII exposure to protect shopper privacy and maintain data compliance.
- **Anti-Prompt-Injection Safeguards**: Instructions for treating external buyer notes and product descriptions as untrusted text.
- **Standard MCP stdio Transport**: Compatible with standard local Model Context Protocol clients.
- **Pre-Configured Templates**: Ready-to-use JSON configuration templates for quick deployment.

---

## The Five Supported Tools
1. `search_orders`: Search and filter merchant orders by status (`pending`, `processing`, `completed`, etc.), date range, and bounded pagination.
2. `get_order`: Retrieve detailed order line items, transaction totals, and status by integer order ID.
3. `search_products`: Search store products by keyword, category, or SKU with real-time stock indicators.
4. `get_product`: Retrieve full product catalog details, pricing tiers, and stock management flags.
5. `get_inventory`: Store-wide stock audits with deterministic low-stock and stockout filtering (`low_stock_only`).

---

## Example Use Cases

### 1. Daily Fulfillment & Pending Order Audits
*Merchant asks:* "Show me all pending orders waiting for fulfillment."
*Agent action:* Queries `search_orders(status: 'pending')` and outputs a clear summary table of pending orders, total order values, and elapsed wait times.

### 2. Identifying Long-Delayed Orders (> 24 Hours)
*Merchant asks:* "Are there any pending orders that have been waiting for more than 24 hours?"
*Agent action:* Queries pending orders, evaluates each order's `created_at` timestamp against the current time, and highlights orders experiencing fulfillment delays.

### 3. Inventory Stockout Alerts & Restock Planning
*Merchant asks:* "Which products are running low or out of stock?"
*Agent action:* Invokes `get_inventory(low_stock_only: true)`, groups results into critical stockouts (0 units) and low-stock warnings (<= 5 units), providing SKUs and prices for fast reordering.

### 4. Cross-Domain Order Bottleneck Detection
*Merchant asks:* "Are any of our pending orders blocked by products that are currently out of stock?"
*Agent action:* Cross-references the line items in pending orders with the current out-of-stock inventory list, pinpointing the exact blocked orders and missing items.

---

## Requirements and Compatibility
- **Host Runtime**: Node.js `>= 20.0.0` and npm `>= 10.0.0`
- **Store Platform**: WordPress with WooCommerce v3.5+ (REST API v3 enabled)
- **WordPress Permalinks**: Pretty permalinks enabled (e.g., Post name setting)
- **Supported MCP Clients**: Any client supporting local `stdio` MCP transport (Claude Desktop, Cursor, Agent Studio, custom MCP clients)
- **Transport**: Standard `stdio` (Standard I/O)

---

## Installation Expectations
- **Local Deployment**: The Cartix MCP server is installed and run locally on your machine or server. Agensi does not host your MCP server.
- **Zero-Build Onboarding**: The server compiles directly from the open-source GitHub repository via `npm install && npm run build`.
- **Customer-Managed Credentials**: You create read-only WooCommerce REST API keys in your WordPress Admin and place them in your local configuration.

---

## Security Boundaries
- **Strictly Read-Only**: The connector contains no code or endpoints to modify, write, delete, or refund store data.
- **Local Credential Storage**: Keys reside strictly on your local machine and are never shared with or transmitted to third parties.
- **PII Minimization**: Customer names, emails, billing/shipping physical addresses, phone numbers, and IP addresses are stripped at the connector layer.
- **Secret Scrubbing**: Automatic redaction prevents API keys from appearing in logs or error messages.

---

## Known Limitations
- **Read-Only Scope**: Cannot be used to mark orders as fulfilled, update stock counts, or create coupons.
- **Local MCP Hosting**: Requires a local Node.js environment to run the MCP server process.
- **Pagination Maximum**: Maximum page size is bounded at 100 items per request to protect context window limits.
- **Standard Stdio Transport**: Standard MCP clients connect via `stdio`. Custom HTTP endpoints are not compliant with standard MCP JSON-RPC 2.0 SSE transport.

---

## Frequently Asked Questions (FAQ)

**Q: Can this skill accidentally modify my store inventory or cancel an order?**
*A:* No. Cartix is built strictly as a read-only connector. There are no write or mutation tools in the codebase.

**Q: Does my store API key leave my machine?**
*A:* No. Your WooCommerce Consumer Key and Secret are configured strictly in your local environment variables or client configuration file. They are never transmitted to Agensi or the LLM.

**Q: Can the AI agent see my customers' home addresses or phone numbers?**
*A:* No. Cartix intentionally strips all customer PII (billing and shipping addresses, phone numbers, customer emails) before passing order summaries to the AI agent.

**Q: How do I know if my store is compatible?**
*A:* Any self-hosted or cloud-hosted WordPress site running WooCommerce with pretty permalinks enabled and REST API access is compatible. Cartix includes a test script (`npm run verify`) to validate connectivity before connecting your agent.

---

## Relevant Search Keywords
`woocommerce`, `mcp`, `model-context-protocol`, `ecommerce`, `order-tracking`, `inventory-management`, `claude-desktop`, `cursor-mcp`, `read-only`, `agent-connector`, `store-analytics`

---

## Recommended Launch Price & Rationale
- **Recommended Launch Price**: **$19.00 USD** (One-Time Purchase)
- **Pricing Tier Category**: Premium Developer Utility / E-Commerce Operations Skill
- **Rationale**:
  - Positions Cartix as an accessible, high-ROI tool for WooCommerce merchants and agencies.
  - Matches typical utility skill pricing on developer marketplaces ($15 - $29).
  - High perceived value from verified security, customer PII redaction, ready-to-use configuration templates, and comprehensive agent steering documentation.
  - Non-exclusive license allows competitive volume sales without enterprise friction.
