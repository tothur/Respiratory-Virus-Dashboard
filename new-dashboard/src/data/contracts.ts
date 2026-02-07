import { z } from "zod";

export const WeeklyRowSchema = z
  .object({
    dataset: z.string().optional(),
    year: z.coerce.number(),
    virus: z.string().optional(),
    week: z.coerce.number(),
    cases: z.coerce.number().nullable().optional(),
    region: z.string().optional(),
  })
  .passthrough();

export const SariWeeklyRowSchema = z
  .object({
    year: z.coerce.number(),
    week: z.coerce.number(),
    admissions: z.coerce.number().nullable().optional(),
    icu: z.coerce.number().nullable().optional(),
  })
  .passthrough();

export const VirologyDetectionRowSchema = z
  .object({
    year: z.coerce.number().optional(),
    week: z.coerce.number(),
    virus: z.string().optional(),
    detections: z.coerce.number().nullable().optional(),
  })
  .passthrough();

export const VirologyPositivityRowSchema = z
  .object({
    year: z.coerce.number().optional(),
    week: z.coerce.number(),
    virus: z.string().optional(),
    positivity: z.coerce.number().nullable().optional(),
  })
  .passthrough();

export const RespiratoryDataSchema = z
  .object({
    years: z.array(z.coerce.number()).default([]),
    weekly: z.array(WeeklyRowSchema).default([]),
    sariWeekly: z.array(SariWeeklyRowSchema).default([]),
    virologyDetections: z.array(VirologyDetectionRowSchema).default([]),
    virologyPositivity: z.array(VirologyPositivityRowSchema).default([]),
    ervissDetections: z.array(VirologyDetectionRowSchema).default([]),
    ervissPositivity: z.array(VirologyPositivityRowSchema).default([]),
  })
  .passthrough();

export const SeasonLabelsSchema = z.record(z.string()).default({});

export type RespiratoryData = z.infer<typeof RespiratoryDataSchema>;
export type WeeklyRow = z.infer<typeof WeeklyRowSchema>;
export type SariWeeklyRow = z.infer<typeof SariWeeklyRowSchema>;
export type VirologyDetectionRow = z.infer<typeof VirologyDetectionRowSchema>;
export type VirologyPositivityRow = z.infer<typeof VirologyPositivityRowSchema>;
