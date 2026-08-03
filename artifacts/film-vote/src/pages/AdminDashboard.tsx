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
  Plus, Edit, Trash2, RotateCcw, LogOut, Loader2, Image as ImageIcon, Film 
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

export function AdminDashboard() {
  const [location, setLocation] = useLocation();
  const queryClient = useQueryClient();
  
  // Auth check
  const token = localStorage.getItem("admin_token");
  useEffect(() => {
    if (!token) {
      setLocation("/admin");
    }
  }, [token, setLocation]);

  const requestOptions = {
    request: { headers: { Authorization: `Bearer ${token}` } }
  };

  const { data: movies, isLoading } = useListMovies();
  const createMovie = useCreateMovie(requestOptions);
  const updateMovie = useUpdateMovie(requestOptions);
  const deleteMovie = useDeleteMovie(requestOptions);

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [year, setYear] = useState<string>("");

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setImageUrl("");
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

  const handleDelete = (id: number, title: string) => {
    if (confirm(`Вы уверены, что хотите удалить фильм "${title}"?`)) {
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

  const handleResetVotes = async (id: number, title: string) => {
    if (!confirm(`Сбросить всю статистику голосования для ""?`)) return;
    try {
      const res = await fetch(`/api/movies/${id}/votes`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      toast.success("Статистика сброшена");
      queryClient.invalidateQueries({ queryKey: getListMoviesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
    } catch {
      toast.error("Ошибка при сбросе");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    setLocation("/admin");
  };

  if (!token) return null;

  return (
    <div className="space-y-8 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold">Управление кинотеатром</h1>
          <p className="text-muted-foreground">Панель администратора</p>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={openAddModal} className="font-bold">
            <Plus className="w-5 h-5 mr-1" />
            Добавить фильм
          </Button>
          <Button variant="outline" onClick={handleLogout} className="text-muted-foreground hover:text-foreground">
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </div>

      <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-secondary/50 border-b">
                  <th className="p-4 font-semibold text-sm text-muted-foreground">Постер</th>
                  <th className="p-4 font-semibold text-sm text-muted-foreground">Название</th>
                  <th className="p-4 font-semibold text-sm text-muted-foreground">Год</th>
                  <th className="p-4 font-semibold text-sm text-muted-foreground">Статистика</th>
                  <th className="p-4 font-semibold text-sm text-muted-foreground text-right">Действия</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {movies?.map((movie) => (
                  <tr key={movie.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="p-4 w-20">
                      <div className="w-12 h-16 bg-muted rounded-md overflow-hidden flex-shrink-0">
                        {movie.imageUrl ? (
                          <img src={movie.imageUrl} alt={movie.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="w-4 h-4 text-muted-foreground/50" />
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="p-4 font-medium max-w-[200px] truncate">{movie.title}</td>
                    <td className="p-4 text-muted-foreground">{movie.year || "—"}</td>
                    <td className="p-4">
                      <div className="flex flex-col text-sm">
                        <span className={cn(
                          "font-bold",
                          movie.expectationPercent >= 75 ? "text-green-600" : movie.expectationPercent < 40 ? "text-destructive" : "text-primary"
                        )}>
                          Ожидание: {Math.round(movie.expectationPercent)}%
                        </span>
                        <span className="text-muted-foreground text-xs">
                          {movie.totalVotes} голосов
                        </span>
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex justify-end items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-amber-500 hover:text-amber-600 hover:bg-amber-100"
                          onClick={() => handleResetVotes(movie.id, movie.title)}
                          title="Сбросить статистику"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                          onClick={() => openEditModal(movie)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon" 
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(movie.id, movie.title)}
                          disabled={deleteMovie.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                
                {movies?.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-muted-foreground">
                      <Film className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      Нет добавленных фильмов
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-xl p-0 overflow-hidden border-0 bg-background rounded-3xl">
          <div className="p-6 md:p-8 space-y-6">
            <DialogHeader>
              <DialogTitle className="text-2xl font-display font-bold">
                {editingId ? "Редактировать фильм" : "Добавить новый фильм"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold ml-1">Название <span className="text-destructive">*</span></label>
                <Input 
                  value={title} 
                  onChange={e => setTitle(e.target.value)} 
                  placeholder="Например, Дюна: Часть вторая"
                  className="bg-secondary/30"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold ml-1">Год</label>
                  <Input 
                    type="number" 
                    value={year} 
                    onChange={e => setYear(e.target.value)} 
                    placeholder="2024"
                    className="bg-secondary/30"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="text-sm font-semibold ml-1">URL Постера</label>
                  <Input 
                    value={imageUrl} 
                    onChange={e => setImageUrl(e.target.value)} 
                    placeholder="https://..."
                    className="bg-secondary/30"
                  />
                </div>
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
              <Button 
                variant="ghost" 
                onClick={() => setIsModalOpen(false)}
                className="w-full sm:w-auto"
              >
                Отмена
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={createMovie.isPending || updateMovie.isPending}
                className="w-full sm:w-auto font-bold"
              >
                {(createMovie.isPending || updateMovie.isPending) && (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                )}
                {editingId ? "Сохранить" : "Добавить"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
