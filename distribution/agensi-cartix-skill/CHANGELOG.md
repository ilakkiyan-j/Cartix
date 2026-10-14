# Changelog

All notable changes to the Cartix Agensi Skill Package will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-10-14

### Added
- Initial public release of the **Cartix — WooCommerce Read-Only Agent Skill** on Agensi Marketplace.
- Complete `SKILL.md` agent instruction specification with YAML frontmatter.
- Agent operational guidelines for 5 read-only MCP tools:
  - `search_orders`: Filter orders by status and date range with bounded pagination.
  - `get_order`: Retrieve normalized order line items and status by integer ID.
  - `search_products`: Search product catalog by keyword or SKU.
  - `get_product`: Retrieve normalized product pricing and stock details by integer ID.
  - `get_inventory`: Query store inventory with deterministic low-stock and stockout filtering.
- Cognitive steering documentation:
  - Grounding vs. inference rules to prevent hallucinations.
  - Token-budgeting heuristics for pagination traversal.
  - Multi-hop reasoning chains (cross-referencing pending orders against stockouts).
  - Prompt-injection defense against untrusted customer notes.
- Customer reference guides:
  - `references/setup-guide.md`: Step-by-step local build and configuration walkthrough.
  - `references/tool-reference.md`: Comprehensive input/output schemas and concrete agent workflows.
  - `references/security-and-troubleshooting.md`: Security controls, PII data minimization guarantees, and error code troubleshooting.
- Pre-configured templates:
  - `templates/mcp-config.json`: Ready-to-use JSON configuration for Claude Desktop, Cursor, and Agent Studio.
  - `templates/.env.example`: Sanitized environment variable configuration template.
- Marketplace listing package:
  - `LISTING.md`: Complete marketplace listing copy with feature matrix, FAQs, and pricing rationale.
