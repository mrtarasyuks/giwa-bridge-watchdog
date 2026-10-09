# GIWA Bridge Watchdog

A read-only tool that finds **stuck ETH bridge withdrawals** between Ethereum Sepolia and [GIWA Sepolia](https://giwa.io/) (an OP Stack L2 testnet, chain id `91342`).

**Live app:** publish to GitHub Pages from `docs/` (see below) — paste a wallet address and get `?address=0x...` as a shareable link.

## Who this is for

Anyone who has bridged ETH to or from GIWA Sepolia — testers, farmers, developers — and isn't sure whether a withdrawal actually finished. OP Stack withdrawals are a 3-step process, and it's very easy to do step 1 and forget steps 2 and 3, leaving funds stuck indefinitely:

1. **Initiate** — on L2 (GIWA Sepolia), call `withdraw`/`initiateWithdrawal`.
2. **Prove** — on L1 (Ethereum Sepolia), submit a proof once the L2 output is posted.
3. **Finalize** — on L1, after the ~7-day fault-proof challenge window passes.

The official GIWA explorer shows raw transactions but doesn't tell you *which step you're stuck on* or *what to do next*. This tool does.

## What it does

- You paste an address (or open a `?address=` link).
- It reads the address's recent transactions directly from the public Blockscout APIs of both chains (GIWA Sepolia + Ethereum Sepolia) — no backend, no API key.
- For every withdrawal it finds the `MessagePassed` event (L2) and checks for matching `WithdrawalProven` / `WithdrawalFinalized` events (L1) by `withdrawalHash`.
- Each withdrawal gets a plain-language status badge: needs prove, in the challenge period (with an estimated countdown), ready to finalize, or done — plus one sentence on what to do next.
- Deposits (L1 → L2) are listed too, with a reminder to check the L2 explorer if one takes longer than the usual 1–3 minutes.

No wallet connect, no signing, nothing to approve. It only reads public chain data in your browser.

## Data sources

- GIWA Sepolia explorer (Blockscout API v2): `https://sepolia-explorer.giwa.io/api/v2/...`
- Ethereum Sepolia explorer (public Blockscout instance, not a GIWA domain): `https://eth-sepolia.blockscout.com/api/v2/...`
- Event decoding uses the standard OP Stack ABIs (`MessagePassed`, `WithdrawalProven`, `WithdrawalFinalized`, `TransactionDeposited`) via [viem](https://viem.sh). The L2 predeploy addresses (`L2ToL1MessagePasser`, `L2StandardBridge`) are fixed by the OP Stack spec — identical on every OP Stack chain. L1 contract addresses are **not** hardcoded: the tool finds relevant events by scanning the address's own L1 transactions, so it works without needing GIWA's L1 contract addresses confirmed in advance.

## Honest limitations

- It only looks at the last ~150 outgoing L2 transactions and ~80 outgoing L1 transactions per address — enough for a test wallet, not for a very high-volume one.
- The 7-day challenge-period estimate is an approximation (see `APPROX_CHALLENGE_PERIOD_DAYS` in `src/constants.js`) based on typical OP Stack defaults, not an independently confirmed GIWA parameter — verify exact timing on [docs.giwa.io](https://docs.giwa.io/) before relying on it.
- Deposits are matched to L1 initiation only; the tool does not attempt to compute the exact L2 mint transaction hash, so "arrived on L2" is left for you to confirm on the explorer rather than guessed.
- If `eth-sepolia.blockscout.com` is unreachable or rate-limits, the L1 status (prove/finalize) is shown as "unknown" rather than guessed — withdrawal data from GIWA's own explorer still loads independently.
- Built and tested against real GIWA Sepolia testnet addresses in October 2026; while testing, no address was found that had completed a full prove+finalize cycle — every withdrawal observed was stuck at "needs prove", which is exactly the problem this tool is meant to surface.
- Not affiliated with the official GIWA project. GIWA Sepolia is a testnet; mainnet and any token do not exist yet. Be careful of phishing sites using the GIWA brand.

## Run locally

```bash
npm install
npm run dev      # dev server
npm run build    # builds the static site into docs/ (served by GitHub Pages)
```

## Stack

Plain Vite + vanilla JS + [viem](https://viem.sh) for ABI decoding. No framework, no backend.
