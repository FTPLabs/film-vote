import { useListMovies } from "@workspace/api-client-react";
import { MovieCard } from "@/components/movie/MovieCard";
import { Clapperboard, Loader2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion, useInView } from "framer-motion";
import { useRef } from "react";

function AnimatedHeader() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="max-w-2xl"
    >
      <motion.h1
        className="text-2xl md:text-5xl font-display font-bold text-foreground mb-2 md:mb-4"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        🌾 Что смотрим в деревне?
      </motion.h1>
      <motion.p
        className="text-lg text-muted-foreground"
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        Голосуй: <strong className="text-green-600">За</strong>, <strong className="text-yellow-600">Нейтрально</strong> или <strong className="text-red-600">Против</strong> — и узнаем, что покажем на вечернем сеансе!
      </motion.p>
      <motion.div
        className="flex gap-2 mt-4 flex-wrap"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        {["🎬 Голосуй", "🍿 Смотри", "🏆 Побеждай"].map((tag, i) => (
          <motion.span
            key={tag}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.4 + i * 0.08 }}
            whileHover={{ scale: 1.08, y: -2 }}
            className="px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-semibold cursor-default select-none"
          >
            {tag}
          </motion.span>
        ))}
      </motion.div>
    </motion.div>
  );
}

function MovieGrid({ movies }: { movies: import("@workspace/api-client-react").MovieWithStats[] | undefined }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-50px" });

  return (
    <div
      ref={ref}
      className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6"
    >
      {(movies ?? []).map((movie, index) => (
        <motion.div
          key={movie.id}
          initial={{ opacity: 0, y: 50, scale: 0.92 }}
          animate={inView ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{
            duration: 0.45,
            delay: index * 0.06,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <MovieCard movie={movie} />
        </motion.div>
      ))}
    </div>
  );
}

export function Home() {
  const { data: movies, isLoading, isError, refetch } = useListMovies();

  if (isLoading) {
    return (
      <div className="w-full h-[60vh] flex flex-col items-center justify-center text-muted-foreground gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        >
          <Loader2 className="w-10 h-10 text-primary" />
        </motion.div>
        <motion.p
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
          className="font-medium text-lg"
        >
          🎬 Мотаем плёнку...
        </motion.p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="w-full h-[60vh] flex flex-col items-center justify-center text-center max-w-md mx-auto">
        <motion.div
          animate={{ rotate: [-5, 5, -5] }}
          transition={{ repeat: Infinity, duration: 0.5 }}
          className="bg-destructive/10 text-destructive p-4 rounded-full mb-4"
        >
          <Clapperboard className="w-8 h-8" />
        </motion.div>
        <h2 className="text-2xl font-display font-bold mb-2">Катушка зажевалась 🎞️</h2>
        <p className="text-muted-foreground mb-6">
          Не удалось загрузить список фильмов. Пожалуйста, попробуйте еще раз.
        </p>
        <Button onClick={() => refetch()} variant="outline">
          Повторить попытку
        </Button>
      </div>
    );
  }

  if (!movies || movies.length === 0) {
    return (
      <div className="w-full h-[60vh] flex flex-col items-center justify-center text-center max-w-md mx-auto">
        <motion.div
          animate={{ scale: [1, 1.12, 1] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className="bg-secondary text-muted-foreground p-4 rounded-full mb-4"
        >
          <Clapperboard className="w-8 h-8" />
        </motion.div>
        <h2 className="text-2xl font-display font-bold mb-2">Пока пусто 🪑</h2>
        <p className="text-muted-foreground">
          В нашем прокате пока нет фильмов. Загляните позже!
        </p>
      </div>
    );
  }

  const totalVotes = movies.reduce((s, m) => s + (m.totalVotes ?? 0), 0);

  return (
    <div className="space-y-8 pb-12">
      <AnimatedHeader />

      {totalVotes > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.4 }}
          className="inline-flex items-center gap-2 bg-accent/20 border border-accent/30 text-accent-foreground px-4 py-2 rounded-full text-sm font-semibold"
        >
          <motion.span
            animate={{ rotate: [0, 15, -15, 0] }}
            transition={{ repeat: Infinity, duration: 3, delay: 1 }}
          >
            <Star className="w-4 h-4 text-accent" />
          </motion.span>
          {totalVotes} голосов подано
        </motion.div>
      )}

      <MovieGrid movies={movies} />
    </div>
  );
}
