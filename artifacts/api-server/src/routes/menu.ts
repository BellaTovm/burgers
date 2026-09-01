import { Router, type IRouter } from "express";
import { getSupabaseClient, SupabaseConfigurationError } from "../lib/supabase";

const router: IRouter = Router();

router.get("/categories", async (req, res) => {
  try {
    const { data, error } = await getSupabaseClient()
      .from("categories")
      .select("id, name, slug")
      .order("name");
    if (error) throw error;
    res.json(data ?? []);
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) {
      res.status(503).json({ error: error.message });
      return;
    }
    req.log.error({ err: error }, "Unable to load categories");
    res.status(500).json({ error: "Unable to load the menu categories." });
  }
});

router.get("/products", async (req, res) => {
  try {
    const supabase = getSupabaseClient();
    let query = supabase
      .from("products")
      .select("id, category_id, name, price, description, image_url, stock_count, is_available")
      .eq("is_available", true)
      .gt("stock_count", 0)
      .order("name");

    const category = typeof req.query.category === "string" ? req.query.category : null;
    if (category) {
      const { data: categoryRow, error: categoryError } = await supabase
        .from("categories")
        .select("id")
        .eq("slug", category)
        .maybeSingle();
      if (categoryError) throw categoryError;
      if (!categoryRow) {
        res.json([]);
        return;
      }
      query = query.eq("category_id", categoryRow.id);
    }

    const { data, error } = await query;
    if (error) throw error;
    res.json(data ?? []);
  } catch (error) {
    if (error instanceof SupabaseConfigurationError) {
      res.status(503).json({ error: error.message });
      return;
    }
    req.log.error({ err: error }, "Unable to load products");
    res.status(500).json({ error: "Unable to load the menu right now." });
  }
});

export default router;