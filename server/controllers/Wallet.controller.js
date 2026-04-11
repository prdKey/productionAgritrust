// controllers/Wallet.controller.js

import axios                 from "axios";
import crypto                from "crypto";
import { ethers }            from "ethers";
import { tokenContract }     from "../blockchain/contract.js";
import WalletTransaction     from "../models/WalletTransaction.js";
import AgtRate               from "../models/Agtrate.js";

// ── PayMongo client ───────────────────────────────────────────────────────────
const paymongo = axios.create({
  baseURL: "https://api.paymongo.com/v1",
  headers: {
    Authorization: `Basic ${Buffer.from(process.env.PAYMONGO_SECRET_KEY + ":").toString("base64")}`,
    "Content-Type": "application/json",
  },
});

// ── Internal helpers ──────────────────────────────────────────────────────────
const _getRate = async () => {
  console.log("[_getRate] Fetching rate from DB...");
  const row  = await AgtRate.findOne({ order: [["id", "DESC"]] });
  const rate = parseFloat(row?.ratePhp ?? 1);
  console.log("[_getRate] Rate:", rate);
  return rate;
};

const _getBalance = async (walletAddress) => {
  console.log("[_getBalance] Fetching balance for:", walletAddress);
  const raw     = await tokenContract.balanceOf(walletAddress);
  const balance = parseFloat(ethers.formatEther(raw));
  console.log("[_getBalance] Balance:", balance);
  return balance;
};

const _mint = async (walletAddress, amountAgt) => {
  console.log("[_mint] Minting", amountAgt, "AGT to", walletAddress);
  const amountWei = ethers.parseEther(amountAgt.toString());
  console.log("[_mint] Amount in wei:", amountWei.toString());
  const tx = await tokenContract.mint(walletAddress, amountWei);
  console.log("[_mint] Tx sent, waiting for confirmation... hash:", tx.hash);
  await tx.wait();
  console.log("[_mint] ✅ Confirmed! txHash:", tx.hash);
  return tx.hash;
};

const _burn = async (walletAddress, amountAgt) => {
  console.log("[_burn] Burning", amountAgt, "AGT from", walletAddress);
  const amountWei = ethers.parseEther(amountAgt.toString());
  console.log("[_burn] Amount in wei:", amountWei.toString());
  const tx = await tokenContract.burn(walletAddress, amountWei);
  console.log("[_burn] Tx sent, waiting for confirmation... hash:", tx.hash);
  await tx.wait();
  console.log("[_burn] ✅ Confirmed! txHash:", tx.hash);
  return tx.hash;
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/wallet/rate
// ─────────────────────────────────────────────────────────────────────────────
export const getRate = async (req, res) => {
  console.log("[getRate] GET /api/wallet/rate");
  try {
    const rate = await _getRate();
    console.log("[getRate] Responding with rate:", rate);
    res.json({ rate });
  } catch (e) {
    console.error("[getRate] Error:", e.message);
    res.status(500).json({ message: "Failed to fetch rate" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/wallet/balance
// ─────────────────────────────────────────────────────────────────────────────
export const getBalance = async (req, res) => {
  console.log("[getBalance] GET /api/wallet/balance | user:", req.user?.id, "| wallet:", req.user?.walletAddress);
  try {
    const balance = await _getBalance(req.user.walletAddress);
    console.log("[getBalance] Responding with balance:", balance);
    res.json({ balance, walletAddress: req.user.walletAddress });
  } catch (e) {
    console.error("[getBalance] Error:", e.message);
    res.status(500).json({ message: "Failed to fetch balance" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/wallet/transactions
// ─────────────────────────────────────────────────────────────────────────────
export const getTransactions = async (req, res) => {
  console.log("[getTransactions] GET /api/wallet/transactions | userId:", req.user?.id);
  try {
    const txs = await WalletTransaction.findAll({
      where:      { userId: req.user.id },
      order:      [["created_at", "DESC"]],
      limit:      50,
      attributes: [
        "id", "type", "amountAgt", "amountPhp",
        "gcashNumber", "referenceNo", "status",
        "txHash", "adminNote", "ewalletType", "isTestMode", "created_at",
      ],
    });
    console.log("[getTransactions] Found", txs.length, "transactions");
    res.json(txs);
  } catch (e) {
    console.error("[getTransactions] Error:", e.message);
    res.status(500).json({ message: "Failed to fetch transactions" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/wallet/deposit/test
// Test mode — skips PayMongo, mints AGT directly at 1:1 ratio
// ─────────────────────────────────────────────────────────────────────────────
export const depositTest = async (req, res) => {
  console.log("[depositTest] POST /api/wallet/deposit/test | body:", req.body, "| userId:", req.user?.id);
  const { amountPhp, ewalletType = "gcash" } = req.body;

  if (!amountPhp || parseFloat(amountPhp) <= 0) {
    console.warn("[depositTest] Invalid amountPhp:", amountPhp);
    return res.status(400).json({ message: "Valid amountPhp is required" });
  }
  if (parseFloat(amountPhp) < 1) {
    return res.status(400).json({ message: "Minimum test deposit is ₱1" });
  }

  try {
    // 1:1 ratio in test mode — PHP = AGT
    const amountAgt = parseFloat(amountPhp).toFixed(4);
    console.log("[depositTest] PHP:", amountPhp, "| AGT (1:1):", amountAgt);

    const tx = await WalletTransaction.create({
      userId:        req.user.id,
      walletAddress: req.user.walletAddress,
      type:          "DEPOSIT",
      amountAgt,
      amountPhp:     parseFloat(amountPhp),
      ewalletType,
      isTestMode:    true,
      status:        "PENDING",
      referenceNo:   `TEST-${Date.now()}`,
    });
    console.log("[depositTest] WalletTransaction created, id:", tx.id);

    // Mint directly — no payment gateway
    const txHash = await _mint(req.user.walletAddress, amountAgt);

    await tx.update({ status: "COMPLETED", txHash });
    console.log("[depositTest] ✅ Minted and marked COMPLETED | txHash:", txHash);

    res.status(201).json({
      transactionId: tx.id,
      amountAgt,
      amountPhp,
      txHash,
      status: "COMPLETED",
      message: "Test deposit successful. AGT minted at 1:1 ratio.",
    });
  } catch (e) {
    console.error("[depositTest] Error:", e.message);
    res.status(500).json({ message: "Test deposit failed" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/wallet/deposit/gcash
// Live mode — creates PayMongo payment link
// ─────────────────────────────────────────────────────────────────────────────
export const depositGcash = async (req, res) => {
  console.log("[depositGcash] POST /api/wallet/deposit/gcash | body:", req.body, "| userId:", req.user?.id);
  const { amountPhp } = req.body;

  if (!amountPhp || parseFloat(amountPhp) <= 0) {
    console.warn("[depositGcash] Invalid amountPhp:", amountPhp);
    return res.status(400).json({ message: "Valid amountPhp is required" });
  }
  if (parseFloat(amountPhp) < 100) {
    console.warn("[depositGcash] Below minimum:", amountPhp);
    return res.status(400).json({ message: "Minimum deposit is ₱100" });
  }

  try {
    const rate      = await _getRate();
    const amountAgt = (parseFloat(amountPhp) / rate).toFixed(4);
    console.log("[depositGcash] PHP:", amountPhp, "| AGT:", amountAgt, "| rate:", rate);

    const tx = await WalletTransaction.create({
      userId:        req.user.id,
      walletAddress: req.user.walletAddress,
      type:          "DEPOSIT",
      amountAgt,
      amountPhp:     parseFloat(amountPhp),
      ewalletType:   "paymongo",
      isTestMode:    false,
      status:        "PENDING",
    });
    console.log("[depositGcash] WalletTransaction created, id:", tx.id);

    const centavos = Math.round(parseFloat(amountPhp) * 100);
    console.log("[depositGcash] Calling PayMongo, centavos:", centavos);

    const { data } = await paymongo.post("/links", {
      data: {
        attributes: {
          amount:      centavos,
          currency:    "PHP",
          description: `AgriTrust Deposit — ${amountAgt} AGT | txId:${tx.id}|wallet:${req.user.walletAddress}`,
          remarks:     `txId:${tx.id}|wallet:${req.user.walletAddress}`,
        },
      },
    });

    const checkoutUrl    = data.data.attributes.checkout_url;
    const paymongoLinkId = data.data.id;
    console.log("[depositGcash] PayMongo link created:", paymongoLinkId, "| checkoutUrl:", checkoutUrl);

    await tx.update({ referenceNo: paymongoLinkId });
    console.log("[depositGcash] WalletTransaction updated with referenceNo:", paymongoLinkId);

    res.status(201).json({ transactionId: tx.id, checkoutUrl, amountAgt, amountPhp });
  } catch (e) {
    console.error("[depositGcash] Error:", e.response?.data ?? e.message);
    res.status(500).json({ message: "Failed to create GCash payment link" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/wallet/webhook/paymongo
// ─────────────────────────────────────────────────────────────────────────────
export const paymongoWebhook = async (req, res) => {
  console.log("[paymongoWebhook] POST /api/wallet/webhook/paymongo");
  console.log("[paymongoWebhook] RAW BODY:", JSON.stringify(req.body, null, 2));
  console.log("[paymongoWebhook] Headers:", JSON.stringify(req.headers, null, 2));

  const sigHeader = req.headers["paymongo-signature"];
  if (!sigHeader) {
    console.warn("[paymongoWebhook] Missing paymongo-signature header");
    return res.status(400).json({ message: "Missing signature" });
  }

  try {
    const parts     = Object.fromEntries(sigHeader.split(",").map((p) => p.split("=")));
    const timestamp = parts.t;
    const signature = parts.li ?? parts.te;

    const expected = crypto
      .createHmac("sha256", process.env.PAYMONGO_WEBHOOK_SECRET)
      .update(`${timestamp}.${JSON.stringify(req.body)}`)
      .digest("hex");

    if (expected !== signature) {
      console.error("[paymongoWebhook] ❌ Signature mismatch!");
      return res.status(401).json({ message: "Invalid signature" });
    }
    console.log("[paymongoWebhook] ✅ Signature verified");
  } catch (e) {
    console.error("[paymongoWebhook] Signature verification error:", e.message);
    return res.status(400).json({ message: "Signature verification failed" });
  }

  res.status(200).json({ received: true });

  try {
    const eventType = req.body?.data?.attributes?.type;
    console.log("[paymongoWebhook] Event type:", eventType);

    const PAID_EVENTS = new Set([
      "payment.paid",
      "link.payment.paid",
      "checkout_session.payment.paid",
    ]);

    if (!PAID_EVENTS.has(eventType)) {
      console.log("[paymongoWebhook] Not a paid event, skipping.");
      return;
    }

    const eventData = req.body.data;
    const linkId =
      eventData?.attributes?.data?.id
      ?? eventData?.attributes?.payment?.id
      ?? eventData?.id;

    console.log("[paymongoWebhook] Resolved linkId:", linkId);

    if (!linkId) {
      console.error("[paymongoWebhook] Cannot determine linkId — check RAW BODY above");
      return;
    }

    let tx = await WalletTransaction.findOne({
      where: { referenceNo: linkId, status: "PENDING" },
    });

    if (!tx) {
      console.warn("[paymongoWebhook] No tx found for linkId:", linkId, "— trying remarks/description fallback");
      const attrs     = eventData?.attributes?.data?.attributes ?? eventData?.attributes ?? {};
      const searchStr = attrs.description ?? attrs.remarks ?? "";
      const txIdMatch = searchStr.match(/txId:(\d+)/);
      if (txIdMatch) {
        const txId = parseInt(txIdMatch[1]);
        tx = await WalletTransaction.findOne({ where: { id: txId, status: "PENDING" } });
        console.log("[paymongoWebhook] Fallback found tx by txId:", txId, tx ? "✅" : "❌");
      }
    }

    if (!tx) {
      console.error("[paymongoWebhook] No pending transaction found");
      return;
    }

    console.log("[paymongoWebhook] Processing tx id:", tx.id, "| wallet:", tx.walletAddress, "| AGT:", tx.amountAgt);

    const txHash = await _mint(tx.walletAddress, tx.amountAgt);
    await tx.update({ status: "COMPLETED", txHash, referenceNo: linkId });
    console.log("[paymongoWebhook] ✅ Minted and marked COMPLETED | txHash:", txHash);

  } catch (e) {
    console.error("[paymongoWebhook] Processing error:", e.message, e.stack);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/wallet/withdraw
// Both test and live — burns AGT on-chain, then marks PENDING for admin payout
// In test mode: burns immediately and marks COMPLETED (no real payout needed)
// In live mode: burns immediately and stays PENDING until admin sends GCash
// ─────────────────────────────────────────────────────────────────────────────
export const withdraw = async (req, res) => {
  console.log("[withdraw] POST /api/wallet/withdraw | body:", req.body, "| userId:", req.user?.id);
  const { amountAgt, gcashNumber, gcashName, ewalletType = "gcash", isTestMode = false } = req.body;

  if (!amountAgt || !gcashNumber) {
    console.warn("[withdraw] Missing fields — amountAgt:", amountAgt, "gcashNumber:", gcashNumber);
    return res.status(400).json({ message: "amountAgt and gcashNumber are required" });
  }
  if (parseFloat(amountAgt) <= 0) {
    console.warn("[withdraw] Invalid amount:", amountAgt);
    return res.status(400).json({ message: "Amount must be greater than 0" });
  }

  try {
    const balance = await _getBalance(req.user.walletAddress);
    console.log("[withdraw] On-chain balance:", balance, "| Requested:", amountAgt);

    if (parseFloat(amountAgt) > balance) {
      console.warn("[withdraw] Insufficient balance");
      return res.status(400).json({ message: "Insufficient AGT balance" });
    }

    // Use 1:1 ratio in test mode, real rate in live mode
    const rate      = isTestMode ? 1 : await _getRate();
    const amountPhp = (parseFloat(amountAgt) * rate).toFixed(2);
    console.log("[withdraw] AGT:", amountAgt, "| PHP:", amountPhp, "| rate:", rate, "| testMode:", isTestMode);

    const tx = await WalletTransaction.create({
      userId:        req.user.id,
      walletAddress: req.user.walletAddress,
      type:          "WITHDRAW",
      amountAgt:     parseFloat(amountAgt),
      amountPhp,
      gcashNumber,
      gcashName:     gcashName ?? "",
      ewalletType,
      isTestMode,
      status:        "PENDING",
    });
    console.log("[withdraw] WalletTransaction created, id:", tx.id);

    // Burn AGT on-chain immediately for both modes
    const txHash = await _burn(req.user.walletAddress, amountAgt);
    console.log("[withdraw] ✅ Burned AGT | txHash:", txHash);

    if (isTestMode) {
      // Test mode — auto-complete, no real payout
      await tx.update({ status: "COMPLETED", txHash });
      console.log("[withdraw] ✅ Test withdraw completed");
      return res.status(201).json({
        message:       "Test withdrawal successful. AGT burned at 1:1 ratio.",
        transactionId: tx.id,
        amountAgt,
        amountPhp,
        txHash,
        status:        "COMPLETED",
      });
    }

    // Live mode — stays PENDING, admin handles GCash payout
    await tx.update({ txHash });
    console.log("[withdraw] ✅ Live withdraw pending admin payout");
    res.status(201).json({
      message:       "Withdrawal request submitted. GCash will be sent within 1–2 hours.",
      transactionId: tx.id,
      amountAgt,
      amountPhp,
      txHash,
      status:        "PENDING",
    });
  } catch (e) {
    console.error("[withdraw] Error:", e.message);
    res.status(500).json({ message: "Failed to submit withdrawal" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/wallet/admin/approve/:id
// ─────────────────────────────────────────────────────────────────────────────
export const adminApprove = async (req, res) => {
  console.log("[adminApprove] PATCH /api/wallet/admin/approve/:id | id:", req.params.id);
  try {
    const tx = await WalletTransaction.findByPk(parseInt(req.params.id));
    console.log("[adminApprove] Transaction found:", tx ? `id=${tx.id} type=${tx.type} status=${tx.status}` : "NOT FOUND");

    if (!tx)                     return res.status(404).json({ message: "Transaction not found" });
    if (tx.status !== "PENDING") return res.status(400).json({ message: "Transaction already processed" });
    if (tx.type !== "WITHDRAW")  return res.status(400).json({ message: "Only withdrawals need manual approval" });

    await tx.update({ status: "COMPLETED" });
    console.log("[adminApprove] ✅ Withdrawal marked as COMPLETED");
    res.json({ message: "Withdrawal marked as completed." });
  } catch (e) {
    console.error("[adminApprove] Error:", e.message);
    res.status(500).json({ message: "Failed to approve transaction" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/wallet/admin/reject/:id
// ─────────────────────────────────────────────────────────────────────────────
export const adminReject = async (req, res) => {
  console.log("[adminReject] PATCH /api/wallet/admin/reject/:id | id:", req.params.id, "| reason:", req.body?.reason);
  try {
    const tx = await WalletTransaction.findByPk(parseInt(req.params.id));
    console.log("[adminReject] Transaction found:", tx ? `id=${tx.id} status=${tx.status}` : "NOT FOUND");

    if (!tx)                     return res.status(404).json({ message: "Transaction not found" });
    if (tx.status !== "PENDING") return res.status(400).json({ message: "Transaction already processed" });

    await tx.update({ status: "REJECTED", adminNote: req.body.reason ?? "Rejected by admin" });
    console.log("[adminReject] ✅ Transaction REJECTED");
    res.json({ message: "Transaction rejected." });
  } catch (e) {
    console.error("[adminReject] Error:", e.message);
    res.status(500).json({ message: "Failed to reject transaction" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/wallet/admin/pending
// ─────────────────────────────────────────────────────────────────────────────
export const adminGetPending = async (req, res) => {
  console.log("[adminGetPending] GET /api/wallet/admin/pending");
  try {
    const pending = await WalletTransaction.findAll({
      where: { status: "PENDING" },
      order: [["created_at", "ASC"]],
    });
    console.log("[adminGetPending] Found", pending.length, "pending transactions");
    res.json(pending);
  } catch (e) {
    console.error("[adminGetPending] Error:", e.message);
    res.status(500).json({ message: "Failed to fetch pending transactions" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/wallet/admin/all
// ─────────────────────────────────────────────────────────────────────────────
export const adminGetAll = async (req, res) => {
  try {
    const all = await WalletTransaction.findAll({
      order: [["created_at", "DESC"]],
      limit: 100,
    });
    console.log("[adminGetAll] Found", all.length, "transactions");
    res.json(all);
  } catch (e) {
    console.error("[adminGetAll] Error:", e.message);
    res.status(500).json({ message: "Failed to fetch transactions" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/wallet/admin/cancel/:id
// ─────────────────────────────────────────────────────────────────────────────
export const adminCancel = async (req, res) => {
  console.log("[adminCancel] DELETE /api/wallet/admin/cancel/:id | id:", req.params.id);
  try {
    const tx = await WalletTransaction.findByPk(parseInt(req.params.id));
    if (!tx)                     return res.status(404).json({ message: "Transaction not found" });
    if (tx.status !== "PENDING") return res.status(400).json({ message: "Only PENDING transactions can be cancelled" });

    await tx.update({ status: "REJECTED", adminNote: "Cancelled by admin" });
    console.log("[adminCancel] ✅ Transaction cancelled, id:", tx.id);
    res.json({ message: "Transaction cancelled." });
  } catch (e) {
    console.error("[adminCancel] Error:", e.message);
    res.status(500).json({ message: "Failed to cancel transaction" });
  }
};