// services/walletService.js

import axios        from "axios";
import { getToken } from "./tokenService.js";

const API_URL    = import.meta.env.VITE_API_URL;
const EXPLORER   = "https://elated-tan-skat.explorer.mainnet.skalenodes.com";
const authHeader = () => ({ Authorization: `Bearer ${getToken()}` });

// ─────────────────────────────────────────────────────────────────────────────
// Get current AGT ↔ PHP exchange rate
// ─────────────────────────────────────────────────────────────────────────────
export const getWalletRate = async () => {
  const res = await axios.get(`${API_URL}/wallet/rate`);
  return res.data.rate;
};

// ─────────────────────────────────────────────────────────────────────────────
// Get transaction history for logged-in user
// ─────────────────────────────────────────────────────────────────────────────
export const getWalletTransactions = async () => {
  const res = await axios.get(`${API_URL}/wallet/transactions`, { headers: authHeader() });
  return res.data;
};

// ─────────────────────────────────────────────────────────────────────────────
// Deposit — TEST MODE
// Skips PayMongo. Mints AGT directly at 1:1 ratio.
// payload: { amountPhp, ewalletType }
// Returns { transactionId, amountAgt, amountPhp, txHash, status }
// ─────────────────────────────────────────────────────────────────────────────
export const createTestDeposit = async (amountPhp, ewalletType = "gcash") => {
  const res = await axios.post(
    `${API_URL}/wallet/deposit/test`,
    { amountPhp, ewalletType },
    { headers: authHeader() }
  );
  return res.data;
};

// ─────────────────────────────────────────────────────────────────────────────
// Deposit — LIVE MODE
// Creates PayMongo payment link. Redirects user to checkoutUrl.
// Returns { transactionId, checkoutUrl, amountAgt, amountPhp }
// ─────────────────────────────────────────────────────────────────────────────
export const createGcashDeposit = async (amountPhp) => {
  const res = await axios.post(
    `${API_URL}/wallet/deposit/gcash`,
    { amountPhp },
    { headers: authHeader() }
  );
  return res.data;
};

// ─────────────────────────────────────────────────────────────────────────────
// Withdraw AGT → E-Wallet
// payload: { amountAgt, gcashNumber, gcashName, ewalletType, isTestMode }
// Test mode:  burns AGT on-chain, auto-completes (no real payout)
// Live mode:  burns AGT on-chain, stays PENDING until admin sends GCash
// ─────────────────────────────────────────────────────────────────────────────
export const submitWithdraw = async (payload) => {
  const res = await axios.post(
    `${API_URL}/wallet/withdraw`,
    payload,
    { headers: authHeader() }
  );
  return res.data;
};

// ─────────────────────────────────────────────────────────────────────────────
// Admin — get all pending transactions
// ─────────────────────────────────────────────────────────────────────────────
export const adminGetPending = async () => {
  const res = await axios.get(`${API_URL}/wallet/admin/pending`, { headers: authHeader() });
  return res.data;
};

// ─────────────────────────────────────────────────────────────────────────────
// Admin — get all transactions
// ─────────────────────────────────────────────────────────────────────────────
export const adminGetAll = async () => {
  const res = await axios.get(`${API_URL}/wallet/admin/all`, { headers: authHeader() });
  return res.data;
};

// ─────────────────────────────────────────────────────────────────────────────
// Admin — approve withdrawal
// ─────────────────────────────────────────────────────────────────────────────
export const adminApprove = async (id) => {
  const res = await axios.patch(`${API_URL}/wallet/admin/approve/${id}`, {}, { headers: authHeader() });
  return res.data;
};

// ─────────────────────────────────────────────────────────────────────────────
// Admin — reject transaction
// ─────────────────────────────────────────────────────────────────────────────
export const adminReject = async (id, reason) => {
  const res = await axios.patch(
    `${API_URL}/wallet/admin/reject/${id}`,
    { reason },
    { headers: authHeader() }
  );
  return res.data;
};

// ─────────────────────────────────────────────────────────────────────────────
// Admin — cancel transaction
// ─────────────────────────────────────────────────────────────────────────────
export const adminCancel = async (id) => {
  const res = await axios.delete(`${API_URL}/wallet/admin/cancel/${id}`, { headers: authHeader() });
  return res.data;
};

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
export const explorerTx   = (hash)    => `${EXPLORER}/tx/${hash}`;
export const explorerAddr = (address) => `${EXPLORER}/address/${address}`;