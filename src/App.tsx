import React, { useState, useEffect } from "react";
import { LessonDiary, ClassSyllabus } from "./types";
import DiaryList from "./components/DiaryList";
import DiaryForm from "./components/DiaryForm";
import DiaryPrint from "./components/DiaryPrint";
import SyllabusManager from "./components/SyllabusManager";
import ClassWiseFilterAndEntry from "./components/ClassWiseFilterAndEntry";
import { DEFAULT_SYLLABUS_DATA } from "./data/defaultSyllabus";
import { BookOpen, HelpCircle, Eye, Edit3, ArrowLeft, Printer, Sparkles, Layers, Filter, FileDown, Share2, Loader2, Download, ExternalLink, X, CheckCircle2, FileText } from "lucide-react";
import { exportDiaryToPdf, PdfExportResult } from "./utils/pdfExport";
import { saveDataUriToDevice, saveAndShare } from "./utils/nativeExport";

// Local storage keys
const STORAGE_KEY = "oav_daily_lesson_diaries_v1";
const SYLLABUS_STORAGE_KEY = "oav_syllabus_data_v2";

// Default/Bootstrap Sanskrit Diary
const DEFAULT_DIARY: LessonDiary = {
  id: "default-sanskrit-diary-1",
  schoolName: "Odisha Adarsha Vidyalaya, Bibina, Saintala",
  subject: "Sanskrit",
  teacherName: "Basanta Bharasagri",
  teacherDesignation: "TGT Sanskrit",
  academicYear: "2026-27",
  createdAt: Date.now() - 86400000 * 3, // 3 days ago
  updatedAt: Date.now(),
  rows: [
    {
      id: "row-default-1",
      slNo: 1,
      date: "2026-07-01",
      classSection: "IX-A",
      periods: "1st & 2nd",
      chapterName: "Chapter 1: सुभाSubhashitani (Epigrams)",
      concept: "श्लोक 1-2 का उच्चारण, व्याख्या एवं नैतिक मूल्य",
      periodsAllotted: "4",
      periodsCovered: "2",
      expectedOutcome: "Students will be able to recite verses 1 & 2 of Subhashitani with correct Sanskrit pronunciation and explain their moral values in simple sentences.",
      tlmRequired: "Sanskrit Textbook, blackboard illustration, charts detailing epigrams and their authors.",
      needsRepetition: "No",
      remarks: "Excellent response. All students chanted with rhythm and understood the core ethical teachings.",
    },
    {
      id: "row-default-2",
      slNo: 2,
      date: "2026-07-02",
      classSection: "IX-A",
      periods: "3rd",
      chapterName: "Chapter 1: सुभाSubhashitani (Epigrams)",
      concept: "श्लोक 3-4 का अर्थ एवं शब्दार्थ व्याख्या",
      periodsAllotted: "4",
      periodsCovered: "3",
      expectedOutcome: "Students will be able to chant verses 3 & 4 with melody, translate key sandhi terms, and describe moral lessons.",
      tlmRequired: "Sanskrit text book, sandhi charts, vocabulary flashcards.",
      needsRepetition: "No",
      remarks: "Students grasped sandhi splits well. Pronunciation practice went smoothly.",
    },
    {
      id: "row-default-3",
      slNo: 3,
      date: "2026-07-03",
      classSection: "IX-A",
      periods: "4th",
      chapterName: "Chapter 1: सुभाSubhashitani (Epigrams)",
      concept: "अध्याय 1: अभ्यास कार्य (Exercises)",
      periodsAllotted: "4",
      periodsCovered: "4",
      expectedOutcome: "Students will be able to answer lesson exercises, match terms, and form simple sentences in Sanskrit.",
      tlmRequired: "Blackboard worksheets, custom worksheets for grammar exercises.",
      needsRepetition: "Yes",
      remarks: "Grammar questions needed extra support. Planned a brief 10-minute revision session for tomorrow.",
    },
  ],
};

export default function App() {
  const [diaries, setDiaries] = useState<LessonDiary[]>([]);
  const [activeDiaryId, setActiveDiaryId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"edit" | "preview" | "syllabus" | "class-filter">("edit");
  const [syllabusData, setSyllabusData] = useState<ClassSyllabus[]>([]);
  const [printRowsPerPage, setPrintRowsPerPage] = useState<string>("auto");
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [pdfProgressMsg, setPdfProgressMsg] = useState<string | null>(null);
  const [pdfResultModalData, setPdfResultModalData] = useState<PdfExportResult | null>(null);

  // Trigger PDF Export for Android APK and Desktop
  const handleExportPdf = async () => {
    const targetDiary = diaries.find((d) => d.id === activeDiaryId);
    if (!targetDiary) return;

    setIsExportingPdf(true);
    const cleanSubject = (targetDiary.subject || "Lesson").replace(/[^a-zA-Z0-9]/g, "_");
    const fileName = `OAV_Lesson_Diary_${cleanSubject}_${targetDiary.academicYear || "2026-27"}.pdf`;

    try {
      const result = await exportDiaryToPdf("printable-diary-area", {
        filename: fileName,
        onProgress: (msg) => setPdfProgressMsg(msg),
      });
      setPdfResultModalData(result);
    } catch (err: any) {
      console.error("Export Error:", err);
      const msg = err?.message || String(err);
      alert(`PDF Export Error: ${msg}`);
    } finally {
      setIsExportingPdf(false);
      setPdfProgressMsg(null);
    }
  };

  // Load diaries and syllabus on boot
  useEffect(() => {
    // 1. Load Diaries
    const loadDiaries = async () => {
      let localData: LessonDiary[] = [];
      const savedDiaries = localStorage.getItem(STORAGE_KEY);
      if (savedDiaries) {
        try {
          localData = JSON.parse(savedDiaries);
        } catch (e) {
          console.error("Error parsing local diaries:", e);
        }
      }

      try {
        const response = await fetch("/api/diaries");
        if (response.ok) {
          const serverData = await response.json();
          if (Array.isArray(serverData) && serverData.length > 0) {
            // Server has data, use it!
            setDiaries(serverData);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(serverData));
          } else {
            // Server has no data (empty array)
            if (localData.length > 0) {
              // Push local data to server so server is updated
              setDiaries(localData);
              fetch("/api/diaries", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(localData),
              }).catch((err) => console.error("Failed to sync local diaries to server:", err));
            } else {
              // Both empty, bootstrap default
              const initial = [DEFAULT_DIARY];
              setDiaries(initial);
              localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
              fetch("/api/diaries", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(initial),
              }).catch((err) => console.error("Failed to bootstrap diaries to server:", err));
            }
          }
        } else {
          throw new Error("Server response not OK");
        }
      } catch (error) {
        console.warn("Using offline fallback for diaries:", error);
        if (localData.length > 0) {
          setDiaries(localData);
        } else {
          setDiaries([DEFAULT_DIARY]);
        }
      }
    };

    // 2. Load Syllabus
    const loadSyllabus = async () => {
      let localSyllabus: ClassSyllabus[] = [];
      const savedSyllabus = localStorage.getItem(SYLLABUS_STORAGE_KEY);
      if (savedSyllabus) {
        try {
          localSyllabus = JSON.parse(savedSyllabus);
        } catch (e) {
          console.error("Error parsing local syllabus:", e);
        }
      }

      try {
        const response = await fetch("/api/syllabus");
        if (response.ok) {
          const serverSyllabus = await response.json();
          if (Array.isArray(serverSyllabus) && serverSyllabus.length > 0) {
            // Server has syllabus, use it!
            setSyllabusData(serverSyllabus);
            localStorage.setItem(SYLLABUS_STORAGE_KEY, JSON.stringify(serverSyllabus));
          } else {
            // Server has no syllabus (empty array)
            if (localSyllabus.length > 0) {
              // Push local data to server
              setSyllabusData(localSyllabus);
              fetch("/api/syllabus", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(localSyllabus),
              }).catch((err) => console.error("Failed to sync local syllabus to server:", err));
            } else {
              // Both empty, bootstrap default
              setSyllabusData(DEFAULT_SYLLABUS_DATA);
              localStorage.setItem(SYLLABUS_STORAGE_KEY, JSON.stringify(DEFAULT_SYLLABUS_DATA));
              fetch("/api/syllabus", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(DEFAULT_SYLLABUS_DATA),
              }).catch((err) => console.error("Failed to bootstrap syllabus to server:", err));
            }
          }
        } else {
          throw new Error("Server response not OK");
        }
      } catch (error) {
        console.warn("Using offline fallback for syllabus:", error);
        if (localSyllabus.length > 0) {
          setSyllabusData(localSyllabus);
        } else {
          setSyllabusData(DEFAULT_SYLLABUS_DATA);
        }
      }
    };

    loadDiaries();
    loadSyllabus();
  }, []);

  // Sync diaries to local storage and server
  const saveDiaries = (updated: LessonDiary[]) => {
    setDiaries(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    fetch("/api/diaries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updated),
    }).catch((err) => console.error("Failed to sync diaries to server:", err));
  };

  // Sync syllabus data to local storage and server
  const handleUpdateSyllabus = (updatedSyllabus: ClassSyllabus[]) => {
    setSyllabusData(updatedSyllabus);
    localStorage.setItem(SYLLABUS_STORAGE_KEY, JSON.stringify(updatedSyllabus));
    fetch("/api/syllabus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updatedSyllabus),
    }).catch((err) => console.error("Failed to sync syllabus to server:", err));
  };

  // Create new empty diary
  const handleCreateDiary = (subject: string, academicYear: string) => {
    const newDiary: LessonDiary = {
      id: `diary-${Date.now()}`,
      schoolName: "Odisha Adarsha Vidyalaya, Bibina, Saintala",
      subject: subject,
      teacherName: "",
      teacherDesignation: "",
      academicYear: academicYear,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      rows: [],
    };
    saveDiaries([newDiary, ...diaries]);
    setActiveDiaryId(newDiary.id);
    setActiveTab("edit");
  };

  // Update diary details/rows
  const handleUpdateDiary = (updatedDiary: LessonDiary) => {
    const updated = diaries.map((d) => (d.id === updatedDiary.id ? updatedDiary : d));
    saveDiaries(updated);
  };

  // Delete diary
  const handleDeleteDiary = (id: string) => {
    if (confirm("Are you sure you want to delete this Lesson Diary? This will remove all recorded logs in this sheet.")) {
      const filtered = diaries.filter((d) => d.id !== id);
      saveDiaries(filtered);
      if (activeDiaryId === id) {
        setActiveDiaryId(null);
      }
    }
  };

  // Backup restore
  const handleImportDiaries = (importedList: LessonDiary[]) => {
    const merged = [...importedList, ...diaries.filter((d) => !importedList.some((imp) => imp.id === d.id))];
    saveDiaries(merged);
  };

  // Locate current active diary
  const activeDiary = diaries.find((d) => d.id === activeDiaryId);

  return (
    <div className="min-h-screen bg-slate-50/50 text-gray-800 font-sans flex flex-col">
      {/* Top Navigation Bar - Hidden on print */}
      <header className="no-print bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <span className="text-sm font-bold text-gray-900 tracking-tight">OAV Lesson Planner Pro</span>
              <p className="text-[10px] text-gray-400 font-medium tracking-wide font-mono uppercase">Daily Lesson Diary</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs bg-indigo-50 text-indigo-700 font-semibold px-2.5 py-1 rounded-md border border-indigo-100/50">
              Basantabharasagri@gmail.com
            </span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeDiary === undefined ? (
          /* Dashboard / Diary List */
          <DiaryList
            diaries={diaries}
            onSelectDiary={(d) => {
              setActiveDiaryId(d.id);
              setActiveTab("edit");
            }}
            onDeleteDiary={handleDeleteDiary}
            onCreateDiary={handleCreateDiary}
            onImportDiaries={handleImportDiaries}
          />
        ) : (
          /* Active Diary Workspace */
          <div className="space-y-6">
            {/* Tab switcher at the top of active diary workspace - Hidden on print */}
            <div className="no-print bg-white p-1.5 rounded-xl border border-gray-100 flex items-center justify-between shadow-xs">
              <div className="flex flex-wrap items-center gap-1">
                <button
                  onClick={() => setActiveDiaryId(null)}
                  className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <ArrowLeft className="w-4 h-4" />
                  Dashboard
                </button>
                <div className="h-4 w-px bg-gray-200 mx-1 hidden sm:block"></div>
                
                <button
                  onClick={() => setActiveTab("edit")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === "edit"
                      ? "bg-indigo-50 text-indigo-700 shadow-2xs"
                      : "text-gray-500 hover:text-gray-800 hover:bg-gray-50/50"
                  }`}
                >
                  <Edit3 className="w-4 h-4" />
                  Edit Form & Logs
                </button>

                <button
                  onClick={() => setActiveTab("class-filter")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === "class-filter"
                      ? "bg-indigo-50 text-indigo-700 shadow-2xs"
                      : "text-gray-500 hover:text-gray-800 hover:bg-gray-50/50"
                  }`}
                >
                  <Filter className="w-4 h-4 text-indigo-500" />
                  Class-wise Filter & Entry
                </button>

                <button
                  onClick={() => setActiveTab("syllabus")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === "syllabus"
                      ? "bg-indigo-50 text-indigo-700 shadow-2xs"
                      : "text-gray-500 hover:text-gray-800 hover:bg-gray-50/50"
                  }`}
                >
                  <Layers className="w-4 h-4 text-indigo-500" />
                  Syllabus Dropdowns
                </button>

                <button
                  onClick={() => setActiveTab("preview")}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === "preview"
                      ? "bg-indigo-50 text-indigo-700 shadow-2xs"
                      : "text-gray-500 hover:text-gray-800 hover:bg-gray-50/50"
                  }`}
                >
                  <Eye className="w-4 h-4" />
                  Printable Ledger Preview
                </button>
              </div>

              <div className="flex items-center gap-2 pr-1.5">
                <button
                  onClick={handleExportPdf}
                  disabled={isExportingPdf}
                  className="flex items-center gap-2 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 disabled:bg-gray-300 text-white text-xs font-bold rounded-lg shadow-xs transition-all cursor-pointer"
                  title="Generate downloadable PDF / Share via WhatsApp or Drive"
                >
                  {isExportingPdf ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <FileDown className="w-3.5 h-3.5" />
                  )}
                  <span>Export / Share PDF</span>
                </button>
              </div>
            </div>

            {/* Content views */}
            {activeTab === "edit" ? (
              <DiaryForm
                diary={activeDiary}
                onUpdateDiary={handleUpdateDiary}
                onBack={() => setActiveDiaryId(null)}
                syllabusData={syllabusData}
                onOpenSyllabusManager={() => setActiveTab("syllabus")}
              />
            ) : activeTab === "syllabus" ? (
              <SyllabusManager
                key={`syllabus-${activeDiary.subject}`}
                syllabusData={syllabusData}
                onUpdateSyllabus={handleUpdateSyllabus}
                onBack={() => setActiveTab("edit")}
                currentSubject={activeDiary.subject}
              />
            ) : activeTab === "class-filter" ? (
              <ClassWiseFilterAndEntry
                diary={activeDiary}
                onUpdateDiary={handleUpdateDiary}
                syllabusData={syllabusData}
                onBack={() => setActiveTab("edit")}
              />
            ) : (
              /* Live Ledger Preview rendering */
              <div className="space-y-4 no-print animate-in fade-in duration-150">
                {/* Minimal Page Settings Bar */}
                <div className="bg-white px-4 py-2.5 rounded-xl border border-gray-100 shadow-2xs flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-700">
                    <Eye className="w-4 h-4 text-indigo-500" />
                    <span>A4 Printable Ledger Preview</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500">Rows per page:</span>
                    <select
                      value={printRowsPerPage}
                      onChange={(e) => setPrintRowsPerPage(e.target.value)}
                      className="px-2.5 py-1 text-xs font-bold bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      <option value="auto">Auto (Smart page split)</option>
                      <option value="1">1 Row per page</option>
                      <option value="2">2 Rows per page</option>
                      <option value="3">3 Rows per page</option>
                      <option value="4">4 Rows per page</option>
                      <option value="5">5 Rows per page</option>
                    </select>
                  </div>
                </div>

                <div className="bg-slate-100/60 p-4 md:p-6 rounded-2xl border border-gray-200/60 overflow-x-auto shadow-inner flex justify-center">
                  <div className="bg-white p-6 sm:p-8 shadow-md rounded-lg border border-gray-200 min-w-[1000px] w-full max-w-[297mm]">
                    <DiaryPrint diary={activeDiary} rowsPerPage={printRowsPerPage} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Hidden print & PDF container */}
      {activeDiary && (
        <div id="printable-diary-area" className="print-only">
          <DiaryPrint diary={activeDiary} rowsPerPage={printRowsPerPage} />
        </div>
      )}

      {/* PDF Export Progress Modal Overlay */}
      {isExportingPdf && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-150">
          <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-sm w-full text-center space-y-4 border border-gray-100">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
            <div className="space-y-1">
              <h3 className="text-sm font-bold text-gray-900">Exporting Lesson Diary PDF</h3>
              <p className="text-xs text-gray-500 font-medium">
                {pdfProgressMsg || "Processing pages into A4 Landscape format..."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* PDF Success & Save/Share Modal (Essential for Android APK & Mobile Web) */}
      {pdfResultModalData && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center z-50 p-3 sm:p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-4 sm:p-5 space-y-3.5 border border-gray-100 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Diary Export Ready</h3>
                  <p className="text-[11px] text-gray-500 font-medium line-clamp-1">{pdfResultModalData.filename}</p>
                </div>
              </div>
              <button
                onClick={() => setPdfResultModalData(null)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Action Buttons Stack (Supports Native Android APK Storage & Web Fallbacks) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 shrink-0">
              {/* Button 1: Save PDF File */}
              <button
                onClick={async () => {
                  if (!pdfResultModalData) return;
                  const res = await saveDataUriToDevice(
                    pdfResultModalData.pdfDataUrl,
                    pdfResultModalData.filename
                  );
                  if (res.savedNative) {
                    alert(`✅ Saved PDF to Documents folder:\n${pdfResultModalData.filename}`);
                  }
                }}
                className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Save PDF File</span>
              </button>

              {/* Button 2: Save High-Res A4 Image (PNG) */}
              <button
                onClick={async () => {
                  if (!pdfResultModalData) return;
                  const pngName = pdfResultModalData.filename.replace(".pdf", ".png");
                  const dataUri = pdfResultModalData.pageImages[0] || pdfResultModalData.pdfDataUrl;
                  const res = await saveDataUriToDevice(dataUri, pngName);
                  if (res.savedNative) {
                    alert(`✅ Saved Image to Documents folder:\n${pngName}`);
                  }
                }}
                className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Save A4 Image (PNG)</span>
              </button>

              {/* Button 3: Native Share via WhatsApp / Drive / Apps */}
              <button
                onClick={async () => {
                  if (!pdfResultModalData) return;
                  const pngName = pdfResultModalData.filename.replace(".pdf", ".png");
                  const dataUri = pdfResultModalData.pageImages[0] || pdfResultModalData.pdfDataUrl;
                  await saveAndShare(dataUri, pngName);
                }}
                className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-900 active:bg-slate-950 text-white text-xs font-bold rounded-xl shadow-xs flex items-center justify-center gap-2 transition-all cursor-pointer sm:col-span-2"
              >
                <Share2 className="w-4 h-4 text-emerald-400" />
                <span>Share via WhatsApp / Apps</span>
              </button>
            </div>

            {/* Crisp Document Image Preview (Rendered High-Res A4) */}
            <div className="flex-1 min-h-[200px] max-h-[300px] bg-slate-100 rounded-xl border border-gray-200 overflow-auto p-2 relative flex items-center justify-center">
              {pdfResultModalData.pageImages && pdfResultModalData.pageImages[0] ? (
                <img
                  src={pdfResultModalData.pageImages[0]}
                  alt="Lesson Diary A4 Page Preview"
                  className="max-w-full h-auto rounded-lg shadow-sm object-contain select-all cursor-pointer border border-gray-300"
                  onClick={() => {
                    const w = window.open();
                    if (w) {
                      w.document.write(`<img src="${pdfResultModalData.pageImages[0]}" style="max-width:100%;height:auto;"/>`);
                    }
                  }}
                />
              ) : (
                <iframe
                  src={pdfResultModalData.pdfDataUrl}
                  className="w-full h-full min-h-[200px] border-0"
                  title="PDF Preview"
                />
              )}
            </div>

            {/* Secondary Direct Download Links */}
            <div className="flex items-center justify-between text-xs pt-1 border-t border-gray-100 text-gray-500 font-medium">
              <a
                href={pdfResultModalData.pdfDataUrl}
                download={pdfResultModalData.filename}
                className="text-emerald-700 hover:text-emerald-800 font-bold underline inline-flex items-center gap-1"
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Direct PDF Link</span>
              </a>

              <button
                onClick={() => window.print()}
                className="text-slate-700 hover:text-slate-900 font-bold underline inline-flex items-center gap-1 cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>System Print / PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer - Hidden on print */}
      <footer className="no-print bg-white border-t border-gray-100 mt-20 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-2">
          <p className="text-xs text-gray-400 font-medium">
            Daily Lesson Diary Organizer • Conforming to OAV Ledger Standard
          </p>
          <p className="text-[10px] text-gray-300">
            Powered by Google AI Studio Gemini API Projections
          </p>
        </div>
      </footer>
    </div>
  );
}
