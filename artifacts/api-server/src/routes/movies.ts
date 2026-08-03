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
      averageScore: sql<number>`coalesce(avg(${votesTable.score})::float, 0)`,
    })
    .from(votesTable)
    .where(eq(votesTable.movieId, movie.id));

  const userVoteRow = await db
    .select({ score: votesTable.score })
    .from(votesTable)
    .where(eq(votesTable.movieId, movie.id))
    .then(rows => rows.find(r => true)); // placeholder - we query by ip below

  const userVoteByIp = await db
    .select({ score: votesTable.score })
    .from(votesTable)
    .where(eq(votesTable.movieId, movie.id))
    .then(rows => rows); // We'll filter by IP in route

  const totalVotes = Number(voteStats[0]?.totalVotes ?? 0);
  const averageScore = Number(voteStats[0]?.averageScore ?? 0);
  const expectationPercent = totalVotes > 0 ? Math.round((averageScore / 10) * 100) : 0;

  // Get user vote by IP
  const userVoteResult = await db
    .select({ score: votesTable.score })
    .from(votesTable)
    .where(sql`${votesTable.movieId} = ${movie.id} AND ${votesTable.ipAddress} = ${userIp}`);

  const userVote = userVoteResult[0]?.score ?? null;

  return {
    id: movie.id,
    title: movie.title,
    description: movie.description,
    imageUrl: movie.imageUrl,
    year: movie.year ?? null,
    createdAt: movie.createdAt.toISOString(),
    totalVotes,
    averageScore: Math.round(averageScore * 10) / 10,
    expectationPercent,
    userVote,
  };
}

// GET /movies — list all with stats
router.get("/movies", async (req, res): Promise<void> => {
  const userIp = getClientIp(req);
  const movies = await db.select().from(moviesTable).orderBy(desc(moviesTable.createdAt));

  const moviesWithStats = await Promise.all(movies.map(m => buildMovieWithStats(m, userIp)));
  res.json(moviesWithStats);
});

// POST /movies — create (admin only)
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

// GET /movies/:id — single movie with stats
router.get("/movies/:id", async (req, res): Promise<void> => {
  const params = GetMovieParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid movie id" });
    return;
  }

  const userIp = getClientIp(req);
  const [movie] = await db
    .select()
    .from(moviesTable)
    .where(eq(moviesTable.id, params.data.id));

  if (!movie) {
    res.status(404).json({ error: "Фильм не найден" });
    return;
  }

  res.json(await buildMovieWithStats(movie, userIp));
});

// PATCH /movies/:id — update (admin only)
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

  const updateData: Record<string, unknown> = {};
  if (parsed.data.title !== undefined) updateData.title = parsed.data.title;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;
  if (parsed.data.imageUrl !== undefined) updateData.imageUrl = parsed.data.imageUrl;
  if (parsed.data.year !== undefined) updateData.year = parsed.data.year;

  const [movie] = await db
    .update(moviesTable)
    .set(updateData)
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

// DELETE /movies/:id — delete (admin only)
router.delete("/movies/:id", verifyAdminToken, async (req, res): Promise<void> => {
  const params = DeleteMovieParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid movie id" });
    return;
  }

  const [deleted] = await db
    .delete(moviesTable)
    .where(eq(moviesTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Фильм не найден" });
    return;
  }

  res.sendStatus(204);
});

// GET /movies/:id/vote — get user's vote
router.get("/movies/:id/vote", async (req, res): Promise<void> => {
  const params = GetMyVoteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid movie id" });
    return;
  }

  const userIp = getClientIp(req);
  const [movie] = await db.select({ id: moviesTable.id }).from(moviesTable).where(eq(moviesTable.id, params.data.id));

  if (!movie) {
    res.status(404).json({ error: "Фильм не найден" });
    return;
  }

  const [vote] = await db
    .select({ score: votesTable.score })
    .from(votesTable)
    .where(sql`${votesTable.movieId} = ${params.data.id} AND ${votesTable.ipAddress} = ${userIp}`);

  res.json({
    movieId: params.data.id,
    voted: !!vote,
    score: vote?.score ?? null,
  });
});

// POST /movies/:id/vote — cast or update vote
router.post("/movies/:id/vote", async (req, res): Promise<void> => {
  const params = CastVoteParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid movie id" });
    return;
  }

  const parsed = CastVoteBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Оценка должна быть числом от 1 до 10" });
    return;
  }

  const score = parsed.data.score;
  if (score < 1 || score > 10) {
    res.status(400).json({ error: "Оценка должна быть от 1 до 10" });
    return;
  }

  const userIp = getClientIp(req);

  const [movie] = await db.select({ id: moviesTable.id }).from(moviesTable).where(eq(moviesTable.id, params.data.id));
  if (!movie) {
    res.status(404).json({ error: "Фильм не найден" });
    return;
  }

  // Upsert vote
  const existingVotes = await db
    .select({ id: votesTable.id })
    .from(votesTable)
    .where(sql`${votesTable.movieId} = ${params.data.id} AND ${votesTable.ipAddress} = ${userIp}`);

  const isNew = existingVotes.length === 0;

  if (isNew) {
    await db.insert(votesTable).values({
      movieId: params.data.id,
      ipAddress: userIp,
      score,
    });
  } else {
    await db
      .update(votesTable)
      .set({ score })
      .where(sql`${votesTable.movieId} = ${params.data.id} AND ${votesTable.ipAddress} = ${userIp}`);
  }

  res.json({
    movieId: params.data.id,
    score,
    isNew,
  });
});

export default router;
