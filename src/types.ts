export interface DiaryRow {
  id: string; // unique ID for editing and deleting rows
  slNo: number;
  date: string;
  classSection: string;
  periods: string;
  chapterName: string;
  concept: string;
  periodsAllotted: string;
  periodsCovered: string;
  expectedOutcome: string;
  tlmRequired: string;
  needsRepetition: "Yes" | "No" | "";
  remarks: string;
}

export interface SyllabusConcept {
  id: string;
  name: string;
  learningOutcome?: string;
}

export interface SyllabusChapter {
  id: string;
  name: string;
  concepts: SyllabusConcept[];
}

export interface ClassSyllabus {
  classId: string; // e.g., "VI", "VII", "VIII", "IX"
  subject?: string; // e.g., "Sanskrit", "Mathematics"
  chapters: SyllabusChapter[];
}

export interface LessonDiary {
  id: string;
  schoolName: string; // Default: Odisha Adarsha Vidyalaya, Bibina, Saintala
  subject: string;    // Default: Sanskrit
  teacherName: string;
  teacherDesignation: string;
  academicYear: string;
  createdAt: number;
  updatedAt: number;
  rows: DiaryRow[];
}

