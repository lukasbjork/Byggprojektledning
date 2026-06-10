"use client";

import { useActionState } from "react";
import Link from "next/link";
import { saveMeeting, type FormState } from "@/app/(app)/moten/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { meetingTypeLabels } from "@/lib/labels";

export interface MeetingFormValues {
  id?: string;
  projectId: string;
  title: string;
  type: string;
  date: string; // yyyy-mm-dd
  participants: string;
}

export interface ProjectOption {
  id: string;
  label: string;
}

export function MeetingForm({
  projects,
  initial,
}: {
  projects: ProjectOption[];
  initial?: MeetingFormValues;
}) {
  const values: MeetingFormValues = initial ?? {
    projectId: projects[0]?.id ?? "",
    title: "",
    type: "BYGGMOTE",
    date: new Date().toISOString().slice(0, 10),
    participants: "",
  };
  const [state, formAction, pending] = useActionState<FormState | undefined, FormData>(
    saveMeeting,
    undefined
  );

  return (
    <Card>
      <CardContent>
        <form action={formAction} className="space-y-5">
          {values.id ? <input type="hidden" name="id" value={values.id} /> : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label>Projekt</Label>
              <Select name="projectId" defaultValue={values.projectId}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Mötestitel *</Label>
              <Input
                id="title"
                name="title"
                defaultValue={values.title}
                placeholder="Byggmöte 14"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Mötestyp</Label>
              <Select name="type" defaultValue={values.type}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(meetingTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Datum *</Label>
              <Input
                id="date"
                name="date"
                type="date"
                defaultValue={values.date}
                className="font-mono"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="participants">Deltagare</Label>
              <Input
                id="participants"
                name="participants"
                defaultValue={values.participants}
                placeholder="Namn, roll — separera med komma"
              />
            </div>
          </div>

          {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

          <div className="flex items-center gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Sparar …" : values.id ? "Spara ändringar" : "Skapa möte"}
            </Button>
            <Button
              variant="ghost"
              render={<Link href={values.id ? `/moten/${values.id}` : "/moten"} />}
            >
              Avbryt
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
