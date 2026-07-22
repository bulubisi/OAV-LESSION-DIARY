import React, { useState, useEffect } from "react";
import { LessonDiary, DiaryRow, ClassSyllabus, SyllabusChapter, SyllabusConcept } from "../types";
import { Filter, Plus, Trash2, Edit2, Sparkles, Loader2, Check, ArrowLeft, BookOpen, HelpCircle, Calendar, MessageSquare, BookOpenCheck } from "lucide-react";

interface ClassWiseFilterAndEntryProps {
  diary: LessonDiary;
  onUpdateDiary: (updated: LessonDiary) => void;
  syllabusData: ClassSyllabus[];
  onBack: () => void;
}

export default function ClassWiseFilterAndEntry({
  diary,
  onUpdateDiary,
  syllabusData,
  onBack,
}: ClassWiseFilterAndEntryProps) {
  // Extract all class sections from either the logged rows or the syllabus structure
  const [allClasses, setAllClasses] = useState<string[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>("");

  // Quick entry form states
  const [rowId, setRowId] = useState<string | null>(null); // For edit mode
  const [rowDate, setRowDate] = useState<string>(() => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  });
  const [rowPeriods, setRowPeriods] = useState<string>("1st");
  const [useCustomPeriods, setUseCustomPeriods] = useState<boolean>(false);
  const [customPeriodsText, setCustomPeriodsText] = useState<string>("");

  const [useCustomChapter, setUseCustomChapter] = useState<boolean>(false);
  const [selectedChapterId, setSelectedChapterId] = useState<string>("");
  const [rowChapterName, setRowChapterName] = useState<string>("");

  const [useCustomConcept, setUseCustomConcept] = useState<boolean>(false);
  const [selectedConceptId, setSelectedConceptId] = useState<string>("");
  const [rowConcept, setRowConcept] = useState<string>("");

  const [rowPeriodsAllotted, setRowPeriodsAllotted] = useState<string>("4");
  const [rowPeriodsCovered, setRowPeriodsCovered] = useState<string>("2");
  const [rowExpectedOutcome, setRowExpectedOutcome] = useState<string>("");
  const [useCustomOutcome, setUseCustomOutcome] = useState<boolean>(false);

  const [rowTlmRequired, setRowTlmRequired] = useState<string>("Smart Board, Sanskrit Textbook, flashcards");
  const [rowNeedsRepetition, setRowNeedsRepetition] = useState<"Yes" | "No" | "">("No");
  const [rowRemarks, setRowRemarks] = useState<string>("");

  // Feedback states
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Compile full list of classes from syllabus and currently logged rows
  useEffect(() => {
    const defaultClasses = ["Class VI A", "Class VI B", "Class VII A", "Class VII B", "Class VIII A", "Class VIII B", "Class IX-A", "Class IX-B", "Class X-A", "Class X-B"];
    
    // Logged classes
    const logged = diary.rows.map((r) => r.classSection).filter(Boolean);
    
    // Syllabus classes matching the current subject
    const subjectSyllabus = syllabusData.filter(
      (s) => (s.subject || "Sanskrit").toLowerCase() === (diary.subject || "Sanskrit").toLowerCase()
    );
    const syllabusClasses = subjectSyllabus.map((s) => s.classId);

    // Merge and deduplicate
    const combined = Array.from(new Set([...logged, ...syllabusClasses, ...defaultClasses])).filter(Boolean);
    
    // Sort beautifully
    combined.sort((a, b) => {
      return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
    });

    setAllClasses(combined);

    // Pick a default selected class
    if (combined.length > 0) {
      // Prefer standard "Class VIII B" or "IX-A" or first one
      const preferred = combined.find((c) => c.includes("VIII") || c.includes("8")) || combined[0];
      setSelectedClass(preferred);
    }
  }, [diary.rows, syllabusData, diary.subject]);

  // Find syllabus corresponding to current selected class and subject
  const activeSyllabus = syllabusData.find((s) => {
    // Normalise comparison to match "Class VIII" with "Class VIII B" etc.
    const normSyllId = s.classId.toLowerCase().replace(/\s+/g, "");
    const normSelClass = selectedClass.toLowerCase().replace(/\s+/g, "");
    return (
      (normSelClass.startsWith(normSyllId) || normSyllId.startsWith(normSelClass)) &&
      (s.subject || "Sanskrit").toLowerCase() === (diary.subject || "Sanskrit").toLowerCase()
    );
  });

  // Handle Chapter change from dropdown
  const handleChapterDropdownChange = (chapterId: string) => {
    setSelectedChapterId(chapterId);
    const chapter = activeSyllabus?.chapters.find((ch) => ch.id === chapterId);
    if (chapter) {
      setRowChapterName(chapter.name);
      setSelectedConceptId("");
      setRowConcept("");
    } else {
      setRowChapterName("");
      setSelectedConceptId("");
      setRowConcept("");
    }
  };

  // Handle Concept change from dropdown
  const handleConceptDropdownChange = (conceptId: string) => {
    setSelectedConceptId(conceptId);
    const chapter = activeSyllabus?.chapters.find((ch) => ch.id === selectedChapterId);
    const concept = chapter?.concepts.find((co) => co.id === conceptId);
    if (concept) {
      setRowConcept(concept.name);
      if (concept.learningOutcome) {
        setRowExpectedOutcome(concept.learningOutcome);
        setUseCustomOutcome(false);
      }
    } else {
      setRowConcept("");
    }
  };

  // Trigger temporary floating Toast notification
  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Clear Form fields
  const handleClearForm = () => {
    setRowId(null);
    setRowDate(() => {
      const today = new Date();
      return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    });
    setRowPeriods("1st");
    setUseCustomPeriods(false);
    setCustomPeriodsText("");
    setUseCustomChapter(false);
    setSelectedChapterId("");
    setRowChapterName("");
    setUseCustomConcept(false);
    setSelectedConceptId("");
    setRowConcept("");
    setRowPeriodsAllotted("4");
    setRowPeriodsCovered("2");
    setRowExpectedOutcome("");
    setUseCustomOutcome(false);
    setRowTlmRequired("Smart Board, Sanskrit Textbook, flashcards");
    setRowNeedsRepetition("No");
    setRowRemarks("");
    setAiError(null);
  };

  // Gemini AI automatic suggestion
  const handleAiSuggest = async () => {
    if (!rowChapterName) {
      setAiError("Please select or enter a Chapter name first so the AI assistant can plan for it.");
      return;
    }

    setIsAiLoading(true);
    setAiError(null);

    try {
      const response = await fetch("/api/gemini/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: diary.subject,
          classSection: selectedClass,
          chapterName: rowChapterName,
          concept: rowConcept,
          periodsAllotted: rowPeriodsAllotted,
        }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to contact Gemini Server");
      }

      const suggestions = await response.json();
      if (suggestions.concept && !rowConcept) {
        setRowConcept(suggestions.concept);
      }
      setRowExpectedOutcome(suggestions.expectedOutcome || "छात्रः पाठनस्य भावार्थं अवगच्छन्ति।");
      setRowTlmRequired(suggestions.tlmRequired || "Sanskrit charts, Smart board presentation");
      setRowRemarks(suggestions.remarks || "Topic discussed successfully.");
      triggerToast("✨ AI Suggestions populated!");
    } catch (err: any) {
      console.error(err);
      setAiError(err.message || "Could not fetch AI recommendations.");
    } finally {
      setIsAiLoading(false);
    }
  };

  // Add or Update row
  const handleSubmitRow = (e: React.FormEvent) => {
    e.preventDefault();

    const actualPeriods = useCustomPeriods ? customPeriodsText : rowPeriods;
    if (!actualPeriods) {
      alert("Please provide the Periods.");
      return;
    }

    if (!rowChapterName.trim()) {
      alert("Please select or type a Chapter Name.");
      return;
    }

    if (!rowConcept.trim()) {
      alert("Please select or type a Concept.");
      return;
    }

    if (rowId) {
      // Edit mode: Update existing row
      const updatedRows = diary.rows.map((row) => {
        if (row.id === rowId) {
          return {
            ...row,
            date: rowDate,
            classSection: selectedClass,
            periods: actualPeriods,
            chapterName: rowChapterName,
            concept: rowConcept,
            periodsAllotted: rowPeriodsAllotted,
            periodsCovered: rowPeriodsCovered,
            expectedOutcome: rowExpectedOutcome,
            tlmRequired: rowTlmRequired,
            needsRepetition: rowNeedsRepetition,
            remarks: rowRemarks,
          };
        }
        return row;
      });

      // Maintain sequential Sl No
      const reindexed = updatedRows.map((r, idx) => ({
        ...r,
        slNo: idx + 1,
      }));

      onUpdateDiary({
        ...diary,
        rows: reindexed,
        updatedAt: Date.now(),
      });

      triggerToast("✓ Row updated successfully!");
      handleClearForm();
    } else {
      // Add mode: Create new row
      const newRow: DiaryRow = {
        id: `row-${Date.now()}`,
        slNo: diary.rows.length + 1,
        date: rowDate,
        classSection: selectedClass,
        periods: actualPeriods,
        chapterName: rowChapterName,
        concept: rowConcept,
        periodsAllotted: rowPeriodsAllotted,
        periodsCovered: rowPeriodsCovered,
        expectedOutcome: rowExpectedOutcome,
        tlmRequired: rowTlmRequired,
        needsRepetition: rowNeedsRepetition,
        remarks: rowRemarks,
      };

      const updatedRows = [...diary.rows, newRow];
      // Maintain sequential Sl No
      const reindexed = updatedRows.map((r, idx) => ({
        ...r,
        slNo: idx + 1,
      }));

      onUpdateDiary({
        ...diary,
        rows: reindexed,
        updatedAt: Date.now(),
      });

      triggerToast("✓ Row entry added successfully!");
      handleClearForm();
    }
  };

  // Edit action
  const handleStartEdit = (row: DiaryRow) => {
    setRowId(row.id);
    setRowDate(row.date);
    
    // Check if periods matches standard values
    const standards = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];
    if (standards.includes(row.periods)) {
      setRowPeriods(row.periods);
      setUseCustomPeriods(false);
    } else {
      setUseCustomPeriods(true);
      setCustomPeriodsText(row.periods);
    }

    // Try to locate corresponding chapter in the syllabus
    setRowChapterName(row.chapterName);
    const matchedCh = activeSyllabus?.chapters.find((ch) => ch.name.toLowerCase() === row.chapterName.toLowerCase());
    if (matchedCh) {
      setUseCustomChapter(false);
      setSelectedChapterId(matchedCh.id);
      
      const matchedCo = matchedCh.concepts.find((co) => co.name.toLowerCase() === row.concept.toLowerCase());
      if (matchedCo) {
        setUseCustomConcept(false);
        setSelectedConceptId(matchedCo.id);
      } else {
        setUseCustomConcept(true);
        setRowConcept(row.concept);
      }
    } else {
      setUseCustomChapter(true);
      setUseCustomConcept(true);
      setRowConcept(row.concept);
    }

    setRowPeriodsAllotted(row.periodsAllotted);
    setRowPeriodsCovered(row.periodsCovered);
    setRowExpectedOutcome(row.expectedOutcome);
    setRowTlmRequired(row.tlmRequired);
    setRowNeedsRepetition(row.needsRepetition);
    setRowRemarks(row.remarks);

    // Smooth scroll to entry form
    const formElement = document.getElementById("quick-entry-form-container");
    if (formElement) {
      formElement.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Delete action
  const handleDeleteRow = (id: string) => {
    if (confirm("Are you sure you want to delete this row entry?")) {
      const remaining = diary.rows.filter((r) => r.id !== id);
      const reindexed = remaining.map((r, idx) => ({
        ...r,
        slNo: idx + 1,
      }));
      onUpdateDiary({
        ...diary,
        rows: reindexed,
        updatedAt: Date.now(),
      });
      triggerToast("Trash bin updated!");
    }
  };

  // Sort helper for periods
  const parsePeriodToNumber = (p: string): number => {
    if (!p) return 999;
    const match = p.match(/\d+/);
    if (match) return parseInt(match[0], 10);
    return 999;
  };

  // Filter and sort the logs matching the current selected class
  const classRows = diary.rows
    .filter((row) => (row.classSection || "").toLowerCase().trim() === (selectedClass || "").toLowerCase().trim())
    .sort((a, b) => {
      const dateA = a.date || "";
      const dateB = b.date || "";
      if (dateA !== dateB) {
        return dateA.localeCompare(dateB);
      }
      return parsePeriodToNumber(a.periods) - parsePeriodToNumber(b.periods);
    });

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-20 animate-in fade-in duration-200">
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            📂 Class-wise Filter & Quick Entry
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Filter recorded diaries by class, view history, and quickly log new chapters & topics!
          </p>
        </div>
        <button
          onClick={onBack}
          className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors"
        >
          Return to Dashboard
        </button>
      </div>

      {/* Class Selector Row */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-xs">
        <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">
          Select Class Section Filter:
        </label>
        <div className="flex flex-wrap gap-1.5">
          {allClasses.map((cls) => {
            const rowCount = diary.rows.filter((r) => (r.classSection || "").toLowerCase().trim() === cls.toLowerCase().trim()).length;
            const isSelected = selectedClass === cls;
            return (
              <button
                key={cls}
                onClick={() => {
                  setSelectedClass(cls);
                  handleClearForm();
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  isSelected
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
                }`}
              >
                <span>{cls}</span>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded-full font-mono ${
                    isSelected ? "bg-indigo-500 text-indigo-50" : "bg-slate-200 text-slate-500"
                  }`}
                >
                  {rowCount}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main layout columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left column: History Table of Logs for Selected Class (60% equivalent) */}
        <div className="lg:col-span-7 space-y-5">
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wide flex items-center gap-2">
              <BookOpenCheck className="w-4 h-4 text-indigo-500" />
              <span>Logged History for {selectedClass}</span>
              <span className="text-[10px] text-gray-400 normal-case font-medium">({classRows.length} entries)</span>
            </h3>

            {classRows.length === 0 ? (
              <div className="text-center py-16 border border-dashed border-gray-100 rounded-xl space-y-3">
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 mx-auto">
                  <Filter className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-700">No lessons logged for {selectedClass}</p>
                  <p className="text-[10px] text-gray-400 max-w-sm mx-auto leading-relaxed">
                    Use the form on the right to quickly enter your first class lesson diary entry!
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-700">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 font-bold bg-slate-50/50">
                      <th className="py-2.5 px-3 text-center">No</th>
                      <th className="py-2.5 px-3">Date</th>
                      <th className="py-2.5 px-3">Period</th>
                      <th className="py-2.5 px-3">Chapter & Topic</th>
                      <th className="py-2.5 px-3 text-center">Periods</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 font-medium">
                    {classRows.map((row, index) => (
                      <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-2.5 px-3 text-center text-gray-400 font-mono font-bold">
                          {index + 1}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-gray-500 whitespace-nowrap">
                          {row.date ? new Date(row.date).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "2-digit",
                          }) : "—"}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-indigo-900">
                          {row.periods}
                        </td>
                        <td className="py-2.5 px-3 space-y-0.5">
                          <p className="font-bold text-slate-800 line-clamp-1">{row.chapterName}</p>
                          <p className="text-[10.5px] text-slate-500 line-clamp-1">{row.concept}</p>
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-gray-400">
                          {row.periodsCovered || "0"}/{row.periodsAllotted || "0"}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex justify-end gap-1">
                            <button
                              onClick={() => handleStartEdit(row)}
                              title="Edit"
                              className="p-1 text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteRow(row.id)}
                              title="Delete"
                              className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Guidelines info card */}
          <div className="bg-amber-50 text-amber-900 p-4 rounded-xl border border-amber-100 space-y-1">
            <span className="text-[10.5px] font-bold text-amber-800 flex items-center gap-1">
              <HelpCircle className="w-4 h-4" />
              Sorting standard protocol
            </span>
            <p className="text-[10px] leading-relaxed font-medium">
              Recorded entries displayed above are sorted chronologically by <strong>Date</strong> first, and then sequentially by <strong>Period</strong> (e.g. 1st, 2nd, 3rd) so your curriculum progression flows perfectly.
            </p>
          </div>
        </div>

        {/* Right column: Quick entry form pre-filled with Selected Class (40% equivalent) */}
        <div id="quick-entry-form-container" className="lg:col-span-5">
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-xs font-bold text-gray-800 uppercase tracking-wide flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-indigo-500" />
                <span>{rowId ? "Edit Lesson Log" : "Quick Entry Form"}</span>
              </h3>
              <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-bold">
                For {selectedClass}
              </span>
            </div>

            <form onSubmit={handleSubmitRow} className="space-y-4">
              {/* Date & Period */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" /> Date
                  </label>
                  <input
                    type="date"
                    value={rowDate}
                    onChange={(e) => setRowDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex justify-between">
                    <span>Period</span>
                    <button
                      type="button"
                      onClick={() => setUseCustomPeriods(!useCustomPeriods)}
                      className="text-[9px] text-indigo-600 hover:underline font-semibold"
                    >
                      {useCustomPeriods ? "Dropdown" : "Custom"}
                    </button>
                  </label>
                  {useCustomPeriods ? (
                    <input
                      type="text"
                      value={customPeriodsText}
                      onChange={(e) => setCustomPeriodsText(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono font-semibold"
                      placeholder="e.g. 1st & 2nd"
                      required
                    />
                  ) : (
                    <select
                      value={rowPeriods}
                      onChange={(e) => setRowPeriods(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold bg-white"
                    >
                      <option value="1st">1st Period</option>
                      <option value="2nd">2nd Period</option>
                      <option value="3rd">3rd Period</option>
                      <option value="4th">4th Period</option>
                      <option value="5th">5th Period</option>
                      <option value="6th">6th Period</option>
                      <option value="7th">7th Period</option>
                      <option value="8th">8th Period</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Syllabus chapter */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Chapter Name
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setUseCustomChapter(!useCustomChapter);
                      setSelectedChapterId("");
                      setRowChapterName("");
                    }}
                    className="text-[9px] text-indigo-600 hover:underline font-semibold"
                  >
                    {useCustomChapter ? "Use Syllabus Dropdown" : "Type Custom Chapter"}
                  </button>
                </div>

                {!useCustomChapter && activeSyllabus && activeSyllabus.chapters.length > 0 ? (
                  <select
                    value={selectedChapterId}
                    onChange={(e) => handleChapterDropdownChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold bg-white"
                  >
                    <option value="">-- Select Chapter --</option>
                    {activeSyllabus.chapters.map((ch) => (
                      <option key={ch.id} value={ch.id}>
                        {ch.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={rowChapterName}
                    onChange={(e) => setRowChapterName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                    placeholder="Enter chapter name manually"
                    required
                  />
                )}
              </div>

              {/* Syllabus Concept */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Concept / Topic
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setUseCustomConcept(!useCustomConcept);
                      setSelectedConceptId("");
                      setRowConcept("");
                    }}
                    className="text-[9px] text-indigo-600 hover:underline font-semibold"
                  >
                    {useCustomConcept ? "Use Concept List" : "Type Custom Concept"}
                  </button>
                </div>

                {!useCustomConcept && activeSyllabus && selectedChapterId ? (
                  (() => {
                    const currentChapter = activeSyllabus.chapters.find((ch) => ch.id === selectedChapterId);
                    if (currentChapter && currentChapter.concepts.length > 0) {
                      return (
                        <select
                          value={selectedConceptId}
                          onChange={(e) => handleConceptDropdownChange(e.target.value)}
                          className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold bg-white"
                        >
                          <option value="">-- Select Concept --</option>
                          {currentChapter.concepts.map((co) => (
                            <option key={co.id} value={co.id}>
                              {co.name}
                            </option>
                          ))}
                        </select>
                      );
                    }
                    return (
                      <input
                        type="text"
                        value={rowConcept}
                        onChange={(e) => setRowConcept(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium bg-gray-50"
                        placeholder="Type manually (Syllabus contains no concepts)"
                      />
                    );
                  })()
                ) : (
                  <input
                    type="text"
                    value={rowConcept}
                    onChange={(e) => setRowConcept(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                    placeholder="Enter concept/topic manually"
                    required
                  />
                )}
              </div>

              {/* No of Period Allotted / Covered */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Allotted
                  </label>
                  <input
                    type="text"
                    value={rowPeriodsAllotted}
                    onChange={(e) => setRowPeriodsAllotted(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-center font-mono"
                    placeholder="e.g. 4"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Covered
                  </label>
                  <input
                    type="text"
                    value={rowPeriodsCovered}
                    onChange={(e) => setRowPeriodsCovered(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-center font-mono"
                    placeholder="e.g. 2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                    Repetition?
                  </label>
                  <select
                    value={rowNeedsRepetition}
                    onChange={(e) => setRowNeedsRepetition(e.target.value as "Yes" | "No")}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold bg-white"
                  >
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                </div>
              </div>

              {/* AI Lesson planner helper */}
              <div className="bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-100/50 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-indigo-800 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                    Gemini Lesson Assistant
                  </span>
                  <button
                    type="button"
                    onClick={handleAiSuggest}
                    disabled={isAiLoading || !rowChapterName}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-[9px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 rounded-md transition-colors cursor-pointer"
                  >
                    {isAiLoading ? (
                      <>
                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-2.5 h-2.5" />
                        AI Auto-fill
                      </>
                    )}
                  </button>
                </div>
                {aiError && (
                  <p className="text-[10px] text-red-600 bg-red-50 p-2 rounded border border-red-100 font-medium">
                    {aiError}
                  </p>
                )}
              </div>

              {/* Expected Learning Outcome */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                    Expected Outcome
                  </label>
                  <button
                    type="button"
                    onClick={() => setUseCustomOutcome(!useCustomOutcome)}
                    className="text-[9px] text-indigo-600 hover:underline font-semibold"
                  >
                    {useCustomOutcome ? "Use Defaults" : "Type Custom"}
                  </button>
                </div>
                {!useCustomOutcome ? (
                  <select
                    value={rowExpectedOutcome}
                    onChange={(e) => setRowExpectedOutcome(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium bg-white"
                  >
                    <option value="">-- Choose Expected Outcome --</option>
                    <option value="छात्रः पाठनस्य भावार्थं अवगच्छन्ति तथा नूतनशब्दानां प्रयोगं करिष्यन्ति।">
                      छात्रः भावार्थं अवगच्छन्ति तथा प्रयोगं करिष्यन्ति।
                    </option>
                    <option value="छात्रः शुद्धं उच्चारणं कर्तुं समर्थाः भविष्यन्ति तथा शब्दकोषस्य वर्धनं करिष्यन्ति।">
                      छात्रः शुद्धं उच्चारणं कर्तुं समर्थाः भविष्यन्ति।
                    </option>
                    <option value="व्याकरणस्य नियमाः ज्ञास्यन्ति तथा अभ्यासप्रश्नानां उत्तराणि लेखिष्यन्ति।">
                      व्याकरणस्य नियमाः ज्ञास्यन्ति तथा अभ्यासलेखनम्।
                    </option>
                    {rowExpectedOutcome && (
                      <option value={rowExpectedOutcome}>{rowExpectedOutcome}</option>
                    )}
                  </select>
                ) : (
                  <textarea
                    value={rowExpectedOutcome}
                    onChange={(e) => setRowExpectedOutcome(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    rows={2}
                    placeholder="Students will be able to..."
                  />
                )}
              </div>

              {/* TLM required */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">
                  TLM Required and Used
                </label>
                <input
                  type="text"
                  value={rowTlmRequired}
                  onChange={(e) => setRowTlmRequired(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                  placeholder="Smart Board, Sanskrit Textbook..."
                />
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                  <MessageSquare className="w-3 h-3 text-slate-400" /> Remarks of Achievements
                </label>
                <textarea
                  value={rowRemarks}
                  onChange={(e) => setRowRemarks(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  rows={2}
                  placeholder="e.g. Students understood sandhi splits beautifully."
                />
              </div>

              {/* Action buttons */}
              <div className="flex gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleClearForm}
                  className="flex-1 py-2 border border-gray-200 rounded-lg text-xs font-semibold text-gray-500 hover:bg-slate-50 transition-colors"
                >
                  Clear Form
                </button>
                <button
                  type="submit"
                  className="flex-2 py-2 px-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                >
                  {rowId ? "Update Entry" : "Add Lesson Log"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Save Success Floating Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-2.5 text-xs font-semibold z-50 animate-in slide-in-from-bottom-2">
          <Check className="w-4 h-4 text-green-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
