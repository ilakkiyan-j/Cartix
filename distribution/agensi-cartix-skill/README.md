# Cartix — WooCommerce Read-Only Agent Skill Package

Welcome to the **Cartix Agensi Skill Package**!

This package enables autonomous AI agents (such as Claude Desktop, Cursor, Agent Studio, and custom LLM agents) to query, inspect, and reason over WooCommerce store data using the open-source **Cartix** Model Context Protocol (MCP) server.

---

## What is Inside This Package

```text
├── SKILL.md                               # Primary AI agent instruction manual (YAML frontmatter)
├── README.md                              # This file
├── LICENSE                                # MIT License
├── CHANGELOG.md                           # Version and release history
├── LISTING.md                             # Marketplace description, FAQs, and pricing
├── references/
│   ├── setup-guide.md                     # Step-by-step installation and local MCP configuration
│   ├── tool-reference.md                  # Comprehensive schemas, arguments, and workflow examples
│   └── security-and-troubleshooting.md    # Security boundaries, data minimization, and error codes
└── templates/
    ├── mcp-config.json                    # Ready-to-use client configuration template (stdio)
    └── .env.example                       # Sanitized environment variable template
```

---

## Quick Start for Merchants & Developers

1. **Install Cartix locally**:
   ```bash
   git clone https://github.com/ilakkiyan-j/Cartix.git
   cd Cartix
   npm install
   npm run build
   ```
2. **Configure your WooCommerce API Keys**:
   - Follow the detailed steps in [`references/setup-guide.md`](references/setup-guide.md) to generate read-only keys in your WordPress Admin.
3. **Configure your MCP Client**:
   - Copy [`templates/mcp-config.json`](templates/mcp-config.json) into your Claude Desktop, Cursor, or Agent Studio settings, updating the paths and store credentials.
4. **Deploy the Skill to your Agent**:
   - Provide [`SKILL.md`](SKILL.md) to your agent runtime to unlock structured, reliable reasoning over orders, inventory, and product data.

---

## The 5 Read-Only Tools

1. `search_orders`: Filter orders by lifecycle status and ISO 8601 timestamps.
2. `get_order`: Retrieve full order line items and status by numeric order ID.
3. `search_products`: Search product catalog by keyword or SKU.
4. `get_product`: Retrieve normalized product specifications and prices by product ID.
5. `get_inventory`: Store-wide inventory audits with low-stock and stockout filtering.

---

## Security & Data Privacy

- **Strictly Read-Only**: Cartix cannot mutate, delete, cancel, or refund orders, nor modify catalog or inventory data.
- **Customer Privacy**: Customer names, emails, billing/shipping addresses, and phone numbers are stripped before returning data to the AI agent.
- **Local Credentials**: API keys remain securely on your local computer or server and are never transmitted to external services.

For full technical specifications, see [`references/security-and-troubleshooting.md`](references/security-and-troubleshooting.md).
