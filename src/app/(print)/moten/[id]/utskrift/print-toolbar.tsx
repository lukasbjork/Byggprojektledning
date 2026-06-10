"use client";

import { Printer, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";

export function PrintToolbar() {
  const router = useRouter();
  return (
    <div className="mb-6 flex items-center justify-between print:hidden">
      <Button variant="ghost" onClick={() => router.back()}>
        <ArrowLeft className="size-4" />
        Tillbaka
      </Button>
      <Button onClick={() => window.print()}>
        <Printer className="size-4" />
        Skriv ut / Spara som PDF
      </Button>
    </div>
  );
}
