import { Link } from "wouter";
import { Star, Ticket, ThumbsUp, Film, TrendingUp } from "lucide-react";
import type { MovieWithStats } from "@workspace/api-client-react";
import { cn } from "@/lib/utils";

interface MovieCardProps {
  movie: MovieWithStats;
}

export function MovieCard({ movie }: MovieCardProps) {
  const hasVoted = movie.userVote != null;
  const isHighExpectation = movie.expectationPercent >= 75;
  const isLowExpectation = movie.expectationPercent < 40;

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
        
        {/* Overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
        
        {/* Top Badges */}
        <div className="absolute top-3 left-3 right-3 flex justify-between items-start z-20">
          <div className={cn(
            "px-2.5 py-1 rounded-full text-xs font-bold backdrop-blur-md border border-white/10 shadow-sm flex items-center gap-1.5",
            isHighExpectation ? "bg-green-500/90 text-white" : isLowExpectation ? "bg-destructive/90 text-white" : "bg-black/60 text-white"
          )}>
            <TrendingUp className="w-3.5 h-3.5" />
            {Math.round(movie.expectationPercent)}%
          </div>
          
          {hasVoted && (
            <div className="px-2 py-1 rounded-full text-xs font-semibold bg-primary/90 text-primary-foreground backdrop-blur-md flex items-center gap-1 shadow-sm border border-primary-foreground/20">
              <Star className="w-3 h-3 fill-current" />
              Ваша оценка {movie.userVote}
            </div>
          )}
        </div>

        {/* Bottom Content within Image */}
        <div className="absolute bottom-0 left-0 right-0 p-4 z-20 text-white">
          <h3 className="font-display font-bold text-xl leading-tight line-clamp-2 text-white/95">
            {movie.title}
          </h3>
          {movie.year && (
            <p className="text-white/70 text-sm font-medium mt-1">{movie.year}</p>
          )}
        </div>
      </div>
      
      <div className="p-4 flex flex-col flex-1 z-20 bg-card">
        <div className="flex items-center justify-between mt-auto pt-2">
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
              {hasVoted ? "Изменить голос" : "Голосовать"}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
