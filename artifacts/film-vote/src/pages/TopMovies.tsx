import { useGetStats } from "@workspace/api-client-react";
import { Trophy, Film, Users, ThumbsUp, ThumbsDown, Minus, Medal } from "lucide-react";
import { Link } from "wouter";
import { cn } from "@/lib/utils";

export function TopMovies() {
  const { data: stats, isLoading } = useGetStats();

  if (isLoading) {
    return (
      <div className="w-full h-[60vh] flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-4 text-muted-foreground">
          <Trophy className="w-12 h-12 text-primary/50" />
          <p className="font-medium">Подсчитываем голоса...</p>
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-500 pb-16">
      <div className="text-center space-y-4">
        <div className="inline-flex items-center justify-center p-3 bg-primary/10 text-primary rounded-full mb-2">
          <Trophy className="w-8 h-8" />
        </div>
        <h1 className="text-4xl md:text-5xl font-display font-bold">Топ ожиданий</h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Самые ожидаемые фильмы по версии наших зрителей.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card border rounded-2xl p-6 flex items-center gap-4 shadow-sm">
          <div className="bg-blue-100 text-blue-600 p-4 rounded-xl">
            <Film className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Всего фильмов</p>
            <p className="text-3xl font-display font-bold">{stats.totalMovies}</p>
          </div>
        </div>
        <div className="bg-card border rounded-2xl p-6 flex items-center gap-4 shadow-sm">
          <div className="bg-green-100 text-green-600 p-4 rounded-xl">
            <Users className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-muted-foreground">Всего голосов</p>
            <p className="text-3xl font-display font-bold">{stats.totalVotes}</p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h2 className="text-2xl font-display font-bold flex items-center gap-2">
          <Medal className="w-6 h-6 text-yellow-500" />
          Лидеры рейтинга
        </h2>

        <div className="space-y-4">
          {stats.topMovies.map((movie, index) => {
            const s = movie as unknown as { forCount: number; neutralCount: number; againstCount: number; forPercent: number; neutralPercent: number; againstPercent: number };
            const forPct  = s.forPercent  ?? (movie.expectationPercent ?? 0);
            const neutPct = s.neutralPercent ?? 0;
            const agPct   = s.againstPercent ?? 0;
            return (
              <Link
                key={movie.id}
                href={`/film/${movie.id}`}
                className="group flex items-center gap-4 sm:gap-6 bg-card border rounded-2xl p-4 transition-all hover:shadow-md hover:border-primary/30"
              >
                <div className={cn(
                  "flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full font-display font-bold text-xl",
                  index === 0 ? "bg-yellow-100 text-yellow-700" :
                  index === 1 ? "bg-gray-100 text-gray-700" :
                  index === 2 ? "bg-amber-100 text-amber-800" :
                  "bg-secondary text-muted-foreground"
                )}>
                  {index + 1}
                </div>

                <div className="flex-shrink-0 w-16 h-24 sm:w-20 sm:h-28 bg-muted rounded-lg overflow-hidden relative">
                  {movie.imageUrl ? (
                    <img src={movie.imageUrl} alt={movie.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Film className="w-6 h-6 text-muted-foreground/50" />
                    </div>
                  )}
                </div>

                <div className="flex-grow min-w-0">
                  <h3 className="text-lg sm:text-xl font-display font-bold truncate group-hover:text-primary transition-colors">
                    {movie.title}
                  </h3>
                  {movie.year && <p className="text-sm text-muted-foreground">{movie.year}</p>}
                  {movie.totalVotes > 0 && (
                    <div className="mt-2 space-y-1">
                      <div className="flex h-1.5 rounded-full overflow-hidden gap-px w-full max-w-[160px]">
                        {forPct  > 0 && <div className="bg-green-500" style={{ width: `${forPct}%` }} />}
                        {neutPct > 0 && <div className="bg-yellow-400" style={{ width: `${neutPct}%` }} />}
                        {agPct   > 0 && <div className="bg-red-500" style={{ width: `${agPct}%` }} />}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="flex items-center gap-0.5 text-green-600 font-medium"><ThumbsUp className="w-3 h-3" />{forPct}%</span>
                        <span className="flex items-center gap-0.5 text-yellow-600 font-medium"><Minus className="w-3 h-3" />{neutPct}%</span>
                        <span className="flex items-center gap-0.5 text-red-500 font-medium"><ThumbsDown className="w-3 h-3" />{agPct}%</span>
                      </div>
                    </div>
                  )}
                  <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                    <Users className="w-3.5 h-3.5" />
                    {movie.totalVotes} голосов
                  </div>
                </div>

                <div className="flex-shrink-0 text-right pr-2">
                  <div className="flex items-center justify-end font-bold text-xl sm:text-2xl text-green-600">
                    {forPct}%
                  </div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mt-1">За</p>
                </div>
              </Link>
            );
          })}

          {stats.topMovies.length === 0 && (
            <div className="text-center py-12 bg-secondary/50 rounded-2xl border border-dashed border-border">
              <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground font-medium">Рейтинг пока формируется. Проголосуйте первым!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
