import { useState, useEffect, useRef } from "react";
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
  Plus, Edit, Trash2, RotateCcw, LogOut, Loader2, Film, Upload, Link as LinkIcon, X
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
import { motion, AnimatePresence } from "framer-motion";

async function resetVotes(movieId: number, token: string) {
  const res = await fetch(`/api/movies/${movieId}/votes`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.ok;
}

async function uploadImage(file: File, token: string): Promise<string> {
  const formData = new FormData();
  formData.append("image", file);
  const res = await fetch("/api/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) throw new Error("Ошибка загрузки");
  const data = await res.json() as { url: string };
  return data.url;
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
  const [imageMode, setImageMode] = useState<"url" | "file">("url");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setImageUrl("");
    setTrailerUrl("");
    setYear("");
    setImageMode("url");
    setUploadFile(null);
    setUploadPreview(null);
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
    setImageMode("url");
    setUploadFile(null);
    setUploadPreview(null);
    setIsModalOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setUploadPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!title.trim() || !description.trim()) {
      toast.error("Заполните обязательные поля (Название и Описание)");
      return;
    }

    let finalImageUrl = imageUrl;

    if (imageMode === "file" && uploadFile) {
      setIsUploading(true);
      try {
        finalImageUrl = await uploadImage(uploadFile, token!);
      } catch {
        toast.error("Не удалось загрузить изображение");
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    const payload = {
      title,
      description,
      imageUrl: finalImageUrl,
      trailerUrl: trailerUrl.trim() || null,
      year: year ? parseInt(year, 10) : null
    };

    if (editingId) {
      updateMovie.mutate(
        { id: editingId, data: payload as MoviePatch },
        {
          onSuccess: () => {
            toast.success("Фильм обновлён");
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

  const handleDelete = (movie: MovieWithStats) => {
    if (!confirm(`Удалить фильм "${movie.title}"?`)) return;
    deleteMovie.mutate(
      { id: movie.id },
      {
        onSuccess: () => {
          toast.success("Фильм удалён");
          queryClient.invalidateQueries({ queryKey: getListMoviesQueryKey() });
          queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
        },
        onError: () => toast.error("Ошибка при удалении")
      }
    );
  };

  const handleResetVotes = async (movie: MovieWithStats) => {
    if (!confirm(`Сбросить голоса для "${movie.title}"?`)) return;
    const ok = await resetVotes(movie.id, token!);
    if (ok) {
      toast.success("Голоса сброшены");
      queryClient.invalidateQueries({ queryKey: getListMoviesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetStatsQueryKey() });
    } else {
      toast.error("Ошибка при сбросе");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("admin_token");
    setLocation("/admin");
  };

  return (
    <div className="space-y-6 pb-16">
      <motion.div
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-display font-bold">🎬 Управление фильмами</h1>
          <p className="text-muted-foreground mt-1">Добавляйте, редактируйте и удаляйте фильмы</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={openAddModal} className="gap-2 font-semibold">
            <Plus className="w-4 h-4" /> Добавить фильм
          </Button>
          <Button variant="ghost" onClick={handleLogout} className="gap-2 text-muted-foreground">
            <LogOut className="w-4 h-4" /> Выйти
          </Button>
        </div>
      </motion.div>

      {isLoading ? (
        <div className="flex items-center justify-center h-40">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {(movies ?? []).map((movie, index) => (
            <motion.div
              key={movie.id}
              initial={{ opacity: 0, y: 20, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.35, delay: index * 0.04 }}
              className="bg-card border rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="aspect-[2/3] relative bg-muted overflow-hidden">
                {movie.imageUrl ? (
                  <img src={movie.imageUrl} alt={movie.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <Film className="w-10 h-10 opacity-20" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-3">
                  <p className="text-white font-display font-bold text-sm leading-tight line-clamp-2">{movie.title}</p>
                  {movie.year && <p className="text-white/60 text-xs">{movie.year}</p>}
                </div>
              </div>
              <div className="p-3 flex gap-2">
                <div className="flex-1 text-xs text-muted-foreground">
                  {movie.totalVotes} голос.
                </div>
                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => openEditModal(movie)}>
                  <Edit className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-yellow-600" onClick={() => handleResetVotes(movie)} title="Сбросить голоса">
                  <RotateCcw className="w-3.5 h-3.5" />
                </Button>
                <Button size="sm" variant="ghost" className="h-7 px-2 text-destructive" onClick={() => handleDelete(movie)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Dialog open={isModalOpen} onOpenChange={(o) => { if (!o) { setIsModalOpen(false); resetForm(); } }}>
        <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              {editingId ? "✏️ Редактировать фильм" : "🎬 Добавить фильм"}
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
            </div>

            {/* Постер — URL или загрузка */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold ml-1">Постер</label>
                <div className="flex rounded-lg border overflow-hidden text-xs">
                  <button
                    type="button"
                    onClick={() => setImageMode("url")}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 transition-colors",
                      imageMode === "url" ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
                    )}
                  >
                    <LinkIcon className="w-3 h-3" /> Ссылка
                  </button>
                  <button
                    type="button"
                    onClick={() => setImageMode("file")}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 transition-colors",
                      imageMode === "file" ? "bg-primary text-primary-foreground" : "hover:bg-secondary"
                    )}
                  >
                    <Upload className="w-3 h-3" /> С компьютера
                  </button>
                </div>
              </div>

              <AnimatePresence mode="wait">
                {imageMode === "url" ? (
                  <motion.div
                    key="url"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Input
                      value={imageUrl}
                      onChange={e => setImageUrl(e.target.value)}
                      placeholder="https://example.com/poster.jpg"
                      className="bg-secondary/30"
                    />
                    {imageUrl && (
                      <div className="mt-2 relative rounded-lg overflow-hidden aspect-[2/3] w-24 border">
                        <img src={imageUrl} alt="preview" className="w-full h-full object-cover" onError={e => (e.currentTarget.style.display = none)} />
                      </div>
                    )}
                  </motion.div>
                ) : (
                  <motion.div
                    key="file"
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.15 }}
                    className="space-y-2"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFileChange}
                    />
                    {!uploadPreview ? (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="w-full border-2 border-dashed border-border hover:border-primary rounded-xl p-6 flex flex-col items-center gap-2 text-muted-foreground hover:text-primary transition-colors"
                      >
                        <Upload className="w-8 h-8" />
                        <span className="text-sm font-medium">Нажмите для выбора файла</span>
                        <span className="text-xs">JPG, PNG, WEBP до 10 МБ</span>
                      </button>
                    ) : (
                      <div className="relative">
                        <div className="rounded-lg overflow-hidden aspect-[2/3] w-24 border">
                          <img src={uploadPreview} alt="preview" className="w-full h-full object-cover" />
                        </div>
                        <button
                          type="button"
                          onClick={() => { setUploadFile(null); setUploadPreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                          className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-0.5 shadow"
                        >
                          <X className="w-3 h-3" />
                        </button>
                        <p className="mt-1 text-xs text-muted-foreground truncate max-w-[200px]">{uploadFile?.name}</p>
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="mt-1 text-xs text-primary underline">Сменить файл</button>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
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
            <Button variant="ghost" onClick={() => { setIsModalOpen(false); resetForm(); }} className="w-full sm:w-auto">Отмена</Button>
            <Button onClick={handleSave} disabled={createMovie.isPending || updateMovie.isPending || isUploading} className="w-full sm:w-auto font-bold">
              {(createMovie.isPending || updateMovie.isPending || isUploading) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingId ? "Сохранить" : "Добавить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
