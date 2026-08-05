import { Link } from "wouter";
import { Film } from "lucide-react";
import type { MovieWithStats } from "@workspace/api-client-react";
import { useCastVote, getListMoviesQueryKey, getGetMovieQueryKey, getGetMyVoteQueryKey, getGetStatsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import { toast } from "sonner";

interface MovieCardProps {
  movie: MovieWithStats;
}

const VOTE_LABELS: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
  for:     { label: "За",         color: "text-green-100",  bg: "bg-green-600/90",  emoji: "👍" },
  neutral: { label: "Нейтрально", color: "text-yellow-100", bg: "bg-yellow-600/90", emoji: "🤔" },
  against: { label: "Против",     color: "text-red-100",    bg: "bg-red-600/90",    emoji: "👎" },
};

const QUICK_VOTE_OPTIONS = [
  { value: "for" as const,     emoji: "👍", label: "За",      activeClass: "bg-green-500 text-white border-green-500",   idleClass: "bg-muted hover:bg-green-100 hover:border-green-400 dark:hover:bg-green-900/50 border-border" },
  { value: "neutral" as const, emoji: "🤔", label: "Норм",    activeClass: "bg-yellow-500 text-white border-yellow-500", idleClass: "bg-muted hover:bg-yellow-100 hover:border-yellow-400 dark:hover:bg-yellow-900/50 border-border" },
  { value: "against" as const, emoji: "👎", label: "Против",  activeClass: "bg-red-500 text-white border-red-500",       idleClass: "bg-muted hover:bg-red-100 hover:border-red-400 dark:hover:bg-red-900/50 border-border" },
];

export function MovieCard({ movie }: MovieCardProps) {
  const hasVoted = movie.userVote != null;
  const stats = movie as unknown as {
    forPercent: number; neutralPercent: number; againstPercent: number; forCount: number; neutralCount: number; againstCount: number;
  };
  const forPct = stats.forPercent ?? (movie.expectationPercent ?? 0);
  const isHighFor = forPct >= 60;
  const isNew = movie.totalVotes === 0;

  const queryClient = useQueryClient();
  const castVote = useCastVote();

  function handleQuickVote(voteType: "for" | "neutral" | "against") {
    castVote.mutate(
      { id: movie.id, data: { voteType } as unknown as import("@workspace/api-client-react").VoteInput },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getListMoviesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetMovieQueryKey(movie.id) });
          queryClient.invalidateQueries({ queryKey: getGetMyVoteQueryKey(movie.id) });
          queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
          const labels: Record<string, string> = { for: "За 👍", neutral: "Нейтрально 🤔", against: "Против 👎" };
          toast.success(`Голос учтён: ${labels[voteType]}`, { description: movie.title });
        },
        onError: () => {
          toast.error("Ошибка при голосовании");
        },
      }
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.93 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 280, damping: 22 }}
      className="group relative flex flex-col bg-card rounded-2xl border shadow-sm hover:shadow-2xl transition-shadow duration-300 overflow-hidden"
    >
      {/* Poster */}
      <div className="aspect-[2/3] w-full relative overflow-hidden bg-muted">
        <Link href={`/film/${movie.id}`} className="absolute inset-0 z-10">
          <span className="sr-only">Смотреть {movie.title}</span>
        </Link>

        {movie.imageUrl ? (
          <motion.img
            src={movie.imageUrl}
            alt={`Постер ${movie.title}`}
            className="w-full h-full object-cover"
            loading="lazy"
            whileHover={{ scale: 1.07 }}
            transition={{ duration: 0.5 }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Film className="w-12 h-12 opacity-20" />
          </div>
        )}

        <motion.div
          className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"
          initial={{ opacity: 0.5 }}
          whileHover={{ opacity: 0.9 }}
          transition={{ duration: 0.3 }}
        />

        {/* Top badges */}
        <div className="absolute top-2 left-2 right-2 flex justify-between items-start z-20">
          {hasVoted && movie.userVote && VOTE_LABELS[movie.userVote] ? (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={cn(
                "px-2 py-0.5 rounded-full text-xs font-bold backdrop-blur-md border border-white/10 shadow-sm flex items-center gap-1",
                VOTE_LABELS[movie.userVote].bg, VOTE_LABELS[movie.userVote].color
              )}
            >
              {VOTE_LABELS[movie.userVote].emoji} {VOTE_LABELS[movie.userVote].label}
            </motion.div>
          ) : isNew ? (
            <motion.div
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
              className="px-2 py-0.5 rounded-full text-xs font-bold bg-primary/90 text-white backdrop-blur-md border border-white/10 shadow-sm"
            >
              🆕 Новинка
            </motion.div>
          ) : (
            <div />
          )}
          {isHighFor && (
            <motion.div
              animate={{ rotate: [-8, 8, -8], scale: [1, 1.15, 1] }}
              transition={{ repeat: Infinity, duration: 2.5 }}
              className="text-lg leading-none"
            >
              🔥
            </motion.div>
          )}
        </div>

        {/* Bottom overlay: title + year */}
        <div className="absolute bottom-0 left-0 right-0 z-20 px-2 pb-2 pt-6">
          <p className="text-white font-bold text-sm leading-tight line-clamp-2 drop-shadow">{movie.title}</p>
          {movie.year && <p className="text-white/70 text-xs mt-0.5">{movie.year}</p>}
        </div>
      </div>

      {/* Card body */}
      <div className="flex flex-col p-2 gap-1.5 flex-1">
        {/* Vote bar */}
        {movie.totalVotes > 0 ? (
          <div>
            <div className="flex h-1.5 rounded-full overflow-hidden gap-px">
              {forPct > 0 && (
                <motion.div
                  className="bg-green-500 rounded-l-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${forPct}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              )}
              {(stats.neutralPercent ?? 0) > 0 && (
                <motion.div
                  className="bg-yellow-400"
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.neutralPercent}%` }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.15 }}
                />
              )}
              {(stats.againstPercent ?? 0) > 0 && (
                <motion.div
                  className="bg-red-500 rounded-r-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${stats.againstPercent}%` }}
                  transition={{ duration: 0.8, ease: "easeOut", delay: 0.3 }}
                />
              )}
            </div>
            <div className="flex justify-between mt-1 text-[9px] text-muted-foreground">
              <span className="text-green-600 font-bold">{forPct}%</span>
              <span className="text-muted-foreground text-[9px]">{movie.totalVotes} гол.</span>
              <span className="text-red-500 font-bold">{stats.againstPercent ?? 0}%</span>
            </div>
          </div>
        ) : (
          <div className="text-[10px] text-muted-foreground italic">Голосов нет</div>
        )}

        {/* Quick vote buttons */}
        <div className="flex gap-1 mt-auto">
          {QUICK_VOTE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              onClick={() => handleQuickVote(opt.value)}
              disabled={castVote.isPending}
              title={opt.label}
              className={cn(
                "flex-1 flex items-center justify-center gap-0.5 rounded-lg border text-[11px] font-semibold py-1.5 transition-all duration-150 relative z-20",
                movie.userVote === opt.value ? opt.activeClass : opt.idleClass,
                "disabled:opacity-50"
              )}
            >
              <span>{opt.emoji}</span>
              <span className="hidden sm:inline text-[10px]">{opt.label}</span>
            </button>
          ))}
          <Link
            href={`/film/${movie.id}`}
            className="flex items-center justify-center px-2 rounded-lg border border-border bg-muted hover:bg-accent text-[11px] font-semibold transition-all relative z-20"
            title="Подробнее"
          >
            ›
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
