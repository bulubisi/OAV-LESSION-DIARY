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

      // Render element to canvas with crisp resolution
      const canvas = await html2canvas(el, {
        scale: 1.8,
        useCORS: true,
        logging: false,
        backgroundColor: "#ffffff",
        allowTaint: true,
        windowWidth: 1280,
        onclone: (clonedDoc) => {
          // Canvas helper to convert any CSS color string (including oklch) to browser-resolved hex/rgb
          const c = document.createElement("canvas");
          const ctx = c.getContext("2d");

          const parseColorToRgb = (colorStr: string): string => {
            if (!ctx) return "rgb(200, 200, 200)";
            try {
              ctx.fillStyle = "#000000";
              ctx.fillStyle = colorStr;
              const res = ctx.fillStyle;
              if (res && res !== "#000000" && res !== "#000" && !res.includes("oklch")) {
                return res;
              }
              return "rgb(200, 200, 200)";
            } catch {
              return "rgb(200, 200, 200)";
            }
          };

          const replaceOklch = (text: string): string => {
            if (!text || !text.includes("oklch")) return text;
            return text.replace(/oklch\([^)]+\)/gi, (match) => parseColorToRgb(match));
          };

          // 1. Sanitize oklch colors from all <style> tags in cloned document
          clonedDoc.querySelectorAll("style").forEach((styleEl) => {
            if (styleEl.textContent && styleEl.textContent.includes("oklch")) {
              styleEl.textContent = replaceOklch(styleEl.textContent);
            }
          });

          // 2. Sanitize stylesheets rules
          try {
            Array.from(clonedDoc.styleSheets).forEach((sheet) => {
              try {
                const rules = sheet.cssRules || sheet.rules;
                if (!rules) return;
                Array.from(rules).forEach((rule: any) => {
                  if (rule.style && rule.style.cssText && rule.style.cssText.includes("oklch")) {
                    rule.style.cssText = replaceOklch(rule.style.cssText);
                  }
                });
              } catch {
                // ignore cross-domain stylesheet read errors
              }
            });
          } catch {
            // ignore
          }

          // 3. Sanitize inline style attributes on all DOM elements
          clonedDoc.querySelectorAll("*").forEach((node) => {
            const htmlEl = node as HTMLElement;
            const styleAttr = htmlEl.getAttribute("style");
            if (styleAttr && styleAttr.includes("oklch")) {
              htmlEl.setAttribute("style", replaceOklch(styleAttr));
            }
          });

          // 4. Convert computed oklch colors on printable elements to explicit inline styles
          const printableNodes = clonedDoc.querySelectorAll<HTMLElement>("#pdf-temp-stage *");
          printableNodes.forEach((node) => {
            try {
              const computed = window.getComputedStyle(node);
              const colorProps = ["backgroundColor", "color", "borderColor", "outlineColor", "fill", "stroke"];
              colorProps.forEach((prop) => {
                const val = (computed as any)[prop];
                if (val && typeof val === "string" && val.includes("oklch")) {
                  (node.style as any)[prop] = parseColorToRgb(val);
                }
              });
            } catch {
              // ignore computed style read errors if any
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
