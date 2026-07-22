import React, { useState, useRef } from "react";
import { LessonDiary } from "../types";
import { Plus, Trash2, Calendar, FileText, Download, Upload, Search, BookOpen, AlertCircle } from "lucide-react";

interface DiaryListProps {
  diaries: LessonDiary[];
  onSelectDiary: (diary: LessonDiary) => void;
  onDeleteDiary: (id: string) => void;
  onCreateDiary: (subject: string, academicYear: string) => void;
  onImportDiaries: (imported: LessonDiary[]) => void;
}

export default function DiaryList({
  diaries,
  onSelectDiary,
  onDeleteDiary,
  onCreateDiary,
  onImportDiaries,
}: DiaryListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [newSubject, setNewSubject] = useState("Sanskrit");
  const [newYear, setNewYear] = useState("2026-27");
  const [showCreateForm, setShowCreateForm] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter diaries based on search
  const filteredDiaries = diaries.filter((d) => {
    const query = searchQuery.toLowerCase();
    return (
      d.subject.toLowerCase().includes(query) ||
      d.schoolName.toLowerCase().includes(query) ||
      d.teacherName.toLowerCase().includes(query) ||
      d.academicYear.toLowerCase().includes(query)
    );
  });

  // Export all diaries to a JSON backup file
  const handleExportBackup = () => {
    if (diaries.length === 0) {
      alert("No diaries to export.");
      return;
    }
    const dataStr = JSON.stringify(diaries, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `daily-lesson-diary-backup-${new Date().toISOString().split("T")[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Import diaries from a JSON backup file
  const handleImportBackup = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed) && parsed.every((d) => d.id && d.subject && Array.isArray(d.rows))) {
          onImportDiaries(parsed);
          alert(`Successfully imported ${parsed.length} diaries!`);
        } else {
          alert("Invalid backup file structure. Please upload a valid Lesson Diary JSON backup file.");
        }
      } catch (err) {
        alert("Failed to parse JSON backup file. Please make sure the file is valid.");
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim()) return;
    onCreateDiary(newSubject.trim(), newYear.trim());
    setShowCreateForm(false);
    setNewSubject("Sanskrit");
  };

  return (
    <div className="space-y-6 no-print">
      {/* Intro Hero banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-2xl p-6 md:p-8 text-white shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-12 -translate-y-8 select-none">
          <BookOpen className="w-80 h-80" />
        </div>
        <div className="relative z-10 space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/15 text-indigo-300 text-xs font-semibold border border-indigo-500/10">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
            Professional Teacher Log
          </div>
          <h1 className="text-2xl md:text-3xl font-bold font-display tracking-tight">
            Daily Lesson Diary Organizer
          </h1>
          <p className="text-sm text-slate-300 leading-relaxed font-sans">
            Maintain your school teaching registers efficiently in the official ledger format. Add entries, generate smart outcomes and Teaching Learning Materials (TLMs) with Gemini, and print clean landscape papers ready for signatures.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              onClick={() => setShowCreateForm(true)}
              className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 px-4 py-2 text-xs font-semibold rounded-lg shadow-sm transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Create New Diary
            </button>
            <button
              onClick={handleExportBackup}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/15 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Backup All (JSON)
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 bg-white/10 hover:bg-white/15 px-3.5 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5" />
              Restore Backup
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportBackup}
              accept=".json"
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* Grid: Saved items list & Search */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-2xs">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium text-gray-700"
              placeholder="Search by subject, teacher, year..."
            />
          </div>
          <div className="text-xs text-gray-400 font-medium">
            Showing {filteredDiaries.length} of {diaries.length} Diaries
          </div>
        </div>

        {/* Modal-style Form Overlay for New Diary creation */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl border border-gray-100 p-6 max-w-md w-full animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-center border-b border-gray-100 pb-3 mb-4">
                <h3 className="text-base font-bold text-gray-900 flex items-center gap-1.5">
                  <BookOpen className="w-5 h-5 text-indigo-500" />
                  Create Lesson Diary
                </h3>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="text-gray-400 hover:text-gray-600 rounded-lg"
                >
                  <XIcon className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Subject</label>
                  <input
                    type="text"
                    value={newSubject}
                    onChange={(e) => setNewSubject(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                    placeholder="e.g. Sanskrit, Mathematics"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Academic Year</label>
                  <input
                    type="text"
                    value={newYear}
                    onChange={(e) => setNewYear(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium font-mono"
                    placeholder="e.g. 2026-27"
                    required
                  />
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm"
                  >
                    Create Diary
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Diaries Listing */}
        {filteredDiaries.length === 0 ? (
          <div className="bg-white border border-gray-100 rounded-xl p-12 text-center space-y-3">
            <AlertCircle className="w-10 h-10 text-gray-300 mx-auto" />
            <h4 className="text-base font-bold text-gray-700">No diaries found</h4>
            <p className="text-sm text-gray-400 max-w-sm mx-auto">
              Create a new diary sheet or upload a backup file to get started recording your daily lesson logs.
            </p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Create One Now
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDiaries.map((diary) => (
              <div
                key={diary.id}
                className="bg-white border border-gray-100 rounded-xl p-5 hover:border-indigo-100 hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer"
                onClick={() => onSelectDiary(diary)}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 text-[10px] font-bold">
                      {diary.subject}
                    </span>
                    <span className="text-[10px] text-gray-400 font-semibold font-mono">
                      {diary.academicYear}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-sm font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">
                      {diary.schoolName || "Odisha Adarsha Vidyalaya"}
                    </h3>
                    <p className="text-xs text-gray-500 line-clamp-1 font-medium">
                      Teacher: {diary.teacherName || "Not Assigned"} {diary.teacherDesignation ? `(${diary.teacherDesignation})` : ""}
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5 text-xs text-gray-400 pt-1 font-medium">
                    <Calendar className="w-3.5 h-3.5" />
                    <span>Logged Rows: {diary.rows.length}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-gray-100 pt-3.5 mt-5">
                  <span className="text-[10px] text-gray-400 font-semibold">
                    Last updated: {new Date(diary.updatedAt).toLocaleDateString()}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteDiary(diary.id);
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-500 rounded hover:bg-red-50 transition-all cursor-pointer"
                    title="Delete Diary"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Inline fallback XIcon since we don't assume external dependencies
function XIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
