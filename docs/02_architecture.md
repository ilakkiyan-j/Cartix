# Cartix — Architecture

## 1. Overview

Cartix is a secure, read-only MCP connector that enables an AI agent to access and reason over merchant data stored in WooCommerce.

Cartix sits between the AI agent and the WooCommerce REST API.

```text
┌──────────────────────┐
│      Merchant /      │
│        User          │
└──────────┬───────────┘
           │ Natural language
           ▼
┌──────────────────────┐
│      AI Agent        │
│  LLM + MCP Client    │
└──────────┬───────────┘
           │ MCP
           ▼
┌──────────────────────────────────────┐
│               CARTIX                 │
│             MCP Server               │
│                                      │
│  ┌────────────────────────────────┐  │
│  │          MCP Tools             │  │
│  │                                │  │
│  │  search_orders()               │  │
│  │  get_order()                   │  │
│  │  search_products()             │  │
│  │  get_product()                 │  │
│  │  get_inventory()               │  │
│  └───────────────┬────────────────┘  │
│                  │                    │
│  ┌───────────────▼────────────────┐  │
│  │        Service Layer            │  │
│  └───────────────┬────────────────┘  │
│                  │                    │
│  ┌───────────────▼────────────────┐  │
│  │      Reliability Layer          │  │
│  │  Validation • Retry • Rate      │  │
│  │  Limits • Errors • Pagination   │  │
│  └───────────────┬────────────────┘  │
│                  │                    │
│  ┌───────────────▼────────────────┐  │
│  │      WooCommerce Client         │  │
│  └───────────────┬────────────────┘  │
└──────────────────┼───────────────────┘
                   │ HTTPS / REST
                   ▼
        ┌──────────────────────┐
        │    WooCommerce       │
        │    Merchant Store    │
        └──────────────────────┘
```

---

## 2. Architecture Goals

Cartix is designed around six goals:

1. **Secure access** — never expose merchant credentials to the LLM.
2. **Least privilege** — use read-only WooCommerce permissions for the assessment.
3. **Agent-friendly tools** — expose small, well-defined MCP tools instead of raw API endpoints.
4. **Reliable integration** — handle pagination, rate limits, retries, timeouts, and upstream failures.
5. **Normalized data** — transform WooCommerce responses into concise, predictable schemas.
6. **Testability** — keep MCP, business logic, API access, and reliability concerns independently testable.

---

## 3. High-Level Components

### 3.1 AI Agent

The AI agent is responsible for natural-language understanding and reasoning.

Examples:

- "Which orders are pending?"
- "Which orders have been pending for more than 24 hours?"
- "Which products are out of stock?"
- "Show me order #10482."

The agent decides which Cartix tool to call based on the tool descriptions and input schemas.

Cartix does **not** own the reasoning layer.

---

### 3.2 MCP Server

The MCP server is the primary interface exposed by Cartix.

It publishes tools that the AI agent can discover and invoke.

Initial tool set:

| Tool | Purpose |
|---|---|
| `search_orders` | Search/filter merchant orders |
| `get_order` | Retrieve one order by ID |
| `search_products` | Search products by text/filter |
| `get_product` | Retrieve one product by ID |
| `get_inventory` | Read stock/inventory information |

The MCP layer should expose only the capabilities required by the assessment.

---

### 3.3 Service Layer

The service layer contains application/business logic.

```text
MCP Tool
   ↓
Service
   ↓
WooCommerce Client
```

Examples:

- Validate business-level parameters.
- Construct WooCommerce API requests.
- Apply date/status filters.
- Normalize records.
- Coordinate pagination where necessary.

Keeping this layer separate prevents the MCP implementation from becoming tightly coupled to WooCommerce.

---

### 3.4 Reliability Layer

The reliability layer protects the merchant API and produces predictable agent behavior.

Responsibilities:

- Input validation
- Rate-limit handling
- Retry with backoff
- Timeout handling
- Upstream error mapping
- Pagination handling
- Request limits

Example:

```text
Request
   ↓
Validate
   ↓
Rate-limit guard
   ↓
WooCommerce API
   ↓
429?
 ┌─┴───────────────┐
 No                Yes
 │                  │
 ▼                  ▼
Return          Wait / backoff
response             │
                     ▼
                   Retry
```

Retries should use a maximum attempt count. Cartix must never retry indefinitely.

---

### 3.5 WooCommerce Client

The WooCommerce client is the only layer that directly knows how to communicate with WooCommerce.

Responsibilities:

- Construct HTTP requests.
- Attach authentication.
- Set headers/query parameters.
- Parse HTTP responses.
- Expose low-level operations to services.

Example endpoints:

```text
GET /wp-json/wc/v3/orders
GET /wp-json/wc/v3/orders/{id}

GET /wp-json/wc/v3/products
GET /wp-json/wc/v3/products/{id}
```

The client should not contain agent or MCP-specific logic.

---

### 3.6 Configuration

Configuration is loaded from environment variables.

Example:

```env
WOOCOMMERCE_URL=https://example.com
WOOCOMMERCE_CONSUMER_KEY=ck_xxxxx
WOOCOMMERCE_CONSUMER_SECRET=cs_xxxxx
```

Credentials must:

- Never be committed to Git.
- Never be returned by an MCP tool.
- Never be included in logs.
- Never be placed in prompts.
- Be provided through environment/configuration management.

---

## 4. Request Lifecycle

Consider the request:

> "Which orders have been pending for more than 24 hours?"

### Step 1 — User request

The merchant submits the natural-language request to the AI agent.

### Step 2 — Agent selects a tool

The agent identifies `search_orders` as the appropriate capability.

```json
{
  "status": "pending",
  "date_to": "2026-10-01T00:00:00Z"
}
```

The exact filtering strategy can be implemented either through API-supported filters or through controlled post-processing.

### Step 3 — MCP server validates input

Cartix validates the tool arguments against its schema.

Invalid input should result in a structured tool error.

### Step 4 — Service layer processes the request

`OrderService` converts the agent-friendly request into a WooCommerce API request.

### Step 5 — Reliability middleware executes

The request passes through:

```text
validation
   ↓
rate-limit protection
   ↓
timeout
   ↓
request
   ↓
retry/backoff when appropriate
```

### Step 6 — WooCommerce returns data

Cartix receives the raw WooCommerce response.

### Step 7 — Normalize response

Cartix maps the raw response into a compact agent-friendly object.

Example:

```json
{
  "order_id": 10482,
  "status": "pending",
  "created_at": "2026-09-30T08:15:00Z",
  "currency": "INR",
  "total": 2499,
  "item_count": 2
}
```

### Step 8 — Agent reasons over the result

The AI agent analyzes the returned data and generates the response for the merchant.

For example:

> "There are 7 pending orders older than 24 hours. Order #10482 is the oldest."

---

## 5. Tool Design

### `search_orders`

Purpose: Retrieve orders matching filters.

Suggested inputs:

```json
{
  "status": "pending",
  "date_from": "2026-10-01T00:00:00Z",
  "date_to": "2026-10-02T00:00:00Z",
  "page": 1,
  "limit": 20
}
```

### `get_order`

Purpose: Retrieve a specific order.

```json
{
  "order_id": 10482
}
```

### `search_products`

Purpose: Find products matching a search term and/or supported filters.

```json
{
  "query": "keyboard",
  "page": 1,
  "limit": 20
}
```

### `get_product`

Purpose: Retrieve one product.

```json
{
  "product_id": 87
}
```

### `get_inventory`

Purpose: Retrieve inventory/stock information.

```json
{
  "low_stock_only": true,
  "page": 1,
  "limit": 20
}
```

Tool names and schemas should remain small and explicit so that the agent can select them reliably.

---

## 6. Data Normalization

WooCommerce responses can contain many implementation-specific fields that are unnecessary for an AI agent.

Cartix should expose a stable normalized model.

Example:

```json
{
  "order_id": 10482,
  "status": "processing",
  "created_at": "2026-10-01T08:20:00Z",
  "currency": "INR",
  "total": 2499,
  "item_count": 3
}
```

Benefits:

- Smaller model context.
- Lower coupling to vendor-specific response structures.
- Easier testing.
- More predictable agent behavior.
- Easier future support for additional merchant platforms.

---

## 7. Pagination Strategy

Merchant stores may contain thousands of records.

Cartix should abstract WooCommerce pagination from the agent.

```text
Agent
  ↓
search_orders
  ↓
Cartix
  ├── page 1
  ├── page 2
  ├── page 3
  └── ...
  ↓
Normalized records
  ↓
Agent
```

The initial version should enforce safe page/limit bounds to prevent accidental large queries.

---

## 8. Rate-Limit and Retry Strategy

Cartix should distinguish between retryable and non-retryable failures.

### Retryable

- HTTP 429
- Temporary 5xx upstream errors
- Network timeout where the operation is safe to retry

### Usually non-retryable

- 400 invalid request
- 401/403 authentication or permission failure
- 404 resource not found
- validation errors

Conceptual policy:

```text
429 / temporary 5xx
       ↓
Read Retry-After when available
       ↓
Exponential backoff
       ↓
Maximum retry attempts
       ↓
Return structured error if still failing
```

Cartix must not hammer the merchant API during an outage.

---

## 9. Error Model

Errors should be translated into stable application errors.

Examples:

```json
{
  "error": "INVALID_INPUT",
  "message": "limit must be between 1 and 100"
}
```

```json
{
  "error": "ORDER_NOT_FOUND",
  "message": "Order 10482 was not found"
}
```

```json
{
  "error": "AUTHENTICATION_FAILED",
  "message": "Unable to authenticate with the merchant store"
}
```

```json
{
  "error": "UPSTREAM_UNAVAILABLE",
  "message": "WooCommerce is temporarily unavailable"
}
```

These are much more useful to an AI agent than raw framework exceptions.

---

## 10. Security Model

Cartix follows least-privilege principles.

### Allowed

```text
✓ Read orders
✓ Search orders
✓ Read products
✓ Search products
✓ Read inventory
```

### Not allowed in the assessment version

```text
✗ Create orders
✗ Update orders
✗ Cancel orders
✗ Refund orders
✗ Delete products
✗ Change prices
✗ Modify inventory
```

The WooCommerce credentials used by Cartix should also be configured with read-only permissions.

The LLM should never receive the underlying credential values.

---

## 11. Deployment Model

For development:

```text
Developer Machine / Cloud Agent
 ├── AI Agent (Agent Studio / Claude Desktop)
 ├── Cartix MCP Server
 └── WooCommerce Store
```

For deployment:

```text
                    ┌──────────────┐
                    │  AI Agent    │
                    └──────┬───────┘
                           │ MCP
                           ▼
                 ┌──────────────────┐
                 │   Cartix Server  │
                 │   Containerized  │
                 └────────┬─────────┘
                          │ HTTPS
                          ▼
                 ┌──────────────────┐
                 │   WooCommerce    │
                 └──────────────────┘
```

The container can be run locally for the assessment and can later be deployed to a cloud container platform.

---

## 12. Observability

Cartix should produce safe operational logs.

Example:

```text
INFO  tool=search_orders request_id=abc123
INFO  tool=search_orders status=pending duration_ms=241
WARN  upstream=woocommerce status=429 retry=1
INFO  upstream=woocommerce status=200 duration_ms=488
```

Never log:

- Consumer secret
- API key
- Authorization headers
- Customer passwords
- Unnecessary private customer information

A request ID should be used to correlate MCP requests with upstream API requests.

---

## 13. Testing Strategy

### Unit tests

Test individual components:

```text
✓ Tool input validation
✓ Order normalization
✓ Product normalization
✓ Inventory normalization
✓ Pagination logic
✓ Retry logic
✓ Error mapping
```

### Integration tests

Verify:

```text
MCP Tool
   ↓
Service
   ↓
WooCommerce Client
```

against a controlled test environment or mocked WooCommerce API.

### Agent-level demo tests

Validate natural-language requests such as:

```text
"Show me pending orders."

"Which products are out of stock?"

"Tell me about order #10482."

"Find products containing keyboard."
```

### Failure tests

Explicitly verify:

```text
✓ 404 handling
✓ 401/403 handling
✓ 429 handling
✓ 500 handling
✓ timeout handling
✓ empty result handling
✓ invalid parameters
```

---

## 14. Repository Architecture

```text
cartix/
│
├── src/
│   ├── config/
│   │   └── env.ts
│   │
│   ├── mcp/
│   │   ├── server.ts
│   │   └── tools/
│   │       ├── orders.tool.ts
│   │       ├── products.tool.ts
│   │       └── inventory.tool.ts
│   │
│   ├── services/
│   │   ├── order.service.ts
│   │   ├── product.service.ts
│   │   └── inventory.service.ts
│   │
│   ├── wooCommerce/
│   │   ├── client.ts
│   │   ├── orders.api.ts
│   │   ├── products.api.ts
│   │   └── inventory.api.ts
│   │
│   ├── middleware/
│   │   ├── rateLimiter.ts
│   │   ├── retry.ts
│   │   └── errorHandler.ts
│   │
│   ├── schemas/
│   │   ├── order.schema.ts
│   │   ├── product.schema.ts
│   │   ├── inventory.schema.ts
│   │   └── tool.schema.ts
│   │
│   └── utils/
│       ├── pagination.ts
│       ├── logger.ts
│       └── errors.ts
│
├── scripts/
│   └── verify-connection.ts
│
├── tests/
│   ├── unit/
│   └── integration/
│
├── docs/
│   ├── 01_problem_statement.md
│   ├── 02_architecture.md
│   ├── 03_development_phases_checklist.md
│   ├── 04_mcp_tools_spec.md
│   ├── 05_authentication_and_security.md
│   └── 06_limitations.md
│
├── website/
│   ├── index.html
│   ├── docs.html
│   ├── css/
│   └── js/
│
├── .env.example
├── .gitignore
├── Dockerfile
├── package.json
├── tsconfig.json
├── vitest.config.ts
└── README.md
```

---

## 15. Design Principles

### Separation of concerns

Each layer has one responsibility:

```text
Agent
  = reasoning

MCP
  = tool interface

Services
  = business logic

Reliability
  = safe/reliable execution

WooCommerce Client
  = vendor API communication
```

### Least privilege

Only expose the minimum permissions and tools required.

### Fail safely

Never hide an upstream failure or silently perform an unexpected action.

### Keep tools composable

Each tool should perform one clear function.

### Optimize for agents

Tool descriptions, schemas, outputs and errors should be designed for reliable model use rather than simply mirroring vendor APIs.

---

## 16. Future Architecture

The architecture should eventually allow Cartix to support additional merchant systems without changing the agent-facing interface.

```text
                         AI Agent
                            │
                          MCP
                            │
                         Cartix
                            │
          ┌─────────────────┼──────────────────┐
          ▼                 ▼                  ▼
     WooCommerce      Zoho Inventory       Unicommerce
```

The long-term vision is a common merchant integration layer where each connector implements the same core design principles.

The assessment version intentionally starts with WooCommerce to keep the scope focused.

---

## 17. Final Architecture Summary

Cartix is not another ecommerce application and it is not the AI model.

It is the **secure integration layer between an AI agent and WooCommerce**.

```text
AI Agent
   │
   │ MCP
   ▼
Cartix
   │
   ├── Tool definitions
   ├── Validation
   ├── Authentication
   ├── Pagination
   ├── Rate-limit handling
   ├── Retry / backoff
   ├── Error handling
   └── Response normalization
   │
   │ REST API
   ▼
WooCommerce
```

The resulting system allows an AI agent to answer real merchant questions using WooCommerce data while keeping access controlled, predictable, and production-oriented.
