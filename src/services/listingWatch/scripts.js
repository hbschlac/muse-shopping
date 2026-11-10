/**
 * Names of the shared store scripts in extractors/scripts.
 *
 *   shopify-catalog        the default: Shopify's agent Catalog
 *   embedded-product-data  the no-AI fallback: product data embedded in store
 *                          pages, switched on after two broken runs
 *
 * A store can also have its own script, extractors/scripts/<storeKey>.js, which
 * runs in place of the default (an AI repair writes one; only a change to a
 * single store's script may merge on its own).
 */
module.exports = {
  DEFAULT_SCRIPT: 'shopify-catalog',
  FALLBACK_SCRIPT: 'embedded-product-data',
  BROKEN_RUNS_BEFORE_FALLBACK: 2,
};
