import { useParams } from "wouter";
import { useGetMovie, useGetMyVote, getGetMovieQueryKey, getGetMyVoteQueryKey } from "@workspace/api-client-react";
import { Loader2, Calendar, Users, ThumbsUp, ThumbsDown, Minus, ChevronLeft, Play } from "lucide-react";
import { Link } from "wouter";
import { VoteWidget } from "@/components/movie/VoteWidget";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

type VoteType = "for" | "neutral" | "against";

function extractYoutubeId(url: string): string | null {
  if (!url) return null;
  // full URL
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([A-Za-z0-9_-]{11})/);
  if (match) return match[1];
  // bare ID
  if (/^[A-Za-z0-9_-]{11}$/.test(url)) return url;
  return null;
}

function TrailerPlayer({ trailerUrl }: { trailerUrl: string }) {
  const [playing, setPlaying] = useState(false);
  const videoId = extractYoutubeId(trailerUrl);
  if (!videoId) return null;

  const thumbUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;

  return (
    <div className="space-y-3">
      <h3 className="font-display font-semibold text-base text-muted-foreground uppercase tracking-wider text-xs flex items-center gap-2">
        <Play className="w-4 h-4" /> Трейлер
      </h3>
      <div className="relative rounded-2xl overflow-hidden bg-black aspect-video shadow-xl">
        <AnimatePresence mode="wait">
          {!playing ? (
            <motion.div
              key="thumb"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="w-full h-full cursor-pointer group"
              onClick={() => setPlaying(true)}
            >
              <img
                src={thumbUrl}
                alt="Превью трейлера"
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
                }}
              />
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className="bg-red-600 rounded-full w-16 h-16 flex items-center justify-center shadow-2xl"
                >
                  <Play className="w-7 h-7 text-white fill-white ml-1" />
                </motion.div>
              </div>
              <div className="absolute bottom-3 left-3 bg-black/60 text-white text-xs px-2 py-1 rounded-md backdrop-blur-sm">
                🎬 Нажми для просмотра трейлера
              </div>
            </motion.div>
          ) : (
            <motion.iframe
              key="iframe"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              src={`https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`}
              title="Трейлер"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full border-0"
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

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
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
          <Loader2 className="w-8 h-8 text-primary" />
        </motion.div>
      </div>
    );
  }

  if (isMovieError || !movie) {
    return (
      <div className="w-full h-[60vh] flex flex-col items-center justify-center text-center">
        <h2 className="text-2xl font-bold mb-4">Фильм не найден 🎞️</h2>
        <Link href="/"><Button variant="outline">Вернуться на главную</Button></Link>
      </div>
    );
  }

  const stats = movie as unknown as {
    forCount: number; neutralCount: number; againstCount: number;
    forPercent: number; neutralPercent: number; againstPercent: number;
    trailerUrl?: string | null;
  };
  const forPct  = stats.forPercent  ?? (movie.expectationPercent ?? 0);
  const neutPct = stats.neutralPercent ?? 0;
  const agPct   = stats.againstPercent ?? 0;
  const userVoteType = (myVote as unknown as { voteType?: VoteType })?.voteType ?? null;
  const trailerUrl = (movie as unknown as { trailerUrl?: string | null }).trailerUrl;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="pb-16"
    >
      <Link href="/" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ChevronLeft className="w-4 h-4 mr-1" />
        К афише
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        {/* Poster */}
        <div className="lg:col-span-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.4 }}
            className="rounded-2xl overflow-hidden shadow-xl border bg-muted aspect-[2/3] relative sticky top-24"
          >
            {movie.imageUrl ? (
              <img src={movie.imageUrl} alt={movie.title} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-secondary/50">
                Нет постера
              </div>
            )}
          </motion.div>
        </div>

        {/* Details */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="lg:col-span-8 space-y-8"
        >
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
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-secondary/40 rounded-2xl p-5 border border-border/50 space-y-4"
            >
              <h3 className="font-display font-semibold text-base text-muted-foreground uppercase tracking-wider text-xs">
                🗳️ Голоса деревни
              </h3>
              <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
                {forPct  > 0 && <motion.div className="bg-green-500" initial={{ width: 0 }} animate={{ width: `${forPct}%` }} transition={{ duration: 0.8, delay: 0.3 }} />}
                {neutPct > 0 && <motion.div className="bg-yellow-400" initial={{ width: 0 }} animate={{ width: `${neutPct}%` }} transition={{ duration: 0.8, delay: 0.4 }} />}
                {agPct   > 0 && <motion.div className="bg-red-500" initial={{ width: 0 }} animate={{ width: `${agPct}%` }} transition={{ duration: 0.8, delay: 0.5 }} />}
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-green-50 dark:bg-green-950/30 rounded-xl p-3 border border-green-200 dark:border-green-800">
                  <div className="text-2xl mb-1">👍</div>
                  <div className="font-bold text-xl text-green-700 dark:text-green-400">{forPct}%</div>
                  <div className="text-xs text-muted-foreground mt-0.5">За ({stats.forCount ?? 0})</div>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-950/30 rounded-xl p-3 border border-yellow-200 dark:border-yellow-800">
                  <div className="text-2xl mb-1">🤔</div>
                  <div className="font-bold text-xl text-yellow-700 dark:text-yellow-400">{neutPct}%</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Нейтрально ({stats.neutralCount ?? 0})</div>
                </div>
                <div className="bg-red-50 dark:bg-red-950/30 rounded-xl p-3 border border-red-200 dark:border-red-800">
                  <div className="text-2xl mb-1">👎</div>
                  <div className="font-bold text-xl text-red-700 dark:text-red-400">{agPct}%</div>
                  <div className="text-xs text-muted-foreground mt-0.5">Против ({stats.againstCount ?? 0})</div>
                </div>
              </div>
            </motion.div>
          )}

          <div className="prose prose-lg dark:prose-invert max-w-none text-muted-foreground leading-relaxed">
            <p>{movie.description}</p>
          </div>

          {/* Trailer */}
          {trailerUrl && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <TrailerPlayer trailerUrl={trailerUrl} />
            </motion.div>
          )}

          <div className="pt-6 border-t border-border/50">
            <VoteWidget movieId={movie.id} initialVoteType={userVoteType} />
          </div>
        </motion.div>
      </div>
    </motion.div>
  );
}
