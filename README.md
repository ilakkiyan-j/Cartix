# Cartix — WooCommerce Agent Connector

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green.svg)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-Standard-purple.svg)](https://modelcontextprotocol.io/)
[![Tests](https://img.shields.io/badge/Tests-60%2F60%20Passing-brightgreen.svg)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Cartix** is a secure, read-only Model Context Protocol (MCP) connector that enables an AI agent to access, inspect, and reason over merchant commerce data stored in WooCommerce.

Built for the **Razorpay Forward-Deployed Engineer, Agent Studio assessment**.

---

## Table of Contents
1. [Overview & Problem Statement](#1-overview--problem-statement)
2. [Architecture](#2-architecture)
3. [Agent vs Connector Boundaries](#3-agent-vs-connector-boundaries)
4. [Supported MCP Tools](#4-supported-mcp-tools)
5. [Security & Data Minimization](#5-security--data-minimization)
6. [Prerequisites & Installation](#6-prerequisites--installation)
7. [WooCommerce Setup & Credentials](#7-woocommerce-setup--credentials)
8. [Sample Data Seeder](#8-sample-data-seeder)
9. [Running the MCP Server](#9-running-the-mcp-server)
10. [Connecting to MCP Clients](#10-connecting-to-mcp-clients)
11. [Running the AI Agent Demo](#11-running-the-ai-agent-demo)
12. [Demonstrated Merchant Scenarios](#12-demonstrated-merchant-scenarios)
13. [Testing & Verification](#13-testing--verification)
14. [Docker Deployment](#14-docker-deployment)
15. [Documentation Website & GitHub Pages Deployment](#15-documentation-website--github-pages-deployment)
16. [Assumptions & Limitations](#16-assumptions--limitations)
17. [Future Evolution](#17-future-evolution)

---

## 1. Overview & Problem Statement

### The Problem
Merchants store critical operational data across WooCommerce (orders, fulfillment statuses, customer purchases, catalog pricing, and inventory levels). Normally, store managers must manually navigate dashboards, execute multiple searches, calculate order delays, and inspect stock logs to answer routine questions:
- *"Which pending orders have been waiting for more than 24 hours?"*
- *"Which products are out of stock or running low?"*
- *"Are any pending orders affected by products that are currently out of stock?"*

AI agents cannot reliably access raw WooCommerce REST APIs directly because:
1. Exposing raw API credentials to an LLM context creates critical security vulnerabilities.
2. Raw merchant payloads contain sensitive customer PII (billing addresses, phone numbers, customer emails) and massive unstructured payloads.
3. Upstream merchant APIs enforce strict rate limits (HTTP 429), pagination boundaries, and transient network errors that LLMs cannot manage autonomously.

### The Cartix Solution
**Cartix** serves as the hardened, reliable bridge between the AI agent and WooCommerce. It abstracts store complexity into clean, typed MCP tool primitives, enforces read-only access, handles upstream rate-limiting with exponential backoff and jitter, redacts secrets, strips PII, and bounds pagination.

---

## 2. Architecture

```text
                        ┌─────────────────────────┐
                        │    Merchant / User      │
                        └────────────┬────────────┘
                                     │ Natural Language
                                     ▼
                        ┌─────────────────────────┐
                        │        AI Agent         │
                        │    LLM + MCP Client     │
                        └────────────┬────────────┘
                                     │
                                     │ MCP Protocol (Tools & Schemas)
                                     ▼
      ┌───────────────────────────────────────────────────────────┐
      │                          CARTIX                           │
      │                        MCP Server                         │
      │                                                           │
      │  ┌─────────────────────────────────────────────────────┐  │
      │  │                     MCP Tools                       │  │
      │  │  search_orders    get_order       search_products   │  │
      │  │  get_product      get_inventory                     │  │
      │  └──────────────────────────┬──────────────────────────┘  │
      │                             │                             │
      │  ┌──────────────────────────▼──────────────────────────┐  │
      │  │                   Service Layer                     │  │
      │  │  OrderService     ProductService   InventoryService │  │
      │  │  Validation       Normalization    Data Minimization│  │
      │  └──────────────────────────┬──────────────────────────┘  │
      │                             │                             │
      │  ┌──────────────────────────▼──────────────────────────┐  │
      │  │                 Reliability Layer                   │  │
      │  │  Exponential Backoff + Jitter • 429 Retry-After     │  │
      │  │  Token-Bucket Rate Limiter • Bounded Pagination     │  │
      │  │  Structured CartixError • Safe Logging + RequestIDs │  │
      │  └──────────────────────────┬──────────────────────────┘  │
      │                             │                             │
      │  ┌──────────────────────────▼──────────────────────────┐  │
      │  │                 WooCommerce Client                  │  │
      │  │  HTTPS Basic Auth • Secret Redaction • Timeouts     │  │
      │  └──────────────────────────┬──────────────────────────┘  │
      └─────────────────────────────┼─────────────────────────────┘
                                    │ HTTPS / REST (Read-Only)
                                    ▼
                        ┌─────────────────────────┐
                        │       WooCommerce       │
                        │     Merchant Store      │
                        └─────────────────────────┘
```

---

## 3. Agent vs Connector Boundaries

| Responsibility | AI Agent | Cartix MCP Connector | WooCommerce |
|---|---|---|---|
| **Natural Language Understanding** | ✅ Primary | ❌ No | ❌ No |
| **Tool Selection & Chaining** | ✅ Primary | ❌ No | ❌ No |
| **Reasoning Over Timestamps & Stock** | ✅ Primary | ❌ No | ❌ No |
| **Store Authentication & Keys** | ❌ Never | ✅ Server-side only | ❌ No |
| **Rate-Limit Backoff & Retries** | ❌ No | ✅ Automatic (429 handling) | ❌ No |
| **Data Normalization & PII Removal** | ❌ No | ✅ Strips PII, compacts schemas| ❌ No |
| **Source of Truth for Data** | ❌ No | ❌ No | ✅ Primary |

---

## 4. Supported MCP Tools

Cartix exposes exactly 5 focused, read-only MCP tools:

### 1. `search_orders`
- **Purpose:** Search and filter orders by status and date range.
- **Inputs:**
  - `status` *(string, optional)*: Filter by status (`pending`, `processing`, `completed`, `on-hold`, `failed`, `cancelled`).
  - `date_from` *(ISO 8601 string, optional)*: Inclusive start datetime.
  - `date_to` *(ISO 8601 string, optional)*: Inclusive end datetime.
  - `page` *(integer, default: 1)*: Page number.
  - `limit` *(integer, 1-100, default: 20)*: Maximum records to return.
- **Output:** Normalized order summaries with total amount, item count, timestamps, and bounded pagination metadata.

### 2. `get_order`
- **Purpose:** Retrieve full details for a specific order by ID.
- **Inputs:**
  - `order_id` *(positive integer, required)*: WooCommerce order ID.
- **Output:** Complete normalized order containing line items (product ID, name, quantity, unit price, line total), status, and customer notes. Returns `NOT_FOUND` if invalid.

### 3. `search_products`
- **Purpose:** Search product catalog by text keyword or SKU.
- **Inputs:**
  - `query` *(string, optional)*: Keyword to match against titles, descriptions, or SKUs.
  - `page` *(integer, default: 1)*: Page number.
  - `limit` *(integer, 1-100, default: 20)*: Page size limit.
- **Output:** Normalized product objects (ID, name, SKU, price, stock status, stock quantity, clean description without HTML).

### 4. `get_product`
- **Purpose:** Retrieve details for a specific product by ID.
- **Inputs:**
  - `product_id` *(positive integer, required)*: WooCommerce product ID.
- **Output:** Normalized product record with pricing and stock details.

### 5. `get_inventory`
- **Purpose:** Retrieve store inventory with deterministic low-stock and out-of-stock filtering.
- **Inputs:**
  - `low_stock_only` *(boolean, default: false)*: When `true`, filters for items with `stock_status === 'outofstock'` or managed `stock_quantity <= 5`.
  - `page` *(integer, default: 1)*: Page number.
  - `limit` *(integer, 1-100, default: 20)*: Page size limit.
- **Output:** Inventory records with `is_low_stock` indicators.

---

## 5. Security & Data Minimization

### What the Agent CAN do
- ✓ Search orders by status and date filters
- ✓ Retrieve specific order line items and statuses
- ✓ Search product catalog and inspect prices
- ✓ Query inventory levels and identify stockouts

### What the Agent CANNOT do
- ✗ Create, modify, cancel, or refund orders
- ✗ Create, edit, or delete products
- ✗ Modify stock quantities or prices
- ✗ Access customer personal information (billing address, phone, email, customer IP are stripped)
- ✗ Access WooCommerce credentials, API keys, or raw authentication headers

### Secret Scrubbing
All loggers and error formatters scrub sensitive credential patterns (`ck_...`, `cs_...`, `Basic ...`, `Bearer ...`) before output.

---

## 6. Prerequisites & Installation

### Prerequisites
- **Node.js:** v20.0.0 or higher
- **npm:** v10.0.0 or higher
- **WooCommerce Store:** A WooCommerce store or test sandbox with REST API credentials

### Installation
```bash
# Clone the repository
git clone https://github.com/merchant-tools/cartix.git
cd cartix

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

---

## 7. WooCommerce Setup & Credentials

1. Log in to your WordPress admin dashboard (`https://your-store.com/wp-admin`).
2. Verify **Settings → Permalinks** is set to **Post name** (pretty permalinks are required for WooCommerce REST API).
3. Navigate to **WooCommerce → Settings → Advanced → REST API**.
4. Click **Add Key**:
   - **Description:** `Cartix Read-Only Connector`
   - **Permissions:** Select **`Read`**
5. Copy the generated credentials into your local `.env`:

```env
WOOCOMMERCE_URL=https://your-store.com
WOOCOMMERCE_CONSUMER_KEY=ck_xxxxxxxxxxxxxxxxxxxxxxxx
WOOCOMMERCE_CONSUMER_SECRET=cs_xxxxxxxxxxxxxxxxxxxxxxxx
PORT=3000
NODE_ENV=development
```

---

## 8. Sample Data Seeder

Cartix includes an automated seeder (`scripts/seed.ts`) that populates test stores with a realistic commerce dataset:
- **20 Products:** 10 in-stock, 5 low-stock, 5 out-of-stock items across multiple categories.
- **50 Orders:** Distributed across varied statuses (`pending`, `processing`, `completed`, `on-hold`, `failed`, `cancelled`) and timestamps (recent, > 24 hours old, > 48 hours old, > 72 hours old) referencing seeded products.

```bash
# Run seeder (requires Read/Write key in .env or WOOCOMMERCE_SEED_CONSUMER_KEY)
npm run seed
```

---

## 9. Running the MCP Server

```bash
# Start in development mode
npm run dev

# Start compiled production server (Stdio transport)
npm start
```

---

## 10. Connecting to MCP Clients

### Claude Desktop Configuration
Add Cartix to your Claude Desktop configuration (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "cartix": {
      "command": "node",
      "args": ["/path/to/cartix/dist/src/index.js"],
      "env": {
        "WOOCOMMERCE_URL": "https://your-store.com",
        "WOOCOMMERCE_CONSUMER_KEY": "ck_xxxxxxxxxxxxxxxxxxxxxxxx",
        "WOOCOMMERCE_CONSUMER_SECRET": "cs_xxxxxxxxxxxxxxxxxxxxxxxx"
      }
    }
  }
}
```

### Cursor / Custom MCP Client
Connect using standard `stdio` transport pointing to `node dist/src/index.js`.

---

## 11. Running the AI Agent Demo

Cartix includes an AI Agent demo (`demo/agent.ts`) that connects to the Cartix MCP server, dynamically discovers tools, translates schemas to LLM function calls, and executes reasoning loops.

### Automated Evaluation Suite
Runs all 6 core assessment scenarios in sequence:

```bash
npm run demo -- --all
```

### Interactive CLI Mode
Interact with your live store via conversational natural language:

```bash
npm run demo
```

*(Note: If `LLM_API_KEY` is configured in `.env`, the agent connects to Google Gemini; otherwise, it operates using an intelligent local reasoning engine for offline/CI verification).*

---

## 12. Demonstrated Merchant Scenarios

| Scenario | Natural Language Prompt | Cartix Tool Chain | Agent Reasoning |
|---|---|---|---|
| **1. Pending Orders** | *"Show me all pending orders."* | `search_orders(status="pending")` | Summarizes count, total amounts, and IDs |
| **2. Delayed Orders** | *"Which pending orders have been waiting for more than 24 hours?"* | `search_orders(status="pending")` | Computes timestamp delta against current time (`created_at`) and filters orders > 24h |
| **3. Inventory Alerts** | *"Which products are out of stock or low in stock?"* | `get_inventory(low_stock_only=true)` | Groups products into out-of-stock alerts and low-stock warnings |
| **4. Order Details** | *"Tell me about order #1004."* | `get_order(order_id=1004)` | Extracts line items, quantities, subtotal, and fulfillment state |
| **5. Product Search** | *"Find products containing keyboard."* | `search_products(query="keyboard")` | Returns matching catalog entries, prices, and stock availability |
| **6. Multi-Tool Reasoning** | *"Are any pending orders affected by products that are out of stock?"* | `search_orders(status="pending")` → `get_inventory(low_stock_only=true)` | Cross-references order line items with out-of-stock product IDs |

---

## 13. Testing & Verification

Cartix maintains an extensive automated test suite covering unit, integration, and failure modes.

```bash
# Run all 60 tests
npm test

# Run tests with coverage
npm run test:coverage

# Run TypeScript typecheck
npm run typecheck

# Verify build
npm run build
```

### Test Coverage Highlights
- **Unit Tests:** Input validation, Zod schemas, order/product/inventory normalizers, error serialization.
- **Reliability Tests:** 429 rate limit backoff, `Retry-After` header extraction, exponential jitter scaling, 5xx server retry, fast-fail on 401/403/404.
- **Integration Tests:** In-memory MCP client-server pair, tool discovery (`tools/list`), dynamic execution (`tools/call`), structured error responses (`isError: true`).
- **Failure Tests:** Malformed ISO dates, non-integer IDs, empty searches, upstream disconnects (`ECONNREFUSED`), 503 errors, and secret leakage audits.

---

## 14. Docker Deployment

### Build Docker Image
```bash
docker build -t cartix:latest .
```

### Run Container
```bash
docker run -d \
  -p 3000:3000 \
  -e WOOCOMMERCE_URL="https://your-store.com" \
  -e WOOCOMMERCE_CONSUMER_KEY="ck_xxxxxxxxxxxx" \
  -e WOOCOMMERCE_CONSUMER_SECRET="cs_xxxxxxxxxxxx" \
  cartix:latest
```

---

## 15. Documentation Website & GitHub Pages Deployment

Cartix includes an interactive static documentation website and 3D architectural pipeline visualizer.

- **Website Location:** `/website` (contains standalone HTML, CSS, Vanilla JS, and interactive canvas visualizer; no frontend frameworks or build steps required).
- **GitHub Pages Source:** Configured as `GitHub Actions` in repository Settings → Pages.
- **How Deployment Works:**
  $$\text{Push to } \texttt{main} \longrightarrow \text{GitHub Actions } (\texttt{.github/workflows/deploy-pages.yml}) \longrightarrow \text{Uploads } \texttt{/website} \longrightarrow \text{Deploys to GitHub Pages}$$
- **Expected Project URL:**
  `https://<username>.github.io/Cartix/` (or `https://<username>.github.io/cartix/`)

All static assets, stylesheets, scripts, and internal links in `/website` use root-agnostic relative paths to support subpath deployment seamlessly.

---

## 16. Assumptions & Limitations

1. **Read-Only Scope:** Cartix intentionally does not perform write, refund, order modification, or product update operations for this assessment.
2. **Deterministic Low-Stock:** A product is classified as low stock if `stock_status === 'outofstock'` or managed `stock_quantity <= (low_stock_amount || 5)`.
3. **Authentication:** Uses WooCommerce REST API v3 Basic Authentication over HTTPS.
4. **Pagination Ceiling:** Results per tool request are bounded to a maximum of `100` items (`MAX_PAGE_SIZE=100`) to prevent LLM context exhaustion.

---

## 17. Future Evolution

For production multi-tenant deployments, Cartix can evolve to include:
- **OAuth 2.0 / WooCommerce App Authorization:** Enabling zero-credential one-click merchant onboarding.
- **Webhook Ingestion:** Real-time push updates for `order.created` and `product.out_of_stock`.
- **Multi-Store Aggregation:** Single agent interface across multiple regional WooCommerce stores.
- **Write Actions with Human-in-the-Loop Gating:** Exposing refund and status update tools with explicit approval tokens.
