import React from "react";
import { LessonDiary } from "../types";
import oavLogo from "../assets/logo.png";

const formatClassSection = (cs: string) => {
  if (!cs) return "";
  let val = cs.replace(/Class\s+/i, ""); // "Class VIII A" -> "VIII A"
  val = val.replace(/Both\s+Section/i, "").replace(/Both/i, "").trim(); // "VIII Both" -> "VIII"
  return val;
};

const formatDateVertically = (dateStr: string) => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  let day = "";
  let month = "";
  let year = "";
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      // YYYY-MM-DD
      year = parts[0];
      month = parts[1];
      day = parts[2];
    } else {
      // DD-MM-YYYY or similar
      day = parts[0];
      month = parts[1];
      year = parts[2];
    }
  } else {
    const d = new Date(dateStr);
    day = d.toLocaleDateString("en-IN", { day: "2-digit" });
    month = d.toLocaleDateString("en-IN", { month: "2-digit" });
    year = d.toLocaleDateString("en-IN", { year: "numeric" });
  }

  // Ensure 4 digit year
  if (year.length === 2) {
    year = "20" + year;
  }

  const displayDate = `${day}-${month}-${year}`;

  return (
    <div className="flex items-center justify-center select-none py-1 min-h-[60px] h-full w-full">
      <span 
        className="inline-block text-[11px] sm:text-xs print:text-[11px] font-bold text-black font-mono whitespace-nowrap"
        style={{
          writingMode: "vertical-rl",
          textOrientation: "mixed",
        }}
        data-date-str={displayDate}
      >
        {displayDate}
      </span>
    </div>
  );
};

interface DiaryPrintProps {
  diary: LessonDiary;
  rowsPerPage?: string; // "auto" | "1" | "2" | "3" | "4" | "5"
}

export default function DiaryPrint({ diary, rowsPerPage = "auto" }: DiaryPrintProps) {
  if (!diary || !diary.rows) {
    return (
      <div className="text-center py-12 text-gray-500 bg-white rounded-xl border border-dashed border-gray-200">
        No diary selected for print preview.
      </div>
    );
  }

  // Helper to parse period string (e.g. "1st", "2nd") into a sortable number
  const parsePeriodToNumber = (p: string): number => {
    if (!p) return 999;
    const match = p.match(/\d+/);
    if (match) {
      return parseInt(match[0], 10);
    }
    return 999;
  };

  // Sort rows by date (ascending) then period (ascending)
  const sortedRows = [...diary.rows].sort((a, b) => {
    const dateA = a.date || "";
    const dateB = b.date || "";
    if (dateA !== dateB) {
      return dateA.localeCompare(dateB);
    }
    return parsePeriodToNumber(a.periods) - parsePeriodToNumber(b.periods);
  });

  // Re-map sequential Sl No to keep it neat and consecutve in print sheets
  const processedRows = sortedRows.map((row, index) => ({
    ...row,
    slNo: index + 1,
  }));

  // Determine actual pageSize based on user setting and diary rows
  let pageSize = 3;
  const rawRows = processedRows;
  
  if (rowsPerPage === "auto") {
    const totalRows = rawRows.length;
    if (totalRows <= 1) {
      pageSize = 1;
    } else if (totalRows === 2) {
      pageSize = 2;
    } else if (totalRows === 3) {
      pageSize = 3;
    } else if (totalRows === 4) {
      pageSize = 4;
    } else if (totalRows === 5) {
      pageSize = 5;
    } else {
      // For more than 5 rows, divide them into pages of 4 to keep it elegant and readable
      pageSize = 4;
    }
  } else {
    pageSize = parseInt(rowsPerPage, 10);
  }

  const chunkedPages: typeof diary.rows[] = [];

  for (let i = 0; i < rawRows.length; i += pageSize) {
    const chunk = rawRows.slice(i, i + pageSize);
    chunkedPages.push(chunk);
  }

  // If there are no rows at all, ensure we have at least one empty page with 1 blank row
  if (chunkedPages.length === 0) {
    chunkedPages.push([{
      id: "empty-0-0",
      slNo: 1,
      date: "",
      classSection: "",
      periods: "",
      chapterName: "",
      concept: "",
      periodsAllotted: "",
      periodsCovered: "",
      expectedOutcome: "",
      tlmRequired: "",
      needsRepetition: "",
      remarks: "",
    }]);
  }

  const finalPages = chunkedPages;

  return (
    <div className="flex flex-col gap-8 print:gap-0 w-full max-w-[297mm] mx-auto print:bg-white">
      {finalPages.map((pageRows, pageIndex) => {
        const isLastPage = pageIndex === finalPages.length - 1;
        const pageNum = pageIndex + 1;
        const totalPages = finalPages.length;

        return (
          <div
            key={pageIndex}
            className={`print-container bg-white text-black p-4 sm:p-5 font-sans w-full border border-gray-200 shadow-sm print:border-none print:shadow-none print:p-0 print:h-[192mm] print:min-h-[192mm] print:flex print:flex-col print:justify-between ${
              isLastPage ? "" : "print:break-after-page"
            }`}
            style={isLastPage ? undefined : { pageBreakAfter: "always" }}
          >
            {/* Header and Meta Info Group */}
            <div className="print:flex print:flex-col print:gap-1.5">
              {/* School Name & Title Header with OAV Logo */}
              <div className="relative flex items-center justify-between mb-2 print:mb-1.5 min-h-[50px]">
                {/* Logo on top left - enlarged and shifted right */}
                <div className="flex items-center shrink-0 w-[68px] h-[68px] print:w-[62px] print:h-[62px] ml-8 sm:ml-12 print:ml-10">
                  <img
                    src={oavLogo}
                    alt="OAV Logo"
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* School Name & Title */}
                <div className="text-center flex-1 px-2">
                  <h1 className="text-lg sm:text-xl md:text-2xl font-bold font-display uppercase tracking-wide print:text-xl text-black leading-tight">
                    {diary.schoolName || "Odisha Adarsha Vidyalaya, Bibina, Saintala"}
                  </h1>
                  <h2 className="text-sm sm:text-base md:text-lg font-bold font-sans border-b border-black inline-block pb-0.5 mt-0.5 print:text-sm text-black">
                    Daily Lesson Diary
                  </h2>
                </div>

                {/* Page Indicator on top right */}
                <div className="shrink-0 w-[52px] text-right self-start pt-0.5">
                  <span className="text-[10px] font-mono text-gray-500 print:text-black font-semibold whitespace-nowrap">
                    Page {pageNum} of {totalPages}
                  </span>
                </div>
              </div>

              {/* Meta info header */}
              <div className="flex flex-wrap justify-between items-end mb-3 print:mb-2 text-xs sm:text-sm font-medium px-1 print:text-xs gap-3">
                {/* Subject */}
                <div className="inline-flex items-baseline gap-1.5">
                  <span className="font-bold text-black whitespace-nowrap">Subject:</span>
                  <span className="font-bold text-black border-b border-dashed border-black px-2 pb-1.5 min-w-[140px] inline-block text-left leading-normal">
                    {diary.subject || "Sanskrit"}
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-[11px] sm:text-xs print:text-xs">
                  {/* Teacher */}
                  <div className="inline-flex items-baseline gap-1.5">
                    <span className="text-black font-semibold whitespace-nowrap">Teacher:</span>
                    <span className="font-bold text-black border-b border-dashed border-black px-2 pb-1.5 min-w-[160px] inline-block text-left leading-normal">
                      {diary.teacherName || "____________________"}
                    </span>
                  </div>

                  {/* Session */}
                  {diary.academicYear && (
                    <div className="inline-flex items-baseline gap-1.5">
                      <span className="text-black font-semibold whitespace-nowrap">Session:</span>
                      <span className="font-bold text-black border-b border-dashed border-black px-2 pb-1.5 min-w-[90px] inline-block text-left leading-normal">
                        {diary.academicYear}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Main Ledger Table */}
            <div className="overflow-x-auto print:overflow-visible print:flex-1 print:flex print:flex-col print:my-2">
              <table className="w-full border-collapse border-[1.5px] border-black text-xs sm:text-sm print:text-[11.5px] print:leading-normal leading-normal text-center font-medium print:h-full print:flex-1">
                <thead>
                  <tr className="bg-white text-black">
                    {/* Sl No */}
                    <th className="border-r border-b-[1.5px] border-black p-1 sm:p-2 font-extrabold text-black w-[3%] align-middle text-center">
                      Sl no
                    </th>
                    
                    {/* Date */}
                    <th className="border-r border-b-[1.5px] border-black p-1 sm:p-2 font-extrabold text-black w-[4%] align-middle text-center">
                      Date
                    </th>
                    
                    {/* Class and Section */}
                    <th className="border-r border-b-[1.5px] border-black p-1 sm:p-2 font-extrabold text-black w-[5%] align-middle text-center">
                      Class & Sec
                    </th>
                    
                    {/* Periods */}
                    <th className="border-r border-b-[1.5px] border-black p-1 sm:p-2 font-extrabold text-black w-[4%] align-middle text-center">
                      Periods
                    </th>
                    
                    {/* Name of chapter */}
                    <th className="border-r border-b-[1.5px] border-black p-1 sm:p-2 font-extrabold text-black w-[17%] align-middle text-left">
                      Name of the chapter
                    </th>
                    
                    {/* Concept */}
                    <th className="border-r border-b-[1.5px] border-black p-1 sm:p-2 font-extrabold text-black w-[23%] align-middle text-left">
                      Concept
                    </th>
                    
                    {/* No of period allotted */}
                    <th className="border-r border-b-[1.5px] border-black w-[4%] align-middle text-center p-1">
                      <div className="font-extrabold text-black text-[9.5px] sm:text-[10.5px] leading-tight text-center">
                        No. of periods allotted
                      </div>
                    </th>
                    
                    {/* No of period covered */}
                    <th className="border-r border-b-[1.5px] border-black w-[4%] align-middle text-center p-1">
                      <div className="font-extrabold text-black text-[9.5px] sm:text-[10.5px] leading-tight text-center">
                        No. of periods covered
                      </div>
                    </th>
                    
                    {/* Expected outcome */}
                    <th className="border-r border-b-[1.5px] border-black p-1 sm:p-2 font-extrabold text-black w-[25%] align-middle text-left">
                      Expected learning outcome
                    </th>
                    
                    {/* TLM required */}
                    <th className="border-r border-b-[1.5px] border-black p-1 sm:p-2 font-extrabold text-black w-[8%] align-middle text-left">
                      TLM required & used
                    </th>
                    
                    {/* Whether needs repetition */}
                    <th className="border-r border-b-[1.5px] border-black w-[4%] align-middle text-center p-1">
                      <div className="font-extrabold text-black text-[9px] sm:text-[10px] leading-tight text-center">
                        Repetition needed?
                      </div>
                    </th>
                    
                    {/* Remarks */}
                    <th className="border-b-[1.5px] border-black p-1 sm:p-2 font-extrabold text-black w-[3%] align-middle text-left">
                      Remarks
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row, index) => {
                    return (
                      <tr
                        key={row.id}
                        className="min-h-[62px] h-auto print:h-auto hover:bg-gray-50/50 print:hover:bg-transparent"
                      >
                        {/* Sl No */}
                        <td className="border-r border-b border-black font-bold p-1 print:p-0.5 text-xs print:text-[11px] text-black">
                          {row.slNo}
                        </td>
                        
                        {/* Date */}
                        <td className="border-r border-b border-black p-1 print:p-0.5 text-center text-black">
                          {formatDateVertically(row.date)}
                        </td>
                        
                        {/* Class and Section */}
                        <td className="border-r border-b border-black p-1 sm:p-1.5 font-bold text-center align-middle text-xs print:text-[11.5px] leading-tight text-black whitespace-normal break-words">
                          {formatClassSection(row.classSection)}
                        </td>
                        
                        {/* Periods */}
                        <td className="border-r border-b border-black p-1 print:p-0.5 font-bold font-mono text-center text-xs print:text-[11px] text-black">
                          {row.periods}
                        </td>
                        
                        {/* Name of Chapter */}
                        <td className="border-r border-b border-black p-1.5 print:p-1 text-left font-bold text-black text-xs sm:text-sm print:text-[12px] leading-snug break-words align-top">
                          {row.chapterName}
                        </td>
                        
                        {/* Concept */}
                        <td className="border-r border-b border-black p-1.5 print:p-1 text-left font-semibold text-black text-xs sm:text-sm print:text-[11.5px] leading-snug break-words align-top">
                          {row.concept}
                        </td>
                        
                        {/* No of Period Allotted */}
                        <td className="border-r border-b border-black p-1 print:p-0.5 font-bold font-mono text-center text-xs print:text-[11.5px] text-black">
                          {row.periodsAllotted}
                        </td>
                        
                        {/* No of Period Covered */}
                        <td className="border-r border-b border-black p-1 print:p-0.5 font-bold font-mono text-center text-xs print:text-[11.5px] text-black">
                          {row.periodsCovered}
                        </td>
                        
                        {/* Expected Learning Outcome */}
                        <td className="border-r border-b border-black p-1.5 print:p-1 text-left font-semibold text-black text-xs sm:text-sm print:text-[11.5px] leading-snug break-words align-top">
                          {row.expectedOutcome}
                        </td>
                        
                        {/* TLM required and used */}
                        <td className="border-r border-b border-black p-1.5 print:p-1 text-left font-medium text-black text-xs sm:text-sm print:text-[11px] leading-tight break-words align-top">
                          {row.tlmRequired}
                        </td>
                        
                        {/* Needs repetition */}
                        <td className="border-r border-b border-black p-1 print:p-0.5 font-bold text-center text-xs print:text-[11.5px] text-black">
                          {row.needsRepetition === "Yes" ? (
                            <span className="font-bold text-black">
                              Yes
                            </span>
                          ) : row.needsRepetition === "No" ? (
                            <span className="text-black font-medium">—</span>
                          ) : (
                            ""
                          )}
                        </td>
                        
                        {/* Remarks */}
                        <td className="border-b border-black p-1.5 print:p-1 text-left font-medium text-black text-[10px] sm:text-xs print:text-[10px] leading-tight break-words align-top">
                          {row.remarks}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Signature Section */}
            <div className="flex justify-between items-center mt-6 print:mt-2 px-6 print:pt-14 pt-2 text-xs font-semibold print:text-[10px]">
              <div className="text-center flex flex-col items-center">
                <div className="w-44 print:w-36 border-b border-black mb-1"></div>
                <p className="tracking-wide text-gray-800">Teacher Signature</p>
                {diary.teacherName && (
                  <p className="text-[10px] print:text-[9px] text-gray-500 font-normal mt-0.5">({diary.teacherName})</p>
                )}
              </div>
              <div className="text-center">
                <div className="w-44 print:w-36 border-b border-black mb-1"></div>
                <p className="tracking-wide text-gray-800">Principal Signature</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
