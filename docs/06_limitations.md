# Cartix — Limitations & Long-Term Fixes

## 1. Purpose

This document describes the current limitations of Cartix, the assumptions made for the assessment implementation, and how the system could evolve into a production-grade merchant integration platform.

Cartix is intentionally scoped for the Razorpay Forward-Deployed Engineer, Agent Studio assessment.

The goal is to demonstrate a reliable MCP connector for WooCommerce without over-engineering the solution.

---

# 2. Current Scope

The assessment version of Cartix supports:

```text
WooCommerce
   ↓
Read-only merchant data
   ↓
MCP tools
   ↓
AI agent
```

The initial tool surface is:

```text
search_orders
get_order
search_products
get_product
get_inventory
```

Cartix does not perform merchant-side write operations.

---

# 3. Limitation: WooCommerce Only

## Current limitation

Cartix is initially designed for one merchant platform:

```text
WooCommerce
```

It cannot directly connect to:

```text
Freshdesk
Zoho Inventory
Unicommerce
Other ecommerce / ERP systems
```

## Impact

A merchant using another platform would need a separate integration.

## Long-term fix

Introduce a provider abstraction:

```text
                  Cartix MCP Interface
                          │
          ┌───────────────┼────────────────┐
          ▼               ▼                ▼
    WooCommerce     Zoho Inventory    Unicommerce
      Adapter          Adapter           Adapter
```

The MCP tool contract should remain stable while provider-specific implementations live behind adapters.

---

# 4. Limitation: Read-Only Capabilities

## Current limitation

Cartix exposes only read operations.

Supported:

```text
✓ Search orders
✓ Get order
✓ Search products
✓ Get product
✓ Read inventory
```

Not supported:

```text
✗ Create order
✗ Update order
✗ Cancel order
✗ Refund order
✗ Change price
✗ Modify inventory
```

## Why this is intentional

The assessment asks for an agent that can read merchant information.

Read-only access also minimizes the risk of an AI agent making unintended changes.

## Long-term fix

Write capabilities could be introduced behind explicit permission and confirmation controls.

Example:

```text
Agent requests action
        ↓
Permission check
        ↓
Risk classification
        ↓
Merchant confirmation
        ↓
Write operation
        ↓
Audit log
```

High-impact actions such as refunds or order cancellation should require stronger controls than simple reads.

---

# 5. Limitation: Single-Merchant Configuration

## Current limitation

The assessment implementation can be configured around a single WooCommerce merchant environment.

Credentials are supplied through environment variables:

```env
WOOCOMMERCE_URL=
WOOCOMMERCE_CONSUMER_KEY=
WOOCOMMERCE_CONSUMER_SECRET=
```

## Impact

The implementation does not yet provide a full merchant onboarding and multi-tenant credential management system.

## Long-term fix

Introduce tenant-aware credential storage:

```text
Merchant A
   ↓
Encrypted credentials

Merchant B
   ↓
Encrypted credentials

Merchant C
   ↓
Encrypted credentials
```

The production architecture would need:

- Tenant isolation
- Encrypted secret storage
- Per-merchant access controls
- Credential rotation
- Audit trails
- Merchant lifecycle management

---

# 6. Limitation: API-Key Based Assessment Authentication

## Current limitation

The assessment implementation uses WooCommerce REST API credentials configured on the server.

This is deliberately simple and appropriate for a controlled demonstration.

## Impact

It requires the credentials to be provisioned before the connector starts.

There is no complete self-service merchant authorization flow.

## Long-term fix

Build a secure merchant onboarding flow where a merchant explicitly authorizes the integration.

Conceptually:

```text
Merchant
   ↓
Connect WooCommerce
   ↓
Authorization
   ↓
Credential provisioning
   ↓
Encrypted storage
   ↓
Cartix
```

The exact production authentication mechanism should follow the platform's supported authorization model and the deployment environment.

---

# 7. Limitation: No Full Agent Studio Runtime

## Current limitation

Cartix is an MCP connector. The assessment demonstration may use a separate MCP client and LLM-based demo agent to prove the connector works.

Cartix itself is not intended to replace the complete Agent Studio runtime.

## Impact

Agent orchestration, model selection, prompting, memory, and higher-level reasoning remain outside Cartix.

## Long-term fix

Deploy Cartix as a native integration/service consumed by the target agent platform.

The boundary remains:

```text
Agent platform
      ↓
MCP
      ↓
Cartix
      ↓
Merchant system
```

This keeps merchant integrations independent from agent reasoning.

---

# 8. Limitation: Provider-Specific Data Models

## Current limitation

WooCommerce has its own resource models, statuses, identifiers, timestamps, and response structures.

A normalized Cartix model simplifies these responses, but some provider-specific information may not be represented.

## Example

Raw provider response:

```text
Many provider-specific fields
          ↓
Cartix normalized model
          ↓
Only fields required by the agent
```

## Impact

An agent may not have access to every field exposed by WooCommerce.

## Long-term fix

Introduce:

```text
Core common schema
+
provider-specific extension fields
```

For example:

```json
{
  "order_id": 10482,
  "status": "pending",
  "created_at": "...",
  "total": 2499,
  "provider": {
    "name": "woocommerce",
    "metadata": {}
  }
}
```

This allows common agent behavior without completely hiding provider-specific capabilities.

---

# 9. Limitation: Search Semantics

## Current limitation

Cartix's search tools depend on the filtering and search capabilities supported by the underlying WooCommerce API.

Some natural-language questions may require the agent to retrieve a set of records and reason over them.

Example:

> "Which pending orders have been waiting for more than 24 hours?"

Cartix may retrieve pending orders and provide timestamps.

The agent then performs the time-based reasoning.

## Long-term fix

Add optimized server-side query primitives for common merchant workflows, while keeping the reasoning layer separate.

Potential future tools:

```text
find_overdue_orders
find_low_stock_products
get_sales_summary
```

These should be added only when there is a clear merchant use case.

---

# 10. Limitation: Inventory Semantics

## Current limitation

Inventory data can vary depending on how a WooCommerce store manages stock, variations, plugins, and external fulfillment systems.

Cartix's initial inventory implementation focuses on the data available through the configured WooCommerce API.

## Impact

Cartix may not represent:

- External warehouse inventory
- Third-party fulfillment inventory
- Complex multi-location inventory
- Plugin-specific stock logic

## Long-term fix

Add provider-aware inventory adapters and explicit warehouse/location concepts.

Example:

```text
Product
 ├── Warehouse A
 ├── Warehouse B
 └── Warehouse C
```

---

# 11. Limitation: Rate-Limit Knowledge Is Provider-Specific

## Current limitation

Cartix implements generic protection such as:

```text
429 detection
retry
backoff
bounded attempts
```

However, exact upstream limits and behaviors can vary by hosting environment, WooCommerce deployment, plugins, proxies, or platform configuration.

## Impact

A generic retry strategy may not be optimal for every merchant environment.

## Long-term fix

Make rate-limit policies provider-aware:

```text
Provider adapter
      ↓
Rate-limit policy
      ↓
Retry / backoff strategy
```

Metrics should also be collected to tune the policy based on actual production behavior.

---

# 12. Limitation: Limited Caching

## Current limitation

The assessment version does not require a distributed caching layer.

Repeated agent queries may therefore result in repeated upstream requests.

## Impact

Frequent repeated requests can:

- Increase latency
- Consume API quota
- Increase upstream load

## Long-term fix

Introduce carefully scoped caching for data that is safe to cache.

Example:

```text
AI Agent
   ↓
Cartix
   ↓
Cache hit?
 ┌──────┴───────┐
Yes            No
 │               │
 ▼               ▼
Return       WooCommerce
cached       ↓
data         Cache result
```

Cache TTL should depend on the data type.

Inventory and order information may require much shorter TTLs than static product metadata.

---

# 13. Limitation: No Distributed Rate Limiter

## Current limitation

A simple local rate limiter is sufficient for an assessment deployment.

It is not enough when Cartix runs as multiple application instances.

## Long-term fix

Use a shared rate-limiting mechanism:

```text
          Load Balancer
               │
       ┌───────┼────────┐
       ▼       ▼        ▼
    Cartix   Cartix   Cartix
       └───────┼────────┘
               │
         Shared limiter
```

Redis or another distributed coordination system could be introduced depending on deployment requirements.

---

# 14. Limitation: Basic Observability

## Current limitation

The assessment version can provide structured application logs and request IDs, but it does not require a complete production observability stack.

## Long-term fix

Add:

```text
Metrics
Tracing
Centralized logs
Alerts
Dashboards
```

Useful metrics include:

```text
tool_calls_total
tool_call_latency
upstream_latency
upstream_errors
rate_limit_events
retry_count
authentication_failures
```

Distributed tracing would help identify whether latency originates in:

```text
Agent
 ↓
Cartix
 ↓
WooCommerce
```

---

# 15. Limitation: No Full Audit Trail

## Current limitation

Because the assessment version is read-only, a full business-action audit trail is not required.

## Long-term fix

A production integration should record important events such as:

```text
Who initiated the request
Which merchant was accessed
Which tool was called
Which resource was accessed
When it happened
Whether it succeeded
```

Write operations would require even stronger auditability.

---

# 16. Limitation: Customer Data Exposure

## Current limitation

WooCommerce can contain customer and order information.

Cartix intentionally normalizes responses to expose only the fields needed for supported workflows.

However, a production implementation would need a formal data classification and privacy policy.

## Long-term fix

Implement field-level controls:

```text
Tool
 ↓
Data policy
 ↓
Allowed fields
 ↓
Normalized response
 ↓
Agent
```

Possible controls:

- Field allowlists
- Redaction policies
- Role-based access
- Tenant-level policies
- Data retention controls
- Audit logging

---

# 17. Limitation: Natural-Language Ambiguity

## Current limitation

Users may ask ambiguous questions.

Example:

> "Show me recent orders."

"Recent" could mean:

```text
Last hour
Last day
Last week
```

The agent needs to either infer the intent from available context or ask the user a clarifying question.

## Long-term fix

Define explicit tool semantics and agent policies for ambiguous requests.

For high-impact or expensive queries:

```text
Ambiguous request
      ↓
Agent detects ambiguity
      ↓
Ask clarification
      ↓
Execute
```

The connector itself should remain deterministic.

---

# 18. Limitation: No Autonomous Write Actions

## Current limitation

Cartix does not let the AI modify the merchant store.

This limits the actions the agent can perform.

## Long-term fix

Introduce graduated autonomy.

### Level 1

Read-only information.

### Level 2

Low-risk draft actions requiring approval.

### Level 3

Explicitly approved write actions.

### Level 4

Policy-controlled automation for low-risk actions.

Every level should have appropriate authorization, auditability, and rollback/compensation strategies where possible.

---

# 19. Limitation: No Offline Fallback

## Current limitation

If WooCommerce is unavailable, Cartix cannot retrieve fresh merchant data.

## Long-term fix

For appropriate use cases, introduce cached or replicated read models.

```text
WooCommerce
    ↓
Sync / Event pipeline
    ↓
Merchant read model
    ↓
Cartix
```

The agent could then distinguish between:

```text
Fresh data
Cached data
Stale data
```

and communicate freshness explicitly.

---

# 20. Assessment Assumptions

The assessment implementation assumes:

- The WooCommerce environment is available.
- API credentials are valid and have required read permissions.
- The test store uses standard WooCommerce API behavior.
- Merchant data is fictional/test data.
- The deployment has network access to WooCommerce.
- The demo agent has access to an LLM.
- The connector is primarily demonstrating read workflows.
- The store is not being treated as a high-scale production deployment.

These assumptions should be stated in the repository README.

---

# 21. Long-Term Production Architecture

A future production version could evolve into:

```text
                        Agent Platform
                              │
                              │ MCP
                              ▼
                     ┌──────────────────┐
                     │      Cartix      │
                     │   Gateway/API    │
                     └────────┬─────────┘
                              │
                ┌─────────────┼─────────────┐
                ▼             ▼             ▼
          Woo Adapter    Zoho Adapter   Unicommerce
                │             │             │
                ▼             ▼             ▼
           Merchant A    Merchant B    Merchant C
```

Cross-cutting services:

```text
Authentication
Secret Management
Tenant Isolation
Authorization
Rate Limiting
Caching
Observability
Audit Logging
Policy Enforcement
```

---

# 22. What We Intentionally Do Not Build

To keep the assessment focused, Cartix does not initially include:

```text
✗ Custom ecommerce frontend
✗ Merchant dashboard
✗ Payment processing
✗ Refund management
✗ Order modification
✗ Full CRM
✗ Custom database for all WooCommerce data
✗ Multi-provider support
✗ Complex workflow engine
✗ Autonomous merchant actions
```

These are potential future product capabilities, not requirements for the assessment.

---

# 23. Limitation → Long-Term Fix Summary

| Current Limitation | Long-Term Direction |
|---|---|
| WooCommerce only | Provider adapter architecture |
| Read-only | Permissioned write actions |
| Single merchant | Multi-tenant architecture |
| Server-configured credentials | Merchant onboarding / authorization |
| Basic search | Merchant-specific query primitives |
| Basic inventory view | Warehouse-aware inventory model |
| Local rate limiting | Distributed rate limiting |
| Limited caching | Controlled distributed cache |
| Basic logs | Metrics + tracing + centralized observability |
| No full audit trail | Audit/event logging |
| Simple data filtering | Field-level data policies |
| Online-only reads | Cached/replicated read models |
| Demo agent | Native agent-platform integration |

---

# 24. Final Positioning

The assessment version of Cartix should be intentionally small:

```text
WooCommerce
    ↓
Secure API integration
    ↓
Reliable connector
    ↓
MCP tools
    ↓
AI agent
```

The purpose is not to build a complete commerce platform.

The purpose is to demonstrate that we can take an existing merchant system and make its data:

- Accessible to an agent
- Structured for agent consumption
- Securely exposed
- Reliably retrieved
- Properly bounded
- Useful for real merchant workflows

The production roadmap then extends the same foundation toward:

```text
Multi-merchant
+
Multi-provider
+
Fine-grained permissions
+
Stronger security
+
Better observability
+
Scalable infrastructure
+
Controlled write actions
```

---

# 25. Final Assessment Note

For the assessment, limitations should be presented as conscious engineering trade-offs rather than unfinished features.

A good limitation statement should answer:

```text
What is limited?
        ↓
Why is it limited?
        ↓
What is the impact?
        ↓
What would the production fix be?
```

This demonstrates that the scope was intentionally controlled while still showing awareness of how Cartix would evolve in a real merchant environment.
