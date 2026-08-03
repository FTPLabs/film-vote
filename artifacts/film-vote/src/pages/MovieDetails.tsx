import { useParams } from "wouter";
import { useGetMovie, useGetMyVote, getGetMovieQueryKey, getGetMyVoteQueryKey } from "@workspace/api-client-react";
import { Loader2, Calendar, Users, ThumbsUp, ThumbsDown, Minus, ChevronLeft } from "lucide-react";
import { Link } from "wouter";
import { VoteWidget } from "@/components/movie/VoteWidget";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type VoteType = "for" | "neutral" | "against";

export function MovieDetails() {
  const { id } = useParams<{ id: string }>();
  const movieId = parseInt(id || "0", 10);

  const { data: movie, isLoading: isMovieLoading, isError: isMovieError } = useGetMovie(movieId, {
    query: { enabled: !!movieId, queryKey: getGetMovieQueryKey(movieId) },
  });

  const { data: myVote, isLoading: isVoteLoading } = useGetMyVote(movieId, {
    query: { enabled: !!movieId, queryKey: getGetMyVoteQueryKey(movieId) },
  });

  if (isMovieLoading || isVoteLoading) {
    return (
      <div className="w-full h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (isMovieError || !movie) {
    return (
      <div className="w-full h-[60vh] flex flex-col items-center justify-center text-center">
        <h2 className="text-2xl font-bold mb-4">Фильм не найден</h2>
        <Link href="/"><Button variant="outline">Вернуться на главную</Button></Link>
      </div>
    );
  }

  const stats = movie as unknown as {
    forCount: number; neutralCount: number; againstCount: number;
    forPercent: number; neutralPercent: number; againstPercent: number;
  };
  const forPct  = stats.forPercent  ?? (movie.expectationPercent ?? 0);
  const neutPct = stats.neutralPercent ?? 0;
  const agPct   = stats.againstPercent ?? 0;
  const userVoteType = (myVote as unknown as { voteType?: VoteType })?.voteType ?? null;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-16">
      <Link href="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ChevronLeft className="w-4 h-4 mr-1" />
        К афише
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        {/* Poster */}
        <div className="lg:col-span-4">
          <div className="rounded-2xl overflow-hidden shadow-xl border bg-muted aspect-[2/3] relative sticky top-24">
            {movie.imageUrl ? (
              <img src={movie.imageUrl} alt={movie.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-secondary/50">
                Нет постера
              </div>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="lg:col-span-8 space-y-8">
          <div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-4 leading-tight">
              {movie.title}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-sm font-medium">
              {movie.year && (
                <div className="flex items-center text-muted-foreground bg-secondary px-3 py-1.5 rounded-md">
                  <Calendar className="w-4 h-4 mr-2" />
                  {movie.year}
                </div>
              )}
              <div className="flex items-center text-muted-foreground">
                <Users className="w-4 h-4 mr-2" />
                {movie.totalVotes} {
                  movie.totalVotes === 1 ? "голос" :
                  movie.totalVotes > 1 && movie.totalVotes < 5 ? "голоса" : "голосов"
                }
              </div>
            </div>
          </div>

          {/* Vote breakdown */}
          {movie.totalVotes > 0 && (
            <div className="bg-secondary/40 rounded-2xl p-5 border border-border/50 space-y-4">
              <h3 className="font-display font-semibold text-base text-muted-foreground uppercase tracking-wider text-xs">Голоса зрителей</h3>
              <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                {forPct  > 0 && <div className="bg-green-500 transition-all duration-700" style={{ width: `${forPct}%` }} />}
                {neutPct > 0 && <div className="bg-yellow-400 transition-all duration-700" style={{ width: `${neutPct}%` }} />}
                {agPct   > 0 && <div className="bg-red-500 transition-all duration-700"   style={{ width: `${agPct}%` }} />}
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-green-50 dark:bg-green-950/30 rounded-xl p-3 border border-green-200 dark:border-green-800">
                  <ThumbsUp className="w-5 h-5 text-green-600 mx-auto mb-1" />
                  <div className="font-bold text-xl text-green-700 dark:text-green-400">{forPct}%</div>
                  <div className="text-xs text-muted-foreground mt-0.5">За ({stats.forCount ?? 0})</div>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-950/30 rounded-xl p-3 border border-yellow-200 dark:border-yellow-800">
                  <Minus className="w-5 h-5 text-yellow-600 mx-auto mb-1" />
                  <div className="font-bold text-xl text-yellow-700 dark:text-yellow-400">{neutPct}%</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Нейтрально ({stats.neutralCount ?? 0})</div>
                </div>
                <div className="bg-red-50 dark:bg-red-950/30 rounded-xl p-3 border border-red-200 dark:border-red-800">
                  <ThumbsDown className="w-5 h-5 text-red-600 mx-auto mb-1" />
                  <div className="font-bold text-xl text-red-700 dark:text-red-400">{agPct}%</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Против ({stats.againstCount ?? 0})</div>
                </div>
              </div>
            </div>
          )}

          <div className="prose prose-lg dark:prose-invert max-w-none text-muted-foreground leading-relaxed">
            <p>{movie.description}</p>
          </div>

          <div className="pt-6 border-t border-border/50">
            <VoteWidget movieId={movie.id} initialVoteType={userVoteType} />
          </div>
        </div>
      </div>
    </div>
  );
}
