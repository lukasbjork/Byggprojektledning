"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";
import { saveTemplate } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";

export interface TemplateView {
  id: string;
  type: string;
  name: string;
  content: string;
}

function TemplateForm({ template }: { template: TemplateView }) {
  const [content, setContent] = useState(template.content);
  const [saving, startTransition] = useTransition();
  const dirty = content !== template.content;

  return (
    <div className="space-y-3">
      <Textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={12}
        className="font-mono text-xs"
        aria-label={`Mall för ${template.name}`}
      />
      <Button
        variant="secondary"
        disabled={!dirty || saving}
        onClick={() =>
          startTransition(async () => {
            await saveTemplate(template.id, content);
            toast.success(`Mallen för ${template.name.toLowerCase()} sparades.`);
          })
        }
      >
        <Save className="size-4" />
        {saving ? "Sparar …" : "Spara mall"}
      </Button>
    </div>
  );
}

export function TemplatesEditor({ templates }: { templates: TemplateView[] }) {
  if (templates.length === 0) return null;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Rapportmallar</CardTitle>
        <CardDescription>
          Rubrikstruktur och ton som AI:n följer när rapporter genereras.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={templates[0].id}>
          <TabsList>
            {templates.map((t) => (
              <TabsTrigger key={t.id} value={t.id}>
                {t.name}
              </TabsTrigger>
            ))}
          </TabsList>
          {templates.map((t) => (
            <TabsContent key={t.id} value={t.id} className="mt-3">
              <TemplateForm template={t} />
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
