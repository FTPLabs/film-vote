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
  Plus, Edit, Trash2, RotateCcw, LogOut, Loader2, Film, Upload, Link as LinkIcon, X, Video
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

async function uploadClip(file: File, token: string): Promise<string> {
  const formData = new FormData();
  formData.append("clip", file);
  const res = await fetch("/api/upload/clip", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) throw new Error("Ошибка загрузки клипа");
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
  const [clipUrl, setClipUrl] = useState("");
  const [year, setYear] = useState<string>("");
  const [imageMode, setImageMode] = useState<"url" | "file">("url");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clip upload state
  const [clipMode, setClipMode] = useState<"url" | "file">("url");
  const [clipFile, setClipFile] = useState<File | null>(null);
  const [clipFileName, setClipFileName] = useState<string | null>(null);
  const [isUploadingClip, setIsUploadingClip] = useState(false);
  const clipFileRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setEditingId(null);
    setTitle("");
    setDescription("");
    setImageUrl("");
    setClipUrl("");
    setYear("");
    setImageMode("url");
    setUploadFile(null);
    setUploadPreview(null);
    setClipMode("url");
    setClipFile(null);
    setClipFileName(null);
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
    setClipUrl(movie.clipUrl ?? "");
    setYear(movie.year ? movie.year.toString() : "");
    setImageMode("url");
    setUploadFile(null);
    setUploadPreview(null);
    setClipMode("url");
    setClipFile(null);
    setClipFileName(null);
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

  const handleClipFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setClipFile(file);
    setClipFileName(file.name);
  };

  const handleSave = async () => {
    if (!title.trim() || !description.trim()) {
      toast.error("Заполните обязательные поля (Название и Описание)");
      return;
    }

    let finalImageUrl = imageUrl;
    let finalClipUrl = clipUrl;

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

    if (clipMode === "file" && clipFile) {
      setIsUploadingClip(true);
      try {
        finalClipUrl = await uploadClip(clipFile, token!);
      } catch {
        toast.error("Не удалось загрузить клип");
        setIsUploadingClip(false);
        return;
      }
      setIsUploadingClip(false);
    }

    const payload = {
      title,
      description,
      imageUrl: finalImageUrl,
      clipUrl: finalClipUrl.trim() || null,
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

  const isBusy = createMovie.isPending || updateMovie.isPending || isUploading || isUploadingClip;

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
                {movie.clipUrl && (
                  <div className="absolute top-2 right-2 bg-black/60 rounded-full p-1" title="Есть клип">
                    <Video className="w-3 h-3 text-green-400" />
                  </div>
                )}
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-display">
              {editingId ? "✏️ Редактировать фильм" : "➕ Добавить фильм"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <label className="text-sm font-semibold ml-1">Название <span className="text-destructive">*</span></label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Название фильма" className="bg-secondary/30" />
              </div>
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <label className="text-sm font-semibold ml-1">Год</label>
                <Input value={year} onChange={e => setYear(e.target.value)} type="number" placeholder="1999" className="bg-secondary/30" />
              </div>
            </div>

            {/* Image section */}
            <div className="space-y-2">
              <label className="text-sm font-semibold ml-1">Постер <span className="text-destructive">*</span></label>
              <div className="flex gap-2 mb-2">
                <Button type="button" size="sm" variant={imageMode === "url" ? "default" : "outline"}
                  className="gap-1.5 text-xs h-7" onClick={() => setImageMode("url")}>
                  <LinkIcon className="w-3 h-3" /> По ссылке
                </Button>
                <Button type="button" size="sm" variant={imageMode === "file" ? "default" : "outline"}
                  className="gap-1.5 text-xs h-7" onClick={() => setImageMode("file")}>
                  <Upload className="w-3 h-3" /> С компьютера
                </Button>
              </div>
              <AnimatePresence mode="wait">
                {imageMode === "url" ? (
                  <motion.div key="url" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}>
                    <Input value={imageUrl} onChange={e => setImageUrl(e.target.value)}
                      placeholder="https://..." className="bg-secondary/30" />
                  </motion.div>
                ) : (
                  <motion.div key="file" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}
                    className="space-y-2">
                    <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        "border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors",
                        uploadPreview ? "border-primary/50 bg-primary/5" : "border-border hover:border-primary/40 hover:bg-secondary/20"
                      )}
                    >
                      {!uploadPreview ? (
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Upload className="w-8 h-8" />
                          <p className="text-sm">Нажмите для выбора файла</p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <img src={uploadPreview} alt="preview" className="w-16 h-20 object-cover rounded-lg" />
                          <div className="flex-1 text-left">
                            <p className="text-sm font-medium text-primary">Файл выбран</p>
                            <p className="mt-1 text-xs text-muted-foreground truncate max-w-[200px]">{uploadFile?.name}</p>
                          </div>
                          <Button type="button" size="sm" variant="ghost"
                            onClick={(e) => { e.stopPropagation(); setUploadFile(null); setUploadPreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Clip section */}
            <div className="space-y-2">
              <label className="text-sm font-semibold ml-1">🎭 Смешной клип (макс. 1 мин, 750p)</label>
              <div className="flex gap-2 mb-2">
                <Button type="button" size="sm" variant={clipMode === "url" ? "default" : "outline"}
                  className="gap-1.5 text-xs h-7" onClick={() => setClipMode("url")}>
                  <LinkIcon className="w-3 h-3" /> По ссылке
                </Button>
                <Button type="button" size="sm" variant={clipMode === "file" ? "default" : "outline"}
                  className="gap-1.5 text-xs h-7" onClick={() => setClipMode("file")}>
                  <Upload className="w-3 h-3" /> Загрузить файл
                </Button>
              </div>
              <AnimatePresence mode="wait">
                {clipMode === "url" ? (
                  <motion.div key="clip-url" initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}>
                    <Input
                      value={clipUrl}
                      onChange={e => setClipUrl(e.target.value)}
                      placeholder="/uploads/clips/filename.mp4"
                      className="bg-secondary/30"
                    />
                    <p className="text-xs text-muted-foreground ml-1 mt-1">Путь к загруженному видеофайлу</p>
                  </motion.div>
                ) : (
                  <motion.div key="clip-file" initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -8 }}>
                    <input ref={clipFileRef} type="file" accept="video/*" className="hidden" onChange={handleClipFileChange} />
                    <div
                      onClick={() => clipFileRef.current?.click()}
                      className={cn(
                        "border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors",
                        clipFileName ? "border-primary/50 bg-primary/5" : "border-border hover:border-primary/40 hover:bg-secondary/20"
                      )}
                    >
                      {!clipFileName ? (
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Video className="w-8 h-8" />
                          <p className="text-sm">Нажмите для выбора видео</p>
                          <p className="text-xs">MP4, WebM до 100 МБ</p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <div className="bg-primary/10 rounded-lg p-3">
                            <Video className="w-6 h-6 text-primary" />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-sm font-medium text-primary">Видео выбрано</p>
                            <p className="mt-1 text-xs text-muted-foreground truncate max-w-[200px]">{clipFileName}</p>
                          </div>
                          <Button type="button" size="sm" variant="ghost"
                            onClick={(e) => { e.stopPropagation(); setClipFile(null); setClipFileName(null); if (clipFileRef.current) clipFileRef.current.value = ""; }}>
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </div>
                    {isUploadingClip && (
                      <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" /> Загружаем клип...
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
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
            <Button onClick={handleSave} disabled={isBusy} className="w-full sm:w-auto font-bold">
              {isBusy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {editingId ? "Сохранить" : "Добавить"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
