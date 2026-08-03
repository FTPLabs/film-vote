import { useState, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { useCastVote, getListMoviesQueryKey, getGetMovieQueryKey, getGetMyVoteQueryKey, getGetStatsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Star, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface VoteWidgetProps {
  movieId: number;
  initialScore?: number | null;
  onVoted?: () => void;
}

export function VoteWidget({ movieId, initialScore, onVoted }: VoteWidgetProps) {
  const [score, setScore] = useState<number>(initialScore || 5);
  const [isEditing, setIsEditing] = useState<boolean>(!initialScore);
  
  const queryClient = useQueryClient();
  const castVote = useCastVote();

  // Reset internal state if initialScore changes (e.g. data re-fetched)
  useEffect(() => {
    if (initialScore != null) {
      setScore(initialScore);
      setIsEditing(false);
    }
  }, [initialScore]);

  const handleVote = () => {
    castVote.mutate(
      { id: movieId, data: { score } },
      {
        onSuccess: () => {
          setIsEditing(false);
          toast.success("Голос учтен!", {
            description: `Ваша оценка: ${score}/10`,
          });
          
          // Invalidate caches
          queryClient.invalidateQueries({ queryKey: getListMoviesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetMovieQueryKey(movieId) });
          queryClient.invalidateQueries({ queryKey: getGetMyVoteQueryKey(movieId) });
          queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
          
          if (onVoted) onVoted();
        },
        onError: () => {
          toast.error("Ошибка при голосовании", {
            description: "Пожалуйста, попробуйте позже.",
          });
        }
      }
    );
  };

  const getScoreColor = (val: number) => {
    if (val <= 3) return "text-destructive";
    if (val <= 6) return "text-yellow-600 dark:text-yellow-500";
    if (val <= 8) return "text-green-600 dark:text-green-500";
    return "text-primary";
  };

  if (!isEditing && initialScore != null) {
    return (
      <div className="bg-secondary/50 rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-3 border border-border/50">
        <div className="bg-primary/10 text-primary p-3 rounded-full mb-1">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <div>
          <h4 className="font-display font-bold text-lg mb-1">Ваша оценка принята</h4>
          <p className="text-muted-foreground text-sm">
            Вы оценили ожидание фильма на
            <span className={cn("font-bold text-lg ml-2", getScoreColor(initialScore))}>
              {initialScore} <Star className="w-4 h-4 inline-block fill-current -mt-1" />
            </span>
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => setIsEditing(true)}
          className="mt-2"
        >
          Изменить оценку
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border p-6 shadow-sm">
      <div className="text-center mb-6">
        <h3 className="font-display font-bold text-2xl mb-2">Оцените ожидание</h3>
        <p className="text-muted-foreground text-sm">
          Насколько сильно вы ждете этот фильм? От 1 (совсем не жду) до 10 (считаю дни).
        </p>
      </div>
      
      <div className="flex flex-col items-center space-y-8">
        <div className="relative w-full max-w-sm pt-8 pb-4 px-4">
          {/* Big number display */}
          <div className={cn(
            "absolute -top-6 left-1/2 -translate-x-1/2 font-display font-bold text-6xl transition-colors duration-300",
            getScoreColor(score)
          )}>
            {score}
          </div>
          
          <Slider
            value={[score]}
            min={1}
            max={10}
            step={1}
            onValueChange={(val) => setScore(val[0])}
            className="mt-6"
          />
          <div className="flex justify-between w-full mt-3 text-xs font-semibold text-muted-foreground">
            <span>1</span>
            <span>10</span>
          </div>
        </div>

        <Button 
          size="lg" 
          className="w-full max-w-sm rounded-full h-14 text-lg font-bold shadow-md hover:shadow-lg transition-all"
          onClick={handleVote}
          disabled={castVote.isPending}
        >
          {castVote.isPending ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              Сохраняем...
            </>
          ) : (
            <>
              {initialScore ? "Обновить оценку" : "Проголосовать"}
            </>
          )}
        </Button>
        
        {initialScore != null && (
          <Button 
            variant="ghost" 
            onClick={() => {
              setScore(initialScore);
              setIsEditing(false);
            }}
            className="text-muted-foreground"
          >
            Отмена
          </Button>
        )}
      </div>
    </div>
  );
}
