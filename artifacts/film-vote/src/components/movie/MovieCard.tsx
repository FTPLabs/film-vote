import { Link } from "wouter";
import { Film } from "lucide-react";
import type { MovieWithStats } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface MovieCardProps {
  movie: MovieWithStats;
}

const VOTE_LABELS: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
  for:     { label: "За",          color: "text-green-100",  bg: "bg-green-600/90",  emoji: "👍" },
  neutral: { label: "Нейтрально",  color: "text-yellow-100", bg: "bg-yellow-600/90", emoji: "🤔" },
  against: { label: "Против",      color: "text-red-100",    bg: "bg-red-600/90",    emoji: "👎" },
};

export function MovieCard({ movie }: MovieCardProps) {
  const hasVoted = movie.userVote != null;
  const stats = movie as unknown as {
    forPercent: number; neutralPercent: number; againstPercent: number; forCount: number; neutralCount: number; againstCount: number;
  };
  const forPct = stats.forPercent ?? (movie.expectationPercent ?? 0);
  const isHighFor = forPct >= 60;
  const isNew = movie.totalVotes === 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.93 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ y: -6, scale: 1.03 }}
      transition={{ type: "spring", stiffness: 280, damping: 22 }}
      className="group relative flex flex-col bg-card rounded-2xl border shadow-sm hover:shadow-2xl transition-shadow duration-300 overflow-hidden"
    >
      <Link href={`/film/${movie.id}`} className="absolute inset-0 z-10">
        <span className="sr-only">Смотреть {movie.title}</span>
      </Link>

      <div className="aspect-[2/3] w-full relative overflow-hidden bg-muted">
        {movie.imageUrl ? (
          <motion.img
            src={movie.imageUrl}
            alt={`Постер ${movie.title}`}
            className="w-full h-full object-cover"
            loading="lazy"
            whileHover={{ scale: 1.1 }}
            transition={{ duration: 0.5 }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Film className="w-12 h-12 opacity-20" />
          </div>
        )}

        <motion.div
          className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent"
          initial={{ opacity: 0.5 }}
          whileHover={{ opacity: 0.85 }}
          transition={{ duration: 0.3 }}
        />

        {/* Top badges */}
        <div className="absolute top-3 left-3 right-3 flex justify-between items-start z-20">
          {hasVoted && movie.userVote && VOTE_LABELS[movie.userVote] ? (
            <motion.div
              initial={{ scale: 0, opacity: 0, rotate: -10 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
              className={cn(
                "px-2.5 py-1 rounded-full text-xs font-bold backdrop-blur-md border border-white/10 shadow-sm flex items-center gap-1.5",
                VOTE_LABELS[movie.userVote].bg, VOTE_LABELS[movie.userVote].color
              )}
            >
              <span>{VOTE_LABELS[movie.userVote].emoji}</span>
              {VOTE_LABELS[movie.userVote].label}
            </motion.div>
          ) : isNew ? (
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="px-2.5 py-1 rounded-full text-xs font-bold bg-primary/90 text-white backdrop-blur-md border border-white/10 shadow-sm"
            >
              🆕 Новинка
            </motion.div>
          ) : (
            <div />
          )}

          {isHighFor && (
            <motion.div
              animate={{ rotate: [-8, 8, -8], scale: [1, 1.15, 1] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
              className="text-lg drop-shadow"
            >
              🔥
            </motion.div>
          )}
        </div>

        {/* Bottom title */}
        <motion.div
          className="absolute bottom-0 left-0 right-0 p-2 sm:p-4 z-20 text-white"
          initial={{ y: 4, opacity: 0.8 }}
          whileHover={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.2 }}
        >
          <h3 className="font-display font-bold text-sm sm:text-xl leading-tight line-clamp-2 text-white/95 drop-shadow-md">
            {movie.title}
          </h3>
          {movie.year && <p className="text-white/70 text-xs sm:text-sm font-medium mt-0.5 sm:mt-1">{movie.year}</p>}
        </motion.div>
      </div>

      <div className="p-2 sm:p-4 flex flex-col flex-1 z-20 bg-card">
        {/* Vote bar */}
        {movie.totalVotes > 0 ? (
          <div className="mb-2 sm:mb-3">
            <div className="flex h-2 sm:h-2.5 rounded-full overflow-hidden gap-px bg-muted">
              {forPct > 0 && (
                <motion.div
                  className="bg-green-500 rounded-l-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${forPct}%` }}
                  transition={{ duration: 1, ease: "easeOut", delay: 0.1 }}
                  title={`За: ${forPct}%`}
                />
              )}
              {(stats.neutralPercent ?? 0) > 0 && (
                <motion.div
                  className="bg-yellow-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.neutralPercent}%` }}
                  transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                  title={`Нейтрально: ${stats.neutralPercent}%`}
                />
              )}
              {(stats.againstPercent ?? 0) > 0 && (
                <motion.div
                  className="bg-red-500 rounded-r-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.againstPercent}%` }}
                  transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                  title={`Против: ${stats.againstPercent}%`}
                />
              )}
            </div>
            <div className="hidden sm:flex justify-between mt-1.5 text-xs text-muted-foreground">
              <span className="text-green-600 font-semibold">👍 {forPct}%</span>
              <span className="text-yellow-600 font-semibold">🤔 {stats.neutralPercent ?? 0}%</span>
              <span className="text-red-500 font-semibold">👎 {stats.againstPercent ?? 0}%</span>
            </div>
            <div className="flex sm:hidden justify-between mt-1 text-[10px] text-muted-foreground">
              <span className="text-green-600 font-bold">{forPct}%</span>
              <span className="text-yellow-600 font-bold">{stats.neutralPercent ?? 0}%</span>
              <span className="text-red-500 font-bold">{stats.againstPercent ?? 0}%</span>
            </div>
          </div>
        ) : (
          <div className="mb-2 sm:mb-3 text-[10px] sm:text-xs text-muted-foreground italic">Голосов нет</div>
        )}

        <div className="flex items-center justify-between mt-auto pt-0.5 sm:pt-1">
          <div className="flex flex-col">
            <span className="text-[9px] sm:text-xs text-muted-foreground font-medium uppercase tracking-wider">Голосов</span>
            <span className="text-xs sm:text-sm font-semibold">{movie.totalVotes}</span>
          </div>
          <div className="relative z-20">
            <motion.div whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.96 }}>
              <Link
                href={`/film/${movie.id}`}
                className={cn(
                  "inline-flex items-center justify-center rounded-full font-semibold transition-colors",
                  "h-7 px-2 text-[10px] sm:h-9 sm:px-4 sm:text-sm",
                  hasVoted
                    ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                )}
              >
                {hasVoted ? "✏️" : "🗳️"}
                <span className="hidden sm:inline ml-1">{hasVoted ? "Изменить" : "Голосовать"}</span>
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
