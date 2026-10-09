import { parseAbiItem, toEventSelector } from 'viem';

// Standard OP Stack events. Signatures are stable across the whole Superchain
// (Optimism, Base, and OP Stack testnets like GIWA Sepolia) — unlike contract
// addresses, these are part of the protocol spec, not something per-chain.

export const MessagePassedEvent = parseAbiItem(
  'event MessagePassed(uint256 indexed nonce, address indexed sender, address indexed target, uint256 value, uint256 gasLimit, bytes data, bytes32 withdrawalHash)'
);

export const WithdrawalProvenEvent = parseAbiItem(
  'event WithdrawalProven(bytes32 indexed withdrawalHash, address indexed from, address indexed to)'
);

// Added in the fault-proof OptimismPortal2 upgrade (second actor re-proves).
export const WithdrawalProvenExtension1Event = parseAbiItem(
  'event WithdrawalProvenExtension1(bytes32 indexed withdrawalHash, address indexed proofSubmitter)'
);

export const WithdrawalFinalizedEvent = parseAbiItem(
  'event WithdrawalFinalized(bytes32 indexed withdrawalHash, bool success)'
);

export const TransactionDepositedEvent = parseAbiItem(
  'event TransactionDeposited(address indexed from, address indexed to, uint256 indexed version, bytes opaqueData)'
);

export const TOPIC = {
  MessagePassed: toEventSelector(MessagePassedEvent),
  WithdrawalProven: toEventSelector(WithdrawalProvenEvent),
  WithdrawalProvenExtension1: toEventSelector(WithdrawalProvenExtension1Event),
  WithdrawalFinalized: toEventSelector(WithdrawalFinalizedEvent),
  TransactionDeposited: toEventSelector(TransactionDepositedEvent),
};
