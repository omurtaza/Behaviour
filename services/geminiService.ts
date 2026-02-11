
import { GoogleGenAI, Type } from "@google/genai";
import { FlagRecord, AnalysisSummary } from "../types";

export async function analyzeFlagData(data: FlagRecord[]): Promise<AnalysisSummary> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const yearGroups = Array.from(new Set(data.map(r => r.yearGroup))).filter(Boolean);

  // Group data to give AI a better sense of frequency for the top students
  const studentStats = new Map<string, number>();
  data.forEach(r => studentStats.set(r.studentName, (studentStats.get(r.studentName) || 0) + 1));
  const topStudentNames = Array.from(studentStats.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(e => e[0]);

  const dataSummary = data.slice(0, 1500).map(r => {
    const d = new Date(r.timestamp || 0);
    const day = isNaN(d.getTime()) ? "Unknown" : d.toLocaleDateString('en-GB', { weekday: 'long' });
    return `${r.date}|${day}|${r.studentName}|${r.teacher}|${r.yearGroup}|${r.category}|${r.reason}`
  }).join('\n');

  const prompt = `
    Act as a Senior School Data Analyst and Behavioral Consultant for a Senior Leadership Team (SLT).
    Analyze this school "Flags" behavioral report.
    Headers: Date|DayOfWeek|Student|Teacher|YearGroup|Category|Reason
    
    Data Context:
    ${dataSummary}

    GOAL: Produce a professional, strategic report focused on growth and targeted support.

    TONE:
    - Constructive, professional, and forward-looking.
    - Avoid alarmist language (no "crisis", "chronic", "failure").
    - Use "strategic focus", "behavioral trend", "developmental priority", or "engagement opportunity".

    SPECIFIC TASKS:
    1. EXECUTIVE SUMMARY: High-level strategic overview of school-wide behavioral culture.
    2. TEMPORAL ANALYSIS: Identify 2-3 specific calendar weeks with volume spikes and provide context (e.g. "Week of Nov 10th showed increased flags, potentially linked to mid-term fatigue or assessments").
    3. YEAR GROUP DEEP DIVES: For each of these years [${yearGroups.join(', ')}], provide:
       - 'insight': Culture summary.
       - 'priority': The main HOY focus.
       - 'interventions': 3-4 practical, school-based actions.
       - 'alerts': Leadership-level patterns (e.g. departmental or time-of-day trends).
    4. FREQUENT FLYER ANALYSIS:
       - For the most flagged students (specifically look at: ${topStudentNames.join(', ')}), provide a 'summary'.
       - The 'summary' MUST be 1-2 specific sentences explaining the exact nature of their flags (e.g., "Mainly flagged for equipment and organization by multiple teachers, suggesting a need for a targeted tutor intervention on self-management").
       - USE THE EXACT STUDENT NAMES as provided in the data.

    Return valid JSON matching the schema.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          totalFlags: { type: Type.NUMBER },
          topTeacher: { type: Type.STRING },
          topYearGroup: { type: Type.STRING },
          mostCommonReason: { type: Type.STRING },
          busiestDay: { type: Type.STRING },
          aiInsights: { type: Type.STRING },
          interventions: { type: Type.ARRAY, items: { type: Type.STRING } },
          temporalSpikes: { type: Type.ARRAY, items: { type: Type.STRING } },
          yearInsights: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                year: { type: Type.STRING },
                insight: { type: Type.STRING },
                priority: { type: Type.STRING },
                interventions: { type: Type.ARRAY, items: { type: Type.STRING } },
                alerts: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ['year', 'insight', 'priority', 'interventions', 'alerts']
            }
          },
          trends: {
            type: Type.OBJECT,
            properties: {
              byTeacher: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, value: { type: Type.NUMBER } }, required: ['name', 'value'] } },
              byYearGroup: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, value: { type: Type.NUMBER } }, required: ['name', 'value'] } },
              byReason: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, value: { type: Type.NUMBER } }, required: ['name', 'value'] } },
              byDay: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, value: { type: Type.NUMBER } }, required: ['name', 'value'] } },
              overTime: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, value: { type: Type.NUMBER } }, required: ['name', 'value'] } },
              byCategory: { type: Type.ARRAY, items: { type: Type.OBJECT, properties: { name: { type: Type.STRING }, value: { type: Type.NUMBER } }, required: ['name', 'value'] } }
            },
            required: ['byTeacher', 'byYearGroup', 'byReason', 'byDay', 'overTime', 'byCategory']
          },
          hotspots: {
            type: Type.OBJECT,
            properties: {
              students: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    name: { type: Type.STRING },
                    count: { type: Type.NUMBER },
                    mainReason: { type: Type.STRING },
                    summary: { type: Type.STRING }
                  },
                  required: ['name', 'count', 'mainReason', 'summary']
                }
              }
            },
            required: ['students']
          }
        },
        required: ['totalFlags', 'topTeacher', 'topYearGroup', 'mostCommonReason', 'busiestDay', 'aiInsights', 'interventions', 'trends', 'hotspots', 'yearInsights', 'temporalSpikes']
      }
    }
  });

  try {
    const text = response.text || "{}";
    return JSON.parse(text.trim()) as AnalysisSummary;
  } catch (e) {
    console.error("Critical AI Processing Error:", e);
    throw new Error("AI analysis failed to compile the temporal and year-group strategy.");
  }
}
