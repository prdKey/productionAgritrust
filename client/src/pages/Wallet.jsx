// pages/WalletPage.jsx

import { useState, useEffect, useCallback } from "react";
import { useUserContext } from "../context/UserContext";
import { getBalance } from "../services/agtTokenService.js";
import {
  getWalletRate,
  getWalletTransactions,
  createGcashDeposit,
  createTestDeposit,
  submitWithdraw,
  explorerTx,
  explorerAddr,
} from "../services/walletService.js";
import {
  Wallet, ArrowDownLeft, ArrowUpRight, Copy, Check,
  RefreshCw, CheckCircle2, Clock, AlertCircle,
  ExternalLink, XCircle, Smartphone, FlaskConical,
} from "lucide-react";

const fmt    = (n) => n == null ? "—" : Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 4 });
const fmtPhp = (n) => n == null ? "—" : `₱${Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_STYLE = {
  PENDING:   "bg-amber-100 text-amber-700",
  COMPLETED: "bg-green-100 text-green-700",
  REJECTED:  "bg-red-100   text-red-600",
};
const STATUS_ICON = {
  PENDING:   <Clock size={10} />,
  COMPLETED: <CheckCircle2 size={10} />,
  REJECTED:  <XCircle size={10} />,
};

const EWALLETS = [
  { key: "gcash",   label: "GCash",   color: "bg-blue-500",    text: "text-blue-600",    border: "border-blue-400",    bg: "bg-blue-50"    },
  { key: "maya",    label: "Maya",    color: "bg-green-500",   text: "text-green-600",   border: "border-green-400",   bg: "bg-green-50"   },
  { key: "grabpay", label: "GrabPay", color: "bg-emerald-500", text: "text-emerald-600", border: "border-emerald-400", bg: "bg-emerald-50" },
];

export default function WalletPage() {
  const { user } = useUserContext();

  const [balance,    setBalance]    = useState(null);
  const [rate,       setRate]       = useState(1);
  const [txs,        setTxs]        = useState([]);
  const [loadingBal, setLoadingBal] = useState(false);
  const [loadingTx,  setLoadingTx]  = useState(false);
  const [copied,     setCopied]     = useState(false);
  const [tab,        setTab]        = useState("deposit");

  // ── Test / Live mode toggle ──────────────────────────────────────────
  const [testMode, setTestMode] = useState(false);

  // deposit
  const [dPhp,     setDPhp]     = useState("");
  const [dAgt,     setDAgt]     = useState("");
  const [dEwallet, setDEwallet] = useState("gcash");
  const [dLoading, setDLoading] = useState(false);
  const [dError,   setDError]   = useState("");
  const [dDone,    setDDone]    = useState(false);
  const [dTxHash,  setDTxHash]  = useState("");

  // withdraw
  const [wAgt,     setWAgt]     = useState("");
  const [wPhp,     setWPhp]     = useState("");
  const [wEwallet, setWEwallet] = useState("gcash");
  const [wNumber,  setWNumber]  = useState("");
  const [wName,    setWName]    = useState("");
  const [wLoading, setWLoading] = useState(false);
  const [wError,   setWError]   = useState("");
  const [wDone,    setWDone]    = useState(false);

  // ── Fetchers ──────────────────────────────────────────────────────────
  const loadBalance = useCallback(async () => {
    if (!user?.walletAddress) return;
    setLoadingBal(true);
    try   { setBalance(parseFloat(await getBalance(user.walletAddress))); }
    catch { /* silent */ }
    finally { setLoadingBal(false); }
  }, [user?.walletAddress]);

  const loadRate = useCallback(async () => {
    try { setRate(await getWalletRate()); } catch { /* silent */ }
  }, []);

  const loadTxs = useCallback(async () => {
    setLoadingTx(true);
    try   { setTxs(await getWalletTransactions()); }
    catch { /* silent */ }
    finally { setLoadingTx(false); }
  }, []);

  useEffect(() => { loadBalance(); loadRate(); loadTxs(); }, [loadBalance, loadRate, loadTxs]);

  // ── PHP ↔ AGT sync ─────────────────────────────────────────────────
  // In test mode always 1:1, in live mode use real rate
  const effectiveRate = testMode ? 1 : rate;

  const clean  = (v) => v.replace(/[^0-9.]/g, "");
  const onDPhp = (v) => { const c = clean(v); setDPhp(c); setDAgt(c ? (parseFloat(c) / effectiveRate).toFixed(4) : ""); };
  const onDAgt = (v) => { const c = clean(v); setDAgt(c); setDPhp(c ? (parseFloat(c) * effectiveRate).toFixed(2) : ""); };
  const onWAgt = (v) => { const c = clean(v); setWAgt(c); setWPhp(c ? (parseFloat(c) * effectiveRate).toFixed(2) : ""); };
  const onWPhp = (v) => { const c = clean(v); setWPhp(c); setWAgt(c ? (parseFloat(c) / effectiveRate).toFixed(4) : ""); };

  // Recalculate derived fields when mode switches
  useEffect(() => {
    if (dPhp) setDAgt((parseFloat(dPhp) / effectiveRate).toFixed(4));
    if (wAgt) setWPhp((parseFloat(wAgt) * effectiveRate).toFixed(2));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [testMode]);

  const copyAddr = () => {
    navigator.clipboard.writeText(user.walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // ── DEPOSIT ───────────────────────────────────────────────────────────
  const handleDeposit = async () => {
    setDError(""); setDLoading(true);
    try {
      if (testMode) {
        // Test mode — direct mint, no PayMongo
        const res = await createTestDeposit(parseFloat(dPhp), dEwallet);
        setDTxHash(res.txHash ?? "");
        setDDone(true);
        setDPhp(""); setDAgt("");
        loadBalance();
        loadTxs();
      } else {
        // Live mode — open PayMongo checkout
        const { checkoutUrl } = await createGcashDeposit(parseFloat(dPhp));
        window.open(checkoutUrl, "_blank");
      }
    } catch (e) {
      setDError(e.response?.data?.message ?? "Failed to process deposit. Try again.");
    } finally {
      setDLoading(false);
    }
  };

  // ── WITHDRAW ──────────────────────────────────────────────────────────
  const handleWithdraw = async () => {
    setWError(""); setWLoading(true);
    try {
      await submitWithdraw({
        amountAgt:   parseFloat(wAgt),
        gcashNumber: wNumber,
        gcashName:   wName,
        ewalletType: wEwallet,
        isTestMode:  testMode,
      });
      setWDone(true);
      setWAgt(""); setWPhp(""); setWNumber(""); setWName("");
      loadBalance();
      loadTxs();
    } catch (e) {
      setWError(e.response?.data?.message ?? "Failed to submit withdrawal.");
    } finally {
      setWLoading(false);
    }
  };

  const switchTab = (t) => {
    setTab(t);
    setDError(""); setDDone(false); setDTxHash("");
    setWError(""); setWDone(false);
  };

  const toggleTestMode = () => {
    setTestMode((v) => !v);
    setDError(""); setDDone(false); setDTxHash("");
    setWError(""); setWDone(false);
    setDPhp(""); setDAgt("");
    setWAgt(""); setWPhp("");
  };

  const selectedDepWallet  = EWALLETS.find(w => w.key === dEwallet);
  const selectedWithWallet = EWALLETS.find(w => w.key === wEwallet);

  const minDeposit    = testMode ? 1   : 100;
  const minDepositMsg = testMode ? "₱1" : "₱100";

  return (
    <div className="min-h-screen bg-[#f4f6f4] pb-16" style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet" />

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">

        {/* ── Balance Card ──────────────────────────────────────────────── */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-green-700 via-green-600 to-emerald-500 p-6 text-white shadow-2xl shadow-green-300/40">
          <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-white/5" />
          <div className="absolute -bottom-8  -left-8  w-32 h-32 rounded-full bg-black/10" />
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2 text-green-200 text-xs font-semibold uppercase tracking-widest">
                <Wallet size={14} /> AGT Wallet
              </div>
              <button onClick={loadBalance} disabled={loadingBal}
                className="flex items-center gap-1.5 bg-white/10 hover:bg-white/20 transition-colors rounded-full px-2.5 py-1 text-[11px] font-medium">
                <RefreshCw size={11} className={loadingBal ? "animate-spin" : ""} /> Refresh
              </button>
            </div>
            <div className="mb-1 flex items-end gap-2">
              <span className="text-4xl font-bold tracking-tight">{loadingBal ? "..." : fmt(balance)}</span>
              <span className="text-xl text-green-200 font-semibold mb-0.5">AGT</span>
            </div>
            <p className="text-green-300 text-sm mb-5">
              ≈ {fmtPhp(balance != null ? balance * rate : null)} PHP
              <span className="ml-2 text-green-400 text-xs">(1 AGT = ₱{rate})</span>
            </p>
            {user?.walletAddress && (
              <div className="flex items-center gap-2 bg-black/20 rounded-xl px-3 py-2">
                <span className="text-[11px] font-mono text-green-100 truncate flex-1">{user.walletAddress}</span>
                <button onClick={copyAddr} className="text-green-300 hover:text-white transition-colors flex-shrink-0">
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                </button>
                <a href={explorerAddr(user.walletAddress)} target="_blank" rel="noreferrer"
                  className="text-green-300 hover:text-white transition-colors flex-shrink-0">
                  <ExternalLink size={13} />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* ── Test / Live Mode Toggle ───────────────────────────────────── */}
        <div className={`flex items-center justify-between rounded-2xl border px-4 py-3 transition-colors
          ${testMode ? "bg-amber-50 border-amber-200" : "bg-white border-gray-100 shadow-sm"}`}>
          <div className="flex items-center gap-2">
            <FlaskConical size={15} className={testMode ? "text-amber-500" : "text-gray-400"} />
            <div>
              <p className={`text-xs font-bold ${testMode ? "text-amber-700" : "text-gray-700"}`}>
                {testMode ? "Test Mode" : "Live Mode"}
              </p>
              <p className={`text-[10px] ${testMode ? "text-amber-500" : "text-gray-400"}`}>
                {testMode
                  ? "1:1 ratio · Direct mint/burn · No real payment"
                  : "Real PayMongo payment · Rate from DB"}
              </p>
            </div>
          </div>
          {/* Toggle switch */}
          <button
            onClick={toggleTestMode}
            className={`relative w-11 h-6 rounded-full transition-colors focus:outline-none
              ${testMode ? "bg-amber-400" : "bg-gray-200"}`}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform
              ${testMode ? "translate-x-5" : "translate-x-0"}`} />
          </button>
        </div>

        {/* ── Tab Switcher ──────────────────────────────────────────────── */}
        <div className="flex gap-2 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100">
          {[
            { key: "deposit",  label: "Deposit",  icon: <ArrowDownLeft size={15} /> },
            { key: "withdraw", label: "Withdraw", icon: <ArrowUpRight  size={15} /> },
          ].map((t) => (
            <button key={t.key} onClick={() => switchTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all
                ${tab === t.key
                  ? t.key === "deposit" ? "bg-green-600 text-white shadow-md shadow-green-200" : "bg-red-500 text-white shadow-md shadow-red-200"
                  : "text-gray-400 hover:bg-gray-50"}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* DEPOSIT                                                        */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {tab === "deposit" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">

            {dDone ? (
              /* ── Test deposit success screen ── */
              <div className="text-center py-4 space-y-3">
                <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={28} className="text-green-600" />
                </div>
                <h3 className="text-base font-bold text-gray-800">Deposit Successful!</h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  AGT has been minted directly to your wallet at 1:1 ratio.
                </p>
                {dTxHash && (
                  <a href={explorerTx(dTxHash)} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-blue-500 hover:text-blue-700 transition-colors">
                    <ExternalLink size={11} /> View on-chain
                  </a>
                )}
                <button onClick={() => { setDDone(false); setDTxHash(""); }}
                  className="w-full py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                  New Deposit
                </button>
              </div>
            ) : (
              <>
                <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  {testMode
                    ? <><FlaskConical size={16} className="text-amber-500" /> Test Deposit (1:1 · Direct Mint)</>
                    : <><Smartphone size={16} className="text-blue-500" /> Pay via E-Wallet</>}
                </p>

                {/* E-wallet selector — clickable in test mode, display-only in live mode */}
                <div className="flex gap-2">
                  {EWALLETS.map((w) => (
                    testMode ? (
                      <button key={w.key} onClick={() => setDEwallet(w.key)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-semibold transition-all
                          ${dEwallet === w.key
                            ? `${w.color} text-white border-transparent shadow-sm`
                            : `bg-gray-50 text-gray-500 border-gray-200 hover:${w.border}`}`}>
                        <span className={`w-2 h-2 rounded-full ${dEwallet === w.key ? "bg-white" : w.color}`} />
                        {w.label}
                      </button>
                    ) : (
                      <div key={w.key}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl border text-xs font-semibold ${w.bg} ${w.border} ${w.text}`}>
                        <span className={`w-2 h-2 rounded-full ${w.color}`} />
                        {w.label}
                      </div>
                    )
                  ))}
                </div>

                <DualInput
                  php={dPhp} agt={dAgt}
                  onPhp={onDPhp} onAgt={onDAgt}
                  rate={effectiveRate}
                  testMode={testMode}
                />

                {/* Quick amounts */}
                <div className="flex gap-2">
                  {(testMode ? [1, 5, 10, 50] : [100, 200, 500, 1000]).map((v) => (
                    <button key={v} onClick={() => onDPhp(String(v))}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-semibold border transition-colors
                        ${dPhp === String(v) ? "bg-green-600 text-white border-green-600" : "bg-gray-50 text-gray-600 border-gray-200 hover:border-green-400"}`}>
                      ₱{v}
                    </button>
                  ))}
                </div>

                {testMode ? (
                  <InfoBox color="yellow" icon={<FlaskConical size={13} />}>
                    <p className="text-xs text-yellow-800">
                      <strong>Test mode:</strong> AGT is minted directly at a <strong>1:1 ratio</strong> with no real payment.
                      Pick any e-wallet above — for simulation only.
                    </p>
                  </InfoBox>
                ) : (
                  <InfoBox color="blue" icon={<AlertCircle size={13} />}>
                    <p className="text-xs text-blue-800">
                      You'll be redirected to <strong>PayMongo</strong> to complete your payment via GCash, Maya, or GrabPay.
                      Once paid, <strong>AGT is automatically credited</strong> to your wallet.
                    </p>
                  </InfoBox>
                )}

                {dError && <ErrorBanner message={dError} />}

                <button onClick={handleDeposit}
                  disabled={!dPhp || parseFloat(dPhp) < minDeposit || dLoading}
                  className={`w-full py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2
                    ${testMode ? "bg-amber-500 hover:bg-amber-600" : "bg-blue-600 hover:bg-blue-700"}`}>
                  {dLoading
                    ? <><RefreshCw size={14} className="animate-spin" />{testMode ? "Minting..." : "Creating payment..."}</>
                    : testMode
                      ? <><FlaskConical size={14} />Mint {dPhp ? fmt(dAgt) + " AGT" : ""} via {selectedDepWallet?.label}</>
                      : <><Smartphone size={14} />Pay {dPhp ? fmtPhp(dPhp) : ""} via E-Wallet</>}
                </button>

                {dPhp && parseFloat(dPhp) < minDeposit && (
                  <p className="text-xs text-red-500 text-center">Minimum deposit is {minDepositMsg}</p>
                )}
              </>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════════════ */}
        {/* WITHDRAW                                                       */}
        {/* ══════════════════════════════════════════════════════════════ */}
        {tab === "withdraw" && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            {wDone ? (
              <div className="text-center py-4 space-y-3">
                <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto">
                  <CheckCircle2 size={28} className="text-green-600" />
                </div>
                <h3 className="text-base font-bold text-gray-800">
                  {testMode ? "Test Withdrawal Complete!" : "Withdrawal Requested!"}
                </h3>
                <p className="text-xs text-gray-500 leading-relaxed">
                  {testMode
                    ? "AGT has been burned from your wallet at 1:1 ratio. No real payout was made."
                    : "Your request is under review. E-Wallet payment will be sent within 1–2 hours during business hours."}
                </p>
                <button onClick={() => setWDone(false)}
                  className="w-full py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
                  New Withdrawal
                </button>
              </div>
            ) : (
              <>
                <p className="text-sm font-bold text-gray-800 flex items-center gap-2">
                  {testMode
                    ? <><FlaskConical size={16} className="text-amber-500" /> Test Withdrawal (1:1 · Direct Burn)</>
                    : <><ArrowUpRight size={16} className="text-red-500" /> Withdraw to E-Wallet</>}
                </p>

                <DualInput
                  php={wPhp} agt={wAgt}
                  onPhp={onWPhp} onAgt={onWAgt}
                  rate={effectiveRate}
                  withdrawMode
                  maxAgt={balance}
                  testMode={testMode}
                />

                {/* E-Wallet selector */}
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-2">
                    E-Wallet <span className="text-red-400">*</span>
                  </label>
                  <div className="flex gap-2">
                    {EWALLETS.map((w) => (
                      <button key={w.key} onClick={() => setWEwallet(w.key)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-xs font-semibold transition-all
                          ${wEwallet === w.key
                            ? `${w.color} text-white border-transparent shadow-sm`
                            : `bg-gray-50 text-gray-600 border-gray-200 hover:${w.border}`}`}>
                        <span className={`w-2 h-2 rounded-full ${wEwallet === w.key ? "bg-white" : w.color}`} />
                        {w.label}
                      </button>
                    ))}
                  </div>
                </div>

                <Field label={`${selectedWithWallet?.label} Number`} required>
                  <input value={wNumber} onChange={(e) => setWNumber(e.target.value)}
                    placeholder="09XX XXX XXXX"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100" />
                </Field>

                <Field label="Account Name">
                  <input value={wName} onChange={(e) => setWName(e.target.value)}
                    placeholder="Optional but recommended"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100" />
                </Field>

                {testMode ? (
                  <InfoBox color="yellow" icon={<FlaskConical size={13} />}>
                    <p className="text-xs text-yellow-800">
                      <strong>Test mode:</strong> AGT will be burned at <strong>1:1 ratio</strong>. No real GCash payout is made.
                    </p>
                  </InfoBox>
                ) : (
                  <InfoBox color="yellow" icon={<AlertCircle size={13} />}>
                    <p className="text-xs text-yellow-800">
                      Double-check your {selectedWithWallet?.label} number. Withdrawals to wrong numbers <strong>cannot be reversed</strong>.
                    </p>
                  </InfoBox>
                )}

                {wError && <ErrorBanner message={wError} />}

                <button onClick={handleWithdraw}
                  disabled={!wAgt || parseFloat(wAgt) <= 0 || !wNumber || wLoading || (balance != null && parseFloat(wAgt) > balance)}
                  className={`w-full py-3 rounded-xl text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2
                    ${testMode ? "bg-amber-500 hover:bg-amber-600" : "bg-red-500 hover:bg-red-600"}`}>
                  {wLoading
                    ? <><RefreshCw size={14} className="animate-spin" />{testMode ? "Burning..." : "Processing..."}</>
                    : testMode
                      ? <><FlaskConical size={14} />Burn {wAgt ? fmt(wAgt) + " AGT" : ""} via {selectedWithWallet?.label}</>
                      : `Withdraw ${wAgt ? fmt(wAgt) + " AGT" : ""} via ${selectedWithWallet?.label}`}
                </button>

                {balance != null && wAgt && parseFloat(wAgt) > balance && (
                  <p className="text-xs text-red-500 text-center font-medium">
                    Insufficient balance. You only have {fmt(balance)} AGT.
                  </p>
                )}
              </>
            )}
          </div>
        )}

        {/* ── Transaction History ───────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-50">
            <h3 className="text-sm font-bold text-gray-800">Transactions</h3>
            <button onClick={loadTxs} disabled={loadingTx} className="text-gray-400 hover:text-green-600 transition-colors">
              <RefreshCw size={13} className={loadingTx ? "animate-spin" : ""} />
            </button>
          </div>

          {loadingTx  && <div className="py-8 text-center text-xs text-gray-400">Loading...</div>}
          {!loadingTx && txs.length === 0 && <div className="py-10 text-center text-xs text-gray-400">No transactions yet.</div>}

          <div className="divide-y divide-gray-50">
            {txs.map((tx) => (
              <div key={tx.id} className="flex items-center gap-3 px-5 py-3.5">
                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0
                  ${tx.type === "DEPOSIT" ? "bg-green-100" : "bg-red-100"}`}>
                  {tx.type === "DEPOSIT"
                    ? <ArrowDownLeft size={15} className="text-green-600" />
                    : <ArrowUpRight  size={15} className="text-red-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 flex items-center gap-1.5 flex-wrap">
                    {tx.type === "DEPOSIT" ? "Deposit" : "Withdraw"} via E-Wallet
                    {tx.ewalletType && (
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full capitalize">
                        {tx.ewalletType}
                      </span>
                    )}
                    {tx.isTestMode && (
                      <span className="text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                        <FlaskConical size={9} /> test
                      </span>
                    )}
                  </p>
                  <p className="text-[10px] text-gray-400 font-mono truncate">{tx.referenceNo ?? "—"}</p>
                  <p className="text-[10px] text-gray-400">{new Date(tx.created_at).toLocaleString("en-PH")}</p>
                </div>
                <div className="text-right flex-shrink-0 space-y-1">
                  <p className={`text-sm font-bold ${tx.type === "DEPOSIT" ? "text-green-600" : "text-red-500"}`}>
                    {tx.type === "DEPOSIT" ? "+" : "-"}{fmt(tx.amountAgt)} AGT
                  </p>
                  <p className="text-[10px] text-gray-400">{fmtPhp(tx.amountPhp)}</p>
                  <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_STYLE[tx.status]}`}>
                    {STATUS_ICON[tx.status]} {tx.status}
                  </span>
                  {tx.txHash && (
                    <a href={explorerTx(tx.txHash)} target="_blank" rel="noreferrer"
                      className="flex items-center justify-end gap-0.5 text-[10px] text-blue-400 hover:text-blue-600 transition-colors">
                      <ExternalLink size={9} /> on-chain
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function DualInput({ php, agt, onPhp, onAgt, rate, withdrawMode = false, maxAgt, testMode = false }) {
  const ring = withdrawMode
    ? testMode ? "focus:border-amber-400 focus:ring-amber-100" : "focus:border-red-400 focus:ring-red-100"
    : testMode ? "focus:border-amber-400 focus:ring-amber-100" : "focus:border-green-500 focus:ring-green-100";

  return (
    <div className="space-y-2">
      <div>
        <label className="block text-xs font-semibold text-gray-600 mb-1">
          PHP Amount <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-bold select-none">₱</span>
          <input value={php} onChange={(e) => onPhp(e.target.value)} placeholder="0.00"
            className={`w-full border border-gray-200 rounded-xl pl-8 pr-4 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 ${ring}`} />
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-semibold text-gray-600">
            AGT Amount{" "}
            <span className="text-gray-400 font-normal">
              {testMode ? "(1:1 — test mode)" : `(@ ₱${rate}/AGT)`}
            </span>
          </label>
          {withdrawMode && maxAgt != null && (
            <button type="button" onClick={() => onAgt(String(maxAgt))}
              className="text-[10px] text-green-600 font-semibold hover:underline">
              Max: {maxAgt} AGT
            </button>
          )}
        </div>
        <div className="relative">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 text-[11px] font-bold select-none">AGT</span>
          <input value={agt} onChange={(e) => onAgt(e.target.value)} placeholder="0.0000"
            className={`w-full border border-gray-200 rounded-xl pl-10 pr-4 py-2.5 text-sm font-mono font-semibold focus:outline-none focus:ring-2 ${ring}`} />
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">
        {label} {required && <span className="text-red-400">*</span>}
      </label>
      {children}
    </div>
  );
}

function InfoBox({ color, icon, children }) {
  const c = {
    blue:   "bg-blue-50   border-blue-200",
    yellow: "bg-yellow-50 border-yellow-200",
    green:  "bg-green-50  border-green-200",
    red:    "bg-red-50    border-red-200",
  };
  return (
    <div className={`flex items-start gap-2.5 rounded-xl border p-3 ${c[color]}`}>
      <span className="flex-shrink-0 mt-0.5 text-gray-500">{icon}</span>
      <div>{children}</div>
    </div>
  );
}

function ErrorBanner({ message }) {
  return (
    <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
      <AlertCircle size={14} className="text-red-500 flex-shrink-0" />
      <p className="text-xs text-red-600 font-medium">{message}</p>
    </div>
  );
}