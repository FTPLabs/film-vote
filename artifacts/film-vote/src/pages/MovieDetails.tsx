import { useParams } from "wouter";
import { useGetMovie, useGetMyVote, getGetMovieQueryKey, getGetMyVoteQueryKey } from "@workspace/api-client-react";
import { Loader2, Calendar, Users, TrendingUp, ChevronLeft } from "lucide-react";
import { Link } from "wouter";
import { VoteWidget } from "@/components/movie/VoteWidget";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function MovieDetails() {
  const { id } = useParams<{ id: string }>();
  const movieId = parseInt(id || "0", 10);

  const { data: movie, isLoading: isMovieLoading, isError: isMovieError } = useGetMovie(movieId, {
    query: { enabled: !!movieId, queryKey: getGetMovieQueryKey(movieId) }
  });

  const { data: myVote, isLoading: isVoteLoading } = useGetMyVote(movieId, {
    query: { enabled: !!movieId, queryKey: getGetMyVoteQueryKey(movieId) }
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
        <Link href="/">
          <Button variant="outline">Вернуться на главную</Button>
        </Link>
      </div>
    );
  }

  const isHighExpectation = movie.expectationPercent >= 75;

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 pb-16">
      <Link href="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ChevronLeft className="w-4 h-4 mr-1" />
        К афише
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        {/* Left Column: Poster */}
        <div className="lg:col-span-4 lg:col-start-1">
          <div className="rounded-2xl overflow-hidden shadow-xl border bg-muted aspect-[2/3] relative sticky top-24">
            {movie.imageUrl ? (
              <img 
                src={movie.imageUrl} 
                alt={movie.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-secondary/50">
                Нет постера
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Details & Voting */}
        <div className="lg:col-span-8 space-y-8">
          <div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold mb-4 leading-tight">
              {movie.title}
            </h1>
            
            <div className="flex flex-wrap items-center gap-4 text-sm font-medium">
              {movie.year && (
                <div className="flex items-center text-muted-foreground bg-secondary px-3 py-1.5 rounded-md">
                  <Calendar className="w-4 h-4 mr-2" />
                  {movie.year}
                </div>
              )}
              
              <div className={cn(
                "flex items-center px-4 py-1.5 rounded-full border shadow-sm",
                isHighExpectation ? "bg-green-100 border-green-200 text-green-800" : "bg-card border-border"
              )}>
                <TrendingUp className="w-4 h-4 mr-2" />
                Ожидание: <span className="font-bold ml-1 text-base">{Math.round(movie.expectationPercent)}%</span>
              </div>
              
              <div className="flex items-center text-muted-foreground">
                <Users className="w-4 h-4 mr-2" />
                {movie.totalVotes} {movie.totalVotes === 1 ? 'голос' : (movie.totalVotes > 1 && movie.totalVotes < 5) ? 'голоса' : 'голосов'}
              </div>
            </div>
          </div>

          <div className="prose prose-lg dark:prose-invert max-w-none text-muted-foreground leading-relaxed">
            <p>{movie.description}</p>
          </div>

          <div className="pt-6 border-t border-border/50">
            <VoteWidget 
              movieId={movie.id} 
              initialScore={myVote?.score ?? null} 
            />
          </div>
        </div>
      </div>
    </div>
  );
}
