"use client";

import * as React from "react";
import * as z from "zod";
import { UseFormReturn } from "react-hook-form";

import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { playgroundFormSchema } from "@/lib/hooks/schemas/formSchemas";

interface NegativePromptFieldProps {
  form: UseFormReturn<z.infer<typeof playgroundFormSchema>>;
}

export function NegativePromptField({ form }: NegativePromptFieldProps) {
  const { watch, setValue } = form;
  const negativePrompt = watch("negativePrompt");

  const handleNegativePromptChange = (
    event: React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    setValue("negativePrompt", event.target.value);
  };

  return (
    <div className="grid gap-2 pt-2">
      <HoverCard openDelay={200}>
        <HoverCardTrigger asChild>
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="Negative Prompt" className="leading-[1.5]">
                Negative Prompt
              </Label>
            </div>
            <Textarea
              {...form.register("negativePrompt")}
              onChange={handleNegativePromptChange}
              value={negativePrompt}
            />
          </div>
        </HoverCardTrigger>
        <HoverCardContent align="start" className="w-[260px] text-sm">
          A feature that allows the model to understand what it should not
          generate. It&apos;s a way to guide the model&apos;s output away from
          certain themes.
        </HoverCardContent>
      </HoverCard>
    </div>
  );
}
