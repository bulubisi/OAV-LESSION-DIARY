import React, { useState } from "react";
import { ClassSyllabus, SyllabusChapter, SyllabusConcept } from "../types";
import { Plus, Trash2, Edit2, Upload, Download, BookOpen, Layers, Sparkles, Check, AlertCircle, X, HelpCircle } from "lucide-react";

interface SyllabusManagerProps {
  key?: string;
  syllabusData: ClassSyllabus[];
  onUpdateSyllabus: (updated: ClassSyllabus[]) => void;
  onBack: () => void;
  currentSubject?: string;
}

export default function SyllabusManager({ syllabusData, onUpdateSyllabus, onBack, currentSubject = "Sanskrit" }: SyllabusManagerProps) {
  const subjectSyllabusList = syllabusData.filter(
    (s) => (s.subject || "Sanskrit").toLowerCase() === currentSubject.toLowerCase()
  );

  const [selectedClassId, setSelectedClassId] = useState<string>(() => {
    const defaultClass = subjectSyllabusList.find((s) => s.classId === "Class VIII") || subjectSyllabusList[0];
    return defaultClass ? defaultClass.classId : "Class VIII";
  });
  const [newClassName, setNewClassName] = useState<string>("");
  const [isAddingClass, setIsAddingClass] = useState<boolean>(false);

  // Chapter editing states
  const [newChapterName, setNewChapterName] = useState<string>("");
  const [editingChapterId, setEditingChapterId] = useState<string | null>(null);
  const [editingChapterName, setEditingChapterName] = useState<string>("");

  // Concept editing states
  const [activeChapterForConcept, setActiveChapterForConcept] = useState<string | null>(null);
  const [newConceptName, setNewConceptName] = useState<string>("");
  const [newConceptLearningOutcome, setNewConceptLearningOutcome] = useState<string>("");

  // Bulk import state
  const [bulkText, setBulkText] = useState<string>("");
  const [bulkImportError, setBulkImportError] = useState<string | null>(null);
  const [bulkImportSuccess, setBulkImportSuccess] = useState<boolean>(false);

  // AI Generator state
  const [isGeneratingAI, setIsGeneratingAI] = useState<boolean>(false);
  const [aiGenerationError, setAiGenerationError] = useState<string | null>(null);

  // Get current active syllabus
  const activeSyllabus = syllabusData.find(
    (s) =>
      s.classId === selectedClassId &&
      (s.subject || "Sanskrit").toLowerCase() === currentSubject.toLowerCase()
  );

  // Initialize empty classes
  const handleInitEmptyClasses = () => {
    const standardClasses = ["Class VI", "Class VII", "Class VIII", "Class IX", "Class X"];
    const existingClasses = syllabusData.filter(
      (s) => (s.subject || "Sanskrit").toLowerCase() === currentSubject.toLowerCase()
    );
    const classesToCreate = standardClasses.filter((c) => !existingClasses.some((ex) => ex.classId === c));

    const newClasses = classesToCreate.map((classId) => ({
      classId,
      subject: currentSubject,
      chapters: [],
    }));

    onUpdateSyllabus([...syllabusData, ...newClasses]);
    setSelectedClassId("Class VIII");
  };

  // Copy Sanskrit as Template
  const handleCopySanskritTemplate = () => {
    const sanskritSyllabus = syllabusData.filter(
      (s) => (s.subject || "Sanskrit").toLowerCase() === "sanskrit"
    );

    if (sanskritSyllabus.length === 0) {
      alert("No Sanskrit syllabus found to copy from!");
      return;
    }

    const copiedClasses = sanskritSyllabus.map((s, sidx) => ({
      classId: s.classId,
      subject: currentSubject,
      chapters: s.chapters.map((ch, chidx) => ({
        id: `copied-chap-${Date.now()}-${sidx}-${chidx}`,
        name: ch.name,
        concepts: ch.concepts.map((co, coidx) => ({
          id: `copied-con-${Date.now()}-${sidx}-${chidx}-${coidx}`,
          name: co.name,
          learningOutcome: co.learningOutcome,
        })),
      })),
    }));

    onUpdateSyllabus([...syllabusData, ...copiedClasses]);
    setSelectedClassId("Class VIII");
  };

  // AI Generate Syllabus for Selected Class
  const handleAiGenerateForClass = async () => {
    setIsGeneratingAI(true);
    setAiGenerationError(null);
    try {
      const response = await fetch("/api/gemini/generate-syllabus", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          subject: currentSubject,
          classId: selectedClassId,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate syllabus from AI server.");
      }

      const data = await response.json();
      if (!data || !Array.isArray(data.chapters)) {
        throw new Error("Invalid syllabus format received from AI.");
      }

      // Convert generated chapters to match SyllabusChapter type
      const aiChapters: SyllabusChapter[] = data.chapters.map((ch: any, chidx: number) => ({
        id: `ai-chap-${Date.now()}-${chidx}`,
        name: ch.name,
        concepts: Array.isArray(ch.concepts)
          ? ch.concepts.map((co: any, coidx: number) => ({
              id: `ai-con-${Date.now()}-${chidx}-${coidx}`,
              name: co.name,
              learningOutcome: co.learningOutcome,
            }))
          : [],
      }));

      // Update the active class in syllabusData
      const updated = syllabusData.map((s) => {
        if (
          s.classId === selectedClassId &&
          (s.subject || "Sanskrit").toLowerCase() === currentSubject.toLowerCase()
        ) {
          return {
            ...s,
            chapters: aiChapters,
          };
        }
        return s;
      });

      onUpdateSyllabus(updated);
    } catch (err: any) {
      console.error(err);
      setAiGenerationError(err.message || "Failed to generate syllabus.");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Add a new Class
  const handleAddClass = (e: React.FormEvent) => {
    e.preventDefault();
    const formatted = newClassName.trim();
    if (!formatted) return;

    if (
      syllabusData.some(
        (s) =>
          s.classId.toLowerCase() === formatted.toLowerCase() &&
          (s.subject || "Sanskrit").toLowerCase() === currentSubject.toLowerCase()
      )
    ) {
      alert("This class already exists!");
      return;
    }

    const updated = [
      ...syllabusData,
      {
        classId: formatted,
        subject: currentSubject,
        chapters: [],
      },
    ];
    onUpdateSyllabus(updated);
    setSelectedClassId(formatted);
    setNewClassName("");
    setIsAddingClass(false);
  };

  // Delete current Class
  const handleDeleteClass = () => {
    if (!confirm(`Are you sure you want to delete the syllabus for ${selectedClassId}? This cannot be undone.`)) {
      return;
    }
    const filtered = syllabusData.filter(
      (s) =>
        !(
          s.classId === selectedClassId &&
          (s.subject || "Sanskrit").toLowerCase() === currentSubject.toLowerCase()
        )
    );
    onUpdateSyllabus(filtered);
    const subjectFiltered = filtered.filter(
      (s) => (s.subject || "Sanskrit").toLowerCase() === currentSubject.toLowerCase()
    );
    if (subjectFiltered.length > 0) {
      setSelectedClassId(subjectFiltered[0].classId);
    } else {
      setSelectedClassId("");
    }
  };

  // Add Chapter to active Class
  const handleAddChapter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChapterName.trim() || !activeSyllabus) return;

    const newChapter: SyllabusChapter = {
      id: `chap-${Date.now()}`,
      name: newChapterName.trim(),
      concepts: [],
    };

    const updated = syllabusData.map((s) => {
      if (
        s.classId === selectedClassId &&
        (s.subject || "Sanskrit").toLowerCase() === currentSubject.toLowerCase()
      ) {
        return {
          ...s,
          chapters: [...s.chapters, newChapter],
        };
      }
      return s;
    });

    onUpdateSyllabus(updated);
    setNewChapterName("");
  };

  // Update Chapter Name
  const handleSaveChapterEdit = (chapterId: string) => {
    if (!editingChapterName.trim()) return;

    const updated = syllabusData.map((s) => {
      if (
        s.classId === selectedClassId &&
        (s.subject || "Sanskrit").toLowerCase() === currentSubject.toLowerCase()
      ) {
        return {
          ...s,
          chapters: s.chapters.map((ch) =>
            ch.id === chapterId ? { ...ch, name: editingChapterName.trim() } : ch
          ),
        };
      }
      return s;
    });

    onUpdateSyllabus(updated);
    setEditingChapterId(null);
    setEditingChapterName("");
  };

  // Delete Chapter
  const handleDeleteChapter = (chapterId: string) => {
    if (!confirm("Are you sure you want to delete this chapter and all of its concepts?")) {
      return;
    }

    const updated = syllabusData.map((s) => {
      if (
        s.classId === selectedClassId &&
        (s.subject || "Sanskrit").toLowerCase() === currentSubject.toLowerCase()
      ) {
        return {
          ...s,
          chapters: s.chapters.filter((ch) => ch.id !== chapterId),
        };
      }
      return s;
    });

    onUpdateSyllabus(updated);
    if (activeChapterForConcept === chapterId) {
      setActiveChapterForConcept(null);
    }
  };

  // Add Concept to Chapter
  const handleAddConcept = (chapterId: string) => {
    if (!newConceptName.trim()) return;

    const newConcept: SyllabusConcept = {
      id: `concept-${Date.now()}`,
      name: newConceptName.trim(),
      learningOutcome: newConceptLearningOutcome.trim() || undefined,
    };

    const updated = syllabusData.map((s) => {
      if (
        s.classId === selectedClassId &&
        (s.subject || "Sanskrit").toLowerCase() === currentSubject.toLowerCase()
      ) {
        return {
          ...s,
          chapters: s.chapters.map((ch) => {
            if (ch.id === chapterId) {
              return {
                ...ch,
                concepts: [...ch.concepts, newConcept],
              };
            }
            return ch;
          }),
        };
      }
      return s;
    });

    onUpdateSyllabus(updated);
    setNewConceptName("");
    setNewConceptLearningOutcome("");
  };

  // Delete Concept
  const handleDeleteConcept = (chapterId: string, conceptId: string) => {
    const updated = syllabusData.map((s) => {
      if (
        s.classId === selectedClassId &&
        (s.subject || "Sanskrit").toLowerCase() === currentSubject.toLowerCase()
      ) {
        return {
          ...s,
          chapters: s.chapters.map((ch) => {
            if (ch.id === chapterId) {
              return {
                ...ch,
                concepts: ch.concepts.filter((co) => co.id !== conceptId),
              };
            }
            return ch;
          }),
        };
      }
      return s;
    });

    onUpdateSyllabus(updated);
  };

  // Process Bulk Import
  const handleBulkImport = () => {
    setBulkImportError(null);
    setBulkImportSuccess(false);

    try {
      // Robust preprocessing to handle literal newlines, carriage returns, tabs inside strings, and trailing commas
      const cleanJsonString = (rawText: string): string => {
        // Remove single-line comments and multi-line comments
        let cleaned = rawText.replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, "$1");

        let insideString = false;
        let escapeActive = false;
        let result = "";

        for (let i = 0; i < cleaned.length; i++) {
          const char = cleaned[i];

          if (insideString) {
            if (escapeActive) {
              result += char;
              escapeActive = false;
            } else if (char === "\\") {
              result += char;
              escapeActive = true;
            } else if (char === '"') {
              result += char;
              insideString = false;
              result += char;
            } else if (char === "\n") {
              result += "\\n"; // escape literal newline
            } else if (char === "\r") {
              result += "\\r"; // escape literal carriage return
            } else if (char === "\t") {
              result += "\\t"; // escape literal tab
            } else {
              result += char;
            }
          } else {
            if (char === '"') {
              insideString = true;
            }
            result += char;
          }
        }

        // Remove trailing commas in arrays and objects
        result = result.replace(/,\s*([}\]])/g, "$1");

        return result;
      };

      const cleanedText = cleanJsonString(bulkText);
      const parsed = JSON.parse(cleanedText);

      // Verify structure is an array of SyllabusChapters or a single ClassSyllabus object
      let verifiedChapters: SyllabusChapter[] = [];

      if (Array.isArray(parsed)) {
        // Assume array of Chapters: [{ name: "Ch 1", concepts: ["C1", "C2"] }] or full chapters
        verifiedChapters = parsed.map((item: any, idx) => {
          if (!item.name) {
            throw new Error(`Item at index ${idx} is missing a 'name' field for the Chapter.`);
          }
          const conceptsArray: SyllabusConcept[] = Array.isArray(item.concepts)
            ? item.concepts.map((c: any, cidx: number) => {
                if (typeof c === "string") {
                  return { id: `bulk-con-${Date.now()}-${idx}-${cidx}`, name: c };
                } else if (c && typeof c === "object" && c.name) {
                  return {
                    id: c.id || `bulk-con-${Date.now()}-${idx}-${cidx}`,
                    name: c.name,
                    learningOutcome: c.learningOutcome || undefined,
                  };
                }
                throw new Error(`Concept at chapter ${item.name} is invalid.`);
              })
            : [];

          return {
            id: item.id || `bulk-chap-${Date.now()}-${idx}`,
            name: item.name,
            concepts: conceptsArray,
          };
        });
      } else if (parsed && typeof parsed === "object") {
        // Might be a single ClassSyllabus object: { classId: "Class X", chapters: [...] }
        if (parsed.chapters && Array.isArray(parsed.chapters)) {
          verifiedChapters = parsed.chapters.map((item: any, idx: number) => {
            if (!item.name) throw new Error("Chapter is missing a 'name'.");
            return {
              id: item.id || `bulk-chap-${Date.now()}-${idx}`,
              name: item.name,
              concepts: Array.isArray(item.concepts)
                ? item.concepts.map((c: any, cidx: number) => ({
                    id: c.id || `bulk-con-${Date.now()}-${idx}-${cidx}`,
                    name: typeof c === "string" ? c : c.name || "",
                    learningOutcome: typeof c === "string" ? undefined : c.learningOutcome || undefined,
                  }))
                : [],
            };
          });
          if (parsed.classId && parsed.classId !== selectedClassId) {
            if (
              confirm(
                `JSON specifies Class '${parsed.classId}'. Do you want to import it into '${selectedClassId}' instead?`
              )
            ) {
              // keep going
            } else {
              setSelectedClassId(parsed.classId);
            }
          }
        } else {
          throw new Error("Invalid object structure. Expected { chapters: [...] } or a plain chapter array.");
        }
      } else {
        throw new Error("Invalid input. Expected a JSON array or a JSON object.");
      }

      // Save into state
      const updated = syllabusData.map((s) => {
        if (
          s.classId === selectedClassId &&
          (s.subject || "Sanskrit").toLowerCase() === currentSubject.toLowerCase()
        ) {
          // Merge or overwrite? Let's overwrite with confirmation, or merge
          return {
            ...s,
            chapters: [...s.chapters, ...verifiedChapters],
          };
        }
        return s;
      });

      onUpdateSyllabus(updated);
      setBulkImportSuccess(true);
      setBulkText("");
    } catch (err: any) {
      setBulkImportError(err.message || "Failed to parse JSON. Please check syntax.");
    }
  };

  // Pre-load default template JSON to assist the user
  const insertTemplateExample = () => {
    const template = [
      {
        name: "Chapter 1: वर्णमाला (Alphabet)",
        concepts: [
          {
            name: "स्वर वर्णाः (Vowels)",
            learningOutcome: "छात्रः स्वरवर्णानां शुद्धोच्चारणं ज्ञास्यन्ति।"
          },
          {
            name: "व्यंजन वर्णाः (Consonants)",
            learningOutcome: "छात्रः व्यंजनवर्णानां भेदं अवगमिष्यन्ति।"
          },
          "अभ्यास कार्य (Exercises)"
        ]
      },
      {
        name: "Chapter 2: शब्दरूपाणि",
        concepts: [
          {
            name: "अकारान्त पुल्लिंग शब्दाः",
            learningOutcome: "छात्रः अकारान्तशब्दानां प्रयोगं ज्ञास्यन्ति।"
          },
          "आकारान्त स्त्रीलिंग शब्दाः",
          "अभ्यास कार्य"
        ]
      }
    ];
    setBulkText(JSON.stringify(template, null, 2));
  };

  if (subjectSyllabusList.length === 0) {
    return (
      <div className="space-y-8 no-print pb-20 max-w-4xl mx-auto animate-in fade-in duration-200">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-5">
          <div>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
              📚 Initialize {currentSubject} Syllabus
            </h2>
            <p className="text-sm text-gray-500 mt-0.5">
              Set up the chapters and topics for the subject <strong>{currentSubject}</strong>.
            </p>
          </div>
          <button
            onClick={onBack}
            className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors"
          >
            Return to Editor
          </button>
        </div>

        <div className="bg-white p-8 rounded-2xl border border-gray-100 shadow-sm space-y-6 text-center max-w-xl mx-auto">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
            <BookOpen className="w-6 h-6 animate-bounce" />
          </div>
          <div className="space-y-2">
            <h3 className="text-base font-bold text-gray-900">Setup {currentSubject} Syllabus</h3>
            <p className="text-xs text-gray-500 max-w-md mx-auto leading-relaxed">
              To log lessons for <strong>{currentSubject}</strong>, you need standard class syllabus structures (VI, VII, VIII, IX, X). Choose one of the initialization methods below to get started instantly:
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 pt-4 text-left">
            {/* Option 1: Copy from Sanskrit */}
            <button
              onClick={handleCopySanskritTemplate}
              className="p-4 border border-gray-200 hover:border-violet-300 hover:bg-violet-50/10 rounded-xl transition-all flex items-start gap-3.5 group cursor-pointer text-left"
            >
              <div className="p-2 bg-violet-50 text-violet-600 rounded-lg shrink-0 group-hover:scale-105 transition-transform">
                <Layers className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-800">Copy Sanskrit Syllabus as a Template</h4>
                <p className="text-[10.5px] text-gray-500 leading-normal">
                  Copy all Sanskrit chapters, topics, and structures as a starter draft, which you can then customize for {currentSubject}.
                </p>
              </div>
            </button>

            {/* Option 2: Initialize Blank */}
            <button
              onClick={handleInitEmptyClasses}
              className="p-4 border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/10 rounded-xl transition-all flex items-start gap-3.5 group cursor-pointer text-left"
            >
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg shrink-0 group-hover:scale-105 transition-transform">
                <Plus className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h4 className="text-xs font-bold text-slate-800">Initialize Empty Classes (Class VI - X)</h4>
                <p className="text-[10.5px] text-gray-500 leading-normal">
                  Create blank syllabus entries for Class VI, VII, VIII, IX, and X to build or bulk-import your own syllabus completely from scratch.
                </p>
              </div>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 no-print pb-20 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-gray-100 pb-5">
        <div>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            📚 {currentSubject} Syllabus & Topic Manager
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            Configure chapters & sub-topics per class so they appear in easy-to-use drop-down menus in your log diary!
          </p>
        </div>
        <button
          onClick={onBack}
          className="px-4 py-2 border border-gray-200 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors"
        >
          Return to Editor
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Left Column: Class Selector and Addition */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-xs space-y-4">
            <h3 className="text-xs font-bold text-gray-800 tracking-wider uppercase">Select Class</h3>

            <div className="space-y-1">
              {subjectSyllabusList.map((s) => (
                <button
                  key={s.classId}
                  onClick={() => {
                    setSelectedClassId(s.classId);
                    setActiveChapterForConcept(null);
                  }}
                  className={`w-full text-left px-3.5 py-2 rounded-lg text-xs font-bold transition-all flex items-center justify-between ${
                    selectedClassId === s.classId
                      ? "bg-indigo-50 text-indigo-700 font-bold"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Layers className="w-3.5 h-3.5" />
                    {s.classId}
                  </span>
                  <span className="text-[10px] bg-white text-gray-400 font-bold px-1.5 py-0.5 rounded border border-gray-100">
                    {s.chapters.length} Ch
                  </span>
                </button>
              ))}
            </div>

            {isAddingClass ? (
              <form onSubmit={handleAddClass} className="space-y-2 pt-2 border-t border-gray-100">
                <input
                  type="text"
                  value={newClassName}
                  onChange={(e) => setNewClassName(e.target.value)}
                  placeholder="e.g. Class IX"
                  className="w-full px-2.5 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                  autoFocus
                />
                <div className="flex justify-end gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsAddingClass(false)}
                    className="px-2 py-1 text-[10px] text-gray-500 bg-gray-50 hover:bg-gray-100 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-2 py-1 text-[10px] text-white bg-indigo-600 hover:bg-indigo-700 rounded font-bold"
                  >
                    Save
                  </button>
                </div>
              </form>
            ) : (
              <button
                onClick={() => setIsAddingClass(true)}
                className="w-full py-2 border border-dashed border-gray-200 hover:border-indigo-200 hover:bg-indigo-50/20 rounded-lg text-[11px] font-bold text-indigo-600 flex items-center justify-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add New Class
              </button>
            )}

            {selectedClassId && (
              <button
                onClick={handleDeleteClass}
                className="w-full py-1.5 text-[10px] text-red-500 hover:bg-red-50 rounded-lg font-bold transition-colors cursor-pointer"
              >
                Delete {selectedClassId} Syllabus
              </button>
            )}
          </div>

          {/* Guidelines info box */}
          <div className="bg-gradient-to-br from-indigo-50/40 to-violet-50/40 p-5 rounded-xl border border-indigo-100/50 space-y-2.5">
            <span className="text-[11px] font-bold text-indigo-800 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
              How does this work?
            </span>
            <p className="text-[11px] text-indigo-600 leading-relaxed font-medium">
              When entering logs in the daily diary, selecting a class like <strong>"{selectedClassId || "Class VIII"}"</strong> automatically populates the "Name of the Chapter" dropdown with the chapters entered here.
            </p>
            <p className="text-[11px] text-indigo-600 leading-relaxed font-medium">
              Selecting a chapter then populates the "Concept / Sub-topic" dropdown with the respective concepts!
            </p>
          </div>
        </div>

        {/* Middle and Right Column: Syllabus Structure Editor */}
        <div className="md:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-xs space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                📂 Chapters & Concepts for {selectedClassId}
              </h3>
              <button
                type="button"
                onClick={handleAiGenerateForClass}
                disabled={isGeneratingAI}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 disabled:opacity-50 transition-colors cursor-pointer"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isGeneratingAI ? 'animate-spin' : 'animate-pulse text-indigo-500'}`} />
                {isGeneratingAI ? "AI Generating..." : "AI Generate Standard Syllabus"}
              </button>
            </div>

            {aiGenerationError && (
              <div className="bg-red-50 text-red-700 border border-red-100 p-3 rounded-lg text-xs flex items-center gap-2 animate-in slide-in-from-top-1">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{aiGenerationError}</span>
              </div>
            )}

            {/* Chapter Builder form */}
            <form onSubmit={handleAddChapter} className="flex gap-2">
              <input
                type="text"
                value={newChapterName}
                onChange={(e) => setNewChapterName(e.target.value)}
                placeholder="Enter new Chapter name... (e.g. Chapter 6: सन्धिप्रकरणम्)"
                className="flex-1 px-3.5 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold"
                required
              />
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> Add Chapter
              </button>
            </form>

            {/* Display Chapters */}
            {!activeSyllabus || activeSyllabus.chapters.length === 0 ? (
              <div className="text-center py-10 text-gray-400 space-y-2">
                <p className="text-xs font-semibold">No Chapters added for this class yet.</p>
                <p className="text-[10px]">Type a chapter name above or use the Bulk JSON upload tab below to populate it.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {activeSyllabus.chapters.map((chapter) => {
                  const isEditing = editingChapterId === chapter.id;
                  const isActiveForConcepts = activeChapterForConcept === chapter.id;

                  return (
                    <div
                      key={chapter.id}
                      className="border border-slate-100 rounded-xl p-4 space-y-3 bg-slate-50/50"
                    >
                      <div className="flex items-center justify-between">
                        {isEditing ? (
                          <div className="flex items-center gap-2 flex-1 max-w-md">
                            <input
                              type="text"
                              value={editingChapterName}
                              onChange={(e) => setEditingChapterName(e.target.value)}
                              className="w-full px-2.5 py-1 border border-indigo-200 rounded text-xs font-semibold focus:outline-none bg-white"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveChapterEdit(chapter.id)}
                              className="px-2 py-1 bg-indigo-600 text-white text-[10px] font-bold rounded cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingChapterId(null)}
                              className="px-2 py-1 bg-gray-100 text-gray-500 text-[10px] font-bold rounded"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-gray-900 flex items-center gap-2">
                            <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                            {chapter.name}
                          </span>
                        )}

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setActiveChapterForConcept(
                                activeChapterForConcept === chapter.id ? null : chapter.id
                              );
                            }}
                            className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                              isActiveForConcepts
                                ? "bg-indigo-50 border-indigo-200 text-indigo-700"
                                : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                            }`}
                          >
                            {isActiveForConcepts ? "Hide Concepts" : `Edit Concepts (${chapter.concepts.length})`}
                          </button>
                          <button
                            onClick={() => {
                              setEditingChapterId(chapter.id);
                              setEditingChapterName(chapter.name);
                            }}
                            className="p-1 text-gray-400 hover:text-indigo-600 rounded transition-colors cursor-pointer"
                            title="Edit Chapter Name"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteChapter(chapter.id)}
                            className="p-1 text-gray-400 hover:text-red-500 rounded transition-colors cursor-pointer"
                            title="Delete Chapter"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Concepts section for this Chapter */}
                      {isActiveForConcepts && (
                        <div className="bg-white p-3 rounded-lg border border-slate-100 space-y-3 animate-in fade-in duration-100">
                          <h4 className="text-[10px] font-bold text-gray-500 tracking-wider uppercase">Concepts / Sub-topics List</h4>

                          {/* Add concept inline input */}
                          <div className="flex flex-col gap-2 p-2 bg-slate-50/55 rounded-lg border border-slate-100">
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={newConceptName}
                                onChange={(e) => setNewConceptName(e.target.value)}
                                placeholder="Topic/Concept Name (e.g. श्लोक 1-2 का अर्थ)"
                                className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 font-semibold bg-white"
                              />
                            </div>
                            <div className="flex gap-2">
                              <input
                                type="text"
                                value={newConceptLearningOutcome}
                                onChange={(e) => setNewConceptLearningOutcome(e.target.value)}
                                placeholder="Expected Learning Outcome - Optional (e.g. छात्रः श्लोकानां उच्चारणं भावार्थं च ज्ञास्यन्ति।)"
                                className="flex-1 px-2.5 py-1.5 text-xs border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium bg-white"
                              />
                              <button
                                type="button"
                                onClick={() => handleAddConcept(chapter.id)}
                                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-[10px] font-bold rounded-md flex items-center gap-1 transition-colors cursor-pointer shrink-0"
                              >
                                <Plus className="w-3.5 h-3.5" /> Add Topic
                              </button>
                            </div>
                          </div>

                          {/* Concepts items list */}
                          {chapter.concepts.length === 0 ? (
                            <p className="text-[10px] text-gray-400 italic">No sub-concepts added yet. Add one above to populate lists.</p>
                          ) : (
                            <div className="divide-y divide-slate-50 border border-slate-50 rounded-lg overflow-hidden">
                              {chapter.concepts.map((concept) => (
                                <div
                                  key={concept.id}
                                  className="px-3 py-2 flex items-center justify-between hover:bg-slate-50/50 transition-colors text-[11px] font-medium text-slate-700"
                                >
                                  <div className="flex flex-col pr-4">
                                    <span className="font-semibold text-slate-900">{concept.name}</span>
                                    {concept.learningOutcome && (
                                      <span className="text-[10px] text-indigo-600 font-medium mt-0.5 flex items-center gap-1">
                                        🎯 Expected Outcome: {concept.learningOutcome}
                                      </span>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => handleDeleteConcept(chapter.id, concept.id)}
                                    className="text-gray-400 hover:text-red-500 rounded transition-colors cursor-pointer shrink-0"
                                    title="Delete Concept"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bulk Import Section */}
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-gray-800 flex items-center gap-1.5">
              <Upload className="w-4 h-4 text-indigo-500" />
              Bulk Syllabus Upload (JSON Format)
            </h3>
            <p className="text-xs text-gray-500">
              Paste a custom JSON array of chapters with their sub-concepts to instantly configure this class!
            </p>

            <div className="space-y-3">
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                rows={5}
                className="w-full p-3 font-mono text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                placeholder='[
  {
    "name": "Chapter 1: क्रीडास्पर्धा",
    "concepts": [
      {
        "name": "प्रसन्ना-एतत् अतिरिक्तं ......... व्यवस्था भविष्यति।",
        "learningOutcome": "छात्रः क्रीडायाः महत्त्वं अवगमिष्यन्ति।"
      },
      "अभ्यास प्रश्नानां चर्चा ...... 1,2,3,4 नम्बर।"
    ]
  }
]'
              />

              <div className="flex justify-between items-center flex-wrap gap-2">
                <button
                  type="button"
                  onClick={insertTemplateExample}
                  className="text-[10px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <HelpCircle className="w-3.5 h-3.5" /> Insert Sample JSON Template
                </button>

                <button
                  type="button"
                  onClick={handleBulkImport}
                  disabled={!bulkText.trim()}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-100 disabled:text-gray-400 text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
                >
                  Parse & Add to Syllabus
                </button>
              </div>

              {bulkImportError && (
                <div className="bg-red-50 text-red-700 border border-red-100 p-3 rounded-lg text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{bulkImportError}</span>
                </div>
              )}

              {bulkImportSuccess && (
                <div className="bg-green-50 text-green-700 border border-green-100 p-3 rounded-lg text-xs flex items-center gap-2 animate-bounce">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>Bulk chapters and concepts successfully imported!</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
