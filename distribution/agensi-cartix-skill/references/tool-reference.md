# Cartix MCP Tool Reference

This reference documents the five production-ready, read-only MCP tools provided by **Cartix**. All tools enforce schema validation via Zod, bound pagination, strip sensitive customer PII, and return typed JSON-RPC results.

All five tools declare the following safety hints:
```json
{
  "readOnlyHint": true,
  "destructiveHint": false,
  "idempotentHint": true,
  "openWorldHint": false
}
```

---

## 1. `search_orders`

### Purpose
Search and filter merchant orders by lifecycle status, date boundaries, and page numbers. Returns compact, normalized order summaries with total amounts, line item summaries, status, and pagination metadata.

### Input Schema
| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `status` | `string` | No | None | Filter by status: `pending`, `processing`, `completed`, `on-hold`, `failed`, `cancelled`, `refunded`, or `any`. |
| `date_from` | `string` | No | None | Inclusive start datetime in ISO 8601 format (e.g., `2026-10-01T00:00:00Z`). |
| `date_to` | `string` | No | None | Inclusive end datetime in ISO 8601 format (e.g., `2026-10-02T23:59:59Z`). |
| `page` | `integer` | No | `1` | Page number for pagination (minimum: `1`). |
| `limit` | `integer` | No | `20` | Records per page (minimum: `1`, maximum: `100`). |

### Output Structure
```json
{
  "orders": [
    {
      "order_id": 1042,
      "status": "pending",
      "created_at": "2026-10-14T08:15:30Z",
      "currency": "USD",
      "total": 149.98,
      "item_count": 2,
      "line_items": [
        {
          "product_id": 87,
          "name": "Wireless Ergonomic Mouse",
          "quantity": 2,
          "price": 74.99,
          "total": 149.98,
          "sku": "MS-087"
        }
      ],
      "customer_note": "Please leave at front door if unattended."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "total_pages": 1,
    "has_next_page": false
  }
}
```

### Privacy & Data Minimization
- Customer personal identifiers (customer name, email address, phone number, billing address, shipping address, customer IP) are **strictly stripped** before returning data to the AI agent.
- `customer_note` is preserved only when present on the order.

### Typical Errors
- `INVALID_INPUT` (400): If `date_from` or `date_to` is not a valid ISO 8601 string, or `page` < 1.

---

## 2. `get_order`

### Purpose
Retrieve full details for a single specific order by its unique integer ID.

### Input Schema
| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `order_id` | `integer` | **Yes** | None | Positive integer order ID (e.g., `1042`). Minimum: `1`. |

### Output Structure
```json
{
  "order_id": 1042,
  "status": "processing",
  "created_at": "2026-10-14T09:00:00Z",
  "currency": "USD",
  "total": 299.95,
  "item_count": 3,
  "line_items": [
    {
      "product_id": 45,
      "name": "Mechanical Keyboard RGB",
      "quantity": 1,
      "price": 149.99,
      "total": 149.99,
      "sku": "KB-RGB-01"
    },
    {
      "product_id": 87,
      "name": "Wireless Ergonomic Mouse",
      "quantity": 2,
      "price": 74.98,
      "total": 149.96,
      "sku": "MS-087"
    }
  ],
  "customer_note": "Express delivery requested."
}
```

### Typical Errors
- `NOT_FOUND` (404): If the requested order ID does not exist on the store.
- `INVALID_INPUT` (400): If `order_id` is missing, non-numeric, or <= 0.

---

## 3. `search_products`

### Purpose
Search the WooCommerce product catalog by text keyword or SKU.

### Input Schema
| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `query` | `string` | No | None | Keyword to match against titles, descriptions, or SKUs. |
| `page` | `integer` | No | `1` | Page number for pagination (minimum: `1`). |
| `limit` | `integer` | No | `20` | Maximum products to return (minimum: `1`, maximum: `100`). |

### Output Structure
```json
{
  "products": [
    {
      "product_id": 87,
      "name": "Wireless Ergonomic Mouse",
      "sku": "MS-087",
      "price": 74.99,
      "regular_price": 89.99,
      "sale_price": 74.99,
      "on_sale": true,
      "manage_stock": true,
      "stock_quantity": 14,
      "stock_status": "instock",
      "low_stock_amount": 5,
      "description": "Ergonomic 2.4GHz wireless mouse with rechargeable lithium battery."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "total_pages": 1,
    "has_next_page": false
  }
}
```

### Privacy & Sanitization
- HTML formatting in product short descriptions is stripped into plain text.

---

## 4. `get_product`

### Purpose
Retrieve full normalized catalog specifications for a single product by numeric ID.

### Input Schema
| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `product_id` | `integer` | **Yes** | None | Positive integer product ID. Minimum: `1`. |

### Output Structure
```json
{
  "product_id": 87,
  "name": "Wireless Ergonomic Mouse",
  "sku": "MS-087",
  "price": 74.99,
  "regular_price": 89.99,
  "sale_price": 74.99,
  "on_sale": true,
  "manage_stock": true,
  "stock_quantity": 14,
  "stock_status": "instock",
  "low_stock_amount": 5,
  "description": "Ergonomic 2.4GHz wireless mouse with rechargeable lithium battery."
}
```

### Typical Errors
- `NOT_FOUND` (404): If the product ID does not exist in WooCommerce.
- `INVALID_INPUT` (400): If `product_id` is missing or not a positive integer.

---

## 5. `get_inventory`

### Purpose
Audit store inventory levels with deterministic low-stock and out-of-stock filtering.

### Input Schema
| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `low_stock_only` | `boolean` | No | `false` | When `true`, filters only for items that are out of stock or have managed stock quantity `<= low_stock_amount` (defaulting to `<= 5` if not defined). |
| `page` | `integer` | No | `1` | Page number for pagination (minimum: `1`). |
| `limit` | `integer` | No | `20` | Maximum inventory items to return (1-100). |

### Low-Stock Evaluation Semantics
A product is deterministically classified as low-stock (`is_low_stock: true`) if:
1. `stock_status === 'outofstock'`, OR
2. `manage_stock === true` AND `typeof stock_quantity === 'number'` AND `stock_quantity <= (low_stock_amount ?? 5)`.

### Output Structure
```json
{
  "inventory": [
    {
      "product_id": 102,
      "name": "USB-C Fast Charging Cable 2m",
      "sku": "CB-USBC-2M",
      "price": 14.99,
      "stock_quantity": 2,
      "stock_status": "instock",
      "manage_stock": true,
      "is_low_stock": true
    },
    {
      "product_id": 105,
      "name": "Noise Cancelling Headphones",
      "sku": "HP-NC-001",
      "price": 199.99,
      "stock_quantity": 0,
      "stock_status": "outofstock",
      "manage_stock": true,
      "is_low_stock": true
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 2,
    "total_pages": 1,
    "has_next_page": false
  }
}
```

---

## 6. Real-World Agent Workflows

### Workflow 1: Finding Pending Orders
**User Goal**: *"What orders are currently waiting for fulfillment?"*
1. **Agent Tool Call**:
   ```json
   {
     "name": "search_orders",
     "arguments": {
       "status": "pending",
       "limit": 20
     }
   }
   ```
2. **Agent Reasoning**:
   Inspects `orders` array. For each order, notes `order_id`, `created_at`, `total`, `currency`, and line item names.
3. **Response to Merchant**:
   Presents a clean markdown table summarizing pending orders, total revenue awaiting processing, and timestamps.

---

### Workflow 2: Identifying Delayed Orders (> 24 Hours)
**User Goal**: *"Show me pending orders that have been waiting for more than 24 hours."*
1. **Agent Tool Call**:
   ```json
   {
     "name": "search_orders",
     "arguments": {
       "status": "pending"
     }
   }
   ```
2. **Agent Reasoning**:
   - Agent takes the current system time $T_{now}$.
   - For each order in the returned list, parses `created_at` (ISO 8601).
   - Computes elapsed hours: $\Delta t = (T_{now} - T_{created}) \text{ / } 3600000$.
   - Filters orders where $\Delta t > 24$.
3. **Response to Merchant**:
   Highlights delayed orders with exact wait times (e.g. *"Order #1042 has been pending for 31 hours"*).

---

### Workflow 3: Stockout & Low-Stock Inventory Audit
**User Goal**: *"Which items are running low or completely out of stock?"*
1. **Agent Tool Call**:
   ```json
   {
     "name": "get_inventory",
     "arguments": {
       "low_stock_only": true
     }
   }
   ```
2. **Agent Reasoning**:
   - Groups items with `stock_status === 'outofstock'` under an **Out of Stock** alert.
   - Groups items with `stock_quantity <= 5` under a **Low Stock Warning** with remaining quantity.
3. **Response to Merchant**:
   Actionable inventory replenishment checklist sorted by lowest remaining quantity.

---

### Workflow 4: Cross-Referencing Pending Orders with Stockouts
**User Goal**: *"Are any of our pending orders blocked by products that are out of stock?"*
1. **Step 1 — Retrieve Pending Orders**:
   ```json
   {
     "name": "search_orders",
     "arguments": { "status": "pending" }
   }
   ```
   *Agent extracts set of needed `product_id`s from line items: e.g., `[87, 105]`.*

2. **Step 2 — Retrieve Stockout & Low-Stock Inventory**:
   ```json
   {
     "name": "get_inventory",
     "arguments": { "low_stock_only": true }
   }
   ```
   *Agent identifies items where `stock_status === 'outofstock'`: e.g., product `105` is out of stock.*

3. **Step 3 — In-Memory Intersection**:
   Agent cross-references the two sets:
   - Order #1042 contains product `87` (In stock: 14 available). -> Not blocked.
   - Order #1049 contains product `105` (Out of stock: 0 available). -> **BLOCKED**.

4. **Response to Merchant**:
   > "⚠️ **Order #1049** ($199.99) is currently blocked because line item **Noise Cancelling Headphones (SKU: HP-NC-001)** is completely out of stock."
