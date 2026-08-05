import { Router, type IRouter } from "express";
import { eq, sql, desc } from "drizzle-orm";
import { db, moviesTable, votesTable } from "@workspace/db";
import {
  CreateMovieBody,
  UpdateMovieBody,
  GetMovieParams,
  UpdateMovieParams,
  DeleteMovieParams,
  GetMyVoteParams,
  CastVoteParams,
  CastVoteBody,
} from "@workspace/api-zod";
import { verifyAdminToken } from "../lib/auth";

const router: IRouter = Router();

/**
 * Возвращает идентификатор голосующего.
 * Приоритет: X-Voter-ID (UUID из localStorage, VPN-safe) → X-Forwarded-For → socket IP.
 * Voter ID хранится в колонке ipAddress — тип text, обратная совместимость полная.
 */
function getVoterIdentifier(req: import("express").Request): string {
  const voterIdHeader = req.headers["x-voter-id"];
  if (voterIdHeader && typeof voterIdHeader === "string" && /^[0-9a-f-]{36}$/i.test(voterIdHeader)) {
    return `vid:${voterIdHeader}`;
  }
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(",")[0];
    return ip.trim();
  }
  return req.socket?.remoteAddress ?? "unknown";
}

async function buildMovieWithStats(movie: typeof moviesTable.$inferSelect, voterKey: string) {
  const voteStats = await db
    .select({
      totalVotes: sql<number>`count(*)::int`,
      forCount: sql<number>`count(*) filter (where ${votesTable.voteType} = for)::int`,
      neutralCount: sql<number>`count(*) filter (where ${votesTable.voteType} = neutral)::int`,
      againstCount: sql<number>`count(*) filter (where ${votesTable.voteType} = against)::int`,
    })
    .from(votesTable)
    .where(eq(votesTable.movieId, movie.id));

  const totalVotes = Number(voteStats[0]?.totalVotes ?? 0);
  const forCount = Number(voteStats[0]?.forCount ?? 0);
  const neutralCount = Number(voteStats[0]?.neutralCount ?? 0);
  const againstCount = Number(voteStats[0]?.againstCount ?? 0);

  const forPercent = totalVotes > 0 ? Math.round((forCount / totalVotes) * 100) : 0;
  const neutralPercent = totalVotes > 0 ? Math.round((neutralCount / totalVotes) * 100) : 0;
  const againstPercent = totalVotes > 0 ? Math.round((againstCount / totalVotes) * 100) : 0;

  const userVoteResult = await db
    .select({ voteType: votesTable.voteType })
    .from(votesTable)
    .where(sql`${votesTable.movieId} = ${movie.id} AND ${votesTable.ipAddress} = ${voterKey}`);

  const userVote = userVoteResult[0]?.voteType ?? null;

  return {
    id: movie.id,
    title: movie.title,
    description: movie.description,
    imageUrl: movie.imageUrl,
    clipUrl: movie.clipUrl ?? null,
    year: movie.year ?? null,
    createdAt: movie.createdAt.toISOString(),
    totalVotes,
    forCount,
    neutralCount,
    againstCount,
    forPercent,
    neutralPercent,
    againstPercent,
    expectationPercent: forPercent,
    userVote,
  };
}

// GET /movies
router.get("/movies", async (req, res): Promise<void> => {
  const voterKey = getVoterIdentifier(req);
  const movies = await db.select().from(moviesTable).orderBy(desc(moviesTable.createdAt));
  const moviesWithStats = await Promise.all(movies.map(m => buildMovieWithStats(m, voterKey)));
  res.json(moviesWithStats);
});

// POST /movies (admin)
router.post("/movies", verifyAdminToken, async (req, res): Promise<void> => {
  const parsed = CreateMovieBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const body = parsed.data;
  const [movie] = await db
    .insert(moviesTable)
    .values({
      title: body.title,
      description: body.description,
      imageUrl: body.imageUrl,
      clipUrl: body.clipUrl ?? null,
      year: body.year ?? null,
    })
    .returning();
  res.status(201).json({
    id: movie!.id,
    title: movie!.title,
    description: movie!.description,
    imageUrl: movie!.imageUrl,
    clipUrl: movie!.clipUrl ?? null,
    year: movie!.year ?? null,
    createdAt: movie!.createdAt.toISOString(),
  });
});

// GET /movies/:id
router.get("/movies/:id", async (req, res): Promise<void> => {
  const params = GetMovieParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid movie id" });
    return;
  }
  const voterKey = getVoterIdentifier(req);
  const [movie] = await db.select().from(moviesTable).where(eq(moviesTable.id, params.data.id));
  if (!movie) {
    res.status(404).json({ error: "Фильм не найден" });
    return;
  }
  const result = await buildMovieWithStats(movie, voterKey);
  res.json(result);
});

// PATCH /movies/:id (admin)
router.patch("/movies/:id", verifyAdminToken, async (req, res): Promise<void> => {
  const params = UpdateMovieParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid movie id" });
    return;
  }
  const parsed = UpdateMovieBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const body = parsed.data;
  const [movie] = await db
    .update(moviesTable)
    .set({
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.imageUrl !== undefined ? { imageUrl: body.imageUrl } : {}),
      ...(body.clipUrl !== undefined ? { clipUrl: body.clipUrl } : {}),
      ...(body.year !== undefined ? { year: body.year } : {}),
    })
    .where(eq(moviesTable.id, params.data.id))
    .returning();
  if (!movie) {
    res.status(404).json({ error: "Фильм не найден" });
    return;
  }
  res.json({
    id: movie.id,
    title: movie.title,
    description: movie.description,
    imageUrl: movie.imageUrl,
    clipUrl: movie.clipUrl ?? null,
    year: movie.year ?? null,
    createdAt: movie.createdAt.toISOString(),
  });
});

// DELETE /movies/:id (admin)
router.delete("/movies/:id", verifyAdminToken, async (req, res): Promise<void> => {
  const params = DeleteMovieParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid movie id" });
    return;
  }
  const [movie] = await db.select({ id: moviesTable.id }).from(moviesTable).where(eq(moviesTable.id, params.data.id));
  if (!movie) {
    res.status(404).json({ error: "Фильм не найден" });
    return;
  }
  await db.delete(moviesTable).where(eq(moviesTable.id, params.data.id));
  res.json({ movieId: params.data.id, deleted: true });
});

// GET /movies/:id/my-vote
router.get("/movies/:id/my-vote", async (req, res): Promise<void> => {
  const params = GetMyVoteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid movie id" });
    return;
  }
  const voterKey = getVoterIdentifier(req);
  const [vote] = await db
    .select({ voteType: votesTable.voteType })
    .from(votesTable)
    .where(sql`${votesTable.movieId} = ${params.data.id} AND ${votesTable.ipAddress} = ${voterKey}`);
  res.json({ movieId: params.data.id, voted: !!vote, voteType: vote?.voteType ?? null });
});

// POST /movies/:id/vote
router.post("/movies/:id/vote", async (req, res): Promise<void> => {
  const params = CastVoteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid movie id" });
    return;
  }
  const parsed = CastVoteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Тип голоса должен быть: for, neutral или against" });
    return;
  }
  const voteType = (parsed.data as unknown as { voteType: string }).voteType;
  if (!["for", "neutral", "against"].includes(voteType)) {
    res.status(400).json({ error: "Тип голоса должен быть: for, neutral или against" });
    return;
  }
  const voterKey = getVoterIdentifier(req);
  const [movie] = await db.select({ id: moviesTable.id }).from(moviesTable).where(eq(moviesTable.id, params.data.id));
  if (!movie) {
    res.status(404).json({ error: "Фильм не найден" });
    return;
  }
  const existingVotes = await db
    .select({ id: votesTable.id })
    .from(votesTable)
    .where(sql`${votesTable.movieId} = ${params.data.id} AND ${votesTable.ipAddress} = ${voterKey}`);
  const isNew = existingVotes.length === 0;
  if (isNew) {
    await db.insert(votesTable).values({ movieId: params.data.id, ipAddress: voterKey, voteType });
  } else {
    await db.update(votesTable).set({ voteType }).where(sql`${votesTable.movieId} = ${params.data.id} AND ${votesTable.ipAddress} = ${voterKey}`);
  }
  res.json({ movieId: params.data.id, voteType, isNew });
});

// DELETE /movies/:id/votes (admin) — сброс статистики, голоса не удаляются без явного подтверждения
router.delete("/movies/:id/votes", verifyAdminToken, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid movie id" }); return; }
  const [movie] = await db.select({ id: moviesTable.id }).from(moviesTable).where(eq(moviesTable.id, id));
  if (!movie) { res.status(404).json({ error: "Фильм не найден" }); return; }
  await db.delete(votesTable).where(eq(votesTable.movieId, id));
  res.json({ movieId: id, deleted: true });
});

export default router;
