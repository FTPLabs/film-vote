import { useState } from "react";
import { useLocation } from "wouter";
import { useAdminLogin } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Lock, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function AdminLogin() {
  const [, setLocation] = useLocation();
  const [password, setPassword] = useState("");
  const adminLogin = useAdminLogin();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;

    adminLogin.mutate(
      { data: { password } },
      {
        onSuccess: (result) => {
          localStorage.setItem("admin_token", result.token);
          toast.success("Вход выполнен успешно");
          setLocation("/admin/dashboard");
        },
        onError: () => {
          toast.error("Ошибка входа", {
            description: "Неверный пароль",
          });
        }
      }
    );
  };

  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm bg-card border rounded-3xl p-8 shadow-lg">
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 bg-primary/10 text-primary flex items-center justify-center rounded-2xl mb-4">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-display font-bold text-center">Вход в админку</h1>
          <p className="text-muted-foreground text-center mt-2">
            Только для сотрудников кинотеатра
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold ml-1">Пароль</label>
            <Input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 bg-secondary/50 border-transparent focus:bg-background"
              required
            />
          </div>

          <Button 
            type="submit" 
            className="w-full h-12 text-base font-bold rounded-xl"
            disabled={adminLogin.isPending}
          >
            {adminLogin.isPending ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Проверка...
              </>
            ) : (
              "Войти"
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
