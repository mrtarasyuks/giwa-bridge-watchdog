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

// OP Stack deposit transactions use EIP-2718 type 0x7E (126) on the L2 side.
export const DEPOSIT_TX_TYPE = 126;

// Typical OP Stack fault-proof challenge window. GIWA has not published its exact
// value independently of this estimate — treat as approximate, verify on docs.giwa.io.
export const APPROX_CHALLENGE_PERIOD_DAYS = 7;
