import { Router, type IRouter } from "express";
import { sql, desc } from "drizzle-orm";
import { db, moviesTable, votesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

function getClientIp(req: import("express").Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const ip = Array.isArray(forwarded) ? forwarded[0] : forwarded.split(",")[0];
    return ip.trim();
  }
  return req.socket?.remoteAddress ?? "unknown";
}

// GET /stats
router.get("/stats", async (req, res): Promise<void> => {
  const userIp = getClientIp(req);

  const totalMoviesResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(moviesTable);

  const totalVotesResult = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(votesTable);

  const totalMovies = Number(totalMoviesResult[0]?.count ?? 0);
  const totalVotes = Number(totalVotesResult[0]?.count ?? 0);

  // Top 5 movies by expectation
  const moviesRanked = await db
    .select({
      id: moviesTable.id,
      title: moviesTable.title,
      description: moviesTable.description,
      imageUrl: moviesTable.imageUrl,
      year: moviesTable.year,
      createdAt: moviesTable.createdAt,
      totalVotes: sql<number>`count(${votesTable.id})::int`,
      averageScore: sql<number>`coalesce(avg(${votesTable.score})::float, 0)`,
    })
    .from(moviesTable)
    .leftJoin(votesTable, eq(votesTable.movieId, moviesTable.id))
    .groupBy(moviesTable.id)
    .orderBy(desc(sql`coalesce(avg(${votesTable.score}), 0)`))
    .limit(5);

  const topMovies = await Promise.all(
    moviesRanked.map(async (m) => {
      const totalVotesNum = Number(m.totalVotes ?? 0);
      const avgScore = Number(m.averageScore ?? 0);
      const expectationPercent = totalVotesNum > 0 ? Math.round((avgScore / 10) * 100) : 0;

      const userVoteResult = await db
        .select({ score: votesTable.score })
        .from(votesTable)
        .where(sql`${votesTable.movieId} = ${m.id} AND ${votesTable.ipAddress} = ${userIp}`);

      return {
        id: m.id,
        title: m.title,
        description: m.description,
        imageUrl: m.imageUrl,
        year: m.year ?? null,
        createdAt: m.createdAt.toISOString(),
        totalVotes: totalVotesNum,
        averageScore: Math.round(avgScore * 10) / 10,
        expectationPercent,
        userVote: userVoteResult[0]?.score ?? null,
      };
    })
  );

  res.json({ totalMovies, totalVotes, topMovies });
});

export default router;
