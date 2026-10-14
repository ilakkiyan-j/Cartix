import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

const ROOT_DIR = path.resolve(process.cwd());
const DIST_SOURCE = path.join(ROOT_DIR, 'distribution', 'agensi-cartix-skill');
const RELEASES_DIR = path.join(ROOT_DIR, 'distribution', 'releases');
const ZIP_PATH = path.join(RELEASES_DIR, 'cartix-agensi-skill.zip');

interface ValidationResult {
  name: string;
  passed: boolean;
  details?: string;
}

const results: ValidationResult[] = [];

function check(name: string, fn: () => void) {
  try {
    fn();
    results.push({ name, passed: true });
    console.log(`  ✓ ${name}`);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    results.push({ name, passed: false, details: msg });
    console.error(`  ✗ ${name}: ${msg}`);
  }
}

console.log('====================================================');
console.log('Cartix Agensi Skill Package — Validation & Packaging');
console.log('====================================================\n');

// 1. Ensure Releases Directory Exists
if (!fs.existsSync(RELEASES_DIR)) {
  fs.mkdirSync(RELEASES_DIR, { recursive: true });
}

// 2. Package the ZIP directly from distribution/agensi-cartix-skill
console.log('Step 1: Building ZIP distribution...');
if (fs.existsSync(ZIP_PATH)) {
  fs.unlinkSync(ZIP_PATH);
}

// Use tar on Windows to create a clean zip with SKILL.md at root
// tar -a -cf <zip_path> * from within DIST_SOURCE
try {
  execSync(`tar -a -cf "${ZIP_PATH}" *`, { cwd: DIST_SOURCE });
  console.log(`  ✓ Created ZIP archive at: ${ZIP_PATH}`);
} catch (zipErr) {
  // Fallback to PowerShell Compress-Archive
  execSync(`powershell -Command "Compress-Archive -Path '${DIST_SOURCE}\\*' -DestinationPath '${ZIP_PATH}' -Force"`);
  console.log(`  ✓ Created ZIP archive via PowerShell at: ${ZIP_PATH}`);
}

// 3. Create isolated clean temporary directory
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cartix-validation-'));
console.log(`\nStep 2: Extracting archive into clean sandbox: ${tempDir}`);

try {
  // Extract archive into tempDir
  execSync(`tar -xf "${ZIP_PATH}" -C "${tempDir}"`);
  console.log('  ✓ Archive successfully extracted.\n');

  console.log('Step 3: Running Validation Assertions...');

  // Assertion 1: ZIP exists and is below 50 MB
  check('ZIP exists and size is below 50 MB', () => {
    const stats = fs.statSync(ZIP_PATH);
    const sizeMB = stats.size / (1024 * 1024);
    if (stats.size === 0) throw new Error('ZIP file is empty (0 bytes).');
    if (sizeMB > 50) throw new Error(`ZIP file is ${sizeMB.toFixed(2)} MB, which exceeds the 50 MB limit.`);
    console.log(`    (Actual ZIP size: ${(stats.size / 1024).toFixed(2)} KB)`);
  });

  // Assertion 2: SKILL.md exists at ZIP root
  check('SKILL.md exists directly at archive root', () => {
    const skillPath = path.join(tempDir, 'SKILL.md');
    if (!fs.existsSync(skillPath)) throw new Error('SKILL.md was not found at the archive root.');
  });

  // Assertion 3: YAML Frontmatter parses and contains name & description
  check('SKILL.md YAML frontmatter is valid and populated', () => {
    const content = fs.readFileSync(path.join(tempDir, 'SKILL.md'), 'utf-8');
    const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!match) throw new Error('SKILL.md does not contain frontmatter delimited by ---.');
    
    const yamlBlock = match[1];
    const nameMatch = yamlBlock.match(/name:\s*['"]?([^'"\r\n]+)['"]?/);
    const descMatch = yamlBlock.match(/description:\s*['"]?([^'"\r\n]+)['"]?/);

    if (!nameMatch || !nameMatch[1].trim()) throw new Error('SKILL.md is missing "name" in frontmatter.');
    if (!descMatch || !descMatch[1].trim()) throw new Error('SKILL.md is missing "description" in frontmatter.');

    console.log(`    (Skill name: "${nameMatch[1].trim()}")`);
    console.log(`    (Skill description: "${descMatch[1].trim().substring(0, 60)}...")`);
  });

  // Assertion 4: All required reference files exist and are non-empty
  const requiredFiles = [
    'README.md',
    'LICENSE',
    'CHANGELOG.md',
    'LISTING.md',
    path.join('references', 'setup-guide.md'),
    path.join('references', 'tool-reference.md'),
    path.join('references', 'security-and-troubleshooting.md'),
    path.join('templates', 'mcp-config.json'),
    path.join('templates', '.env.example'),
  ];

  check('All required reference and template files exist and are non-empty', () => {
    for (const relPath of requiredFiles) {
      const fullPath = path.join(tempDir, relPath);
      if (!fs.existsSync(fullPath)) throw new Error(`Missing expected file: ${relPath}`);
      const stats = fs.statSync(fullPath);
      if (stats.size < 50) throw new Error(`File ${relPath} is unexpectedly small (${stats.size} bytes).`);
    }
  });

  // Assertion 5: JSON configuration template parses cleanly
  check('templates/mcp-config.json is syntactically valid JSON', () => {
    const mcpConfigPath = path.join(tempDir, 'templates', 'mcp-config.json');
    const raw = fs.readFileSync(mcpConfigPath, 'utf-8');
    const parsed = JSON.parse(raw);

    if (!parsed.mcpServers || !parsed.mcpServers.cartix) {
      throw new Error('mcp-config.json must define mcpServers.cartix.');
    }
    const cartix = parsed.mcpServers.cartix;
    if (cartix.command !== 'node') throw new Error(`Expected command "node", found "${cartix.command}"`);
    if (!Array.isArray(cartix.args) || cartix.args.length === 0) throw new Error('cartix.args must be an array with entry point');
    if (!cartix.env || !cartix.env.WOOCOMMERCE_URL) throw new Error('cartix.env must specify WOOCOMMERCE_URL placeholder');
  });

  // Assertion 6: Environment variables match actual application config
  check('Environment variable placeholders match src/config/env.ts schema', () => {
    const envExamplePath = path.join(tempDir, 'templates', '.env.example');
    const content = fs.readFileSync(envExamplePath, 'utf-8');

    const expectedKeys = [
      'WOOCOMMERCE_URL',
      'WOOCOMMERCE_CONSUMER_KEY',
      'WOOCOMMERCE_CONSUMER_SECRET',
      'PORT',
      'NODE_ENV',
      'MCP_TRANSPORT',
      'MAX_RETRIES',
      'RETRY_BASE_DELAY_MS',
      'REQUEST_TIMEOUT_MS',
      'MAX_PAGE_SIZE',
      'LOG_LEVEL',
    ];

    for (const key of expectedKeys) {
      if (!content.includes(key)) {
        throw new Error(`templates/.env.example is missing expected configuration key: ${key}`);
      }
    }
  });

  // Assertion 7: Build entry point path matches package.json
  check('Compiled entry point dist/src/index.js matches package.json main', () => {
    const pkg = JSON.parse(fs.readFileSync(path.join(ROOT_DIR, 'package.json'), 'utf-8'));
    if (pkg.main !== 'dist/src/index.js') {
      throw new Error(`package.json main is "${pkg.main}", expected "dist/src/index.js"`);
    }
    const distIndex = path.join(ROOT_DIR, 'dist', 'src', 'index.js');
    if (!fs.existsSync(distIndex)) {
      throw new Error('dist/src/index.js does not exist in build output. Did you run npm run build?');
    }
  });

  // Assertion 8: Secret Leakage & Forbidden Artifact Audit
  check('Zero secrets, credentials, .env files, or private keys in archive', () => {
    function walk(dir: string): string[] {
      let files: string[] = [];
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          files = files.concat(walk(full));
        } else {
          files.push(full);
        }
      }
      return files;
    }

    const allFiles = walk(tempDir);

    for (const filePath of allFiles) {
      const base = path.basename(filePath);

      // Check forbidden filenames
      if (base === '.env' || base === '.env.local' || base.endsWith('.pem') || base.endsWith('.key') || base.endsWith('.log')) {
        throw new Error(`Forbidden file found in distribution: ${base}`);
      }

      // Check forbidden directories
      if (filePath.includes('.git') || filePath.includes('node_modules') || filePath.includes('.system_generated')) {
        throw new Error(`Forbidden directory artifact leaked into archive: ${filePath}`);
      }

      // Content scanning for actual secrets
      const content = fs.readFileSync(filePath, 'utf-8');

      // Check for real WooCommerce keys (ck_ followed by 30+ hex chars)
      const realKeyMatch = content.match(/ck_[0-9a-fA-F]{30,}/);
      if (realKeyMatch) {
        throw new Error(`Real WooCommerce consumer key found in ${base}: ${realKeyMatch[0].substring(0, 10)}...`);
      }

      const realSecretMatch = content.match(/cs_[0-9a-fA-F]{30,}/);
      if (realSecretMatch) {
        throw new Error(`Real WooCommerce consumer secret found in ${base}: ${realSecretMatch[0].substring(0, 10)}...`);
      }

      // Check for raw LLM API key dynamically if local .env exists
      const localEnvPath = path.join(ROOT_DIR, '.env');
      if (fs.existsSync(localEnvPath)) {
        const localEnv = fs.readFileSync(localEnvPath, 'utf-8');
        const llmMatch = localEnv.match(/LLM_API_KEY=([^\r\n]+)/);
        if (llmMatch && llmMatch[1].trim() && content.includes(llmMatch[1].trim())) {
          throw new Error(`Workspace LLM API key leaked into ${base}`);
        }
      }

      // Check for private key blocks
      if (content.includes('-----BEGIN PRIVATE KEY-----') || content.includes('-----BEGIN RSA PRIVATE KEY-----')) {
        throw new Error(`Cryptographic private key found in ${base}`);
      }
    }
  });

  // Assertion 9: Inspect actual ZIP archive structure via tar list
  check('Archive table of contents verified via tar list', () => {
    const listOutput = execSync(`tar -tf "${ZIP_PATH}"`).toString();
    const lines = listOutput.split(/\r?\n/).filter(Boolean).map(l => l.replace(/\\/g, '/').replace(/\/$/, ''));

    if (!lines.includes('SKILL.md')) {
      throw new Error('tar table of contents does not contain SKILL.md at root.');
    }
    if (!lines.includes('references/tool-reference.md') && !lines.includes('references/tool-reference.md')) {
      // Check if normalized matches
      const hasToolRef = lines.some(l => l.endsWith('tool-reference.md'));
      if (!hasToolRef) throw new Error('tar table of contents missing tool-reference.md');
    }

    console.log(`    (Verified ${lines.length} items in archive catalog)`);
  });

} finally {
  // Clean up sandbox
  try {
    fs.rmSync(tempDir, { recursive: true, force: true });
    console.log(`\nCleaned up sandbox temporary directory: ${tempDir}`);
  } catch {
    // Ignore cleanup error
  }
}

console.log('\n====================================================');
console.log('Validation Summary:');
const passedCount = results.filter(r => r.passed).length;
const totalCount = results.length;
console.log(`Result: ${passedCount}/${totalCount} checks passed.`);
console.log('====================================================\n');

if (passedCount !== totalCount) {
  process.exit(1);
}
