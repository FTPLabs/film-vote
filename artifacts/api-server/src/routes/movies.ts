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

function getClientIp(req: import("express").Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(",")[0];
    return ip.trim();
  }
  return req.socket?.remoteAddress ?? "unknown";
}

async function buildMovieWithStats(movie: typeof moviesTable.$inferSelect, userIp: string) {
  const voteStats = await db
    .select({
      totalVotes: sql<number>`count(*)::int`,
      forCount: sql<number>`count(*) filter (where ${votesTable.voteType} = 'for')::int`,
      neutralCount: sql<number>`count(*) filter (where ${votesTable.voteType} = 'neutral')::int`,
      againstCount: sql<number>`count(*) filter (where ${votesTable.voteType} = 'against')::int`,
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
    .where(sql`${votesTable.movieId} = ${movie.id} AND ${votesTable.ipAddress} = ${userIp}`);

  const userVote = userVoteResult[0]?.voteType ?? null;

  return {
    id: movie.id,
    title: movie.title,
    description: movie.description,
    imageUrl: movie.imageUrl,
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
  const userIp = getClientIp(req);
  const movies = await db.select().from(moviesTable).orderBy(desc(moviesTable.createdAt));
  const moviesWithStats = await Promise.all(movies.map(m => buildMovieWithStats(m, userIp)));
  res.json(moviesWithStats);
});

// POST /movies (admin)
router.post("/movies", verifyAdminToken, async (req, res): Promise<void> => {
  const parsed = CreateMovieBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [movie] = await db
    .insert(moviesTable)
    .values({
      title: parsed.data.title,
      description: parsed.data.description,
      imageUrl: parsed.data.imageUrl,
      year: parsed.data.year ?? null,
    })
    .returning();
  res.status(201).json({
    id: movie!.id,
    title: movie!.title,
    description: movie!.description,
    imageUrl: movie!.imageUrl,
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
  const userIp = getClientIp(req);
  const [movie] = await db.select().from(moviesTable).where(eq(moviesTable.id, params.data.id));
  if (!movie) {
    res.status(404).json({ error: "Фильм не найден" });
    return;
  }
  res.json(await buildMovieWithStats(movie, userIp));
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
  const [movie] = await db
    .update(moviesTable)
    .set({
      title: parsed.data.title,
      description: parsed.data.description,
      imageUrl: parsed.data.imageUrl,
      year: parsed.data.year ?? null,
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
  res.status(204).end();
});

// GET /movies/:id/vote
router.get("/movies/:id/vote", async (req, res): Promise<void> => {
  const params = GetMyVoteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid movie id" });
    return;
  }
  const userIp = getClientIp(req);
  const userVoteResult = await db
    .select({ voteType: votesTable.voteType })
    .from(votesTable)
    .where(sql`${votesTable.movieId} = ${params.data.id} AND ${votesTable.ipAddress} = ${userIp}`);
  const voteType = userVoteResult[0]?.voteType ?? null;
  res.json({
    movieId: params.data.id,
    voted: voteType !== null,
    voteType,
  });
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
  if (!['for', 'neutral', 'against'].includes(voteType)) {
    res.status(400).json({ error: "Тип голоса должен быть: for, neutral или against" });
    return;
  }
  const userIp = getClientIp(req);
  const [movie] = await db.select({ id: moviesTable.id }).from(moviesTable).where(eq(moviesTable.id, params.data.id));
  if (!movie) {
    res.status(404).json({ error: "Фильм не найден" });
    return;
  }
  const existingVotes = await db
    .select({ id: votesTable.id })
    .from(votesTable)
    .where(sql`${votesTable.movieId} = ${params.data.id} AND ${votesTable.ipAddress} = ${userIp}`);
  const isNew = existingVotes.length === 0;
  if (isNew) {
    await db.insert(votesTable).values({
      movieId: params.data.id,
      ipAddress: userIp,
      voteType,
    });
  } else {
    await db
      .update(votesTable)
      .set({ voteType })
      .where(sql`${votesTable.movieId} = ${params.data.id} AND ${votesTable.ipAddress} = ${userIp}`);
  }
  res.json({ movieId: params.data.id, voteType, isNew });
});

// DELETE /movies/:id/votes (admin) — сброс статистики
router.delete("/movies/:id/votes", verifyAdminToken, async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid movie id" }); return; }
  const [movie] = await db.select({ id: moviesTable.id }).from(moviesTable).where(eq(moviesTable.id, id));
  if (!movie) { res.status(404).json({ error: "Фильм не найден" }); return; }
  const result = await db.delete(votesTable).where(eq(votesTable.movieId, id));
  res.json({ movieId: id, deleted: true });
});

export default router;
