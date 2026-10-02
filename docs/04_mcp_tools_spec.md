# Cartix — MCP Tools Specification

## 1. Purpose

Cartix exposes a small set of read-only Model Context Protocol (MCP) tools that allow an AI agent to securely retrieve merchant information from WooCommerce.

The tools are intentionally focused on common merchant operations:

- Orders
- Products
- Inventory

Cartix does not expose write operations such as creating, modifying, cancelling, or deleting merchant data.

---

## 2. Design Principles

### Agent-oriented

Tools should represent useful merchant capabilities rather than mirror every WooCommerce REST endpoint.

### Read-only

The assessment implementation exposes only read operations.

### Explicit schemas

Every tool has a clear input and output schema so the model can select and invoke tools predictably.

### Bounded requests

Pagination and result limits prevent unnecessarily large requests.

### Stable responses

Cartix normalizes WooCommerce responses into compact, predictable objects for agent consumption.

### Safe failures

Tool failures should return structured, understandable errors rather than raw framework exceptions.

---

# 3. Tool Overview

| Tool | Purpose | Access |
|---|---|---|
| `search_orders` | Search and filter merchant orders | Read |
| `get_order` | Retrieve a specific order | Read |
| `search_products` | Search merchant products | Read |
| `get_product` | Retrieve a specific product | Read |
| `get_inventory` | Retrieve product stock information | Read |

---

# 4. `search_orders`

## Purpose

Search for WooCommerce orders using supported filters.

This is the primary tool for agent questions about order status, date ranges, and merchant order activity.

### Example user requests

> "Show me all pending orders."

> "Find orders created today."

> "Show me processing orders."

> "Find pending orders from yesterday."

---

## Input Schema

```json
{
  "type": "object",
  "properties": {
    "status": {
      "type": "string",
      "description": "Optional WooCommerce order status filter."
    },
    "date_from": {
      "type": "string",
      "description": "Optional inclusive start datetime in ISO 8601 format."
    },
    "date_to": {
      "type": "string",
      "description": "Optional inclusive end datetime in ISO 8601 format."
    },
    "page": {
      "type": "integer",
      "minimum": 1,
      "default": 1,
      "description": "Page number."
    },
    "limit": {
      "type": "integer",
      "minimum": 1,
      "maximum": 100,
      "default": 20,
      "description": "Maximum number of orders to return."
    }
  },
  "additionalProperties": false
}
```

---

## Example Call

```json
{
  "status": "pending",
  "page": 1,
  "limit": 20
}
```

---

## Output

```json
{
  "orders": [
    {
      "order_id": 1004,
      "status": "pending",
      "created_at": "2026-10-01T08:20:00Z",
      "currency": "INR",
      "total": 2499,
      "item_count": 2
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "has_next_page": false
  }
}
```

---

## Agent Usage Notes

Use `search_orders` when the user is asking for a collection of orders or when filters are required.

For questions involving derived conditions such as:

> "Which orders have been pending for more than 24 hours?"

the agent can retrieve relevant orders and reason over timestamps.

The connector provides the evidence; the agent performs the reasoning.

---

# 5. `get_order`

## Purpose

Retrieve details for a specific WooCommerce order.

### Example user requests

> "Show me order #1004."

> "What is the status of order 1004?"

> "What items are in order 1004?"

---

## Input Schema

```json
{
  "type": "object",
  "properties": {
    "order_id": {
      "type": "integer",
      "minimum": 1,
      "description": "WooCommerce order ID."
    }
  },
  "required": ["order_id"],
  "additionalProperties": false
}
```

---

## Example Call

```json
{
  "order_id": 1004
}
```

---

## Output

```json
{
  "order_id": 1004,
  "status": "processing",
  "created_at": "2026-10-01T08:20:00Z",
  "currency": "INR",
  "total": 2499,
  "items": [
    {
      "product_id": 87,
      "name": "Mechanical Keyboard",
      "quantity": 1
    },
    {
      "product_id": 91,
      "name": "Wireless Mouse",
      "quantity": 1
    }
  ]
}
```

---

## Agent Usage Notes

Use `get_order` when the user provides or the agent already knows a specific order ID.

Do not use this tool for broad searches.

---

# 6. `search_products`

## Purpose

Search for products in the merchant's WooCommerce store.

### Example user requests

> "Find products containing keyboard."

> "Search for wireless mouse."

> "Show me products matching laptop."

---

## Input Schema

```json
{
  "type": "object",
  "properties": {
    "query": {
      "type": "string",
      "minLength": 1,
      "maxLength": 100,
      "description": "Text used to search products."
    },
    "page": {
      "type": "integer",
      "minimum": 1,
      "default": 1
    },
    "limit": {
      "type": "integer",
      "minimum": 1,
      "maximum": 100,
      "default": 20
    }
  },
  "required": ["query"],
  "additionalProperties": false
}
```

---

## Example Call

```json
{
  "query": "keyboard",
  "page": 1,
  "limit": 20
}
```

---

## Output

```json
{
  "products": [
    {
      "product_id": 87,
      "name": "Mechanical Keyboard",
      "sku": "KB-001",
      "price": 1499,
      "stock_quantity": 12,
      "stock_status": "instock"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "has_next_page": false
  }
}
```

---

# 7. `get_product`

## Purpose

Retrieve details for a single product.

### Example user requests

> "Tell me about product 87."

> "How much stock does product 87 have?"

---

## Input Schema

```json
{
  "type": "object",
  "properties": {
    "product_id": {
      "type": "integer",
      "minimum": 1,
      "description": "WooCommerce product ID."
    }
  },
  "required": ["product_id"],
  "additionalProperties": false
}
```

---

## Example Call

```json
{
  "product_id": 87
}
```

---

## Output

```json
{
  "product_id": 87,
  "name": "Mechanical Keyboard",
  "sku": "KB-001",
  "price": 1499,
  "stock_quantity": 12,
  "stock_status": "instock",
  "active": true
}
```

---

# 8. `get_inventory`

## Purpose

Retrieve stock and inventory information for products.

This is intended for merchant questions about stock availability and low-stock products.

### Example user requests

> "Which products are out of stock?"

> "Show me low-stock products."

> "What products have only a few units left?"

---

## Input Schema

```json
{
  "type": "object",
  "properties": {
    "low_stock_only": {
      "type": "boolean",
      "default": false,
      "description": "When true, return products considered low stock."
    },
    "page": {
      "type": "integer",
      "minimum": 1,
      "default": 1
    },
    "limit": {
      "type": "integer",
      "minimum": 1,
      "maximum": 100,
      "default": 20
    }
  },
  "additionalProperties": false
}
```

---

## Example Call

```json
{
  "low_stock_only": true,
  "page": 1,
  "limit": 20
}
```

---

## Output

```json
{
  "inventory": [
    {
      "product_id": 91,
      "name": "Wireless Mouse",
      "sku": "MOUSE-001",
      "stock_quantity": 3,
      "stock_status": "instock"
    },
    {
      "product_id": 102,
      "name": "Mechanical Keyboard",
      "sku": "KB-002",
      "stock_quantity": 0,
      "stock_status": "outofstock"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "has_next_page": false
  }
}
```

---

# 9. Common Error Model

All tools should return predictable error types.

## Invalid input

```json
{
  "error": "INVALID_INPUT",
  "message": "limit must be between 1 and 100"
}
```

## Resource not found

```json
{
  "error": "NOT_FOUND",
  "message": "Order 1004 was not found"
}
```

## Authentication failure

```json
{
  "error": "AUTHENTICATION_FAILED",
  "message": "Unable to authenticate with the merchant store"
}
```

## Permission failure

```json
{
  "error": "PERMISSION_DENIED",
  "message": "The configured WooCommerce credentials do not have the required permission"
}
```

## Rate limited

```json
{
  "error": "RATE_LIMITED",
  "message": "The merchant API is temporarily rate limited"
}
```

## Upstream unavailable

```json
{
  "error": "UPSTREAM_UNAVAILABLE",
  "message": "WooCommerce is temporarily unavailable"
}
```

## Timeout

```json
{
  "error": "UPSTREAM_TIMEOUT",
  "message": "The WooCommerce request timed out"
}
```

---

# 10. Pagination Contract

All collection-based tools use the same pagination structure.

### Input

```json
{
  "page": 1,
  "limit": 20
}
```

### Output

```json
{
  "pagination": {
    "page": 1,
    "limit": 20,
    "has_next_page": true
  }
}
```

Cartix is responsible for translating WooCommerce pagination behavior into this consistent interface.

The agent should not need to understand provider-specific pagination details.

---

# 11. Rate-Limit Behavior

Tool calls must pass through Cartix's reliability layer.

```text
MCP Tool
    ↓
Cartix
    ↓
WooCommerce
    ↓
429?
 ┌──┴───────┐
 No         Yes
 │           │
 ▼           ▼
Return    Retry-After /
result     backoff
              │
              ▼
            retry
```

The connector should:

- Detect HTTP 429.
- Respect `Retry-After` when provided.
- Apply exponential backoff when appropriate.
- Limit the maximum number of retries.
- Return `RATE_LIMITED` when the request still cannot be completed.

Non-retryable client errors should not be retried blindly.

---

# 12. Authentication Boundary

The LLM never receives the WooCommerce credentials.

```text
Merchant credentials
        │
        ▼
   Cartix config
        │
        ▼
WooCommerce Client
        │
        ▼
WooCommerce API
```

The MCP tool only receives business parameters such as:

```text
order_id
status
query
page
limit
```

not:

```text
consumer_key
consumer_secret
authorization_header
```

---

# 13. Read-Only Capability Boundary

Cartix intentionally does not expose tools such as:

```text
create_order
update_order
cancel_order
refund_order
delete_product
update_product
update_inventory
```

This reduces the risk of unintended agent actions and keeps the assessment implementation focused on read access.

---

# 14. Tool Selection Guidelines for the Agent

The agent should select tools based on the user's intent.

| User intent | Tool |
|---|---|
| Find multiple orders | `search_orders` |
| Inspect one known order | `get_order` |
| Search products | `search_products` |
| Inspect one known product | `get_product` |
| Ask about stock/inventory | `get_inventory` |

Examples:

```text
"Show pending orders"
→ search_orders
```

```text
"Tell me about order #1004"
→ get_order
```

```text
"Find keyboards"
→ search_products
```

```text
"Show product 87"
→ get_product
```

```text
"Which products are out of stock?"
→ get_inventory
```

---

# 15. Derived Questions

Cartix tools primarily provide source data. The AI agent can reason over that data for higher-level questions.

Example:

```text
User:
"Which pending orders are older than 24 hours?"

Agent:
1. Calls search_orders(status="pending")
2. Receives normalized order timestamps
3. Compares timestamps
4. Returns the matching orders
```

Another example:

```text
User:
"Which products need restocking?"

Agent:
1. Calls get_inventory(low_stock_only=true)
2. Reviews returned stock levels
3. Summarizes products requiring attention
```

Cartix should avoid embedding LLM reasoning into the connector itself.

---

# 16. Tool Naming Convention

Tool names use:

```text
<action>_<resource>
```

Current tools:

```text
search_orders
get_order
search_products
get_product
get_inventory
```

Names should remain:

- Short
- Descriptive
- Consistent
- Verb-based
- Easy for an LLM to distinguish

---

# 17. Output Design Guidelines

Tool responses should:

- Return only information useful to the agent.
- Avoid unnecessary provider-specific fields.
- Use stable field names.
- Use explicit types.
- Include identifiers needed for follow-up calls.
- Include pagination metadata for collections.
- Avoid secret or credential information.
- Avoid exposing unnecessary personal/customer information.

Example normalized order:

```json
{
  "order_id": 1004,
  "status": "pending",
  "created_at": "2026-10-01T08:20:00Z",
  "currency": "INR",
  "total": 2499,
  "item_count": 2
}
```

---

# 18. Security and Privacy Notes

Cartix should follow a minimum-data principle.

The connector should expose only the fields needed for the supported merchant workflows.

It should not unnecessarily return:

- Authentication secrets
- Internal server configuration
- Payment credentials
- Passwords
- Unneeded customer personal information

Any customer information returned by WooCommerce should be minimized to the fields required by the tool's purpose.

---

# 19. Future Tool Extensions

The current assessment intentionally keeps the tool surface small.

Potential future capabilities could include:

```text
search_customers
get_customer
search_categories
get_sales_summary
search_order_notes
```

Write operations could also be introduced in a future version, but should require a separate permission model, confirmation strategy, and stronger safeguards.

---

# 20. Final MCP Contract

The Cartix MCP server exposes the following initial contract:

```text
READ
────
search_orders(status?, date_from?, date_to?, page?, limit?)
get_order(order_id)
search_products(query, page?, limit?)
get_product(product_id)
get_inventory(low_stock_only?, page?, limit?)
```

The resulting interaction is:

```text
User
  ↓
AI Agent
  ↓
MCP tool selection
  ↓
Cartix
  ↓
Validate
  ↓
Authenticate
  ↓
Rate-limit / retry
  ↓
WooCommerce API
  ↓
Normalize
  ↓
MCP response
  ↓
AI Agent
  ↓
Merchant answer
```

Cartix therefore acts as a controlled, reliable tool layer between an AI agent and WooCommerce rather than exposing the raw merchant API directly to the model.
