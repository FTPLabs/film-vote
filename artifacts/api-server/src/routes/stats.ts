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

  // Top 5 movies sorted by "for" percentage
  const moviesRanked = await db
    .select({
      id: moviesTable.id,
      title: moviesTable.title,
      description: moviesTable.description,
      imageUrl: moviesTable.imageUrl,
      year: moviesTable.year,
      createdAt: moviesTable.createdAt,
      totalVotes: sql<number>`count(${votesTable.id})::int`,
      forCount: sql<number>`count(${votesTable.id}) filter (where ${votesTable.voteType} = 'for')::int`,
      neutralCount: sql<number>`count(${votesTable.id}) filter (where ${votesTable.voteType} = 'neutral')::int`,
      againstCount: sql<number>`count(${votesTable.id}) filter (where ${votesTable.voteType} = 'against')::int`,
    })
    .from(moviesTable)
    .leftJoin(votesTable, eq(votesTable.movieId, moviesTable.id))
    .groupBy(moviesTable.id)
    .orderBy(desc(sql`count(${votesTable.id}) filter (where ${votesTable.voteType} = 'for')`))
    .limit(5);

  const topMovies = await Promise.all(
    moviesRanked.map(async (m) => {
      const total = Number(m.totalVotes ?? 0);
      const forC = Number(m.forCount ?? 0);
      const neutralC = Number(m.neutralCount ?? 0);
      const againstC = Number(m.againstCount ?? 0);
      const forPercent = total > 0 ? Math.round((forC / total) * 100) : 0;
      const neutralPercent = total > 0 ? Math.round((neutralC / total) * 100) : 0;
      const againstPercent = total > 0 ? Math.round((againstC / total) * 100) : 0;

      const userVoteResult = await db
        .select({ voteType: votesTable.voteType })
        .from(votesTable)
        .where(sql`${votesTable.movieId} = ${m.id} AND ${votesTable.ipAddress} = ${userIp}`);

      return {
        id: m.id,
        title: m.title,
        description: m.description,
        imageUrl: m.imageUrl,
        year: m.year ?? null,
        createdAt: m.createdAt.toISOString(),
        totalVotes: total,
        forCount: forC,
        neutralCount: neutralC,
        againstCount: againstC,
        forPercent,
        neutralPercent,
        againstPercent,
        expectationPercent: forPercent,
        userVote: userVoteResult[0]?.voteType ?? null,
      };
    })
  );

  res.json({ totalMovies, totalVotes, topMovies });
});

export default router;
