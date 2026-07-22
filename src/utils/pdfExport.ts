import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export interface PdfExportOptions {
  filename?: string;
  onProgress?: (msg: string | null) => void;
}

export interface PdfExportResult {
  pdfBlob: Blob;
  pdfDataUrl: string;
  pageImages: string[];
  filename: string;
  shared: boolean;
}

/**
 * Generates an A4 Landscape PDF from printable diary containers.
 * Renders offscreen (no UI flash) and returns PDF Blob & Data URL for download/preview/sharing.
 */
export async function exportDiaryToPdf(
  containerId: string,
  options: PdfExportOptions = {}
): Promise<PdfExportResult> {
  const {
    filename = "OAV_Daily_Lesson_Diary.pdf",
    onProgress,
  } = options;

  // Find original printable container
  const container = document.getElementById(containerId);
  if (!container) {
    throw new Error(`Target container #${containerId} not found.`);
  }

  if (onProgress) onProgress("Preparing diary layout for PDF export...");

  // Create temporary OFFSCREEN staging container attached to document.body
  // Offscreen positioning (-9999px) prevents any screen flash in APK WebView
  const tempStage = document.createElement("div");
  tempStage.id = "pdf-temp-stage";
  tempStage.style.position = "absolute";
  tempStage.style.top = "0";
  tempStage.style.left = "-9999px";
  tempStage.style.width = "1120px";
  tempStage.style.background = "#ffffff";
  tempStage.style.zIndex = "-9999";
  tempStage.style.opacity = "1";
  tempStage.style.pointerEvents = "none";

  // Clone container contents into tempStage
  const clone = container.cloneNode(true) as HTMLElement;
  clone.style.display = "block";
  clone.style.visibility = "visible";
  clone.style.position = "relative";
  clone.style.left = "0";
  clone.style.top = "0";
  clone.style.width = "1120px";
  clone.style.margin = "0 auto";

  // Unhide any hidden sub-elements inside the cloned container
  const allChildren = clone.querySelectorAll<HTMLElement>("*");
  allChildren.forEach((child) => {
    if (child.style.display === "none") {
      child.style.display = "block";
    }
  });

  tempStage.appendChild(clone);
  document.body.appendChild(tempStage);

  try {
    // Find all page elements with class .print-container inside the cloned tree
    let pageElements = Array.from(
      tempStage.querySelectorAll<HTMLElement>(".print-container")
    );

    if (pageElements.length === 0) {
      pageElements = [clone];
    }

    if (onProgress) onProgress(`Rendering ${pageElements.length} page(s) into PDF...`);

    // Create jsPDF instance in A4 Landscape (297mm x 210mm)
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const pdfWidth = pdf.internal.pageSize.getWidth(); // 297 mm
    const pdfHeight = pdf.internal.pageSize.getHeight(); // 210 mm

    const pageImages: string[] = [];

    for (let i = 0; i < pageElements.length; i++) {
      const el = pageElements[i];

      if (onProgress) {
        onProgress(`Processing page ${i + 1} of ${pageElements.length}...`);
      }

      // Ensure page element is explicitly displayed
      el.style.display = "block";
      el.style.visibility = "visible";
      el.style.width = "1120px";
      el.style.margin = "0 auto";

      // Render element to canvas with crisp HD resolution
      const canvas = await html2canvas(el, {
        scale: 2.2,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        allowTaint: true,
        windowWidth: 1280,
        onclone: (clonedDoc) => {
          // Helper to convert any CSS color string (like oklch) to standard browser-resolved rgb(r,g,b)
          const dummyEl = clonedDoc.createElement("div");
          clonedDoc.body.appendChild(dummyEl);

          const oklchToRgb = (oklchStr: string): string => {
            try {
              dummyEl.style.color = "";
              dummyEl.style.color = oklchStr;
              const computed = window.getComputedStyle(dummyEl).color;
              if (computed && (computed.startsWith("rgb") || computed.startsWith("#"))) {
                return computed;
              }
            } catch {
              // fallback
            }
            // If it's a high lightness color (like bg-gray-50), return white, else black
            const lightMatch = oklchStr.match(/oklch\s*\(\s*([0-9\.]+)/i);
            if (lightMatch && parseFloat(lightMatch[1]) > 0.5) {
              return "#ffffff";
            }
            return "transparent";
          };

          const replaceOklch = (text: string): string => {
            if (!text || !text.includes("oklch")) return text;
            return text.replace(/oklch\s*\([^\)]*\)/gi, (match) => oklchToRgb(match));
          };

          // 1. Convert all <link rel="stylesheet"> into inline <style> tags and sanitize oklch
          const links = Array.from(clonedDoc.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]'));
          links.forEach((link) => {
            try {
              const sheet = link.sheet;
              if (sheet) {
                let cssText = "";
                try {
                  const rules = sheet.cssRules || sheet.rules;
                  if (rules) {
                    for (let r = 0; r < rules.length; r++) {
                      cssText += rules[r].cssText + "\n";
                    }
                  }
                } catch {
                  // cross-origin protection
                }
                if (cssText) {
                  const styleTag = clonedDoc.createElement("style");
                  styleTag.textContent = replaceOklch(cssText);
                  clonedDoc.head.appendChild(styleTag);
                }
              }
            } catch {
              // ignore
            }
            link.remove();
          });

          // 2. Sanitize all <style> tags in cloned document
          clonedDoc.querySelectorAll("style").forEach((styleEl) => {
            if (styleEl.textContent && styleEl.textContent.includes("oklch")) {
              styleEl.textContent = replaceOklch(styleEl.textContent);
            }
          });

          // 3. Sanitize inline style attributes on all DOM elements
          clonedDoc.querySelectorAll("*").forEach((node) => {
            const htmlEl = node as HTMLElement;
            const styleAttr = htmlEl.getAttribute("style");
            if (styleAttr && styleAttr.includes("oklch")) {
              htmlEl.setAttribute("style", replaceOklch(styleAttr));
            }
          });

          // Clean up dummy element
          dummyEl.remove();

          // 4. Force solid black text, white background, and crisp black borders on printable nodes
          const printableNodes = clonedDoc.querySelectorAll<HTMLElement>("#pdf-temp-stage *");
          printableNodes.forEach((node) => {
            try {
              const tagName = node.tagName.toLowerCase();
              // Text color black everywhere
              node.style.color = "#000000";

              if (tagName === "td" || tagName === "th") {
                node.style.borderColor = "#000000";
                node.style.borderStyle = "solid";
                node.style.backgroundColor = "#ffffff";
              } else if (tagName === "table") {
                node.style.borderColor = "#000000";
                node.style.borderStyle = "solid";
                node.style.borderCollapse = "collapse";
                node.style.backgroundColor = "#ffffff";
              } else if (node.classList.contains("border-b") || node.className.includes("border-b")) {
                node.style.borderBottomColor = "#000000";
              }
            } catch {
              // ignore
            }
          });

          // 5. Convert vertical date elements with data-date-str into crisp canvas images for html2canvas
          const dateElements = clonedDoc.querySelectorAll<HTMLElement>("[data-date-str]");
          dateElements.forEach((el) => {
            try {
              const dateStr = el.getAttribute("data-date-str");
              if (!dateStr) return;

              const canvas = clonedDoc.createElement("canvas");
              const scale = 3;
              canvas.width = 50 * scale;
              canvas.height = 120 * scale;
              const ctx = canvas.getContext("2d");

              if (ctx) {
                ctx.scale(scale, scale);
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, 50, 120);
                ctx.font = "900 16px monospace, 'Courier New', sans-serif";
                ctx.fillStyle = "#000000";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";

                ctx.translate(25, 60);
                ctx.rotate(Math.PI / 2); // 90deg clockwise rotation
                ctx.fillText(dateStr, 0, 0);

                const img = clonedDoc.createElement("img");
                img.src = canvas.toDataURL("image/png");
                img.style.width = "28px";
                img.style.height = "76px";
                img.style.display = "block";
                img.style.margin = "0 auto";
                img.style.objectFit = "contain";

                const parent = el.parentElement || el;
                el.remove();
                parent.appendChild(img);
              }
            } catch {
              // fallback
            }
          });
        },
      });

      const imgData = canvas.toDataURL("image/png");
      pageImages.push(imgData);

      if (i > 0) {
        pdf.addPage("a4", "landscape");
      }

      // Fill full A4 landscape page
      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight, undefined, "FAST");
    }

    if (onProgress) onProgress("Finalizing PDF document...");

    // Generate PDF Blob and Data URL
    const pdfBlob = pdf.output("blob");
    const pdfDataUrl = pdf.output("datauristring");
    const pdfFile = new File([pdfBlob], filename, { type: "application/pdf" });

    // Attempt Native Web Share API if possible
    let sharedSuccessfully = false;
    if (typeof navigator !== "undefined" && navigator.canShare) {
      try {
        if (navigator.canShare({ files: [pdfFile] })) {
          if (onProgress) onProgress("Opening share options...");
          await navigator.share({
            files: [pdfFile],
            title: "OAV Lesson Diary",
            text: "Daily Lesson Diary PDF",
          });
          sharedSuccessfully = true;
        }
      } catch (shareErr: any) {
        console.warn("Web Share API skipped or cancelled:", shareErr);
      }
    }

    if (onProgress) onProgress(null);

    return {
      pdfBlob,
      pdfDataUrl,
      pageImages,
      filename,
      shared: sharedSuccessfully,
    };
  } catch (err: any) {
    console.error("PDF Export Error:", err);
    if (onProgress) onProgress(null);
    throw err;
  } finally {
    // Always clean up temporary staging element from document.body
    if (document.body.contains(tempStage)) {
      document.body.removeChild(tempStage);
    }
  }
}
