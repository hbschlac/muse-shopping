/**
 * Muse's own MCP server (Streamable HTTP, JSON responses only).
 *
 *   POST /api/v1/mcp   JSON-RPC 2.0: initialize, tools/list, tools/call, ping
 *
 * One endpoint over every store Muse can reach through agent bridges, with
 * Muse's own metadata tags on each item. Any MCP client (Claude, ChatGPT apps,
 * internal tools) can add https://www.muse.shopping/api/v1/mcp as a server.
 *
 * Tools: list_stores, search_products, get_product, start_checkout.
 * start_checkout only builds a checkout at the store and returns its
 * continue_url; the shopper pays on the store's site.
 */

const express = require('express');
const router = express.Router();
const AgentBridges = require('../services/agentBridges');
const { tagProduct } = require('../services/agentBridges/itemTagger');
const logger = require('../utils/logger');

const PROTOCOL_VERSION = '2025-06-18';
const SERVER_INFO = { name: 'muse-shopping', version: '1.0.0' };

const TOOLS = [
  {
    name: 'list_stores',
    description: 'List the stores Muse can search and check out at through their own agent endpoints.',
    inputSchema: {
      type: 'object',
      properties: {
        store_category: { type: 'string', description: 'apparel, beauty, shoes, activewear, jewelry, swim, denim, bags, ...' },
      },
    },
  },
  {
    name: 'search_products',
    description: 'Search products across partner stores. Every result carries Muse tags: category, colors, patterns, materials, silhouette, fit, occasion, sizesInStock, onSale. Filters apply to those tags.',
    inputSchema: {
      type: 'object',
      required: ['query'],
      properties: {
        query: { type: 'string', description: 'What the shopper wants, e.g. "black midi dress".' },
        stores: { type: 'array', items: { type: 'string' }, description: 'Store keys from list_stores. Default: up to 12 stores in store_category.' },
        store_category: { type: 'string' },
        item_category: { type: 'string', description: 'dress, top, pants, jeans, skirt, outerwear, knitwear, shoes, bag, jewelry, swim, beauty, ...' },
        color: { type: 'string' },
        material: { type: 'string' },
        occasion: { type: 'string', description: 'work, event, vacation, athleisure, lounge, going out' },
        size: { type: 'string', description: 'Only items with this size in stock.' },
        max_price: { type: 'number', description: 'In dollars.' },
      },
    },
  },
  {
    name: 'get_product',
    description: 'Get one product with all variants, sizes, availability and Muse tags.',
    inputSchema: {
      type: 'object',
      required: ['store', 'product_id'],
      properties: {
        store: { type: 'string' },
        product_id: { type: 'string', description: 'The product id from search_products.' },
      },
    },
  },
  {
    name: 'start_checkout',
    description: "Build a checkout at the store and return totals, policies, what the shopper still has to enter, and the store's continue_url where the shopper pays.",
    inputSchema: {
      type: 'object',
      required: ['store', 'lines'],
      properties: {
        store: { type: 'string' },
        lines: {
          type: 'array',
          items: {
            type: 'object',
            required: ['variant_id'],
            properties: { variant_id: { type: 'string' }, quantity: { type: 'integer', minimum: 1, maximum: 10 } },
          },
        },
      },
    },
  },
];

function publicStore(p) {
  return { key: p.key, name: p.name, domain: p.domain, category: p.category, can_checkout: !!p.canCheckout };
}

async function callTool(name, args = {}) {
  switch (name) {
    case 'list_stores':
      return { stores: AgentBridges.listPartners({ category: args.store_category || null }).map(publicStore) };

    case 'search_products': {
      const filters = {
        category: args.item_category || null,
        color: args.color || null,
        material: args.material || null,
        occasion: args.occasion || null,
        size: args.size || null,
        maxPriceCents: args.max_price ? Math.round(Number(args.max_price) * 100) : null,
      };
      const hasFilters = Object.values(filters).some(Boolean);
      return AgentBridges.search(args.query, {
        partners: Array.isArray(args.stores) ? args.stores : null,
        category: args.store_category || null,
        limitPerPartner: hasFilters ? 10 : 4,
        filters: hasFilters ? filters : null,
      });
    }

    case 'get_product': {
      const product = await AgentBridges.getBridge(args.store).getProduct(String(args.product_id || ''));
      return { product: product ? { ...product, tags: tagProduct(product) } : null };
    }

    case 'start_checkout': {
      const lines = (args.lines || []).map(l => ({ variantId: l.variant_id, quantity: l.quantity || 1 }));
      return { checkout: await AgentBridges.getBridge(args.store).startCheckout(lines) };
    }

    default: {
      const err = new Error(`Unknown tool: ${name}`);
      err.rpcCode = -32602;
      throw err;
    }
  }
}

function rpcResult(id, result) {
  return { jsonrpc: '2.0', id, result };
}

function rpcError(id, code, message) {
  return { jsonrpc: '2.0', id, error: { code, message } };
}

async function handleMessage(msg) {
  const { id = null, method, params = {} } = msg || {};

  // Notifications (no id) get no response body.
  if (id === null || id === undefined) return null;

  switch (method) {
    case 'initialize':
      return rpcResult(id, {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: { tools: { listChanged: false } },
        serverInfo: SERVER_INFO,
        instructions: 'Search fashion and beauty stores with search_products, then start_checkout and send the shopper to continue_url to pay.',
      });
    case 'ping':
      return rpcResult(id, {});
    case 'tools/list':
      return rpcResult(id, { tools: TOOLS });
    case 'tools/call':
      try {
        const data = await callTool(params.name, params.arguments || {});
        return rpcResult(id, {
          content: [{ type: 'text', text: JSON.stringify(data) }],
          structuredContent: data,
        });
      } catch (err) {
        if (err.rpcCode) return rpcError(id, err.rpcCode, err.message);
        logger.warn(`Muse MCP tool ${params.name} failed: ${err.message}`);
        // Tool failures are results, so the calling model can read and recover.
        const detail = { error: err.message, continue_url: err.continueUrl || null };
        return rpcResult(id, { isError: true, content: [{ type: 'text', text: JSON.stringify(detail) }] });
      }
    default:
      return rpcError(id, -32601, `Method not found: ${method}`);
  }
}

router.post('/', async (req, res) => {
  const body = req.body;
  if (Array.isArray(body)) {
    const responses = (await Promise.all(body.map(handleMessage))).filter(Boolean);
    return responses.length ? res.json(responses) : res.status(202).end();
  }
  const response = await handleMessage(body);
  return response ? res.json(response) : res.status(202).end();
});

// This server keeps no sessions and sends no server-initiated messages.
router.get('/', (req, res) => res.status(405).set('Allow', 'POST').end());
router.delete('/', (req, res) => res.status(405).set('Allow', 'POST').end());

module.exports = router;
module.exports.TOOLS = TOOLS;
module.exports.handleMessage = handleMessage;
