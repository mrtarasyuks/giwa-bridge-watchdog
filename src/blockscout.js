// Minimal client for the Blockscout API v2 (https://docs.blockscout.com/devs/apis/rest).
// Read-only GET requests only, no API key, straight from the browser.

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`${url} -> HTTP ${res.status}`);
  }
  return res.json();
}

/**
 * Fetches up to `maxItems` transactions sent by `address`, newest first, paginating as
 * needed. Returns `truncated: true` when the address still had older transactions beyond
 * `maxItems` (i.e. the loop stopped because of the cap, not because history ran out) —
 * callers use that to tell a high-activity wallet apart from one that's simply quiet.
 */
export async function fetchSentTransactions(base, address, maxItems = 150) {
  const items = [];
  let params = '';
  let truncated = false;
  for (;;) {
    const url = `${base}/api/v2/addresses/${address}/transactions?filter=from${params}`;
    const page = await getJson(url);
    const pageItems = page.items ?? [];
    items.push(...pageItems);
    const hasMore = Boolean(page.next_page_params) && pageItems.length > 0;
    if (items.length >= maxItems) {
      truncated = hasMore;
      break;
    }
    if (!hasMore) break;
    params = '&' + new URLSearchParams(page.next_page_params).toString();
  }
  return { items: items.slice(0, maxItems), truncated };
}

export async function fetchTxLogs(base, txHash) {
  const url = `${base}/api/v2/transactions/${txHash}/logs`;
  const page = await getJson(url);
  return page.items ?? [];
}

/** Fetches up to `maxItems` logs emitted BY `address` (as a contract), newest first. */
export async function fetchAddressLogs(base, address, maxItems = 300) {
  const items = [];
  let params = '';
  while (items.length < maxItems) {
    const url = `${base}/api/v2/addresses/${address}/logs${params ? `?${params}` : ''}`;
    const page = await getJson(url);
    const pageItems = page.items ?? [];
    items.push(...pageItems);
    if (!page.next_page_params || pageItems.length === 0) break;
    params = new URLSearchParams(page.next_page_params).toString();
  }
  return items.slice(0, maxItems);
}

/** Fetches the unix/ISO timestamp of a block, used to estimate withdrawal age. */
export async function fetchBlockTimestamp(base, blockNumber) {
  const block = await getJson(`${base}/api/v2/blocks/${blockNumber}`);
  return block.timestamp ?? null;
}

/** Runs `worker` over `items` with at most `limit` in flight at once. */
export async function mapWithConcurrency(items, limit, worker) {
  const results = new Array(items.length);
  let next = 0;
  async function run() {
    while (next < items.length) {
      const i = next++;
      results[i] = await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, run));
  return results;
}
