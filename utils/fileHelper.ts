
import * as XLSX from 'xlsx';
import { FlagRecord } from "../types";

/**
 * Parses the CSV/Excel document.
 * Handles grouped school reports where headers repeat throughout the file.
 */
export function parseSpreadsheet(data: ArrayBuffer): FlagRecord[] {
  const workbook = XLSX.read(data, { type: 'array', cellDates: true });
  let worksheet = workbook.Sheets[workbook.SheetNames[0]];
  
  // Get raw rows as arrays of strings to find headers anywhere
  const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" }) as any[][];
  
  if (rows.length === 0) return [];

  let headerIndices: { [key: string]: number } = {};
  const records: FlagRecord[] = [];

  // 1. Find the header row by looking for unique identifiers
  let foundHeader = false;
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i].map(cell => String(cell).toLowerCase().trim());
    
    // Look for the specific header row provided by the user
    if (row.includes("pupil name") && row.includes("date") && row.includes("category")) {
      headerIndices = {
        studentName: row.indexOf("pupil name"),
        house: row.indexOf("house"),
        yearGroup: row.indexOf("year"),
        category: row.indexOf("category"),
        points: row.indexOf("points"),
        date: row.indexOf("date"),
        reason: row.indexOf("reward description"),
        teacher: row.indexOf("teacher"),
        subject: row.indexOf("subject")
      };
      foundHeader = true;
      continue; // Skip the actual header row
    }

    if (!foundHeader) continue;

    // 2. Process data rows
    const studentName = String(rows[i][headerIndices.studentName] || "").trim();
    const dateValue = String(rows[i][headerIndices.date] || "").trim();

    // Skip rows that are empty, or repeats of the header, or pupil name group headers
    if (!studentName || studentName.toLowerCase() === "pupil name") continue;
    if (!dateValue || dateValue.toLowerCase() === "date") continue;

    // Handle DD/MM/YYYY format or Excel serial dates
    let timestamp = 0;
    let formattedDate = dateValue;
    
    if (dateValue.includes('/')) {
      const [d, m, y] = dateValue.split('/');
      timestamp = new Date(`${y}-${m}-${d}`).getTime();
    } else {
      timestamp = Date.parse(dateValue);
    }

    records.push({
      studentName,
      date: formattedDate,
      timestamp: timestamp || 0,
      yearGroup: String(rows[i][headerIndices.yearGroup] || "Unknown"),
      house: String(rows[i][headerIndices.house] || "None"),
      form: "N/A", // Not explicitly mapped as it's often merged
      teacher: String(rows[i][headerIndices.teacher] || "Unknown"),
      reason: String(rows[i][headerIndices.reason] || ""),
      category: String(rows[i][headerIndices.category] || "None"),
      subject: String(rows[i][headerIndices.subject] || ""),
      points: parseFloat(String(rows[i][headerIndices.points])) || 0
    });
  }

  return records;
}

export function generateSampleCSV(): string {
  const data = [
    ["Rewards Report"],
    [],
    ["Abbott, Amelia"],
    ["Pupil Name", "House", "", "Form", "Year", "Reward", "Category", "Points", "Date", "Reward Description", "Teacher", "Dep", "Subject"],
    ["Abbott, Amelia", "Izanami", "", "I - Wilkie", "Year 7", "Flags", "Uniform", "1", "03/09/2025", "In sports shoes today.", "JWI", "", ""],
    ["Abbott, Amelia", "Izanami", "", "I - Wilkie", "Year 7", "Flags", "Equipment", "1", "01/12/2025", "no notebook", "JIQU", "", ""],
    [],
    ["Abe, Sebastian"],
    ["Pupil Name", "House", "", "Form", "Year", "Reward", "Category", "Points", "Date", "Reward Description", "Teacher", "Dep", "Subject"],
    ["Abe, Sebastian", "Amaterasu", "", "A - Que", "Year 8", "Flags", "Classroom behaviour", "1", "16/09/2025", "Not sitting properly", "JIQU", "", ""],
    ["Abe, Sebastian", "Amaterasu", "", "A - Que", "Year 8", "Flags", "Homework", "1", "20/10/2025", "No homework done", "APR", "", ""]
  ];
  return data.map(r => r.join(",")).join("\n");
}
