import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { NextRequest, NextResponse } from 'next/server';

// Increase body size limit to 10MB for large timetable images
export const config = {
    api: {
        bodyParser: {
            sizeLimit: '10mb',
        },
    },
};

// Schema for a single extracted entry
interface ExtractedEntry {
    class: string;
    day: string;
    timeFrom: string;
    timeTo: string;
    subject: string;
    teacherName: string;
}

// Time format validation
const TIME_REGEX = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;

/**
 * Sanitize and validate extracted entries from the AI response.
 * Filters out invalid entries, normalizes fields, and removes duplicates.
 */
function sanitizeEntries(rawEntries: any[]): ExtractedEntry[] {
    const seen = new Set<string>();
    const valid: ExtractedEntry[] = [];

    for (const entry of rawEntries) {
        if (!entry || typeof entry !== 'object') continue;

        // Normalize field names: the AI might return "time from" or "time_from" or "timeFrom"
        const normalized: ExtractedEntry = {
            class: String(entry.class || entry.Class || '').trim(),
            day: String(entry.day || entry.Day || '').trim(),
            timeFrom: String(entry.timeFrom || entry.time_from || entry['time from'] || entry.TimeFrom || '').trim(),
            timeTo: String(entry.timeTo || entry.time_to || entry['time to'] || entry.TimeTo || '').trim(),
            subject: String(entry.subject || entry.Subject || '').trim(),
            teacherName: String(entry.teacherName || entry.teacher_name || entry.teacher || entry.Teacher || entry['teacher name'] || '').trim(),
        };

        // Validate required fields
        if (!normalized.subject || !normalized.timeFrom || !normalized.timeTo) {
            console.warn('[AI Extract] Skipping entry with missing required fields:', normalized);
            continue;
        }

        // Validate time format
        if (!TIME_REGEX.test(normalized.timeFrom) || !TIME_REGEX.test(normalized.timeTo)) {
            console.warn('[AI Extract] Skipping entry with invalid time format:', normalized);
            continue;
        }

        // Validate time order (timeFrom should be before timeTo)
        if (normalized.timeFrom >= normalized.timeTo) {
            console.warn('[AI Extract] Skipping entry where timeFrom >= timeTo:', normalized);
            continue;
        }

        // Duplicate detection
        const key = `${normalized.class}_${normalized.day}_${normalized.timeFrom}_${normalized.timeTo}_${normalized.subject}`.toLowerCase();
        if (seen.has(key)) {
            console.warn('[AI Extract] Skipping duplicate entry:', normalized);
            continue;
        }
        seen.add(key);

        valid.push(normalized);
    }

    return valid;
}

/**
 * Extract JSON array from AI response text.
 * Handles cases where the AI wraps JSON in markdown code blocks.
 */
function extractJsonFromResponse(text: string): any[] {
    // Try to extract from markdown code blocks first
    const codeBlockMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
    const jsonStr = codeBlockMatch ? codeBlockMatch[1].trim() : text.trim();

    const parsed = JSON.parse(jsonStr);

    // Handle both { entries: [...] } and [...] formats
    if (Array.isArray(parsed)) {
        return parsed;
    }
    if (parsed && Array.isArray(parsed.entries)) {
        return parsed.entries;
    }
    if (parsed && typeof parsed === 'object') {
        // Try to find any array property
        const arrayProp = Object.values(parsed).find(v => Array.isArray(v));
        if (arrayProp) return arrayProp as any[];
    }

    throw new Error('AI response did not contain a valid array of entries.');
}

/**
 * Retry a function with exponential backoff for rate limit (429) errors.
 * Gemini free tier has strict rate limits; this automatically retries after the suggested delay.
 */
async function withRetry<T>(fn: () => Promise<T>, maxRetries: number = 3): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error: any) {
            const is429 = error?.status === 429 || error?.message?.includes('429') || error?.statusText === 'Too Many Requests';
            if (!is429 || attempt === maxRetries) {
                throw error;
            }
            // Extract retry delay from error if available, otherwise use exponential backoff
            const retryDelay = error?.errorDetails
                ?.find((d: any) => d['@type']?.includes('RetryInfo'))
                ?.retryDelay;
            const delaySec = retryDelay ? parseInt(retryDelay) || 15 : 10 * attempt;
            console.log(`[AI Extract] Rate limited (429). Retrying in ${delaySec}s (attempt ${attempt}/${maxRetries})...`);
            await new Promise(resolve => setTimeout(resolve, delaySec * 1000));
        }
    }
    throw new Error('Max retries exceeded');
}

export async function POST(request: NextRequest) {
    console.log('[AI Extract] Image upload received');

    const apiKey = process.env.GOOGLE_GENAI_API_KEY;
    if (!apiKey) {
        console.error('[AI Extract] GOOGLE_GENAI_API_KEY is not set');
        return NextResponse.json(
            { error: 'AI service is not configured. Please set the GOOGLE_GENAI_API_KEY environment variable.' },
            { status: 500 }
        );
    }

    try {
        const body = await request.json();
        const { timetableImage } = body;

        if (!timetableImage || typeof timetableImage !== 'string') {
            return NextResponse.json(
                { error: 'No image provided. Please upload a timetable image.' },
                { status: 400 }
            );
        }

        // Parse the data URI to extract mime type and base64 data
        const dataUriMatch = timetableImage.match(/^data:(.+?);base64,(.+)$/);
        if (!dataUriMatch) {
            return NextResponse.json(
                { error: 'Invalid image format. Please upload a valid image file.' },
                { status: 400 }
            );
        }

        const mimeType = dataUriMatch[1];
        const base64Data = dataUriMatch[2];

        console.log('[AI Extract] Gemini request sent');

        // Initialize the Gemini client
        const genAI = new GoogleGenerativeAI(apiKey);
        const modelName = 'gemini-2.5-pro';
        console.log(`[AI Extract] Using model: ${modelName}`);
        const model = genAI.getGenerativeModel({
            model: modelName,
            safetySettings: [
                { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            ],
        });

        const prompt = `You are an expert data extraction assistant specializing in academic timetables.
Your task is to analyze the provided image of a college timetable and extract every lecture into a structured JSON format.

**Instructions:**
1. Scan the entire timetable grid, which may include multiple classes, days, and time slots.
2. For each individual lecture cell you find, extract the following information:
   - **class**: The name of the class (e.g., 'FYIT', 'SYBMS', 'TYCS'). This is often a column header.
   - **day**: The day of the week (e.g., 'Monday', 'Tuesday'). This is often a row header.
   - **timeFrom**: The start time of the lecture, in HH:MM 24-hour format (e.g., '09:00', '14:30').
   - **timeTo**: The end time of the lecture, in HH:MM 24-hour format.
   - **subject**: The name of the subject being taught.
   - **teacherName**: The name of the teacher. Often written in parentheses after the subject. Extract just the name.
3. If any piece of information for a lecture is unclear or missing from the image, return an empty string "" for that specific field. Do not guess or make up data.
4. Do NOT include breaks, empty cells, headers, room numbers, logos, decorations, or any non-lecture content.
5. Return ONLY a valid JSON array of objects. No explanations, no markdown, no text outside the JSON.

**Output format (strict):**
[
  {
    "class": "TYCS",
    "day": "Monday",
    "timeFrom": "09:00",
    "timeTo": "10:00",
    "subject": "Data Science",
    "teacherName": "Mr. Sharma"
  }
]`;

        // Call Gemini with automatic retry for rate limits (free tier)
        const result = await withRetry(() => model.generateContent([
            prompt,
            {
                inlineData: {
                    mimeType: mimeType,
                    data: base64Data,
                },
            },
        ]));

        const response = result.response;
        const text = response.text();

        console.log('[AI Extract] Gemini response received');
        console.log('[AI Extract] Raw response length:', text.length);

        // Parse and validate the response
        let rawEntries: any[];
        try {
            rawEntries = extractJsonFromResponse(text);
            console.log('[AI Extract] JSON parsing result: success, raw entries:', rawEntries.length);
        } catch (parseError) {
            console.error('[AI Extract] JSON parsing failed:', parseError);
            console.error('[AI Extract] Raw response:', text.substring(0, 500));
            return NextResponse.json(
                { error: 'The AI returned an invalid response. Please try again with a clearer image.' },
                { status: 422 }
            );
        }

        // Sanitize and validate entries
        const entries = sanitizeEntries(rawEntries);
        console.log('[AI Extract] Validated entries:', entries.length, 'out of', rawEntries.length, 'raw');

        if (entries.length === 0) {
            return NextResponse.json(
                { error: 'The AI could not find any valid timetable entries in the image. Please try a clearer image or enter lectures manually.' },
                { status: 422 }
            );
        }

        console.log('[AI Extract] Form autofill success, returning', entries.length, 'entries');

        return NextResponse.json({ entries });

    } catch (error: any) {
        console.error('[AI Extract] Error:', error);

        // Handle specific error types
        if (error?.status === 429 || error?.message?.includes('429')) {
            return NextResponse.json(
                { error: 'AI service rate limit reached. Please wait a moment and try again.' },
                { status: 429 }
            );
        }
        if (error?.message?.includes('API key')) {
            return NextResponse.json(
                { error: 'Invalid API key. Please check your GOOGLE_GENAI_API_KEY configuration.' },
                { status: 401 }
            );
        }
        if (error?.name === 'AbortError' || error?.message?.includes('timeout')) {
            return NextResponse.json(
                { error: 'The AI request timed out. Please try again with a smaller or clearer image.' },
                { status: 504 }
            );
        }

        return NextResponse.json(
            { error: 'An unexpected error occurred during extraction. Please try again.' },
            { status: 500 }
        );
    }
}
