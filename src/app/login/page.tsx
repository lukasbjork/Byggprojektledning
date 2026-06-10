import type { Metadata } from "next";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Logga in" };

export default function LoginPage() {
  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Ritningshuvud-inspirerad brand: monostämpel + namn */}
        <div className="mb-8 flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-md border border-foreground/20 bg-card font-mono text-sm font-semibold tracking-tight">
            BP
          </div>
          <div>
            <p className="text-base font-semibold leading-tight">Byggprojektledning</p>
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
              Platskontor
            </p>
          </div>
        </div>
        <LoginForm />
      </div>
    </main>
  );
}
