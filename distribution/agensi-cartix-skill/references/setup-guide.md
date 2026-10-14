# Cartix Setup & Local Configuration Guide

This guide walks you through installing, building, and configuring the **Cartix WooCommerce Agent Connector** locally, and connecting it to your AI agent client (Claude Desktop, Cursor, Agent Studio) via standard Model Context Protocol (MCP) `stdio` transport.

---

## 1. Prerequisites

Before installing Cartix, verify that your environment meets these requirements:

| Prerequisite | Minimum Version | Check Command | Notes |
|---|---|---|---|
| **Node.js** | `>= 20.0.0` (LTS recommended) | `node -v` | Cartix utilizes modern ES modules and Node.js v20+ runtime APIs |
| **npm** | `>= 10.0.0` | `npm -v` | Installed automatically with Node.js |
| **Git** | Any modern version | `git --version` | Required to clone the repository |
| **WooCommerce** | `v3.5+` with REST API v3 | N/A | Running on WordPress 5.0+ |

---

## 2. Generating WooCommerce REST API Credentials

Cartix requires read-only access to your WooCommerce store's REST API.

> [!IMPORTANT]
> Always generate credentials with **Read** permissions only. Cartix is strictly read-only and will never perform write, update, or delete operations.

1. Log in to your WordPress administrator dashboard (`https://your-store.example.com/wp-admin`).
2. **Verify Permalinks**:
   - Go to **Settings → Permalinks**.
   - Ensure the permalink structure is set to **Post name** (or any setting other than Plain). The WooCommerce REST API (`/wp-json/wc/v3/...`) requires pretty permalinks to function.
   - Click **Save Changes**.
3. **Navigate to REST API Settings**:
   - Go to **WooCommerce → Settings → Advanced → REST API**.
4. **Create an API Key**:
   - Click **Add Key**.
   - **Description**: Enter `Cartix Read-Only Agent Connector`.
   - **User**: Select an administrator user account.
   - **Permissions**: Select **`Read`** from the dropdown.
   - Click **Generate API Key**.
5. **Record Your Keys**:
   - Copy the **Consumer Key** (starts with `ck_...`).
   - Copy the **Consumer Secret** (starts with `cs_...`).
   - *Note: Store these safely. The Consumer Secret cannot be viewed again once you leave this screen.*

---

## 3. Installing and Building Cartix

Cartix runs locally on your computer or server. Clone the official open-source repository and compile the TypeScript source:

```bash
# 1. Clone the public repository
git clone https://github.com/ilakkiyan-j/Cartix.git

# 2. Enter the project directory
cd Cartix

# 3. Install dependencies
npm install

# 4. Build the TypeScript application
npm run build
```

Upon a successful build, the compiled JavaScript entry point will be located at:
```text
dist/src/index.js
```

---

## 4. Verifying Store Connectivity

Before connecting your AI agent, test your store credentials and endpoint with Cartix's built-in diagnostic script:

1. Create a local `.env` file from the template:
   ```bash
   cp .env.example .env
   ```
2. Populate the `.env` file with your store URL and keys:
   ```env
   WOOCOMMERCE_URL=https://your-store.example.com
   WOOCOMMERCE_CONSUMER_KEY=ck_your_actual_consumer_key
   WOOCOMMERCE_CONSUMER_SECRET=cs_your_actual_consumer_secret
   MCP_TRANSPORT=stdio
   LOG_LEVEL=info
   ```
3. Run the non-mutating verification script:
   ```bash
   npm run verify
   ```

**Expected output:**
```text
Testing WooCommerce connectivity and read operations...
Connection Check: { connected: true, message: 'Successfully connected and authenticated with WooCommerce.' }

Fetching products (first page)...
Products returned: 5 (Total available: 42)
Sample product: { id: 87, name: 'Mechanical Keyboard', price: '49.99', stock_status: 'instock' }

Fetching orders (first page)...
Orders returned: 5 (Total available: 128)
```

---

## 5. Configuring Your Local MCP Client

Cartix communicates with AI clients over standard `stdio` (Standard Input/Output) using the official Model Context Protocol SDK.

### Option A: Claude Desktop Configuration

Edit your Claude Desktop configuration file:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

Add the `cartix` server configuration under `mcpServers`:

#### Windows Configuration
```json
{
  "mcpServers": {
    "cartix": {
      "command": "node",
      "args": [
        "C:\\path\\to\\Cartix\\dist\\src\\index.js"
      ],
      "env": {
        "WOOCOMMERCE_URL": "https://your-store.example.com",
        "WOOCOMMERCE_CONSUMER_KEY": "ck_your_read_only_key",
        "WOOCOMMERCE_CONSUMER_SECRET": "cs_your_read_only_secret",
        "MCP_TRANSPORT": "stdio",
        "LOG_LEVEL": "error"
      }
    }
  }
}
```
*(Note: Forward slashes like `"C:/path/to/Cartix/dist/src/index.js"` are also accepted by Node on Windows).*

#### macOS / Linux Configuration
```json
{
  "mcpServers": {
    "cartix": {
      "command": "node",
      "args": [
        "/Users/username/Cartix/dist/src/index.js"
      ],
      "env": {
        "WOOCOMMERCE_URL": "https://your-store.example.com",
        "WOOCOMMERCE_CONSUMER_KEY": "ck_your_read_only_key",
        "WOOCOMMERCE_CONSUMER_SECRET": "cs_your_read_only_secret",
        "MCP_TRANSPORT": "stdio",
        "LOG_LEVEL": "error"
      }
    }
  }
}
```

> [!TIP]
> Setting `"LOG_LEVEL": "error"` ensures informational logs are silenced, keeping the `stdio` JSON-RPC stream pure and free of noise.

### Option B: Cursor MCP Configuration

1. In Cursor, navigate to **Settings → Features → MCP**.
2. Click **Add New MCP Server**.
3. Fill in:
   - **Name**: `cartix`
   - **Type**: `command`
   - **Command**: `node /absolute/path/to/Cartix/dist/src/index.js`
4. Set the environment variables (`WOOCOMMERCE_URL`, `WOOCOMMERCE_CONSUMER_KEY`, `WOOCOMMERCE_CONSUMER_SECRET`, `MCP_TRANSPORT=stdio`, `LOG_LEVEL=error`).

### Option C: Agent Studio / Custom Agent Framework

Configure an MCP tool provider with:
- **Transport**: `stdio`
- **Execution Command**: `node <path-to-Cartix>/dist/src/index.js`
- **Environment**: Same as above.

---

## 6. Restart & Verify

1. Restart your MCP client (completely quit and relaunch Claude Desktop or Cursor).
2. Look for the hammer or tools icon in your agent interface.
3. You should see 5 active Cartix tools:
   - `search_orders`
   - `get_order`
   - `search_products`
   - `get_product`
   - `get_inventory`
4. Test with a simple prompt:
   > *"Show me 3 recent orders from our store."*
5. The agent will invoke `search_orders(limit: 3)` and display the normalized order summaries.
