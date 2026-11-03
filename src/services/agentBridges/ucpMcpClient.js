/**
 * Minimal Universal Commerce Protocol (UCP) client over MCP (JSON-RPC 2.0).
 *
 * A UCP store publishes a manifest at https://<domain>/.well-known/ucp that lists
 * its MCP endpoint (for Shopify stores: https://<shop>.myshopify.com/api/ucp/mcp).
 * Every tool call carries Muse's agent profile URL in arguments.meta["ucp-agent"].
 *
 * This client only talks to endpoints a store has published for agents. It never
 * drives a browser or reads pages meant for people.
 */

const logger = require('../../utils/logger');
const { getProfileUrl } = require('./agentProfile');
const { bridgeSignatureHeaders } = require('../agentSigning');

const DEFAULT_TIMEOUT_MS = 8000;
const MANIFEST_TTL_MS = 6 * 60 * 60 * 1000;
const USER_AGENT = 'MuseShopping-Agent/1.0 (+https://www.muse.shopping/.well-known/ucp)';

const manifestCache = new Map();
let rpcId = 0;

class UcpError extends Error {
  constructor(message, { code = null, data = null, status = null } = {}) {
    super(message);
    this.name = 'UcpError';
    this.code = code;
    this.data = data;
    this.status = status;
    // The store, not Muse, failed: report as a bad gateway.
    this.statusCode = 502;
    this.isOperational = true;
    this.recoverable = true;
    this.userMessage = 'That store did not respond to Muse. You can finish on the store\'s site.';
    // Stores often return a URL the shopper can use to finish on their site.
    this.continueUrl = data?.continue_url || null;
    this.suggestedActions = this.continueUrl ? [{ type: 'continue_at_store', url: this.continueUrl }] : [];
  }
}

async function fetchWithTimeout(url, options = {}, timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // Web Bot Auth headers, signed through Cloud KMS. Empty unless
    // AGENT_SIGN_BRIDGE_REQUESTS=true and the store is a registered partner.
    const signed = await bridgeSignatureHeaders(url);
    return await fetch(url, {
      ...options,
      headers: { 'User-Agent': USER_AGENT, ...signed, ...(options.headers || {}) },
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

function normalizeDomain(domain) {
  return String(domain || '')
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/\/.*$/, '')
    .toLowerCase();
}

/**
 * Fetch and cache a store's /.well-known/ucp manifest.
 * @returns {Promise<{endpoint: string, version: string, capabilities: string[], paymentHandlers: string[]}>}
 */
async function discover(domain, { timeoutMs } = {}) {
  const host = normalizeDomain(domain);
  if (!host) throw new UcpError('A store domain is required');

  const cached = manifestCache.get(host);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const res = await fetchWithTimeout(`https://${host}/.well-known/ucp`, {
    headers: { Accept: 'application/json' },
  }, timeoutMs);
  if (!res.ok) {
    throw new UcpError(`No UCP manifest at ${host} (HTTP ${res.status})`, { status: res.status, code: 'no_manifest' });
  }

  const manifest = await res.json();
  const ucp = manifest && manifest.ucp;
  const shopping = ucp?.services?.['dev.ucp.shopping'] || [];
  const mcp = shopping.find(s => s.transport === 'mcp' && s.endpoint);
  if (!mcp) {
    throw new UcpError(`${host} publishes UCP but no MCP endpoint`, { code: 'no_mcp_transport' });
  }

  const value = {
    domain: host,
    endpoint: mcp.endpoint,
    version: ucp.version,
    capabilities: Object.keys(ucp.capabilities || {}),
    paymentHandlers: Object.keys(ucp.payment_handlers || {}),
  };
  manifestCache.set(host, { value, expiresAt: Date.now() + MANIFEST_TTL_MS });
  return value;
}

/**
 * Pull the JSON payload out of an MCP tools/call result.
 * Prefers structuredContent; falls back to the first JSON text block.
 */
function unwrapToolResult(result) {
  if (!result) return null;
  if (result.structuredContent) return result.structuredContent;
  const blocks = Array.isArray(result.content) ? result.content : [];
  for (const block of blocks) {
    if (block?.type === 'text' && typeof block.text === 'string') {
      try {
        return JSON.parse(block.text);
      } catch (err) {
        return { text: block.text };
      }
    }
  }
  return result;
}

/**
 * Call one UCP tool on a store's MCP endpoint.
 * @param {string} endpoint - MCP endpoint from discover()
 * @param {string} tool - e.g. search_catalog, get_product, create_cart, create_checkout
 * @param {Object} args - tool arguments (meta is added here)
 */
async function callTool(endpoint, tool, args = {}, { timeoutMs, idempotencyKey } = {}) {
  rpcId += 1;
  const meta = { 'ucp-agent': { profile: getProfileUrl() }, ...(args.meta || {}) };
  if (idempotencyKey) meta['idempotency-key'] = idempotencyKey;

  const body = {
    jsonrpc: '2.0',
    id: rpcId,
    method: 'tools/call',
    params: { name: tool, arguments: { ...args, meta } },
  };

  const res = await fetchWithTimeout(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(body),
  }, timeoutMs);

  let payload;
  try {
    payload = await res.json();
  } catch (err) {
    throw new UcpError(`${tool} returned non-JSON (HTTP ${res.status})`, { status: res.status });
  }

  if (payload.error) {
    const { message, code, data } = payload.error;
    logger.warn(`UCP ${tool} failed at ${endpoint}: ${message}`, { code, ucpCode: data?.code });
    throw new UcpError(message || `${tool} failed`, { code: data?.code || code, data, status: res.status });
  }

  const result = payload.result || {};
  if (result.isError) {
    const detail = unwrapToolResult(result);
    throw new UcpError(detail?.message || detail?.text || `${tool} returned an error`, { data: detail });
  }
  return unwrapToolResult(result);
}

function clearManifestCache() {
  manifestCache.clear();
}

module.exports = {
  UcpError,
  discover,
  callTool,
  unwrapToolResult,
  normalizeDomain,
  clearManifestCache,
};
