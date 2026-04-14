// scheduler/autoRelease.js
import cron from "node-cron";
import { orderManagerContract } from "../blockchain/contract.js";
import { formatUnits } from "ethers";
import { createNotification } from "../controllers/Notification.controller.js";
import { emitOrderStatus } from "../config/socket.js";

const ORDER_STATUS_DELIVERED = 5;

// ─────────────────────────────────────────────────────────────────────────────
// CORE FUNCTION — can be called anytime (startup or cron)
// ─────────────────────────────────────────────────────────────────────────────
const runAutoRelease = async () => {
  console.log("[AutoRelease] Checking delivered orders...");

  try {
    const allOrders = await orderManagerContract.getAllOrders();

    const deliveredOrders = allOrders.filter(
      (o) => Number(o.status) === ORDER_STATUS_DELIVERED
    );

    if (deliveredOrders.length === 0) {
      console.log("[AutoRelease] No delivered orders to check.");
      return;
    }

    console.log(
      `[AutoRelease] Found ${deliveredOrders.length} delivered order(s). Checking eligibility...`
    );

    for (const order of deliveredOrders) {
      const orderId = Number(order.id);

      try {
        // ── Ask the contract if 3 days have passed ──────────────────────────
        const [eligible, secondsLeft] =
          await orderManagerContract.getAutoReleaseStatus(orderId);

        if (!eligible) {
          const hoursLeft = (Number(secondsLeft) / 3600).toFixed(1);
          console.log(
            `[AutoRelease] Order #${orderId} — not yet eligible (${hoursLeft}h left)`
          );
          continue;
        }

        // ── Call autoReleasePayment on the smart contract ───────────────────
        console.log(
          `[AutoRelease] Order #${orderId} — eligible! Releasing payment...`
        );

        const tx = await orderManagerContract.autoReleasePayment(orderId);
        await tx.wait();

        console.log(
          `[AutoRelease] ✅ Order #${orderId} auto-released. TxHash: ${tx.hash}`
        );

        // ── Fetch updated order data ────────────────────────────────────────
        const updatedOrder = await orderManagerContract.getOrderById(orderId);
        const productAmountAGT = formatUnits(
          updatedOrder.totalProductPrice,
          18
        );
        const logisticsFeeAGT = formatUnits(updatedOrder.logisticsFee, 18);

        // ── Notify Seller ───────────────────────────────────────────────────
        await createNotification(updatedOrder.sellerAddress, {
          type: "SUCCESS",
          title: "Payment Auto-Released!",
          message: `Order #${orderId} was automatically completed after 3 days of no response from the buyer. ${productAmountAGT} AGT has been released to your wallet.`,
          orderId,
          recipientRole: "SELLER",
        });

        // ── Notify Buyer ────────────────────────────────────────────────────
        await createNotification(updatedOrder.buyerAddress, {
          type: "INFO",
          title: "Order Auto-Completed",
          message: `Your order #${orderId} was automatically completed after 3 days. Payment has been released to the seller. If you have concerns, please open a dispute.`,
          orderId,
          recipientRole: "BUYER",
        });

        // ── Notify Logistics (if assigned) ─────────────────────────────────
        const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
        const hasLogistics =
          updatedOrder.logisticsAddress.toLowerCase() !==
          ZERO_ADDRESS.toLowerCase();

        if (hasLogistics) {
          await createNotification(updatedOrder.logisticsAddress, {
            type: "SUCCESS",
            title: "Logistics Fee Released!",
            message: `Order #${orderId} has been auto-completed. Your logistics fee of ${logisticsFeeAGT} AGT has been released to your wallet.`,
            orderId,
            recipientRole: "LOGISTICS",
          });
        }

        // ── Emit socket event (status = 6 = Completed) ──────────────────────
        emitOrderStatus(orderId, 6);
      } catch (err) {
        // Don't crash the whole loop — log and continue to next order
        console.error(
          `[AutoRelease] ❌ Failed for Order #${orderId}:`,
          err.reason || err.message
        );
      }
    }

    console.log("[AutoRelease] Check complete.");
  } catch (err) {
    console.error("[AutoRelease] Scheduler error:", err.message);
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// EXPORT — call this once in your server entry point
// ─────────────────────────────────────────────────────────────────────────────
export const startAutoReleaseScheduler = () => {
  // ✅ Run immediately on startup — catches any orders missed during downtime
  runAutoRelease();

  // ✅ Then run every hour
  cron.schedule("0 * * * *", runAutoRelease);

  console.log(
    "[AutoRelease] Scheduler started — runs on startup + every hour."
  );
};