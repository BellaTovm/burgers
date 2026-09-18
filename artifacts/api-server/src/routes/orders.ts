import { Router, type IRouter } from "express";
import type { Order } from "@workspace/api-zod";
import { CreateOrderBody } from "@workspace/api-zod";
import { getUserScopedClient, SupabaseConfigurationError } from "../lib/supabase";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

/**
 * place_order() signals business failures with tagged messages so they can be
 * turned into something a customer can act on, rather than leaking Postgres
 * internals to the browser.
 */
function friendlyOrderError(raw: string): { status: number; message: string } {
  const [tag, detail] = raw.split(":", 2);

  switch (tag.trim()) {
    case "AUTH_REQUIRED":
      return { status: 401, message: "Please sign in before placing an order." };
    case "EMPTY_ORDER":
      return { status: 400, message: "Your bag is empty." };
    case "MISSING_NAME":
      return { status: 400, message: "Enter the name for the order." };
    case "MISSING_PHONE":
      return { status: 400, message: "Enter a phone number we can reach you on." };
    case "MISSING_ADDRESS":
      return { status: 400, message: "Enter a delivery address." };
    case "INVALID_QUANTITY":
      return { status: 400, message: "Every item needs a quantity of at least one." };
    case "PRODUCT_NOT_FOUND":
      return { status: 400, message: "One of the items is no longer on the menu." };
    case "PRODUCT_UNAVAILABLE":
      return {
        status: 400,
        message: `${detail?.trim() || "An item"} is off the grill right now.`,
      };
    case "INSUFFICIENT_STOCK":
      return {
        status: 400,
        message: `We don't have enough ${detail?.trim() || "of an item"} left. Reduce the quantity and try again.`,
      };
    default:
      return { status: 400, message: "We couldn't place that order." };
  }
}

router.get("/orders", requireAuth, async (req, res) => {
  try {
    // RLS decides the rows: a customer sees their own, a manager or admin
    // sees every order. No extra filtering is needed here.
    const { data, error } = await getUserScopedClient(req.auth!.accessToken)
      .from("orders")
      .select(
        "id, customer_id, customer_name, customer_phone, delivery_address, items, total_price, status, created_at",
      )
      .order("created_at", { ascending: false });

    if (error) throw error;
    res.json((data ?? []) as Order[]);
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) {
      res.status(503).json({ error: error.message });
      return;
    }
    req.log.error({ err: error }, "Unable to load orders");
    res.status(500).json({ error: "Unable to load your orders right now." });
  }
});

router.post("/orders", requireAuth, async (req, res) => {
  const parsed = CreateOrderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: "Enter a name, phone number and delivery address, and add at least one item.",
    });
    return;
  }

  try {
    // Everything happens inside place_order(): prices come from the database,
    // stock is checked and decremented, and the order is written — all in one
    // transaction. The client never gets to choose a total.
    const { data, error } = await getUserScopedClient(req.auth!.accessToken).rpc(
      "place_order",
      {
        p_items: parsed.data.items,
        p_customer_name: parsed.data.customer_name,
        p_customer_phone: parsed.data.customer_phone,
        p_delivery_address: parsed.data.delivery_address,
      },
    );

    if (error) {
      const { status, message } = friendlyOrderError(error.message ?? "");
      // Genuine faults are worth a log line; rejected orders are routine.
      if (status >= 500) {
        req.log.error({ err: error }, "place_order failed");
      } else {
        req.log.info({ reason: error.message }, "Order rejected");
      }
      res.status(status).json({ error: message });
      return;
    }

    res.status(201).json(data as Order);
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) {
      res.status(503).json({ error: error.message });
      return;
    }
    req.log.error({ err: error }, "Unable to place order");
    res.status(500).json({ error: "Unable to place your order right now." });
  }
});

export default router;
