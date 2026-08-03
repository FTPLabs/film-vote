import { useListMovies } from "@workspace/api-client-react";
import { MovieCard } from "@/components/movie/MovieCard";
import { Clapperboard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Home() {
  const { data: movies, isLoading, isError, refetch } = useListMovies();

  if (isLoading) {
    return (
      <div className="w-full h-[60vh] flex flex-col items-center justify-center text-muted-foreground gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="font-medium animate-pulse">Загружаем фильмотеку...</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="w-full h-[60vh] flex flex-col items-center justify-center text-center max-w-md mx-auto">
        <div className="bg-destructive/10 text-destructive p-4 rounded-full mb-4">
          <Clapperboard className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-display font-bold mb-2">Катушка зажевалась</h2>
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
        <div className="bg-secondary text-muted-foreground p-4 rounded-full mb-4">
          <Clapperboard className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-display font-bold mb-2">Пока пусто</h2>
        <p className="text-muted-foreground">
          В нашем прокате пока нет фильмов. Загляните позже!
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      <div className="max-w-2xl">
        <h1 className="text-4xl md:text-5xl font-display font-bold text-foreground mb-4">
          Что ждем больше всего?
        </h1>
        <p className="text-lg text-muted-foreground">
          Оценивайте ожидаемые новинки от 1 до 10. Ваш голос формирует народный рейтинг ожидания.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {movies.map((movie) => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
      </div>
    </div>
  );
}
