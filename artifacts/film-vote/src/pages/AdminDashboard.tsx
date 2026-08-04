import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { 
  useListMovies, 
  useCreateMovie, 
  useUpdateMovie, 
  useDeleteMovie,
  getListMoviesQueryKey,
  getGetStatsQueryKey,
  type MovieWithStats,
  type MovieInput,
  type MoviePatch
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  Plus, Edit, Trash2, RotateCcw, LogOut, Loader2, Film 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useCastVote, getGetMovieQueryKey, getGetMyVoteQueryKey, getGetStatsQueryKey as getStats } from "@workspace/api-client-react";

// Re-export for reset votes - use fetch directly
async function resetVotes(movieId: number, token: string) {
  const res = await fetch(`/api/movies/${movieId}/votes`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.ok;
}

export function AdminDashboard() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  const token = localStorage.getItem("admin_token");
  useEffect(() => {
    if (!token) setLocation("/admin");
  }, [token, setLocation]);

  const requestOptions = {
    request: { headers: { Authorization: `Bearer ${token}` } }
  };

  const { data: movies, isLoading } = useListMovies();
  const createMovie = useCreateMovie(requestOptions);
  const updateMovie = useUpdateMovie(requestOptions);
  const deleteMovie = useDeleteMovie(requestOptions);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [trailerUrl, setTrailerUrl] = useState("");
  const [year, setYear] = useState<string>("");

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setImageUrl("");
    setTrailerUrl("");
    setYear("");
  };

  const openAddModal = () => {
    resetForm();
    setIsModalOpen(true);
  };

  const openEditModal = (movie: MovieWithStats) => {
    setEditingId(movie.id);
    setTitle(movie.title);
    setDescription(movie.description);
    setImageUrl(movie.imageUrl);
    setTrailerUrl((movie as unknown as { trailerUrl?: string | null }).trailerUrl ?? "");
    setYear(movie.year ? movie.year.toString() : "");
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!title.trim() || !description.trim()) {
      toast.error("Заполните обязательные поля (Название и Описание)");
      return;
    }

    const payload = {
      title,
      description,
      imageUrl,
      trailerUrl: trailerUrl.trim() || null,
      year: year ? parseInt(year, 10) : null
    };

    if (editingId) {
      updateMovie.mutate(
        { id: editingId, data: payload as MoviePatch },
        {
          onSuccess: () => {
            toast.success("Фильм обновлен");
            queryClient.invalidateQueries({ queryKey: getListMoviesQueryKey() });
            setIsModalOpen(false);
          },
          onError: () => toast.error("Ошибка при обновлении")
        }
      );
    } else {
      createMovie.mutate(
        { data: payload as MovieInput },
        {
          onSuccess: () => {
            toast.success("Фильм добавлен");
            queryClient.invalidateQueries({ queryKey: getListMoviesQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
            setIsModalOpen(false);
          },
          onError: () => toast.error("Ошибка при добавлении")
        }
      );
    }
  };

  const handleDelete = (id: number, movieTitle: string) => {
    if (confirm(`Удалить фильм "${movieTitle}"?`)) {
      deleteMovie.mutate(
        { id },
        {
          onSuccess: () => {
            toast.success("Фильм удален");
            queryClient.invalidateQueries({ queryKey: getListMoviesQueryKey() });
            queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
          },
          onError: () => toast.error("Ошибка при удалении")
        }
      );
    }
  };

  const handleResetVotes = async (id: number, movieTitle: string) => {
    if (!token) return;
    if (confirm(`Сбросить голоса для "${movieTitle}"?`)) {
      const ok = await resetVotes(id, token);
      if (ok) {
        toast.success("Голоса сброшены");
        queryClient.invalidateQueries({ queryKey: getListMoviesQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
      } else {
        toast.error("Ошибка при сбросе");
      }
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    setLocation("/admin");
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-display font-bold">🎬 Управление фильмами</h1>
          <p className="text-muted-foreground mt-1">Выбор фильма для деревни — админка</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={openAddModal} className="font-semibold">
            <Plus className="w-4 h-4 mr-2" /> Добавить фильм
          </Button>
          <Button variant="ghost" onClick={handleLogout} title="Выйти">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-3">
          {movies?.map((movie) => (
            <div key={movie.id} className="bg-card border rounded-2xl p-4 flex items-center gap-4">
              <div className="w-14 h-20 bg-muted rounded-lg overflow-hidden flex-shrink-0">
                {movie.imageUrl ? (
                  <img src={movie.imageUrl} alt={movie.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Film className="w-5 h-5 text-muted-foreground/40" />
                  </div>
                )}
              </div>
              <div className="flex-grow min-w-0">
                <h3 className="font-display font-bold text-lg truncate">{movie.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {movie.year && `${movie.year} · `}
                  {movie.totalVotes} голосов
                  {(movie as unknown as { trailerUrl?: string | null }).trailerUrl && (
                    <span className="ml-2 text-primary">🎬 трейлер</span>
                  )}
                </p>
                <div className="flex items-center gap-2 mt-1 text-xs">
                  <span className="text-green-600">👍 {(movie as unknown as { forPercent: number }).forPercent ?? 0}%</span>
                  <span className="text-yellow-600">🤔 {(movie as unknown as { neutralPercent: number }).neutralPercent ?? 0}%</span>
                  <span className="text-red-500">👎 {(movie as unknown as { againstPercent: number }).againstPercent ?? 0}%</span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button variant="ghost" size="sm" onClick={() => openEditModal(movie)} title="Редактировать">
                  <Edit className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleResetVotes(movie.id, movie.title)} title="Сбросить голоса">
                  <RotateCcw className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDelete(movie.id, movie.title)} title="Удалить" className="text-destructive hover:text-destructive">
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          {(!movies || movies.length === 0) && (
            <div className="text-center py-16 text-muted-foreground">
              <Film className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>Фильмов нет. Добавьте первый!</p>
            </div>
          )}
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              {editingId ? "✏️ Редактировать фильм" : "➕ Добавить фильм"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <label className="text-sm font-semibold ml-1">Название <span className="text-destructive">*</span></label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Название фильма" className="bg-secondary/30" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-semibold ml-1">Год</label>
                <Input value={year} onChange={e => setYear(e.target.value)} placeholder="2024" type="number" className="bg-secondary/30" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold ml-1">URL Постера</label>
                <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)} placeholder="https://..." className="bg-secondary/30" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold ml-1">🎬 YouTube трейлер</label>
              <Input
                value={trailerUrl}
                onChange={e => setTrailerUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=... или ID видео"
                className="bg-secondary/30"
              />
              <p className="text-xs text-muted-foreground ml-1">Ссылка на YouTube или ID видео (11 символов)</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold ml-1">Описание <span className="text-destructive">*</span></label>
              <Textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                rows={4}
                placeholder="Сюжет фильма..."
                className="bg-secondary/30 resize-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-3 pt-2">
            <Button variant="ghost" onClick={() => setIsModalOpen(false)} className="w-full sm:w-auto">Отмена</Button>
            <Button onClick={handleSave} disabled={createMovie.isPending || updateMovie.isPending} className="w-full sm:w-auto font-bold">
              {(createMovie.isPending || updateMovie.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingId ? "Сохранить" : "Добавить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
