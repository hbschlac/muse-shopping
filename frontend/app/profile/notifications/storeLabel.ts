/** Readable store name from a store key ("nordstrom-rack" -> "Nordstrom Rack"). */
const KNOWN: Record<string, string> = { tjmaxx: 'TJ Maxx', 'nordstrom-rack': 'Nordstrom Rack', nordstrom: 'Nordstrom' };

export function storeLabel(key: string | null | undefined): string {
  if (!key) return 'Muse';
  return KNOWN[key] || key.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}
