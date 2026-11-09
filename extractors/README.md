# Store scripts ("code mode")

Each file in `scripts/` is a short program that reads one store's listings.
AI writes a script once; the script does the repetitive work every 15 minutes;
AI comes back only when a script breaks. Design:
https://claude.ai/artifact/KZCuvzhasvwGdFnuGFLb2B

## How a script runs

`.github/workflows/refresh-listings.yml` runs three jobs:

1. **plan** (has the job secret) asks `GET /api/v1/listings/plan` which stores
   to check: watched items to look up, and new-drop searches for followed stores.
2. **extract** (no secrets, token has no permissions) runs
   `node extractors/run-one.js` once per store, in a child process with an
   empty environment.
3. **post** (has the job secret) sends each result to
   `POST /api/v1/listings/ingest`, which checks it again, compares it with the
   last run, and records new items, price changes and sizes back in stock.

A store broken two runs in a row is handed to `repair-extractor.yml`.

## Writing a script

```js
module.exports = {
  async run({ task, tools }) {
    // task: { storeKey, domain, endpoint, watchedItemIds, searchQueries }
    return { listings: [/* see src/services/listingWatch/contract.js */] };
  },
};
```

`tools` (from `tools.js`) is all a script gets:

| Call | What it does |
|------|--------------|
| `tools.ucp.lookup(ids)` | Shopify Catalog `lookup_catalog`, 10 ids per call |
| `tools.ucp.search(query, { limit })` | Shopify Catalog `search_catalog` |
| `tools.http.getText(url)` | GET a page on this store's own domain, https only |
| `tools.html.jsonLdProducts(html)` | schema.org Product objects in a page |
| `tools.log(...)` | goes to the job log, not the output |

Rules a test enforces (`tests/listingWatch/isolation.test.js`): no `require`
outside `extractors/` except the contract, no `process.env`, no child
processes. Requests are capped per run and limited to the store's own hosts.

Shopify's Catalog rules: keep price and stock at most 15 minutes, no bulk
copies of a catalog, no redistribution. Look up what people watch; search
for new drops; never page through a whole catalog.

## Trying one locally

```sh
echo '{"storeKey":"allbirds","domain":"www.allbirds.com","endpoint":"https://weareallbirds.myshopify.com/api/ucp/mcp","script":"shopify-catalog","watchedItemIds":[],"searchQueries":["new arrivals women"]}' \
  | node extractors/run-one.js
```
