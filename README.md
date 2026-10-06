# Cartix — WooCommerce Agent Connector

[![CI](https://github.com/ilakkiyan-j/Cartix/actions/workflows/ci.yml/badge.svg)](https://github.com/ilakkiyan-j/Cartix/actions/workflows/ci.yml)
[![M8ven Score](https://m8ven.ai/badge/mcp/ilakkiyan-j/cartix)](https://m8ven.ai/mcp/ilakkiyan-j/cartix?s=readme)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-green.svg)](https://nodejs.org/)
[![MCP](https://img.shields.io/badge/MCP-Standard-purple.svg)](https://modelcontextprotocol.io/)
[![Tests](https://img.shields.io/badge/Tests-60%2F60%20Passing-brightgreen.svg)]()
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> **Cartix** is a secure, read-only Model Context Protocol (MCP) connector that enables autonomous AI agents (Agent Studio, Claude Desktop, Cursor) to safely query, inspect, and reason over WooCommerce store data.

Built for the **Razorpay Forward-Deployed Engineer, Agent Studio assessment**.

---

## Table of Contents
1. [Overview & Problem Statement](#1-overview--problem-statement)
2. [Architecture & Protocol Flow](#2-architecture--protocol-flow)
3. [Agent vs Connector Boundaries](#3-agent-vs-connector-boundaries)
4. [Supported MCP Tools](#4-supported-mcp-tools)
5. [Security & Data Minimization](#5-security--data-minimization)
6. [Prerequisites & Installation](#6-prerequisites--installation)
7. [WooCommerce Setup & Credentials](#7-woocommerce-setup--credentials)
8. [Read-Only Connection Verification](#8-read-only-connection-verification)
9. [Running the MCP Server](#9-running-the-mcp-server)
10. [Connecting to MCP Clients](#10-connecting-to-mcp-clients)
11. [Testing & Verification](#11-testing--verification)
12. [Docker Deployment](#12-docker-deployment)
13. [Documentation Website & Live Deployment](#13-documentation-website--live-deployment)
14. [Assumptions & Limitations](#14-assumptions--limitations)
15. [Future Evolution](#15-future-evolution)

---

## 1. Overview & Problem Statement

### The Problem
Merchants store critical operational data across WooCommerce (orders, fulfillment statuses, customer purchases, catalog pricing, and inventory levels). Normally, store managers must manually navigate dashboards, execute multiple searches, calculate order delays, and inspect stock logs to answer routine operational questions:
- *"Which pending orders have been waiting for more than 24 hours?"*
- *"Which products are out of stock or running low?"*
- *"Are any pending orders affected by products that are currently out of stock?"*

AI agents cannot reliably access raw WooCommerce REST APIs directly because:
1. Exposing raw API credentials to an LLM context creates critical security vulnerabilities.
2. Raw merchant payloads contain sensitive customer PII (billing addresses, phone numbers, customer emails) and massive unstructured payloads that exhaust context windows.
3. Upstream merchant APIs enforce strict rate limits (HTTP 429), pagination boundaries, and transient network errors that LLMs cannot manage autonomously.

### The Cartix Solution
**Cartix** serves as the hardened, reliable bridge between the AI agent and WooCommerce. It abstracts store complexity into clean, typed MCP tool primitives, enforces strictly read-only access, handles upstream rate-limiting with exponential backoff and jitter, redacts secrets, strips customer PII, and bounds pagination limits.

---

## 2. Architecture & Protocol Flow

```text
                        ┌─────────────────────────┐
                        │    Merchant / User      │
                        └────────────┬────────────┘
                                     │ Natural Language
                                     ▼
                        ┌─────────────────────────┐
                        │   Agent Studio / LLM    │
                        │    Claude / Cursor      │
                        └────────────┬────────────┘
                                     │
                                     │ MCP Protocol (JSON-RPC 2.0)
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

| Responsibility | AI Agent (e.g. Agent Studio) | Cartix MCP Connector | WooCommerce |
|---|---|---|---|
| **Natural Language Understanding** | ✅ Primary | ❌ No | ❌ No |
| **Tool Selection & Query Strategy** | ✅ Primary | ❌ No | ❌ No |
| **Reasoning Over Timestamps & Stock** | ✅ Primary | ❌ No | ❌ No |
| **Store Authentication & Secret Storage** | ❌ Never | ✅ Server-side only | ❌ No |
| **Rate-Limit Backoff & Retries** | ❌ No | ✅ Automatic (429 handling) | ❌ No |
| **Data Normalization & PII Removal** | ❌ No | ✅ Strips PII, compacts schemas| ❌ No |
| **Source of Truth for Store Data** | ❌ No | ❌ No | ✅ Primary |

---

## 4. Supported MCP Tools

Cartix exposes 5 production-ready, read-only MCP tools implemented in TypeScript with Zod validation:

### 1. `search_orders`
- **Purpose:** Search and filter orders by status, date range, and pagination.
- **Inputs:**
  - `status` *(string, optional)*: Filter by status (`pending`, `processing`, `completed`, `on-hold`, `failed`, `cancelled`, `refunded`, `any`).
  - `date_from` *(ISO 8601 string, optional)*: Inclusive start datetime.
  - `date_to` *(ISO 8601 string, optional)*: Inclusive end datetime.
  - `page` *(integer, default: 1)*: Page number.
  - `limit` *(integer, 1-100, default: 20)*: Maximum records to return.
- **Output:** Normalized order summaries with total amount, item count, timestamps, and bounded pagination metadata.

### 2. `get_order`
- **Purpose:** Retrieve full details for a specific order by numeric ID.
- **Inputs:**
  - `order_id` *(positive integer, required)*: WooCommerce order ID.
- **Output:** Complete normalized order containing line items (product ID, name, quantity, unit price, line total), status, and sanitized billing info. Returns `NOT_FOUND` if invalid.

### 3. `search_products`
- **Purpose:** Search the catalog by text keyword or SKU.
- **Inputs:**
  - `query` *(string, optional)*: Keyword to match against titles, descriptions, or SKUs.
  - `page` *(integer, default: 1)*: Page number.
  - `limit` *(integer, 1-100, default: 20)*: Page size limit.
- **Output:** Normalized product objects (ID, name, SKU, price, stock status, stock quantity).

### 4. `get_product`
- **Purpose:** Retrieve full catalog specifications for a single product by numeric ID.
- **Inputs:**
  - `product_id` *(positive integer, required)*: WooCommerce product ID.
- **Output:** Normalized product record with pricing tiers, stock quantity, and manage_stock flag.

### 5. `get_inventory`
- **Purpose:** Audit store-wide inventory with deterministic low-stock and out-of-stock filtering.
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
All loggers and error formatters scrub sensitive credential patterns (`ck_...`, `cs_...`, `Basic ...`, `Bearer ...`) before any output.

---

## 6. Prerequisites & Installation

### Prerequisites
- **Node.js:** v20.0.0 or higher
- **npm:** v10.0.0 or higher
- **WooCommerce Store:** A WooCommerce store or test sandbox with REST API credentials

### Installation
```bash
# Clone the repository
git clone https://github.com/ilakkiyan-j/Cartix.git
cd Cartix

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
MCP_TRANSPORT=stdio
PORT=3000
NODE_ENV=development
```

---

## 8. Read-Only Connection Verification

Cartix provides a non-mutating diagnostic script (`scripts/verify-connection.ts`) to validate store connectivity, API credentials, and read access before connecting AI agents:

```bash
# Verify read-only WooCommerce credentials and endpoint status
npm run verify
```

This diagnostic utility connects via HTTPS Basic Auth, queries `/wp-json/wc/v3/system_status`, lists sample products, and retrieves recent orders without writing or mutating any merchant records.

---

## 9. Running the MCP Server

```bash
# Start in development mode (watches for changes)
npm run dev

# Build TypeScript
npm run build

# Start compiled production server (Stdio transport by default)
npm start
```

---

## 10. Connecting to MCP Clients

### 1. Agent Studio (Razorpay)
Configure Cartix as a standard MCP tool source in Agent Studio:
- **Transport:** `stdio` (Command: `node /absolute/path/to/Cartix/dist/src/index.js`) or `streamable-http` (Endpoint: `http://localhost:3000/mcp`)
- **Environment:** Pass `WOOCOMMERCE_URL`, `WOOCOMMERCE_CONSUMER_KEY`, and `WOOCOMMERCE_CONSUMER_SECRET`.

### 2. Claude Desktop Configuration
Add Cartix to your Claude Desktop configuration (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "cartix": {
      "command": "node",
      "args": ["/absolute/path/to/Cartix/dist/src/index.js"],
      "env": {
        "WOOCOMMERCE_URL": "https://your-store.com",
        "WOOCOMMERCE_CONSUMER_KEY": "ck_xxxxxxxxxxxxxxxxxxxxxxxx",
        "WOOCOMMERCE_CONSUMER_SECRET": "cs_xxxxxxxxxxxxxxxxxxxxxxxx",
        "MCP_TRANSPORT": "stdio"
      }
    }
  }
}
```

### 3. Cursor / Custom MCP Client
Connect using standard `stdio` transport pointing to `node dist/src/index.js`.

---

## 11. Testing & Verification

Cartix maintains an extensive automated test suite covering unit, integration, and failure modes on Vitest.

```bash
# Run all 60 tests
npm test

# Run tests with coverage report
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

## 12. Docker Deployment

### Build Docker Image
```bash
docker build -t cartix:latest .
```

### Run Container (HTTP Streamable Mode)
```bash
docker run -d \
  -p 3000:3000 \
  -e WOOCOMMERCE_URL="https://your-store.com" \
  -e WOOCOMMERCE_CONSUMER_KEY="ck_xxxxxxxxxxxx" \
  -e WOOCOMMERCE_CONSUMER_SECRET="cs_xxxxxxxxxxxx" \
  -e MCP_TRANSPORT="streamable-http" \
  --name cartix-mcp \
  cartix:latest
```

---

## 13. Documentation Website & Live Deployment

Cartix includes a standalone documentation website and interactive developer portal:
- **Location:** `/website` (HTML5, Vanilla CSS, and JavaScript; no frameworks required).
- **GitHub Pages Deployment:** Automatically built and published via `.github/workflows/deploy-pages.yml`.
- **Live URL:** `https://ilakkiyan-j.github.io/Cartix/`

---

## 14. Assumptions & Limitations

1. **Read-Only Scope:** Cartix intentionally does not perform write, refund, order modification, or product update operations for this assessment.
2. **Deterministic Low-Stock:** A product is classified as low stock if `stock_status === 'outofstock'` or managed `stock_quantity <= 5`.
3. **Authentication:** Uses WooCommerce REST API v3 Basic Authentication over HTTPS.
4. **Pagination Ceiling:** Results per tool request are bounded to a maximum of `100` items (`MAX_PAGE_SIZE=100`) to protect context window tokens.

---

## 15. Future Evolution

For production multi-tenant deployments, Cartix can evolve to include:
- **OAuth 2.0 / WooCommerce App Authorization:** Enabling zero-credential one-click merchant onboarding.
- **Webhook Ingestion:** Real-time push updates for `order.created` and `product.out_of_stock`.
- **Multi-Store Aggregation:** Single agent interface across multiple regional WooCommerce stores.
- **Write Actions with Human-in-the-Loop Gating:** Exposing refund and status update tools with explicit approval tokens.
