// Chain facts verified against https://docs.giwa.io/ (chain id, RPC) and
// https://github.com/ethereum-optimism/optimism (fixed OP Stack predeploy addresses —
// identical on every OP Stack chain, including GIWA Sepolia, by protocol spec).
export const L2_CHAIN_ID = 91342; // GIWA Sepolia
export const L1_CHAIN_ID = 11155111; // Ethereum Sepolia

export const L2_EXPLORER_BASE = 'https://sepolia-explorer.giwa.io';
// Public community-run Blockscout instance for Ethereum Sepolia. Not a GIWA domain —
// used only as a read-only data source for the L1 side of the bridge, queried directly
// from the visitor's browser, nothing is ever signed or sent there.
export const L1_EXPLORER_BASE = 'https://eth-sepolia.blockscout.com';

// Fixed OP Stack L2 predeploys (same address on every OP Stack chain).
export const L2_TO_L1_MESSAGE_PASSER = '0x4200000000000000000000000000000000000016';
export const L2_STANDARD_BRIDGE = '0x4200000000000000000000000000000000000010';
export const L2_CROSS_DOMAIN_MESSENGER = '0x4200000000000000000000000000000000000007';

// Public Ethereum Sepolia JSON-RPCs used only for read-only eth_getLogs calls (the
// network-wide stats widget) — not GIWA domains, no key, no wallet, nothing signed.
// - tenderly (primary): verified live on 2026-10-09 to return the portal's *full* log
//   history (currently ~2.75M blocks, from deployment to tip) in one call with no range
//   cap — this is what makes the exact proven/finalized totals possible at all.
// - ankr / publicnode (fallback, tried in order if tenderly is unreachable): live-tested
//   on 2026-10-09 and confirmed to enforce a hard 50,000-block eth_getLogs range cap
//   ("exceed maximum block range: 50000"), which the portal's full history is now ~55x
//   over — so a full-history query always fails on them. networkStats.js therefore only
//   asks fallback RPCs for a recent window (see L1_RPC_FALLBACK_WINDOW_BLOCKS below)
//   instead of pretending a full-range retry could ever succeed there.
export const L1_RPC_URLS = [
  'https://sepolia.gateway.tenderly.co',
  'https://rpc.ankr.com/eth_sepolia',
  'https://ethereum-sepolia-rpc.publicnode.com',
];

// Block window used when a fallback RPC answers instead of the primary. 50,000 (the
// range cap above) failed outright and even 45,000 errored with "pruned history
// unavailable" on both fallback RPCs' free tier — 8,000 blocks (~1 day) was tested live
// and works reliably on both. That's well short of the ~7-day challenge period, so a
// fallback-sourced snapshot will typically show 0 "overdue" even when there genuinely are
// some outside the window — the UI labels fallback results as a recent window, not full
// history, to stay honest about that gap.
export const L1_RPC_FALLBACK_WINDOW_BLOCKS = 8000;

// OptimismPortal2 on Ethereum Sepolia (L1) for GIWA Sepolia — the fault-proof contract
// that emits WithdrawalProven/WithdrawalProvenExtension1/WithdrawalFinalized for every
// withdrawal on the network. Used only for the read-only network-wide stats widget
// (per-address scanning below does not depend on this address, see bridge.js).
// Source: supplied 2026-10-09 as verified against live on-chain data; this build round
// has no web access to independently re-check it against the contract address table on
// docs.giwa.io/giwa-chain/en/network-information/contracts — do that before relying on
// it for anything beyond this read-only demo (see README "Open questions").
export const L1_OPTIMISM_PORTAL = '0x956962C34687A954e611A83619ABaA37Ce6bC78A';

// Per-address scan depth: how many of the address's most recent outgoing transactions to
// check for bridge activity on each chain. "Normal" keeps a typical test wallet's search
// fast; "deep" costs far more Blockscout requests (and time) but was added because the
// default window was losing older withdrawals for addresses with heavy unrelated L1/L2
// activity (e.g. farm wallets touching many testnet dapps) — it's offered as an explicit
// extra step (see the "scan deeper" prompt in main.js) rather than paid on every search.
export const L2_SCAN_NORMAL = 150;
export const L2_SCAN_DEEP = 1000;
export const L1_SCAN_NORMAL = 80;
export const L1_SCAN_DEEP = 600;

// OP Stack deposit transactions use EIP-2718 type 0x7E (126) on the L2 side.
export const DEPOSIT_TX_TYPE = 126;

// Typical OP Stack fault-proof challenge window. GIWA has not published its exact
// value independently of this estimate — treat as approximate, verify on docs.giwa.io.
// (Still unconfirmed as of 2026-10-09: docs.giwa.io was not reachable from this build
// round — see README "Open questions".)
export const APPROX_CHALLENGE_PERIOD_DAYS = 7;

// Example addresses shown as one-click demos. Keep this honest: only list an address
// once its on-chain history has actually been observed to match the label.
export const EXAMPLE_ADDRESSES = [
  {
    address: '0x353B4BDb62605ECc09741356a296204789572E9B',
    label: 'незавершене виведення (потребує prove)',
  },
  {
    address: '0x777EF3FD045A3aDd21593434db2766F74AFfEaF2',
    label: 'завершений цикл: initiate → prove → finalize',
  },
];
