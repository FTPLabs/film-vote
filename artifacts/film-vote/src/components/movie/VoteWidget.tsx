import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useCastVote, getListMoviesQueryKey, getGetMovieQueryKey, getGetMyVoteQueryKey, getGetStatsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, ThumbsUp, Minus, ThumbsDown } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

type VoteType = "for" | "neutral" | "against";

interface VoteWidgetProps {
  movieId: number;
  initialVoteType?: VoteType | null;
  onVoted?: () => void;
}

const VOTE_OPTIONS: { value: VoteType; label: string; emoji: string; icon: React.ElementType; color: string; bg: string; border: string; hoverBg: string }[] = [
  {
    value: "for",
    label: "За",
    emoji: "🙌",
    icon: ThumbsUp,
    color: "text-green-700 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-950/40",
    border: "border-green-300 dark:border-green-700",
    hoverBg: "hover:bg-green-100 dark:hover:bg-green-900/60",
  },
  {
    value: "neutral",
    label: "Нейтрально",
    emoji: "🤷",
    icon: Minus,
    color: "text-yellow-700 dark:text-yellow-400",
    bg: "bg-yellow-50 dark:bg-yellow-950/40",
    border: "border-yellow-300 dark:border-yellow-700",
    hoverBg: "hover:bg-yellow-100 dark:hover:bg-yellow-900/60",
  },
  {
    value: "against",
    label: "Против",
    emoji: "😬",
    icon: ThumbsDown,
    color: "text-red-700 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/40",
    border: "border-red-300 dark:border-red-700",
    hoverBg: "hover:bg-red-100 dark:hover:bg-red-900/60",
  },
];

const FUNNY_MESSAGES: Record<VoteType, string[]> = {
  for: [
    "Отличный выбор! Берём попкорн! 🍿",
    "Голос принят! Деревня одобряет! 🌾",
    "Ура! Будем смотреть! 🎉",
  ],
  neutral: [
    "Ладно, посмотрим... если не будет дождя 🌧️",
    "Ни рыба ни мясо, но ок 🐟",
    "Народ в раздумьях... 🤔",
  ],
  against: [
    "Фу, не надо! Лучше спать ляжем 😴",
    "Деревня против! Категорически! 🙅",
    "Нет-нет-нет! Только не это! 😱",
  ],
};

export function VoteWidget({ movieId, initialVoteType, onVoted }: VoteWidgetProps) {
  const [selected, setSelected] = useState<VoteType | null>(initialVoteType ?? null);
  const [isEditing, setIsEditing] = useState<boolean>(!initialVoteType);
  const [showConfetti, setShowConfetti] = useState(false);

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
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 2000);
          const msgs = FUNNY_MESSAGES[selected];
          const msg = msgs[Math.floor(Math.random() * msgs.length)];
          toast.success("Голос учтён!", { description: msg });
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
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-secondary/50 rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-3 border border-border/50"
      >
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ repeat: 3, duration: 0.4 }}
          className={cn("p-3 rounded-full mb-1", opt.bg, opt.border, "border")}
        >
          <Icon className={cn("w-8 h-8", opt.color)} />
        </motion.div>
        <div>
          <h4 className="font-display font-bold text-lg mb-1">Ваш голос принят {opt.emoji}</h4>
          <p className="text-muted-foreground text-sm">
            Вы проголосовали: <span className={cn("font-bold text-base ml-1", opt.color)}>{opt.label}</span>
          </p>
        </div>
        <Button variant="outline" onClick={() => setIsEditing(true)} className="mt-2">
          ✏️ Изменить голос
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="font-display font-semibold text-lg">Ваш голос 🗳️</h3>
      <div className="grid grid-cols-3 gap-3">
        {VOTE_OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const isSelected = selected === opt.value;
          return (
            <motion.button
              key={opt.value}
              onClick={() => setSelected(opt.value)}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              animate={isSelected ? { scale: [1, 1.08, 1] } : { scale: 1 }}
              transition={isSelected ? { duration: 0.3 } : {}}
              className={cn(
                "relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 font-semibold text-sm transition-all",
                opt.bg, opt.hoverBg,
                isSelected
                  ? cn("border-current shadow-lg", opt.color, "ring-2 ring-offset-1 ring-current")
                  : cn("border-transparent", opt.color)
              )}
            >
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-2 -right-2 text-base"
                >
                  ✅
                </motion.div>
              )}
              <span className="text-2xl">{opt.emoji}</span>
              <Icon className="w-5 h-5" />
              <span>{opt.label}</span>
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Button
              onClick={handleVote}
              disabled={castVote.isPending}
              className="w-full font-bold text-base h-12 rounded-xl"
              size="lg"
            >
              {castVote.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Считаем голоса...</>
              ) : (
                <>🗳️ Проголосовать</>
              )}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showConfetti && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="text-center text-4xl py-2"
          >
            🎊🎉🥳
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
