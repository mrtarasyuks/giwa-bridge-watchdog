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

// Public Ethereum Sepolia JSON-RPC used only for one read-only eth_getLogs call (the
// network-wide stats widget) — not a GIWA domain, no key, no wallet, nothing signed.
// Chosen because, unlike most free public Sepolia RPCs, it doesn't prune eth_getLogs
// history or cap the block range, so a single call can cover the portal's full history
// (verified live from a browser context on 2026-10-09 — other public RPCs tried either
// pruned history older than ~8000 blocks or capped the range to 50 blocks).
export const L1_RPC = 'https://sepolia.gateway.tenderly.co';

// OptimismPortal2 on Ethereum Sepolia (L1) for GIWA Sepolia — the fault-proof contract
// that emits WithdrawalProven/WithdrawalProvenExtension1/WithdrawalFinalized for every
// withdrawal on the network. Used only for the read-only network-wide stats widget
// (per-address scanning below does not depend on this address, see bridge.js).
// Source: supplied 2026-10-09 as verified against live on-chain data; this build round
// has no web access to independently re-check it against the contract address table on
// docs.giwa.io/giwa-chain/en/network-information/contracts — do that before relying on
// it for anything beyond this read-only demo (see README "Open questions").
export const L1_OPTIMISM_PORTAL = '0x956962C34687A954e611A83619ABaA37Ce6bC78A';

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
