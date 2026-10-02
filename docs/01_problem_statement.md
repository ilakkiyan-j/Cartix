# Cartix — Problem Statement & Solution

## 1. Problem Statement

Modern merchants often run their stores on platforms such as WooCommerce, where critical operational data already exists across orders, products, and inventory.

However, an AI agent cannot reliably reason over this data unless it has a secure, structured, and well-defined way to access the merchant's existing systems.

Today, a merchant or operations employee may need to manually open the WooCommerce dashboard, search for records, apply filters, inspect multiple pages, and interpret the results to answer routine questions such as:

- Which orders are still pending?
- Which orders have been pending for more than 24 hours?
- Which products are out of stock or low in stock?
- What is the current status of a specific order?
- What does today's order activity look like?

This creates repetitive operational work and prevents an AI agent from becoming a reliable interface to the merchant's existing commerce data.

### Core Problem

> **AI agents need a secure and reliable bridge to merchant systems before they can use merchant data to answer real business questions.**

The challenge is therefore not simply retrieving data from WooCommerce. The challenge is exposing the right capabilities to an AI agent while handling authentication, permissions, validation, pagination, rate limits, retries, failures, and data normalization correctly.

---

## 2. Proposed Solution

**Cartix** is a secure, read-only **Model Context Protocol (MCP) connector** that connects an AI agent to a merchant's WooCommerce account.

Cartix acts as the integration and reliability layer between the AI agent and WooCommerce.

```text
Merchant / User
      |
      v
   AI Agent
      |
      | MCP tool calls
      v
    Cartix
      |
      | WooCommerce REST API
      v
 WooCommerce
      |
      v
Orders / Products / Inventory
```

The AI agent remains responsible for natural-language understanding, reasoning, and analysis. Cartix is responsible for securely retrieving and structuring the required WooCommerce data.

### Responsibility Split

| Component | Responsibility |
|---|---|
| **AI Agent** | Understand the user's question, choose tools, reason over returned data, and generate the final response |
| **Cartix** | Authenticate, validate requests, call WooCommerce, handle pagination/rate limits/retries/errors, normalize responses, and expose MCP tools |
| **WooCommerce** | Remain the source of truth for merchant store data |

---

## 3. What Cartix Enables

Cartix will expose focused read-only MCP tools that an AI agent can invoke when needed.

### Core Tools

```text
search_orders
get_order
search_products
get_product
get_inventory
```

These tools allow the agent to answer merchant questions without exposing the merchant to the underlying WooCommerce API complexity.

---

## 4. Example User Flow

### Example 1 — Pending Orders

**Merchant:**

> Show me all pending orders.

**Agent:**

Determines that order data is required and calls:

```text
search_orders(status="pending")
```

**Cartix:**

1. Validates the request.
2. Authenticates with WooCommerce.
3. Retrieves the required orders.
4. Handles pagination if necessary.
5. Normalizes the response.
6. Returns structured order data to the agent.

**Agent:**

Uses the returned data to provide a natural-language answer.

---

### Example 2 — Delayed Orders

**Merchant:**

> Which orders have been pending for more than 24 hours?

The agent can retrieve pending orders through Cartix and reason over their timestamps to identify delayed orders.

This illustrates the intended separation:

```text
Cartix -> provides reliable evidence
Agent  -> reasons over the evidence
```

---

### Example 3 — Inventory

**Merchant:**

> Which products are out of stock?

The agent calls:

```text
get_inventory(low_stock_only=true)
```

Cartix retrieves the relevant inventory information and returns a normalized result for the agent to interpret.

---

## 5. Why an MCP Connector?

A raw WooCommerce API is designed for software applications, not directly for AI agents.

Cartix converts WooCommerce capabilities into explicit agent tools with clear input and output schemas.

For example:

```text
Tool: search_orders

Purpose:
Search merchant orders using supported filters.

Inputs:
- status
- date_from
- date_to
- page
- limit

Output:
Normalized order records
```

This gives the agent a predictable interface and keeps the underlying WooCommerce implementation hidden behind the connector.

---

## 6. Reliability Requirements

Cartix is designed as more than a simple API wrapper.

### Authentication

Cartix uses merchant-provided WooCommerce credentials stored securely through environment configuration. The assessment implementation will use read-only access.

### Input Validation

Tool parameters are validated before requests reach WooCommerce.

### Pagination

Cartix abstracts WooCommerce's page-based API behavior so the agent does not have to manage low-level pagination mechanics.

### Rate-Limit Handling

When the upstream API returns a rate-limit response, Cartix uses controlled retry and backoff behavior rather than repeatedly sending requests.

### Error Handling

Upstream failures are converted into structured, agent-friendly errors instead of exposing raw HTTP/client stack traces.

### Data Normalization

WooCommerce responses are transformed into focused schemas containing information useful to the agent rather than unnecessarily exposing the full raw API response.

---

## 7. Security and Permission Model

For the assessment, Cartix will intentionally be **read-only**.

### Agent Can

```text
✓ Search orders
✓ Retrieve an order
✓ Search products
✓ Retrieve a product
✓ Read inventory
```

### Agent Cannot

```text
✗ Cancel orders
✗ Issue refunds
✗ Modify inventory
✗ Change product prices
✗ Delete products
✗ Modify merchant data
```

This follows a least-privilege approach and limits the blast radius of an AI integration.

---

## 8. Scope of the Assessment Implementation

### In Scope

- WooCommerce REST API integration
- Read-only authentication
- MCP server
- Order search/retrieval tools
- Product search/retrieval tools
- Inventory retrieval
- Request validation
- Pagination handling
- Rate-limit handling
- Retry/backoff logic
- Structured error handling
- Response normalization
- Automated tests
- End-to-end demo with an AI agent
- Setup and run documentation

### Out of Scope

- Order modification
- Refunds or payment operations
- Product creation/deletion
- Inventory updates
- Customer messaging
- Production-scale multi-tenant infrastructure
- Real customer data

---

## 9. Expected Outcome

Cartix should allow an AI agent to interact with WooCommerce through a small, secure, reliable set of tools and answer practical merchant questions using live store data.

The expected experience is:

```text
Natural-language question
        |
        v
     AI Agent
        |
        v
   Selects MCP tool
        |
        v
      Cartix
        |
        v
  WooCommerce data
        |
        v
   Structured result
        |
        v
  Agent reasoning
        |
        v
  Business answer
```

The end result is a system where the merchant can interact with existing commerce data through an AI interface without having to understand or manually operate the underlying WooCommerce API.

---

## 10. One-Line Definition

> **Cartix is a secure, read-only MCP connector that enables AI agents to access and reason over WooCommerce merchant data such as orders, products, and inventory.**
