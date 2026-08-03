import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useCastVote, getListMoviesQueryKey, getGetMovieQueryKey, getGetMyVoteQueryKey, getGetStatsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, ThumbsUp, Minus, ThumbsDown, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type VoteType = "for" | "neutral" | "against";

interface VoteWidgetProps {
  movieId: number;
  initialVoteType?: VoteType | null;
  onVoted?: () => void;
}

const VOTE_OPTIONS: { value: VoteType; label: string; icon: React.ElementType; color: string; bg: string; border: string }[] = [
  {
    value: "for",
    label: "За",
    icon: ThumbsUp,
    color: "text-green-700 dark:text-green-400",
    bg: "bg-green-50 hover:bg-green-100 dark:bg-green-950/40 dark:hover:bg-green-900/60",
    border: "border-green-300 dark:border-green-700",
  },
  {
    value: "neutral",
    label: "Нейтрально",
    icon: Minus,
    color: "text-yellow-700 dark:text-yellow-400",
    bg: "bg-yellow-50 hover:bg-yellow-100 dark:bg-yellow-950/40 dark:hover:bg-yellow-900/60",
    border: "border-yellow-300 dark:border-yellow-700",
  },
  {
    value: "against",
    label: "Против",
    icon: ThumbsDown,
    color: "text-red-700 dark:text-red-400",
    bg: "bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60",
    border: "border-red-300 dark:border-red-700",
  },
];

export function VoteWidget({ movieId, initialVoteType, onVoted }: VoteWidgetProps) {
  const [selected, setSelected] = useState<VoteType | null>(initialVoteType ?? null);
  const [isEditing, setIsEditing] = useState<boolean>(!initialVoteType);

  const queryClient = useQueryClient();
  const castVote = useCastVote();

  useEffect(() => {
    if (initialVoteType != null) {
      setSelected(initialVoteType);
      setIsEditing(false);
    }
  }, [initialVoteType]);

  const handleVote = () => {
    if (!selected) return;
    castVote.mutate(
      { id: movieId, data: { voteType: selected } as unknown as import("@workspace/api-client-react").VoteInput },
      {
        onSuccess: () => {
          setIsEditing(false);
          const labels: Record<VoteType, string> = { for: "За", neutral: "Нейтрально", against: "Против" };
          toast.success("Голос учтён!", { description: `Ваш голос: ${labels[selected]}` });
          queryClient.invalidateQueries({ queryKey: getListMoviesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetMovieQueryKey(movieId) });
          queryClient.invalidateQueries({ queryKey: getGetMyVoteQueryKey(movieId) });
          queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
          if (onVoted) onVoted();
        },
        onError: () => {
          toast.error("Ошибка при голосовании", { description: "Пожалуйста, попробуйте позже." });
        },
      }
    );
  };

  if (!isEditing && initialVoteType != null) {
    const opt = VOTE_OPTIONS.find(o => o.value === initialVoteType)!;
    const Icon = opt.icon;
    return (
      <div className="bg-secondary/50 rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-3 border border-border/50">
        <div className={cn("p-3 rounded-full mb-1", opt.bg, opt.border, "border")}>
          <Icon className={cn("w-8 h-8", opt.color)} />
        </div>
        <div>
          <h4 className="font-display font-bold text-lg mb-1">Ваш голос принят</h4>
          <p className="text-muted-foreground text-sm">
            Вы проголосовали: <span className={cn("font-bold text-base ml-1", opt.color)}>{opt.label}</span>
          </p>
        </div>
        <Button variant="outline" onClick={() => setIsEditing(true)} className="mt-2">
          Изменить голос
        </Button>
      </div>
    );
  }

  return (
    <div className="bg-card rounded-xl border p-6 shadow-sm">
      <div className="text-center mb-6">
        <h3 className="font-display font-bold text-2xl mb-2">Ваш голос</h3>
        <p className="text-muted-foreground text-sm">За, против или нейтрально — ваш голос формирует рейтинг.</p>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        {VOTE_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isActive = selected === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setSelected(opt.value)}
              className={cn(
                "flex flex-col items-center justify-center gap-2 rounded-xl border-2 p-4 transition-all duration-200 cursor-pointer",
                isActive
                  ? cn(opt.bg, opt.border, "ring-2", opt.value === "for" ? "ring-green-400" : opt.value === "neutral" ? "ring-yellow-400" : "ring-red-400", "scale-105 shadow-md")
                  : "border-border bg-card hover:bg-secondary/50"
              )}
            >
              <Icon className={cn("w-7 h-7 transition-colors", isActive ? opt.color : "text-muted-foreground")} />
              <span className={cn("text-sm font-semibold transition-colors", isActive ? opt.color : "text-muted-foreground")}>
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>

      <Button
        size="lg"
        className="w-full rounded-full h-14 text-lg font-bold shadow-md hover:shadow-lg transition-all"
        onClick={handleVote}
        disabled={castVote.isPending || !selected}
      >
        {castVote.isPending ? (
          <><Loader2 className="mr-2 h-5 w-5 animate-spin" />Сохраняем...</>
        ) : (
          initialVoteType ? "Обновить голос" : "Проголосовать"
        )}
      </Button>

      {initialVoteType != null && (
        <Button
          variant="ghost"
          onClick={() => { setSelected(initialVoteType); setIsEditing(false); }}
          className="w-full mt-2 text-muted-foreground"
        >
          Отмена
        </Button>
      )}
    </div>
  );
}
