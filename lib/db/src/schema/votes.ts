import { pgTable, text, serial, timestamp, integer, unique } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { moviesTable } from "./movies";

export const votesTable = pgTable("votes", {
  id: serial("id").primaryKey(),
  movieId: integer("movie_id").notNull().references(() => moviesTable.id, { onDelete: "cascade" }),
  ipAddress: text("ip_address").notNull(),
  voteType: text("vote_type").notNull(), // 'for' | 'neutral' | 'against'
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [
  unique("votes_movie_ip_unique").on(table.movieId, table.ipAddress),
]);

export const insertVoteSchema = createInsertSchema(votesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertVote = z.infer<typeof insertVoteSchema>;
export type Vote = typeof votesTable.$inferSelect;
