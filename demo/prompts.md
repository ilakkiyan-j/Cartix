# Cartix — AI Agent Demo Prompts & Scenarios

This document outlines the core merchant evaluation scenarios tested by the Cartix AI Agent.

---

## Scenario 1 — Pending Orders

### Natural Language Prompt
> *"Show me all pending orders."*

### Expected Tool Call
```json
{
  "name": "search_orders",
  "arguments": {
    "status": "pending"
  }
}
```

### Agent Reasoning Flow
1. Agent selects `search_orders` tool with `status: "pending"`.
2. Cartix validates input and queries WooCommerce API (`/wp-json/wc/v3/orders?status=pending`).
3. Cartix returns normalized orders (total amount, item count, currency, date created).
4. Agent summarizes the active pending orders in clear natural language for the merchant.

---

## Scenario 2 — Delayed Orders (> 24 Hours)

### Natural Language Prompt
> *"Which pending orders have been waiting for more than 24 hours?"*

### Expected Tool Call
```json
{
  "name": "search_orders",
  "arguments": {
    "status": "pending"
  }
}
```

### Agent Reasoning Flow
1. Agent queries `search_orders(status: "pending")`.
2. Cartix returns the list of pending orders with ISO 8601 timestamps (`created_at`).
3. **Agent-side reasoning:** The agent inspects `created_at` against the current timestamp, computes the duration elapsed for each order, filters for orders where elapsed time > 24 hours, and presents a prioritized list of delayed orders to the merchant.

---

## Scenario 3 — Out of Stock / Low Stock Inventory

### Natural Language Prompt
> *"Which products are out of stock or running low?"*

### Expected Tool Call
```json
{
  "name": "get_inventory",
  "arguments": {
    "low_stock_only": true
  }
}
```

### Agent Reasoning Flow
1. Agent selects `get_inventory` with `low_stock_only: true`.
2. Cartix queries product stock levels and applies deterministic low stock filters (`stock_status === 'outofstock'` or `stock_quantity <= 5`).
3. Cartix returns normalized inventory items.
4. Agent groups the products into out-of-stock and low-stock alerts with SKUs and remaining quantities.

---

## Scenario 4 — Order Inspection

### Natural Language Prompt
> *"Tell me about order #1004."*

### Expected Tool Call
```json
{
  "name": "get_order",
  "arguments": {
    "order_id": 1004
  }
}
```

### Agent Reasoning Flow
1. Agent extracts the positive integer ID `1004` and calls `get_order(order_id: 1004)`.
2. Cartix retrieves and normalizes order details (line items, item prices, subtotal, total, and status).
3. Agent explains order status, line items ordered, and total transaction amount.

---

## Scenario 5 — Product Catalog Search

### Natural Language Prompt
> *"Find all products containing keyboard."*

### Expected Tool Call
```json
{
  "name": "search_products",
  "arguments": {
    "query": "keyboard"
  }
}
```

### Agent Reasoning Flow
1. Agent queries `search_products(query: "keyboard")`.
2. Cartix searches WooCommerce product catalog and normalizes matching records.
3. Agent presents the matching keyboards, their prices, and current in-stock availability.

---

## Scenario 6 — Multi-Tool Reasoning (Cross-Reference)

### Natural Language Prompt
> *"Are any of our pending orders affected by products that are currently out of stock?"*

### Expected Multi-Tool Call Chain
```text
1. search_orders(status="pending")
   ↓
   Returns pending orders with line item product IDs
2. get_inventory(low_stock_only=true)
   ↓
   Returns list of out-of-stock and low-stock product IDs
3. Cross-reference: Compare line items in pending orders with out-of-stock product IDs
   ↓
   Agent synthesizes answer identifying specific delayed orders blocked by stockouts.
```
