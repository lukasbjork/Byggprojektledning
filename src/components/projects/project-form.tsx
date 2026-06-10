"use client";

import { useActionState } from "react";
import Link from "next/link";
import { saveProject, type FormState } from "@/app/(app)/projekt/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import {
  projectTypeLabels,
  entreprenadformLabels,
  projectStatusLabels,
} from "@/lib/labels";

export interface ProjectFormValues {
  id?: string;
  name: string;
  projectNumber: string;
  type: string;
  entreprenadform: string;
  status: string;
  budget: number;
  startDate: string; // yyyy-mm-dd eller ""
  endDate: string;
  client: string;
  contractor: string;
  description: string;
}

const emptyValues: ProjectFormValues = {
  name: "",
  projectNumber: "",
  type: "NYBYGGNAD",
  entreprenadform: "TOTALENTREPRENAD",
  status: "PLANERING",
  budget: 0,
  startDate: "",
  endDate: "",
  client: "",
  contractor: "",
  description: "",
};

export function ProjectForm({ initial }: { initial?: ProjectFormValues }) {
  const values = initial ?? emptyValues;
  const [state, formAction, pending] = useActionState<FormState | undefined, FormData>(
    saveProject,
    undefined
  );

  return (
    <Card>
      <CardContent>
        <form action={formAction} className="space-y-5">
          {values.id ? <input type="hidden" name="id" value={values.id} /> : null}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name">Projektnamn *</Label>
              <Input id="name" name="name" defaultValue={values.name} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectNumber">Projektnummer *</Label>
              <Input
                id="projectNumber"
                name="projectNumber"
                defaultValue={values.projectNumber}
                placeholder="P-2026-001"
                className="font-mono"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="budget">Budget (SEK)</Label>
              <Input
                id="budget"
                name="budget"
                type="number"
                min={0}
                step={1000}
                defaultValue={values.budget}
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label>Typ</Label>
              <Select name="type" defaultValue={values.type}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(projectTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Entreprenadform</Label>
              <Select name="entreprenadform" defaultValue={values.entreprenadform}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(entreprenadformLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Status</Label>
              <Select name="status" defaultValue={values.status}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(projectStatusLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="client">Beställare</Label>
              <Input id="client" name="client" defaultValue={values.client} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="contractor">Entreprenör</Label>
              <Input id="contractor" name="contractor" defaultValue={values.contractor} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Startdatum</Label>
              <Input
                id="startDate"
                name="startDate"
                type="date"
                defaultValue={values.startDate}
                className="font-mono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="endDate">Slutdatum</Label>
              <Input
                id="endDate"
                name="endDate"
                type="date"
                defaultValue={values.endDate}
                className="font-mono"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description">Kort beskrivning</Label>
              <Textarea
                id="description"
                name="description"
                rows={3}
                defaultValue={values.description}
              />
            </div>
          </div>

          {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}

          <div className="flex items-center gap-2">
            <Button type="submit" disabled={pending}>
              {pending ? "Sparar …" : values.id ? "Spara ändringar" : "Skapa projekt"}
            </Button>
            <Button
              variant="ghost"
              render={<Link href={values.id ? `/projekt/${values.id}` : "/projekt"} />}
            >
              Avbryt
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
