import React, { useState, useEffect } from "react";
import { LessonDiary, DiaryRow, ClassSyllabus, SyllabusChapter, SyllabusConcept } from "../types";
import { Sparkles, Plus, Trash2, Edit2, ArrowDown, ArrowUp, X, Save, Eye, Loader2, Undo, Check, HelpCircle, Layers, BookOpen } from "lucide-react";

interface DiaryFormProps {
  diary: LessonDiary;
  onUpdateDiary: (updated: LessonDiary) => void;
  onBack: () => void;
  syllabusData: ClassSyllabus[];
  onOpenSyllabusManager: () => void;
}

export default function DiaryForm({
  diary,
  onUpdateDiary,
  onBack,
  syllabusData,
  onOpenSyllabusManager,
}: DiaryFormProps) {
  // Editing state for school metadata
  const [schoolName, setSchoolName] = useState(diary.schoolName);
  const [subject, setSubject] = useState(diary.subject);
  const [teacherName, setTeacherName] = useState(diary.teacherName || "");
  const [teacherDesignation, setTeacherDesignation] = useState(diary.teacherDesignation || "");
  const [academicYear, setAcademicYear] = useState(diary.academicYear || "2026-27");

  // State for active row being added or edited
  const [isEditingRowId, setIsEditingRowId] = useState<string | null>(null);
  const [rowDate, setRowDate] = useState("");
  
  // Custom class parsing states
  const [selectedClassId, setSelectedClassId] = useState<string>("Class VIII");
  const [selectedSection, setSelectedSection] = useState<string>("B");
  const [useCustomClass, setUseCustomClass] = useState<boolean>(false);
  const [customClassSection, setCustomClassSection] = useState("");

  const [rowPeriods, setRowPeriods] = useState("");
  
  // Custom chapter vs dropdown states
  const [useCustomChapter, setUseCustomChapter] = useState<boolean>(false);
  const [selectedChapterId, setSelectedChapterId] = useState<string>("");
  const [rowChapterName, setRowChapterName] = useState("");

  // Custom concept vs dropdown states
  const [useCustomConcept, setUseCustomConcept] = useState<boolean>(false);
  const [selectedConceptId, setSelectedConceptId] = useState<string>("");
  const [rowConcept, setRowConcept] = useState("");

  const [rowPeriodsAllotted, setRowPeriodsAllotted] = useState("0");
  const [rowPeriodsCovered, setRowPeriodsCovered] = useState("0");
  const [rowExpectedOutcome, setRowExpectedOutcome] = useState("");
  const [rowTlmRequired, setRowTlmRequired] = useState("Smart Board, Ebook, ppt");
  const [rowNeedsRepetition, setRowNeedsRepetition] = useState<"Yes" | "No" | "">("No");
  const [rowRemarks, setRowRemarks] = useState("");

  // AI loading and feedback states
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);

  // Custom period and outcome modes
  const [useCustomPeriods, setUseCustomPeriods] = useState<boolean>(false);
  const [useCustomOutcome, setUseCustomOutcome] = useState<boolean>(false);

  // Auto detect active syllabus based on selected class and current subject
  const activeSyllabus = syllabusData.find(
    (s) =>
      s.classId === selectedClassId &&
      (s.subject || "Sanskrit").toLowerCase() === (diary.subject || "Sanskrit").toLowerCase()
  );

  // Synchronize drop-downs when Class or dropdown items change
  useEffect(() => {
    if (!useCustomClass) {
      const sectionLabel = selectedSection === "Both" ? "" : selectedSection;
      setCustomClassSection(`${selectedClassId} ${sectionLabel}`.trim());
    }
  }, [selectedClassId, selectedSection, useCustomClass]);

  // Handle syllabus dropdown chapter change
  const handleDropdownChapterChange = (chapterId: string) => {
    setSelectedChapterId(chapterId);
    const chapter = activeSyllabus?.chapters.find((ch) => ch.id === chapterId);
    if (chapter) {
      setRowChapterName(chapter.name);
      // Reset concepts dropdown selection
      setSelectedConceptId("");
      setRowConcept("");
      setUseCustomConcept(false);
    } else {
      setRowChapterName("");
      setSelectedConceptId("");
      setRowConcept("");
    }
  };

  // Handle syllabus dropdown concept change
  const handleDropdownConceptChange = (conceptId: string) => {
    setSelectedConceptId(conceptId);
    const chapter = activeSyllabus?.chapters.find((ch) => ch.id === selectedChapterId);
    const concept = chapter?.concepts.find((co) => co.id === conceptId);
    if (concept) {
      setRowConcept(concept.name);
      if (concept.learningOutcome) {
        setRowExpectedOutcome(concept.learningOutcome);
        setUseCustomOutcome(false);
      } else {
        setRowExpectedOutcome("");
      }
    } else {
      setRowConcept("");
    }
  };

  // Check if a Chapter has already been logged in this Diary
  const isChapterCompleted = (chapterName: string) => {
    if (!chapterName) return false;
    // Check if there is at least one row entry in this diary matching this chapter name
    return diary.rows.some((row) => row.chapterName.toLowerCase().trim() === chapterName.toLowerCase().trim());
  };

  // Check if a Concept has already been logged
  const isConceptCompleted = (conceptName: string) => {
    if (!conceptName) return false;
    return diary.rows.some((row) => row.concept.toLowerCase().trim() === conceptName.toLowerCase().trim());
  };

  // Load a syllabus chapter/concept directly into the form on click (Magical Auto-fill!)
  const handleAutoFillFromSyllabus = (chapter: SyllabusChapter, concept?: SyllabusConcept) => {
    setUseCustomClass(false);
    // Find the class from syllabusData that contains this chapter and matches current subject
    const parentSyllabus = syllabusData.find(
      (s) =>
        s.chapters.some((ch) => ch.id === chapter.id) &&
        (s.subject || "Sanskrit").toLowerCase() === (diary.subject || "Sanskrit").toLowerCase()
    );
    if (parentSyllabus) {
      setSelectedClassId(parentSyllabus.classId);
    }
    
    setUseCustomChapter(false);
    setSelectedChapterId(chapter.id);
    setRowChapterName(chapter.name);

    if (concept) {
      setUseCustomConcept(false);
      setSelectedConceptId(concept.id);
      setRowConcept(concept.name);
      if (concept.learningOutcome) {
        setRowExpectedOutcome(concept.learningOutcome);
        setUseCustomOutcome(false);
      } else {
        setRowExpectedOutcome("");
      }
    } else {
      setUseCustomConcept(true);
      setSelectedConceptId("");
      setRowConcept("");
    }

    // Smooth scroll to the top of the row builder form
    const editor = document.getElementById("row-editor-section");
    if (editor) {
      editor.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Save general info metadata
  const handleSaveMetadata = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateDiary({
      ...diary,
      schoolName,
      subject,
      teacherName,
      teacherDesignation,
      academicYear,
      updatedAt: Date.now(),
    });
    triggerSaveToast();
  };

  const triggerSaveToast = () => {
    setShowSaveSuccess(true);
    setTimeout(() => setShowSaveSuccess(false), 3000);
  };

  // Reset row editor form
  const resetRowForm = () => {
    setIsEditingRowId(null);
    setRowDate("");
    setRowPeriods("");
    setUseCustomPeriods(false);
    setRowChapterName("");
    setRowConcept("");
    setSelectedChapterId("");
    setSelectedConceptId("");
    setUseCustomChapter(false);
    setUseCustomConcept(false);
    setRowPeriodsAllotted("0");
    setRowPeriodsCovered("0");
    setRowExpectedOutcome("");
    setUseCustomOutcome(false);
    setRowTlmRequired("Smart Board, Ebook, ppt");
    setRowNeedsRepetition("No");
    setRowRemarks("");
    setAiError(null);
  };

  // Edit an existing row - populate editor fields
  const handleStartEditRow = (row: DiaryRow) => {
    setIsEditingRowId(row.id);
    setRowDate(row.date);
    setCustomClassSection(row.classSection);
    
    // Parse the Class from the string if possible to keep dropdowns in sync
    const matchedClass = syllabusData.find(
      (s) =>
        row.classSection.startsWith(s.classId) &&
        (s.subject || "Sanskrit").toLowerCase() === (diary.subject || "Sanskrit").toLowerCase()
    );
    if (matchedClass) {
      setSelectedClassId(matchedClass.classId);
      const sectionPart = row.classSection.replace(matchedClass.classId, "").trim();
      if (sectionPart === "A & B" || sectionPart === "Both" || sectionPart === "Both Sections") {
        setSelectedSection("Both");
      } else {
        setSelectedSection(sectionPart || "A");
      }
      setUseCustomClass(false);
    } else {
      setUseCustomClass(true);
    }

    setRowPeriods(row.periods);
    const standardPeriods = ["1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"];
    setUseCustomPeriods(!standardPeriods.includes(row.periods));

    setRowChapterName(row.chapterName);
    setRowConcept(row.concept);

    // Sync Chapter / Concept Dropdown selectors
    if (matchedClass) {
      const chapter = matchedClass.chapters.find((ch) => ch.name === row.chapterName);
      if (chapter) {
        setSelectedChapterId(chapter.id);
        setUseCustomChapter(false);
        const concept = chapter.concepts.find((co) => co.name === row.concept);
        if (concept) {
          setSelectedConceptId(concept.id);
          setUseCustomConcept(false);
          if (concept.learningOutcome) {
            setUseCustomOutcome(false);
          } else {
            setUseCustomOutcome(true);
          }
        } else {
          setUseCustomConcept(true);
          setUseCustomOutcome(true);
        }
      } else {
        setUseCustomChapter(true);
        setUseCustomConcept(true);
        setUseCustomOutcome(true);
      }
    } else {
      setUseCustomChapter(true);
      setUseCustomConcept(true);
      setUseCustomOutcome(true);
    }

    setRowPeriodsAllotted(row.periodsAllotted);
    setRowPeriodsCovered(row.periodsCovered);
    setRowExpectedOutcome(row.expectedOutcome);
    setRowTlmRequired(row.tlmRequired);
    setRowNeedsRepetition(row.needsRepetition);
    setRowRemarks(row.remarks);
    setAiError(null);

    // Scroll editor into view smoothly
    const editor = document.getElementById("row-editor-section");
    if (editor) {
      editor.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Save or Add Row
  const handleSaveRow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rowDate) {
      alert("Please select a date.");
      return;
    }

    const finalClassSection = useCustomClass ? customClassSection.trim() : `${selectedClassId} ${selectedSection}`.trim();

    let updatedRows: DiaryRow[] = [];

    if (isEditingRowId) {
      // Editing an existing row
      updatedRows = diary.rows.map((r) => {
        if (r.id === isEditingRowId) {
          return {
            ...r,
            date: rowDate,
            classSection: finalClassSection,
            periods: rowPeriods,
            chapterName: rowChapterName.trim(),
            concept: rowConcept.trim(),
            periodsAllotted: rowPeriodsAllotted,
            periodsCovered: rowPeriodsCovered,
            expectedOutcome: rowExpectedOutcome,
            tlmRequired: rowTlmRequired,
            needsRepetition: rowNeedsRepetition,
            remarks: rowRemarks,
          };
        }
        return r;
      });
    } else {
      // Adding a new row
      const newRow: DiaryRow = {
        id: `row-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        slNo: diary.rows.length + 1,
        date: rowDate,
        classSection: finalClassSection,
        periods: rowPeriods,
        chapterName: rowChapterName.trim(),
        concept: rowConcept.trim(),
        periodsAllotted: rowPeriodsAllotted,
        periodsCovered: rowPeriodsCovered,
        expectedOutcome: rowExpectedOutcome,
        tlmRequired: rowTlmRequired,
        needsRepetition: rowNeedsRepetition,
        remarks: rowRemarks,
      };
      updatedRows = [...diary.rows, newRow];
    }

    // Re-assign Sl No sequentially
    const sequentialRows = updatedRows.map((row, index) => ({
      ...row,
      slNo: index + 1,
    }));

    onUpdateDiary({
      ...diary,
      rows: sequentialRows,
      updatedAt: Date.now(),
    });

    resetRowForm();
    triggerSaveToast();
  };

  // Delete row
  const handleDeleteRow = (rowId: string) => {
    if (!confirm("Are you sure you want to remove this entry from the diary?")) {
      return;
    }
    const filtered = diary.rows.filter((r) => r.id !== rowId);
    const reindexed = filtered.map((row, index) => ({
      ...row,
      slNo: index + 1,
    }));
    onUpdateDiary({
      ...diary,
      rows: reindexed,
      updatedAt: Date.now(),
    });
    if (isEditingRowId === rowId) {
      resetRowForm();
    }
  };

  // Move row up/down
  const handleMoveRow = (index: number, direction: "up" | "down") => {
    if (direction === "up" && index === 0) return;
    if (direction === "down" && index === diary.rows.length - 1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    const newRows = [...diary.rows];
    const temp = newRows[index];
    newRows[index] = newRows[targetIndex];
    newRows[targetIndex] = temp;

    const reindexed = newRows.map((row, idx) => ({
      ...row,
      slNo: idx + 1,
    }));

    onUpdateDiary({
      ...diary,
      rows: reindexed,
      updatedAt: Date.now(),
    });
  };

  // Gemini Smart Auto-fill
  const handleAiSuggest = async () => {
    if (!rowChapterName) {
      setAiError("Please select or type a Chapter name first so the AI assistant can plan for it.");
      return;
    }

    setIsAiLoading(true);
    setAiError(null);

    try {
      const finalClassSection = useCustomClass ? customClassSection : `${selectedClassId} ${selectedSection}`;
      const response = await fetch("/api/gemini/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject,
          classSection: finalClassSection,
          chapterName: rowChapterName,
          concept: rowConcept,
          periodsAllotted: rowPeriodsAllotted,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to fetch suggestions from Gemini server.");
      }

      const suggestions = await response.json();

      if (suggestions.concept && !rowConcept) {
        setRowConcept(suggestions.concept);
      }
      setRowExpectedOutcome(suggestions.expectedOutcome || "");
      setRowTlmRequired(suggestions.tlmRequired || "");
      setRowRemarks(suggestions.remarks || "");
    } catch (error: any) {
      console.error(error);
      setAiError(error.message || "An unexpected error occurred while contacting the AI helper.");
    } finally {
      setIsAiLoading(false);
    }
  };

  return (
    <div className="space-y-8 no-print pb-20">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <button
            onClick={onBack}
            className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1.5 font-medium mb-1 group"
          >
            <Undo className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-0.5" />
            Back to All Diaries
          </button>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            Workspace: {subject} <span className="text-sm font-normal text-gray-500">({academicYear})</span>
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Log your daily lessons, generate content via AI, and print ledger sheets.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            onClick={onOpenSyllabusManager}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-all cursor-pointer"
          >
            <Layers className="w-4 h-4 text-indigo-500" />
            Syllabus Dropdown Settings
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm cursor-pointer transition-all"
          >
            <Eye className="w-4 h-4" />
            Print / PDF Export
          </button>
        </div>
      </div>

      {/* Main Grid: Info form, Row builder, and Syllabus checklist */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Column 1: School and Teacher Settings (col-span-3) */}
        <div className="lg:col-span-3 bg-white p-5 rounded-xl border border-gray-100 shadow-xs space-y-5">
          <h3 className="text-xs font-bold text-gray-800 border-b border-gray-100 pb-3 flex items-center gap-2 uppercase tracking-wide">
            🏫 School & Teacher Info
          </h3>
          <form onSubmit={handleSaveMetadata} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">School Name</label>
              <textarea
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                rows={2}
                placeholder="Odisha Adarsha Vidyalaya, Bibina, Saintala"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                placeholder="e.g. Sanskrit"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Teacher Name</label>
              <input
                type="text"
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                placeholder="Mr./Mrs. Teacher Name"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Teacher Designation</label>
              <input
                type="text"
                value={teacherDesignation}
                onChange={(e) => setTeacherDesignation(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                placeholder="e.g. TGT Sanskrit"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Academic Year</label>
              <input
                type="text"
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold font-mono"
                placeholder="e.g. 2026-27"
              />
            </div>

            <button
              type="submit"
              className="w-full flex items-center justify-center gap-1.5 py-2 px-4 border border-transparent rounded-lg text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              Update General Info
            </button>
          </form>
        </div>

        {/* Column 2 & 3: Row Builder / Editor (col-span-6) */}
        <div id="row-editor-section" className="lg:col-span-6 bg-white p-6 rounded-xl border border-gray-100 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h3 className="text-xs font-bold text-gray-800 flex items-center gap-2 uppercase tracking-wide">
              📝 {isEditingRowId ? "✏️ Edit Row Entry" : "➕ Add New Diary Row"}
            </h3>
            {isEditingRowId && (
              <button
                onClick={resetRowForm}
                className="text-[10px] text-gray-400 hover:text-gray-600 flex items-center gap-1 font-bold cursor-pointer"
              >
                <X className="w-3.5 h-3.5" /> Cancel Edit
              </button>
            )}
          </div>

          <form onSubmit={handleSaveRow} className="space-y-4">
            {/* Class and Period Settings */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Date</label>
                <input
                  type="date"
                  value={rowDate}
                  onChange={(e) => setRowDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                  required
                />
              </div>

              {/* Dynamic Class Selector Dropdowns */}
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex justify-between">
                  <span>Class and Section</span>
                  <button
                    type="button"
                    onClick={() => setUseCustomClass(!useCustomClass)}
                    className="text-[9px] text-indigo-600 hover:underline font-semibold"
                  >
                    {useCustomClass ? "Use Dropdowns" : "Type Manually"}
                  </button>
                </label>

                {useCustomClass ? (
                  <input
                    type="text"
                    value={customClassSection}
                    onChange={(e) => setCustomClassSection(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                    placeholder="e.g. VIII A, IX B"
                    required
                  />
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={selectedClassId}
                      onChange={(e) => setSelectedClassId(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold bg-white"
                    >
                      {(() => {
                        const filtered = syllabusData.filter(
                          (s) => (s.subject || "Sanskrit").toLowerCase() === (diary.subject || "Sanskrit").toLowerCase()
                        );
                        if (filtered.length === 0) {
                          // Fallback to default class list if no syllabus initialized yet
                          return ["Class VI", "Class VII", "Class VIII", "Class IX", "Class X"].map((cId) => (
                            <option key={cId} value={cId}>
                              {cId}
                            </option>
                          ));
                        }
                        return filtered.map((s) => (
                          <option key={s.classId} value={s.classId}>
                            {s.classId}
                          </option>
                        ));
                      })()}
                    </select>

                    <select
                      value={selectedSection}
                      onChange={(e) => setSelectedSection(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold bg-white"
                    >
                      <option value="A">Section A</option>
                      <option value="B">Section B</option>
                      <option value="Both">Both Section</option>
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Period and Chapter Selection */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex justify-between">
                  <span>Periods</span>
                  <button
                    type="button"
                    onClick={() => setUseCustomPeriods(!useCustomPeriods)}
                    className="text-[9px] text-indigo-600 hover:underline font-semibold"
                  >
                    {useCustomPeriods ? "Use Dropdown" : "Type Custom"}
                  </button>
                </label>
                {useCustomPeriods ? (
                  <input
                    type="text"
                    value={rowPeriods}
                    onChange={(e) => setRowPeriods(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-center font-semibold animate-in fade-in duration-100"
                    placeholder="e.g. 2nd, 3rd"
                  />
                ) : (
                  <select
                    value={rowPeriods}
                    onChange={(e) => setRowPeriods(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-bold bg-white text-center"
                  >
                    <option value="">-- Period --</option>
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

              {/* Dynamic Chapter Dropdown */}
              <div className="md:col-span-2">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex justify-between">
                  <span>Name of the chapter</span>
                  <button
                    type="button"
                    onClick={() => setUseCustomChapter(!useCustomChapter)}
                    className="text-[9px] text-indigo-600 hover:underline font-semibold"
                  >
                    {useCustomChapter ? "Use Syllabus Dropdown" : "Type Custom Chapter"}
                  </button>
                </label>

                {!useCustomChapter && activeSyllabus && activeSyllabus.chapters.length > 0 ? (
                  <select
                    value={selectedChapterId}
                    onChange={(e) => handleDropdownChapterChange(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold bg-white"
                  >
                    <option value="">-- Choose Chapter --</option>
                    {activeSyllabus.chapters.map((ch) => {
                      const completed = isChapterCompleted(ch.name);
                      return (
                        <option key={ch.id} value={ch.id}>
                          {completed ? "✓ " : ""} {ch.name}
                        </option>
                      );
                    })}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={rowChapterName}
                    onChange={(e) => setRowChapterName(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                    placeholder="Enter chapter name"
                    required
                  />
                )}
              </div>
            </div>

            {/* Dynamic Concept Dropdown */}
            <div>
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex justify-between">
                <span>Concept / Sub-topic</span>
                <button
                  type="button"
                  onClick={() => setUseCustomConcept(!useCustomConcept)}
                  className="text-[9px] text-indigo-600 hover:underline font-semibold"
                >
                  {useCustomConcept ? "Use Concept List" : "Type Custom Topic"}
                </button>
              </label>

              {!useCustomConcept && activeSyllabus && selectedChapterId ? (
                (() => {
                  const currentChapter = activeSyllabus.chapters.find((ch) => ch.id === selectedChapterId);
                  if (currentChapter && currentChapter.concepts.length > 0) {
                    return (
                      <select
                        value={selectedConceptId}
                        onChange={(e) => handleDropdownConceptChange(e.target.value)}
                        className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold bg-white"
                      >
                        <option value="">-- Choose Concept --</option>
                        {currentChapter.concepts.map((co) => {
                          const completed = isConceptCompleted(co.name);
                          return (
                            <option key={co.id} value={co.id}>
                              {completed ? "✓ " : ""} {co.name}
                            </option>
                          );
                        })}
                      </select>
                    );
                  }
                  return (
                    <input
                      type="text"
                      value={rowConcept}
                      onChange={(e) => setRowConcept(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium bg-gray-50"
                      placeholder="Type manually (Syllabus contains no concepts for this chapter)"
                    />
                  );
                })()
              ) : (
                <input
                  type="text"
                  value={rowConcept}
                  onChange={(e) => setRowConcept(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                  placeholder="e.g. श्लोक 1-2 का उच्चारण"
                  required
                />
              )}
            </div>

            {/* Periods allotment and covered trackers */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">No of period allotted</label>
                <input
                  type="text"
                  value={rowPeriodsAllotted}
                  onChange={(e) => setRowPeriodsAllotted(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-center"
                  placeholder="e.g. 4"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">No of period covered</label>
                <input
                  type="text"
                  value={rowPeriodsCovered}
                  onChange={(e) => setRowPeriodsCovered(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono text-center"
                  placeholder="e.g. 1"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Needs repetition?</label>
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

            {/* AI Assistant Module */}
            <div className="bg-gradient-to-r from-indigo-50 to-violet-50 p-4 rounded-xl border border-indigo-100 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-indigo-800 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
                  Gemini AI Lesson Assistant
                </span>
                <button
                  type="button"
                  onClick={handleAiSuggest}
                  disabled={isAiLoading || !rowChapterName}
                  className="flex items-center gap-1.5 px-3 py-1 text-[10px] font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-400 rounded-lg transition-colors cursor-pointer"
                >
                  {isAiLoading ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Suggesting...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3" />
                      Auto-fill Fields
                    </>
                  )}
                </button>
              </div>
              <p className="text-[10px] text-indigo-600 leading-normal font-medium">
                Uses the latest AI model to draft beautifulExpected Outcomes (e.g., "Students will be able to..."), custom Sanskrit and general Teaching-Learning Materials (TLMs), and precise lesson remarks instantly!
              </p>
              {aiError && (
                <p className="text-[11px] text-red-600 bg-red-50 p-2 rounded border border-red-100">
                  {aiError}
                </p>
              )}
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1 flex justify-between">
                  <span>Expected learning outcome</span>
                  <button
                    type="button"
                    onClick={() => setUseCustomOutcome(!useCustomOutcome)}
                    className="text-[9px] text-indigo-600 hover:underline font-semibold"
                  >
                    {useCustomOutcome ? "Use Dropdown Options" : "Type Custom Outcome"}
                  </button>
                </label>
                {!useCustomOutcome ? (
                  <select
                    value={rowExpectedOutcome}
                    onChange={(e) => setRowExpectedOutcome(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium bg-white text-gray-800 animate-in fade-in duration-100"
                  >
                    <option value="">-- Choose Expected Outcome --</option>
                    {(() => {
                      const chapter = activeSyllabus?.chapters.find((ch) => ch.id === selectedChapterId);
                      const concept = chapter?.concepts.find((co) => co.id === selectedConceptId);
                      if (concept && concept.learningOutcome) {
                        return (
                          <option value={concept.learningOutcome}>
                            {concept.learningOutcome}
                          </option>
                        );
                      }
                      return (
                        <>
                          <option value="छात्रः पाठनस्य भावार्थं अवगच्छन्ति तथा नूतनशब्दानां प्रयोगं करिष्यन्ति।">
                            छात्रः पाठनस्य भावार्थं अवगच्छन्ति तथा नूतनशब्दानां प्रयोगं करिष्यन्ति।
                          </option>
                          <option value="छात्रः शुद्धं उच्चारणं कर्तुं समर्थाः भविष्यन्ति तथा शब्दकोषस्य वर्धनं करिष्यन्ति।">
                            छात्रः शुद्धं उच्चारणं कर्तुं समर्थाः भविष्यन्ति तथा शब्दकोषस्य वर्धनं करिष्यन्ति।
                          </option>
                          <option value="व्याकरणस्य नियमाः ज्ञास्यन्ति तथा अभ्यासप्रश्नानां उत्तराणि लेखिष्यन्ति।">
                            व्याकरणस्य नियमाः ज्ञास्यन्ति तथा अभ्यासप्रश्नानां उत्तराणि लेखिष्यन्ति।
                          </option>
                          <option value="नैतिकमूल्यानां व्यवहारं जीवने प्रयोगं च ज्ञास्यन्ति।">
                            नैतिकमूल्यानां व्यवहारं जीवने प्रयोगं च ज्ञास्यन्ति।
                          </option>
                        </>
                      );
                    })()}
                    {rowExpectedOutcome && (
                      (() => {
                        const chapter = activeSyllabus?.chapters.find((ch) => ch.id === selectedChapterId);
                        const concept = chapter?.concepts.find((co) => co.id === selectedConceptId);
                        if (concept && concept.learningOutcome === rowExpectedOutcome) {
                          return null;
                        }
                        const standardOutcomes = [
                          "छात्रः पाठनस्य भावार्थं अवगच्छन्ति तथा नूतनशब्दानां प्रयोगं करिष्यन्ति।",
                          "छात्रः शुद्धं उच्चारणं कर्तुं समर्थाः भविष्यन्ति तथा शब्दकोषस्य वर्धनं करिष्यन्ति।",
                          "व्याकरणस्य नियमाः ज्ञास्यन्ति तथा अभ्यासप्रश्नानां उत्तराणि लेखिष्यन्ति।",
                          "नैतिकमूल्यानां व्यवहारं जीवने प्रयोगं च ज्ञास्यन्ति।"
                        ];
                        if (standardOutcomes.includes(rowExpectedOutcome)) {
                          return null;
                        }
                        return (
                          <option value={rowExpectedOutcome}>
                            {rowExpectedOutcome}
                          </option>
                        );
                      })()
                    )}
                  </select>
                ) : (
                  <textarea
                    value={rowExpectedOutcome}
                    onChange={(e) => setRowExpectedOutcome(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-800 font-medium animate-in fade-in duration-100"
                    rows={2}
                    placeholder="Students will be able to..."
                  />
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">TLM required and used</label>
                <textarea
                  value={rowTlmRequired}
                  onChange={(e) => setRowTlmRequired(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-800 font-medium"
                  rows={2}
                  placeholder="e.g. Smart Board, textbook, audio ppt"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider mb-1">Remarks of achievements</label>
                <textarea
                  value={rowRemarks}
                  onChange={(e) => setRowRemarks(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-gray-800 font-medium"
                  rows={2}
                  placeholder="Remarks on student understanding or difficulties..."
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={resetRowForm}
                className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Clear Form
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-5 py-2 rounded-lg text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                {isEditingRowId ? "Update Row" : "Add Row Entry"}
              </button>
            </div>
          </form>
        </div>

        {/* Column 3: Syllabus Progression Checklist (col-span-3) */}
        {/* Directly answers "and us chapter complete hone ke baad nehi entry hua chapter aa jae to keisa hoga" */}
        <div className="lg:col-span-3 space-y-5">
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs space-y-4 max-h-[600px] overflow-y-auto">
            <h3 className="text-xs font-bold text-gray-800 border-b border-gray-100 pb-3 flex items-center justify-between uppercase tracking-wide">
              <span>📚 Syllabus Progress</span>
              <span className="text-[9px] text-gray-400 font-mono">({selectedClassId})</span>
            </h3>

            {!activeSyllabus || activeSyllabus.chapters.length === 0 ? (
              <div className="text-center py-6 text-gray-400 space-y-1.5">
                <p className="text-[10px] font-semibold">No syllabus configured for {selectedClassId}.</p>
                <button
                  onClick={onOpenSyllabusManager}
                  className="text-[10px] text-indigo-600 font-bold hover:underline"
                >
                  Configure Syllabus
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {activeSyllabus.chapters.map((chapter) => {
                  const completed = isChapterCompleted(chapter.name);

                  return (
                    <div key={chapter.id} className="space-y-1.5">
                      {/* Chapter heading with status */}
                      <div
                        onClick={() => handleAutoFillFromSyllabus(chapter)}
                        className="flex items-start justify-between p-2 rounded-lg bg-slate-50 hover:bg-indigo-50/50 transition-all cursor-pointer group"
                      >
                        <span className="text-[10px] font-bold text-slate-800 line-clamp-1 group-hover:text-indigo-600 flex items-center gap-1">
                          <BookOpen className="w-3 h-3 text-slate-400 group-hover:text-indigo-500" />
                          {chapter.name}
                        </span>
                        <span>
                          {completed ? (
                            <span className="text-[9px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded font-bold border border-green-200">
                              Logged ✓
                            </span>
                          ) : (
                            <span className="text-[9px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded font-bold border border-amber-200">
                              Pending
                            </span>
                          )}
                        </span>
                      </div>

                      {/* Concepts inside chapter */}
                      <div className="pl-4 space-y-1">
                        {chapter.concepts.map((concept) => {
                          const conceptDone = isConceptCompleted(concept.name);
                          return (
                            <div
                              key={concept.id}
                              onClick={() => handleAutoFillFromSyllabus(chapter, concept)}
                              className="text-[9px] py-1 px-1.5 hover:bg-indigo-50/25 text-slate-500 hover:text-indigo-600 transition-colors flex items-center gap-1.5 cursor-pointer rounded"
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${conceptDone ? "bg-green-500" : "bg-gray-300"}`}></span>
                              <span className="truncate flex-1 font-medium">{concept.name}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-amber-50 text-amber-900 p-4 rounded-xl border border-amber-100 space-y-1">
            <span className="text-[10px] font-bold text-amber-800 flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5" /> Quick Tip
            </span>
            <p className="text-[9px] leading-relaxed font-medium">
              Click on any chapter or concept in the <strong>Syllabus Progress checklist</strong> to instantly load it into the row builder!
            </p>
          </div>
        </div>
      </div>

      {/* Row List table (Current list of logs) */}
      <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-gray-800 border-b border-gray-100 pb-3">
          📋 Current Row Logs in this Diary ({diary.rows.length} rows)
        </h3>

        {diary.rows.length === 0 ? (
          <div className="text-center py-10 text-gray-400 space-y-2">
            <p className="text-sm">No row entries logged in this sheet yet.</p>
            <p className="text-xs">Use the Form above to add your first lesson entry.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500 font-bold bg-gray-50/50">
                  <th className="py-2.5 px-3 w-[60px] text-center">Sl No</th>
                  <th className="py-2.5 px-3 w-[100px]">Date</th>
                  <th className="py-2.5 px-3 w-[100px]">Class</th>
                  <th className="py-2.5 px-3">Chapter</th>
                  <th className="py-2.5 px-3">Concept</th>
                  <th className="py-2.5 px-3 w-[60px] text-center">Allotted</th>
                  <th className="py-2.5 px-3 w-[60px] text-center">Covered</th>
                  <th className="py-2.5 px-3 w-[150px] text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium text-gray-700">
                {diary.rows.map((row, index) => (
                  <tr key={row.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-2 px-3 text-center text-gray-400 font-mono font-bold">
                      {row.slNo}
                    </td>
                    <td className="py-2 px-3 font-mono text-gray-500">
                      {row.date ? new Date(row.date).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "2-digit",
                      }) : "—"}
                    </td>
                    <td className="py-2 px-3 text-gray-800 font-bold">
                      {row.classSection || "—"}
                    </td>
                    <td className="py-2 px-3 font-semibold text-indigo-950 truncate max-w-[120px]">
                      {row.chapterName || "—"}
                    </td>
                    <td className="py-2 px-3 text-gray-600 truncate max-w-[150px]">
                      {row.concept || "—"}
                    </td>
                    <td className="py-2 px-3 text-center font-mono text-gray-500">
                      {row.periodsAllotted || "—"}
                    </td>
                    <td className="py-2 px-3 text-center font-mono text-gray-500">
                      {row.periodsCovered || "—"}
                    </td>
                    <td className="py-2 px-3 flex items-center justify-center gap-1.5 h-full">
                      {/* Re-order controls */}
                      <button
                        onClick={() => handleMoveRow(index, "up")}
                        disabled={index === 0}
                        title="Move Up"
                        className="p-1 text-gray-400 hover:text-indigo-600 disabled:opacity-30 rounded hover:bg-gray-100/50 transition-colors cursor-pointer"
                      >
                        <ArrowUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleMoveRow(index, "down")}
                        disabled={index === diary.rows.length - 1}
                        title="Move Down"
                        className="p-1 text-gray-400 hover:text-indigo-600 disabled:opacity-30 rounded hover:bg-gray-100/50 transition-colors cursor-pointer"
                      >
                        <ArrowDown className="w-3.5 h-3.5" />
                      </button>

                      <div className="w-px h-4 bg-gray-200 mx-0.5"></div>

                      {/* Edit & Delete */}
                      <button
                        onClick={() => handleStartEditRow(row)}
                        title="Edit Entry"
                        className="p-1 text-indigo-600 hover:bg-indigo-50 rounded transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteRow(row.id)}
                        title="Delete Entry"
                        className="p-1 text-red-500 hover:bg-red-50 rounded transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Save Success Toast Indicator */}
      {showSaveSuccess && (
        <div className="fixed bottom-6 right-6 bg-gray-900 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-xs font-semibold animate-bounce z-50">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span>Lesson Diary updated successfully!</span>
        </div>
      )}
    </div>
  );
}
