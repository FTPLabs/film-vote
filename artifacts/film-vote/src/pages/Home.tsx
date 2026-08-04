import { useListMovies } from "@workspace/api-client-react";
import { MovieCard } from "@/components/movie/MovieCard";
import { Clapperboard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

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
          animate={{ opacity: [0.5, 1, 0.5] }}
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
          animate={{ scale: [1, 1.1, 1] }}
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

  return (
    <div className="space-y-8 pb-12">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-2xl"
      >
        <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
          🌾 Что смотрим в деревне?
        </h1>
        <p className="text-lg text-muted-foreground">
          Голосуй: <strong className="text-green-600">За</strong>, <strong className="text-yellow-600">Нейтрально</strong> или <strong className="text-red-600">Против</strong> — и узнаем, что покажем на вечернем сеансе!
        </p>
      </motion.div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {movies.map((movie, index) => (
          <motion.div
            key={movie.id}
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, delay: index * 0.07, ease: "easeOut" }}
          >
            <MovieCard movie={movie} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}
