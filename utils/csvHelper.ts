
import { FlagRecord } from "../types";

export function parseCSV(text: string): FlagRecord[] {
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  if (lines.length < 2) return [];

  // Basic CSV header mapping
  const headers = lines[0].toLowerCase().split(',').map(h => h.trim());
  
  return lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.trim());
    const record: any = {};
    
    headers.forEach((header, index) => {
      const val = values[index] || "";
      if (header.includes('date')) record.date = val;
      else if (header.includes('student')) record.studentName = val;
      else if (header.includes('year')) record.yearGroup = val;
      else if (header.includes('teacher')) record.teacher = val;
      else if (header.includes('reason')) record.reason = val;
    });

    // Fallback if headers are weird
    if (!record.date) record.date = values[0];
    if (!record.studentName) record.studentName = values[1];
    if (!record.yearGroup) record.yearGroup = values[2];
    if (!record.teacher) record.teacher = values[3];
    if (!record.reason) record.reason = values[4];

    return record as FlagRecord;
  });
}

export function generateSampleData(): string {
  return `Date,Student,Year,Teacher,Reason
2023-10-02,John Doe,Year 9,Mr. Smith,Disruptive Behavior
2023-10-02,Jane Roe,Year 10,Ms. Jones,Late to class
2023-10-03,Bob Smith,Year 9,Mr. Smith,Homework Missing
2023-10-03,Alice Brown,Year 11,Dr. Watson,Disruptive Behavior
2023-10-04,Charlie Davis,Year 9,Mr. Smith,Disruptive Behavior
2023-10-04,Eve White,Year 10,Ms. Jones,Mobile Phone Use
2023-10-05,Frank Miller,Year 11,Ms. Green,Uniform Violation
2023-10-05,Grace Hopper,Year 9,Mr. Smith,Homework Missing
2023-10-06,Hank Aaron,Year 10,Ms. Jones,Late to class
2023-10-06,Ivy League,Year 11,Dr. Watson,Disruptive Behavior`;
}
