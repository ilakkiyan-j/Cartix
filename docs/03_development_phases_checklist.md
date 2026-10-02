# Cartix — Development Phases Checklist

## Overview

Cartix is a secure, read-only MCP connector that connects an AI agent to a merchant's WooCommerce account.

This checklist organizes the implementation into eight phases so the core system is working before adding polish.

---

# Phase 1 — Project Foundation

**Goal:** Get the repository and development environment ready.

### Checklist

- [x] Create `cartix` repository
- [x] Initialize TypeScript + Node.js
- [x] Configure `tsconfig.json`
- [x] Configure ESLint / Prettier
- [x] Configure Vitest
- [x] Add `.gitignore`
- [x] Create `.env.example`
- [x] Add required dependencies
- [x] Create initial folder structure
- [x] Add basic README
- [x] Verify `npm run dev` works
- [x] Verify `npm test` works

**Deliverable:** Clean, runnable Cartix skeleton.

---

# Phase 2 — WooCommerce Integration

**Goal:** Establish reliable communication with WooCommerce.

### Checklist

- [x] Create or use a WooCommerce test store
- [x] Add fictional products
- [x] Add fictional orders
- [x] Generate read-only API credentials
- [x] Implement `WooCommerceClient`
- [x] Implement authenticated requests
- [x] Test `/orders`
- [x] Test `/orders/{id}`
- [x] Test `/products`
- [x] Test `/products/{id}`
- [x] Verify inventory / stock fields
- [x] Handle invalid credentials
- [x] Handle resource-not-found responses

**Deliverable:** Cartix can reliably read WooCommerce data.

---

# Phase 3 — Service Layer

**Goal:** Separate business logic from raw API calls.

### Checklist

- [x] Create `OrderService`
- [x] Create `ProductService`
- [x] Create `InventoryService`
- [x] Implement order searching / filtering
- [x] Implement order retrieval
- [x] Implement product search
- [x] Implement product retrieval
- [x] Implement inventory retrieval
- [x] Add response normalization
- [x] Define internal data models

**Deliverable:** Clean application and business layer.

---

# Phase 4 — MCP Connector

**Goal:** Turn Cartix into an actual MCP server.

### Checklist

- [x] Set up MCP server
- [x] Define MCP transport
- [x] Implement `search_orders`
- [x] Implement `get_order`
- [x] Implement `search_products`
- [x] Implement `get_product`
- [x] Implement `get_inventory`
- [x] Write clear tool descriptions
- [x] Add input schemas
- [x] Add output schemas
- [x] Validate tool inputs
- [x] Verify tool discovery from an MCP client

**Deliverable:** Cartix MCP Connector v1.

---

# Phase 5 — Reliability & Production Handling

**Goal:** Make the connector production-oriented.

### Checklist

- [x] Implement pagination
- [x] Implement request timeouts
- [x] Implement 429 handling
- [x] Implement `Retry-After` support where available
- [x] Implement exponential backoff
- [x] Set maximum retry attempts
- [x] Handle 4xx errors
- [x] Handle 5xx errors
- [x] Create structured error types
- [x] Add safe logging
- [x] Add request IDs
- [x] Ensure credentials never appear in logs

**Deliverable:** Robust Cartix connector.

---

# Phase 6 — Agent Studio & Client Verification

**Goal:** Prove that AI agents (Agent Studio, Claude Desktop) seamlessly connect and query Cartix.

### Checklist

- [x] Build MCP client
- [x] Connect agent to Cartix
- [x] Connect LLM
- [x] Discover Cartix tools automatically
- [x] Test natural-language tool selection
- [x] Test order questions
- [x] Test product questions
- [x] Test inventory questions
- [x] Verify agent can reason over returned data
- [x] Add sample prompts

## Demo Questions

- [x] "Show me all pending orders."
- [x] "Which orders have been pending for more than 24 hours?"
- [x] "Which products are out of stock?"
- [x] "Tell me about order #1004."
- [x] "Find products containing keyboard."

**Deliverable:** End-to-end User → Agent → Cartix → WooCommerce → Agent demo.

---

# Phase 7 — Testing

**Goal:** Prove the connector works beyond the happy path.

## Unit Tests

- [x] Tool validation
- [x] Order service
- [x] Product service
- [x] Inventory service
- [x] Response normalization
- [x] Pagination
- [x] Retry logic
- [x] Error mapping

## Integration Tests

- [x] MCP server startup
- [x] Tool discovery
- [x] Tool execution
- [x] WooCommerce API integration

## Failure Tests

- [x] Invalid credentials
- [x] Invalid tool input
- [x] Non-existent order
- [x] Empty search result
- [x] 429 response
- [x] 500 response
- [x] Timeout
- [x] Large dataset / multiple pages

**Deliverable:** Tested connector with evidence.

---

# Phase 8 — Assessment Packaging

**Goal:** Turn the engineering project into a strong submission.

### Checklist

- [x] Finalize `README.md`
- [x] Finalize `architecture.md`
- [x] Create `mcp-tools.md`
- [x] Create `authentication.md`
- [x] Create `limitations.md`
- [x] Add setup instructions
- [x] Add run instructions
- [x] Add testing instructions
- [x] Add architecture diagram
- [x] Add example tool calls
- [x] Add agent demo instructions & prompts
- [x] Add security assumptions
- [x] Add known limitations
- [x] Add long-term production fix
- [x] Remove all real credentials
- [x] Check `.env` is gitignored
- [x] Clone / build from clean state
- [x] Run complete setup from scratch
- [x] Run complete demo from scratch
- [x] Final repository packaging

---

# Final Definition of Done

Cartix is ready when this complete flow works:

```text
User
  │
  │ "Which orders are delayed?"
  ▼
AI Agent
  │
  │ search_orders()
  ▼
Cartix MCP Server
  │
  ├── Validate
  ├── Authenticate
  ├── Rate-limit
  ├── Retry
  ├── Paginate
  └── Normalize
  │
  ▼
WooCommerce
  │
  ▼
Cartix
  │
  ▼
AI Agent
  │
  ▼
Useful merchant answer
```

# Priority Rules for the 48-Hour Assessment

## P0 — Must Work

- [ ] WooCommerce API connection
- [ ] MCP server
- [ ] Core MCP tools
- [ ] AI agent connection
- [ ] End-to-end agent demo

## P1 — Must Be Robust

- [ ] Authentication
- [ ] Input validation
- [ ] Pagination
- [ ] Error handling
- [ ] Rate-limit handling
- [ ] Retry / backoff

## P2 — Must Be Present

- [ ] Unit tests
- [ ] Integration tests
- [ ] Documentation
- [ ] Architecture
- [ ] Limitations
- [ ] Security notes

## P3 — Nice to Have

- [ ] Docker
- [ ] Polished demo UI
- [ ] Advanced agent workflows
- [ ] Additional tooling / observability

> **Rule:** Do not move to P2 or P3 until P0 is completely working.

The goal is a focused, reliable connector rather than a large application with unfinished core functionality.
