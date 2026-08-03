import { Link } from "wouter";
import { ThumbsUp, ThumbsDown, Minus, Film } from "lucide-react";
import type { MovieWithStats } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

interface MovieCardProps {
  movie: MovieWithStats;
}

const VOTE_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  for:     { label: "За",          color: "text-green-100",  bg: "bg-green-600/90" },
  neutral: { label: "Нейтрально",  color: "text-yellow-100", bg: "bg-yellow-600/90" },
  against: { label: "Против",      color: "text-red-100",    bg: "bg-red-600/90" },
};

export function MovieCard({ movie }: MovieCardProps) {
  const hasVoted = movie.userVote != null;
  const stats = movie as unknown as {
    forPercent: number; neutralPercent: number; againstPercent: number; forCount: number; neutralCount: number; againstCount: number;
  };
  const forPct = stats.forPercent ?? (movie.expectationPercent ?? 0);
  const isHighFor = forPct >= 60;

  return (
    <div className="group relative flex flex-col bg-card rounded-2xl border shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden">
      <Link href={`/film/${movie.id}`} className="absolute inset-0 z-10">
        <span className="sr-only">Смотреть {movie.title}</span>
      </Link>

      <div className="aspect-[2/3] w-full relative overflow-hidden bg-muted">
        {movie.imageUrl ? (
          <img
            src={movie.imageUrl}
            alt={`Постер ${movie.title}`}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-muted-foreground">
            <Film className="w-12 h-12 opacity-20" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />

        {/* Top badge — user vote */}
        <div className="absolute top-3 left-3 right-3 flex justify-between items-start z-20">
          {hasVoted && movie.userVote && VOTE_LABELS[movie.userVote] ? (
            <div className={cn(
              "px-2.5 py-1 rounded-full text-xs font-bold backdrop-blur-md border border-white/10 shadow-sm flex items-center gap-1.5",
              VOTE_LABELS[movie.userVote].bg, VOTE_LABELS[movie.userVote].color
            )}>
              {movie.userVote === "for" && <ThumbsUp className="w-3 h-3" />}
              {movie.userVote === "neutral" && <Minus className="w-3 h-3" />}
              {movie.userVote === "against" && <ThumbsDown className="w-3 h-3" />}
              {VOTE_LABELS[movie.userVote].label}
            </div>
          ) : (
            <div />
          )}
        </div>

        {/* Bottom content */}
        <div className="absolute bottom-0 left-0 right-0 p-4 z-20 text-white">
          <h3 className="font-display font-bold text-xl leading-tight line-clamp-2 text-white/95">
            {movie.title}
          </h3>
          {movie.year && <p className="text-white/70 text-sm font-medium mt-1">{movie.year}</p>}
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1 z-20 bg-card">
        {/* Vote bar */}
        {movie.totalVotes > 0 ? (
          <div className="mb-3">
            <div className="flex h-2 rounded-full overflow-hidden gap-px">
              {forPct > 0 && <div className="bg-green-500 transition-all" style={{ width: `${forPct}%` }} title={`За: ${forPct}%`} />}
              {(stats.neutralPercent ?? 0) > 0 && <div className="bg-yellow-400 transition-all" style={{ width: `${stats.neutralPercent}%` }} title={`Нейтрально: ${stats.neutralPercent}%`} />}
              {(stats.againstPercent ?? 0) > 0 && <div className="bg-red-500 transition-all" style={{ width: `${stats.againstPercent}%` }} title={`Против: ${stats.againstPercent}%`} />}
            </div>
            <div className="flex justify-between mt-1 text-xs text-muted-foreground">
              <span className="text-green-600 font-semibold">{forPct}% за</span>
              <span className="text-red-500 font-semibold">{stats.againstPercent ?? 0}% против</span>
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-between mt-auto pt-1">
          <div className="flex flex-col">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Голосов</span>
            <span className="text-sm font-semibold">{movie.totalVotes}</span>
          </div>
          <div className="relative z-20">
            <Link
              href={`/film/${movie.id}`}
              className={cn(
                "inline-flex items-center justify-center h-9 px-4 rounded-full text-sm font-semibold transition-colors",
                hasVoted
                  ? "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                  : "bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
              )}
            >
              {hasVoted ? "Изменить" : "Голосовать"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
