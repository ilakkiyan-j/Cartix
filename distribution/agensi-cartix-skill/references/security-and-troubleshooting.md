# Cartix Security Boundaries & Troubleshooting Guide

This document details the security architecture, customer data minimization guarantees, credential redaction mechanisms, and troubleshooting procedures for the **Cartix WooCommerce Agent Connector**.

---

## 1. Security Architecture & Boundaries

Cartix operates under a strict principle of least privilege, acting as an air-gapped security boundary between autonomous AI agents and WooCommerce databases.

### 🛡️ What the Agent CAN Do (Read-Only)
- Query order lists filtered by status and ISO 8601 date ranges.
- Retrieve individual order summaries with item counts and line items.
- Search catalog products by keywords, categories, or SKUs.
- Inspect pricing, sale statuses, and stock counts.
- Identify store inventory deficits and low-stock items.

### 🚫 What the Agent CANNOT Do
- **Zero Mutation**: Cartix contains **no write, update, create, or delete tools**.
- **No Order Changes**: Cannot cancel, complete, edit, or refund orders.
- **No Inventory Edits**: Cannot alter stock quantities, backorder statuses, or warehouse counts.
- **No Catalog Modifications**: Cannot change prices, product names, or descriptions.
- **No Direct Database Access**: Cannot execute raw SQL or bypass WooCommerce REST API validation.

---

## 2. Customer Privacy & Data Minimization

To eliminate risks of PII (Personally Identifiable Information) leakage into LLM training sets or conversational contexts, Cartix normalizes and filters all upstream WooCommerce payloads before returning results:

| Upstream WooCommerce Field | Included in Cartix Output? | Rationale |
|---|---|---|
| `billing.first_name`, `billing.last_name` | ❌ **STRIPPED** | Prevents exposing customer names to LLM context |
| `billing.email`, `billing.phone` | ❌ **STRIPPED** | Eliminates privacy and contact information risk |
| `billing.address_1`, `shipping.address_1` | ❌ **STRIPPED** | Protects customer physical location and address |
| `customer_ip_address`, `customer_user_agent`| ❌ **STRIPPED** | Prevents device tracking and IP exposure |
| `order_id`, `status`, `created_at` | ✅ **INCLUDED** | Essential for order lifecycle reasoning |
| `line_items` (name, sku, quantity, price) | ✅ **INCLUDED** | Necessary for fulfillment and stock reasoning |
| `total`, `currency` | ✅ **INCLUDED** | Necessary for financial transaction reporting |
| `customer_note` | ✅ **PRESERVED** | Preserved only when merchant delivery notes exist |

> [!NOTE]
> When users ask questions like *"Who bought order #1042?"* or *"What is the customer's shipping address?"*, the AI agent will not receive this data from Cartix. The agent must explain that Cartix intentionally minimizes customer personal data to safeguard customer privacy.

---

## 3. Secret Scrubbing & Transport Security

1. **Credential Scrubbing**:
   All internal loggers and error sanitizers automatically scrub credentials matching sensitive regex patterns (`ck_[a-zA-Z0-9_-]+`, `cs_[a-zA-Z0-9_-]+`, `Basic ...`, `Bearer ...`) before outputting to stdout/stderr.
2. **HTTPS Enforcement**:
   Remote connections to WooCommerce stores require HTTPS (`https://`). Cartix rejects unencrypted HTTP URLs in production mode.
3. **Local Credentials Only**:
   WooCommerce Consumer Keys and Secrets are read exclusively from local environment variables on the user's host machine. They are never transmitted to Agensi, never logged, and never returned in MCP tool call outputs.

---

## 4. Structured Error Handling

When an operation fails, Cartix catches the exception and returns a structured JSON payload with `isError: true` within the MCP protocol envelope:

```json
{
  "isError": true,
  "content": [
    {
      "type": "text",
      "text": "{\n  \"error\": \"AUTHENTICATION_FAILED\",\n  \"message\": \"WooCommerce authentication failed. Check your Consumer Key and Consumer Secret.\"\n}"
    }
  ]
}
```

### Error Code Reference

| Error Code | HTTP Equivalent | Retryable? | Meaning & Corrective Action |
|---|---|---|---|
| `INVALID_INPUT` | 400 | No | The agent provided an invalid argument (e.g. non-ISO date string, negative ID). Fix argument format and retry. |
| `AUTHENTICATION_FAILED` | 401 | No | Consumer Key or Consumer Secret is invalid or expired. Check WordPress REST API key settings. |
| `PERMISSION_DENIED` | 403 | No | The API key lacks read permissions, or the user role is not authorized. Regenerate key with Read permissions. |
| `NOT_FOUND` | 404 | No | Requested order ID or product ID does not exist, or WordPress permalinks are set to Plain. |
| `RATE_LIMITED` | 429 | **Yes** | Upstream store rate limit reached. Cartix automatically backs off and retries using the `Retry-After` header. |
| `UPSTREAM_UNAVAILABLE` | 500 / 502 / 503 | **Yes** | WooCommerce server error or host unreachable. Cartix retries up to 3 times with exponential jitter. |
| `UPSTREAM_TIMEOUT` | 504 | **Yes** | Request exceeded `REQUEST_TIMEOUT_MS` (default 10s). WooCommerce database may be under heavy load. |
| `INTERNAL_ERROR` | 500 | No | Internal connector failure. Inspect local logs for details. |

---

## 5. Troubleshooting Matrix

### Issue 1: "401 Unauthorized" or `AUTHENTICATION_FAILED`
- **Cause**: WooCommerce Consumer Key or Consumer Secret is incorrect, or Basic Auth headers are blocked by server security.
- **Solution**:
  1. Confirm `WOOCOMMERCE_CONSUMER_KEY` and `WOOCOMMERCE_CONSUMER_SECRET` in `.env` match your WordPress API key.
  2. If using Apache, verify `Authorization` headers are passed through by adding to `.htaccess`:
     ```apache
     SetEnvIf Authorization "(.*)" HTTP_AUTHORIZATION=$1
     ```

### Issue 2: "404 Not Found" when querying any endpoint
- **Cause**: WordPress Permalinks are set to "Plain", which disables the REST API router (`/wp-json/wc/v3/...`).
- **Solution**:
  1. In WordPress Admin, go to **Settings → Permalinks**.
  2. Change from **Plain** to **Post name**.
  3. Click **Save Changes**.

### Issue 3: Claude Desktop or Cursor says "Server failed to start"
- **Cause**: The path in `mcp-config.json` is incorrect, or Node.js is not found in the client's execution PATH.
- **Solution**:
  1. Verify the absolute path to `dist/src/index.js` exists. Did you run `npm run build`?
  2. Provide the absolute path to `node` if your MCP client does not inherit your shell PATH (e.g. `C:\\Program Files\\nodejs\\node.exe` or `/usr/local/bin/node`).

### Issue 4: "Rate Limit Exceeded" / Repeated 429 Responses
- **Cause**: The WooCommerce host or cloud firewall (Cloudflare, Wordfence) is throttling requests.
- **Solution**:
  Cartix automatically retries 429 errors using exponential backoff. You can also adjust rate limiting in `.env`:
  ```env
  MAX_RETRIES=5
  RETRY_BASE_DELAY_MS=1000
  ```
