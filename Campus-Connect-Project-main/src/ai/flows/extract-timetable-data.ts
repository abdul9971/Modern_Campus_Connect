'use server';
/**
 * @fileOverview An AI flow to extract structured timetable data from an image.
 *
 * - extractTimetableData - A function that handles the timetable extraction process.
 * - ExtractTimetableDataInput - The input type for the extractTimetableData function.
 * - ExtractTimetableDataOutput - The return type for the extractTimetableData function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';

// Define the schema for a single extracted entry, which will be used in the review table.
const ExtractedEntrySchema = z.object({
  class: z.string().describe("The class name, e.g., 'FYIT', 'SYBCOM'."),
  day: z.string().describe("The day of the week, e.g., 'Monday', 'Tuesday'."),
  timeFrom: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format, should be HH:MM").describe("The start time of the lecture in HH:MM format, e.g., '09:00'."),
  timeTo: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, "Invalid time format, should be HH:MM").describe("The end time of the lecture in HH:MM format, e.g., '09:45'."),
  subject: z.string().describe("The subject name, e.g., 'Data Structures'."),
  teacherName: z.string().describe("The name of the teacher, extracted from parentheses if present. e.g., 'Prof. Shah'."),
});

// Define the input schema for the flow, which requires a data URI of the image.
export const ExtractTimetableDataInputSchema = z.object({
  timetableImage: z
    .string()
    .describe(
      "A photo of a timetable, as a data URI that must include a MIME type and use Base64 encoding. Expected format: 'data:<mimetype>;base64,<encoded_data>'."
    ),
});
export type ExtractTimetableDataInput = z.infer<typeof ExtractTimetableDataInputSchema>;

// Define the output schema for the flow, which is an array of extracted entries.
export const ExtractTimetableDataOutputSchema = z.object({
  entries: z.array(ExtractedEntrySchema).describe("An array of all lecture entries extracted from the timetable image."),
});
export type ExtractTimetableDataOutput = z.infer<typeof ExtractTimetableDataOutputSchema>;

// The main exported function that the frontend will call.
export async function extractTimetableData(
  input: ExtractTimetableDataInput
): Promise<ExtractTimetableDataOutput> {
  // Gracefully handle cases where AI is disabled or not configured.
  if (!ai) {
    console.warn("AI feature is disabled. Returning empty data.");
    return { entries: [] };
  }
  return extractTimetableDataFlow(input);
}

// The Genkit Prompt that instructs the Gemini model on how to perform the extraction.
const extractPrompt = ai.definePrompt({
  name: 'extractTimetablePrompt',
  input: { schema: ExtractTimetableDataInputSchema },
  output: { schema: ExtractTimetableDataOutputSchema },
  prompt: `You are an expert data extraction assistant specializing in academic timetables.
Your task is to analyze the provided image of a college timetable and extract every lecture into a structured JSON format.

**Instructions:**
1.  Scan the entire timetable grid, which may include multiple classes, days, and time slots.
2.  For each individual lecture cell you find, extract the following information:
    *   **class**: The name of the class (e.g., 'FYIT', 'SYBMS', 'Third Year BCOM'). This is often a column header.
    *   **day**: The day of the week (e.g., 'Monday', 'Tuesday'). This is often a row header.
    *   **timeFrom**: The start time of the lecture, in HH:MM format.
    *   **timeTo**: The end time of the lecture, in HH:MM format.
    *   **subject**: The name of the subject being taught (e.g., 'Applied Mathematics', 'Financial Accounting').
    *   **teacherName**: The name of the teacher. Often, the teacher's name is written in parentheses after the subject, like "Economics (Prof. Mehta)". In this case, extract "Prof. Mehta". If the name is separate, extract it.
3.  If any piece of information for a lecture is unclear or missing from the image, return an empty string "" for that specific field. Do not guess or make up data.
4.  Compile all extracted lectures into a single array named 'entries'.
5.  Ensure the output strictly adheres to the provided JSON schema.

**Image to analyze:**
{{media url=timetableImage}}
`,
});

// The Genkit Flow that orchestrates the call to the prompt.
const extractTimetableDataFlow = ai.defineFlow(
  {
    name: 'extractTimetableDataFlow',
    inputSchema: ExtractTimetableDataInputSchema,
    outputSchema: ExtractTimetableDataOutputSchema,
  },
  async (input) => {
    const { output } = await extractPrompt(input);
    if (!output) {
      throw new Error("The AI model did not return a valid response.");
    }
    return output;
  }
);
