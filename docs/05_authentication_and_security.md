# Cartix — Authentication & Security

## 1. Purpose

This document defines how Cartix authenticates with a merchant's WooCommerce store and the security boundaries between:

```text
Merchant
   ↓
AI Agent
   ↓
Cartix MCP Server
   ↓
WooCommerce
```

The goal is to provide the AI agent with controlled access to merchant data without exposing merchant credentials or unnecessary capabilities to the model.

---

# 2. Authentication Overview

Cartix uses **WooCommerce REST API credentials** to authenticate requests to the merchant's WooCommerce store.

WooCommerce supports generated REST API keys associated with a WordPress user. A key can be configured with `Read`, `Write`, or `Read/Write` permissions. For the Cartix assessment implementation, the connector should use **Read access only**. citeturn273073search0turn273073search1

The credential boundary is:

```text
                     AI Agent
                        │
                        │ Tool arguments only
                        ▼
                 ┌──────────────┐
                 │    Cartix    │
                 │  MCP Server  │
                 └──────┬───────┘
                        │
                        │ Credentials remain here
                        ▼
                WooCommerce API
```

The AI agent never receives the WooCommerce consumer key or consumer secret.

---

# 3. WooCommerce API Authentication

For HTTPS connections, WooCommerce documents HTTP Basic Authentication using:

```text
username = Consumer Key
password = Consumer Secret
```

Example:

```text
GET https://example.com/wp-json/wc/v3/orders
Authorization: Basic <credentials>
```

WooCommerce recommends HTTPS wherever possible. citeturn273073search0turn273073search1

Cartix should therefore assume:

```text
HTTPS
+
WooCommerce REST API credentials
+
Read-only permissions
```

WooCommerce's current REST API version is `v3`, using endpoints under `/wp-json/wc/v3/`. citeturn273073search5

---

# 4. Credential Setup

A merchant/developer creates API credentials in WooCommerce:

```text
WooCommerce
    ↓
Settings
    ↓
Advanced
    ↓
REST API
    ↓
Add Key
```

The API key is associated with a WordPress user and inherits that user's relevant capabilities. WooCommerce allows the key to be assigned `Read`, `Write`, or `Read/Write` permissions. citeturn273073search0

For Cartix:

```text
Permission: Read
```

This ensures the connector cannot perform write operations through the configured API key.

---

# 5. Environment Configuration

Credentials are supplied through environment variables.

Example:

```env
WOOCOMMERCE_URL=https://merchant.example.com
WOOCOMMERCE_CONSUMER_KEY=ck_xxxxxxxxxxxxxxxxx
WOOCOMMERCE_CONSUMER_SECRET=cs_xxxxxxxxxxxxxxxxx
```

Use `.env.example` for documentation:

```env
WOOCOMMERCE_URL=
WOOCOMMERCE_CONSUMER_KEY=
WOOCOMMERCE_CONSUMER_SECRET=
```

The real `.env` file must never be committed.

---

# 6. Secret Management Rules

Cartix must follow these rules for credentials:

### Never commit

```text
.env
consumer key
consumer secret
API tokens
private certificates
production credentials
```

### Never expose to the agent

Tool inputs must contain business parameters only:

```json
{
  "order_id": 10482
}
```

and never:

```json
{
  "consumer_key": "...",
  "consumer_secret": "..."
}
```

### Never log

Do not log:

```text
Authorization headers
Consumer Secret
Consumer Key
Full credential objects
```

Safe example:

```text
INFO tool=search_orders request_id=req_123 status=success
```

Unsafe example:

```text
INFO consumer_secret=cs_xxxxxxxxx
```

---

# 7. Authentication Boundary

The authentication flow is intentionally isolated inside the WooCommerce client.

```text
MCP Tool
   ↓
Service
   ↓
WooCommerce Client
   ↓
Load credentials from secure configuration
   ↓
Authenticated HTTPS request
   ↓
WooCommerce
```

The MCP tool does not construct or expose authentication credentials.

This separation reduces the chance of accidentally passing secrets into an LLM context.

---

# 8. Least-Privilege Model

Cartix follows the principle of **least privilege**.

The connector only requires permissions needed for the assessment.

### Cartix can

```text
✓ Read orders
✓ Search orders
✓ Read products
✓ Search products
✓ Read inventory
```

### Cartix cannot

```text
✗ Create orders
✗ Update orders
✗ Cancel orders
✗ Refund orders
✗ Delete products
✗ Change product prices
✗ Modify inventory
```

The MCP server should also avoid exposing tools for unsupported write operations.

---

# 9. Agent Security Boundary

The LLM is treated as an untrusted decision-making layer.

The LLM may decide:

```text
"I need order information."
        ↓
get_order(order_id=10482)
```

But the LLM cannot decide:

```text
"Give me the consumer secret."
```

because credentials are not part of the tool interface.

The model only receives:

```text
Tool names
Tool descriptions
Tool input schemas
Tool results
```

It does not receive the underlying authentication configuration.

---

# 10. Input Validation

Every MCP tool must validate its input before making a WooCommerce request.

Examples:

```text
order_id → positive integer
product_id → positive integer
page → integer >= 1
limit → bounded integer
query → non-empty string when required
date_from → valid ISO 8601 datetime
date_to → valid ISO 8601 datetime
```

Invalid input should stop before an upstream request is made.

Example:

```json
{
  "error": "INVALID_INPUT",
  "message": "limit must be between 1 and 100"
}
```

This prevents malformed or unexpectedly expensive requests.

---

# 11. Output Filtering

Cartix should return only information required for the agent's task.

WooCommerce can expose a large amount of resource information. Cartix should normalize and minimize responses.

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

The connector should not return unnecessary internal or sensitive fields merely because they are present in the raw API response.

---

# 12. Customer Data Minimization

Cartix should follow a minimum-data principle for customer information.

When a supported workflow does not require customer information, it should not be included in the normalized result.

For workflows that do require customer information, only the minimum necessary fields should be returned.

Potentially sensitive information should never be exposed simply because it is available from the upstream API.

---

# 13. Transport Security

Cartix should communicate with WooCommerce over HTTPS.

```text
Cartix
   │
   │ TLS / HTTPS
   ▼
WooCommerce
```

WooCommerce documents HTTPS as the recommended transport where possible. citeturn273073search1

The deployment should also expose the Cartix MCP endpoint over HTTPS when accessed remotely by an MCP client.

---

# 14. MCP Server Security

The Cartix MCP server itself should be treated as a protected application.

For an assessment deployment:

```text
Internet
   ↓
HTTPS
   ↓
Cartix MCP Server
   ↓
WooCommerce
```

For a production implementation, the MCP endpoint should additionally use an appropriate server-side authentication mechanism for authorized Agent Studio clients.

The merchant's WooCommerce credentials must remain server-side.

---

# 15. Credential Rotation

Credentials may need to be rotated or revoked.

Cartix should therefore avoid hard-coding credentials into source code.

Recommended process:

```text
Generate new key
      ↓
Update secret configuration
      ↓
Deploy
      ↓
Verify connectivity
      ↓
Revoke old key
```

WooCommerce provides API-key management and revocation through its REST API key administration flow. citeturn273073search0

---

# 16. Error Handling

Authentication failures should be converted into structured errors.

### Invalid credentials

```json
{
  "error": "AUTHENTICATION_FAILED",
  "message": "Unable to authenticate with the merchant store"
}
```

### Insufficient permission

```json
{
  "error": "PERMISSION_DENIED",
  "message": "The configured WooCommerce credentials do not have the required permission"
}
```

Do not return the raw authorization header, secret, or other sensitive diagnostic information.

---

# 17. Rate Limiting and Abuse Prevention

Authentication alone is not enough to protect an integration.

Cartix should also:

- Bound `limit` values.
- Restrict excessive pagination.
- Apply request-level timeouts.
- Handle upstream `429` responses.
- Use controlled retries.
- Avoid infinite retry loops.

Example:

```text
Agent
  ↓
Cartix
  ↓
Request limits
  ↓
Rate-limit guard
  ↓
WooCommerce
```

This protects both Cartix and the merchant's upstream API.

---

# 18. Logging and Observability

Logs should help diagnose integration issues without exposing secrets.

### Safe

```text
INFO tool=get_order
INFO request_id=req_123
INFO upstream_status=200
INFO duration_ms=312
```

### Unsafe

```text
INFO Authorization=Basic xxxxxxxxx
INFO consumer_secret=cs_xxxxx
```

Recommended fields:

```text
request_id
tool_name
operation
upstream_status
duration_ms
retry_count
error_code
```

Customer data should also be avoided in logs unless specifically required for troubleshooting.

---

# 19. Threat Model

Cartix considers several major security risks.

## Risk: Credential leakage

**Threat:** API credentials appear in source code, logs, prompts, or tool responses.

**Mitigation:**

```text
Environment / secret management
+
Server-side authentication handling
+
Credential redaction
+
No credential fields in MCP schemas
```

---

## Risk: Excessive agent permissions

**Threat:** The agent can modify merchant data unexpectedly.

**Mitigation:**

```text
Read-only WooCommerce API key
+
Read-only MCP tool surface
```

---

## Risk: Malformed agent input

**Threat:** The model generates invalid or excessively large requests.

**Mitigation:**

```text
Zod/tool schemas
+
bounded pagination
+
input validation
```

---

## Risk: Upstream API abuse

**Threat:** Repeated agent calls overload the merchant API.

**Mitigation:**

```text
Rate limiting
+
maximum retry attempts
+
exponential backoff
+
pagination limits
```

---

## Risk: Sensitive data exposure

**Threat:** Raw WooCommerce responses expose more customer/store data than required.

**Mitigation:**

```text
Response normalization
+
field allowlists
+
minimum-data principle
```

---

## 20. Assessment Scope vs Production Scope

### Assessment implementation

```text
Single WooCommerce merchant
        ↓
Read-only credentials
        ↓
Read-only MCP tools
        ↓
Controlled test data
```

This keeps the implementation focused.

### Production evolution

A production-grade deployment could add:

```text
Merchant onboarding
        ↓
OAuth / application authorization flow where appropriate
        ↓
Encrypted credential storage
        ↓
Per-merchant credential isolation
        ↓
MCP client authentication
        ↓
Audit logging
        ↓
Tenant isolation
        ↓
Secret rotation
        ↓
Fine-grained permissions
```

WooCommerce also documents an application authentication endpoint that can be used by applications to let users authorize and generate API keys, with a callback mechanism. This can be considered for a future onboarding flow rather than being required for the initial assessment implementation. citeturn273073search0

---

# 21. Security Checklist

Before submission:

- [ ] No real customer data committed
- [ ] No credentials committed
- [ ] `.env` is in `.gitignore`
- [ ] `.env.example` contains placeholders only
- [ ] WooCommerce key has read-only permissions
- [ ] Credentials are never sent to the LLM
- [ ] Credentials are never included in tool schemas
- [ ] Credentials are never logged
- [ ] MCP tools expose read-only operations only
- [ ] Tool inputs are validated
- [ ] Pagination is bounded
- [ ] Request timeouts are enabled
- [ ] 429 responses are handled
- [ ] Retry count is bounded
- [ ] Upstream errors are normalized
- [ ] Sensitive response fields are minimized
- [ ] Remote MCP deployment uses HTTPS
- [ ] Repository is checked for accidental secrets before submission

---

# 22. Final Security Architecture

```text
                      ┌──────────────────┐
                      │     AI Agent     │
                      │                  │
                      │ No credentials   │
                      └────────┬─────────┘
                               │
                               │ MCP
                               ▼
                    ┌──────────────────────┐
                    │       Cartix         │
                    │                      │
                    │ Tool validation      │
                    │ Permission boundary  │
                    │ Response filtering   │
                    │ Rate limiting        │
                    │ Retry / timeout      │
                    │ Safe logging         │
                    └─────────┬────────────┘
                              │
                              │ Secure HTTPS
                              │
                              │ Credentials
                              ▼
                    ┌──────────────────────┐
                    │    WooCommerce       │
                    │                      │
                    │ Read-only API key    │
                    └──────────────────────┘
```

---

# 23. Security Summary

Cartix follows a simple security model:

> **The AI agent decides what information it needs; Cartix decides what the agent is allowed to access; WooCommerce remains the source of truth.**

The agent receives only controlled MCP tools and normalized data.

The WooCommerce credentials remain inside Cartix.

The assessment implementation uses read-only access and does not expose write capabilities.

This creates a clear security boundary between agent reasoning and merchant system access.
