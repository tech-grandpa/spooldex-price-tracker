import "dotenv/config";
import express, { type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import {
  listFilaments,
  getFilamentById,
  getOffersForFilament,
  getPriceHistory,
} from "./services/filament-service.js";
import { searchOffers, getMarkets } from "./services/offer-service.js";

const app = express();
app.use(express.json());

// ── Health ──────────────────────────────────────────────────────────────────

app.get("/api/v1/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ── Filaments ───────────────────────────────────────────────────────────────

const filamentQuerySchema = z.object({
  brand: z.string().optional(),
  material: z.string().optional(),
  market: z.string().optional(),
});

app.get("/api/v1/filaments", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = filamentQuerySchema.parse(req.query);
    const filaments = await listFilaments(query);
    res.json({ data: filaments });
  } catch (err) {
    next(err);
  }
});

app.get("/api/v1/filaments/:id", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    const result = await getFilamentById(id);
    if (!result) {
      res.status(404).json({ error: "Filament not found" });
      return;
    }
    res.json({ data: result });
  } catch (err) {
    next(err);
  }
});

app.get("/api/v1/filaments/:id/offers", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const id = z.string().uuid().parse(req.params.id);
    const offers = await getOffersForFilament(id);
    res.json({ data: offers });
  } catch (err) {
    next(err);
  }
});

app.get(
  "/api/v1/filaments/:id/price-history",
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const id = z.string().uuid().parse(req.params.id);
      const limit = z.coerce.number().int().positive().default(90).parse(req.query.limit);
      const history = await getPriceHistory(id, limit);
      res.json({ data: history });
    } catch (err) {
      next(err);
    }
  },
);

// ── Offers ──────────────────────────────────────────────────────────────────

const offerQuerySchema = z.object({
  ean: z.string().optional(),
  q: z.string().optional(),
});

app.get("/api/v1/offers", async (req: Request, res: Response, next: NextFunction) => {
  try {
    const query = offerQuerySchema.parse(req.query);
    const offers = await searchOffers(query);
    res.json({ data: offers });
  } catch (err) {
    next(err);
  }
});

// ── Markets ─────────────────────────────────────────────────────────────────

app.get("/api/v1/markets", async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const markets = await getMarkets();
    res.json({ data: markets });
  } catch (err) {
    next(err);
  }
});

// ── Error handling ──────────────────────────────────────────────────────────

app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof z.ZodError) {
    res.status(400).json({ error: "Validation error", details: err.errors });
    return;
  }

  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

// ── Start ───────────────────────────────────────────────────────────────────

const port = Number(process.env.PORT) || 3100;

app.listen(port, () => {
  console.log(`🚀 Price tracker API running on port ${port}`);
});

export default app;
