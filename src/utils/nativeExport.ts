import { Capacitor } from "@capacitor/core";
import { Filesystem, Directory } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";

export interface SaveResult {
  savedNative: boolean;
  uri?: string;
  filename: string;
}

/**
 * Saves a base64 Data URI (PDF or PNG) to the device.
 * On native Android/iOS Capacitor APK, writes directly to Directory.Documents.
 * On standard Web browser, uses link trigger download fallback.
 */
export async function saveDataUriToDevice(
  dataUri: string,
  filename: string
): Promise<SaveResult> {
  if (Capacitor.isNativePlatform()) {
    try {
      // Extract pure base64 string from Data URI
      const base64Data = dataUri.includes(",") ? dataUri.split(",")[1] : dataUri;

      const savedFile = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Documents,
        recursive: true,
      });

      return {
        savedNative: true,
        uri: savedFile.uri,
        filename,
      };
    } catch (err) {
      console.error("Capacitor Native File Save Error:", err);
      // Fallback if permission error occurs on older devices
      try {
        const base64Data = dataUri.includes(",") ? dataUri.split(",")[1] : dataUri;
        const savedFile = await Filesystem.writeFile({
          path: filename,
          data: base64Data,
          directory: Directory.Cache,
          recursive: true,
        });

        return {
          savedNative: true,
          uri: savedFile.uri,
          filename,
        };
      } catch (cacheErr) {
        console.error("Cache save fallback failed:", cacheErr);
      }
    }
  }

  // Web Browser Fallback
  try {
    const link = document.createElement("a");
    link.href = dataUri;
    link.download = filename;
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (webErr) {
    console.error("Web link download failed:", webErr);
  }

  return {
    savedNative: false,
    filename,
  };
}

/**
 * Saves file to native storage cache and opens native Android/iOS Share sheet.
 * On Web, uses navigator.share or link trigger.
 */
export async function saveAndShare(
  dataUri: string,
  filename: string
): Promise<boolean> {
  if (Capacitor.isNativePlatform()) {
    try {
      const base64Data = dataUri.includes(",") ? dataUri.split(",")[1] : dataUri;

      const savedFile = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Cache,
        recursive: true,
      });

      await Share.share({
        title: "OAV Lesson Diary",
        text: filename,
        url: savedFile.uri,
        dialogTitle: "Share Lesson Diary",
      });

      return true;
    } catch (err: any) {
      if (err?.name === "AbortError") return true;
      console.error("Capacitor Native Share Error:", err);
    }
  }

  // Web Share Fallback
  if (typeof navigator !== "undefined" && navigator.canShare) {
    try {
      // Convert Data URI to blob file
      const res = await fetch(dataUri);
      const blob = await res.blob();
      const mime = filename.endsWith(".png") ? "image/png" : "application/pdf";
      const file = new File([blob], filename, { type: mime });

      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "OAV Daily Lesson Diary",
        });
        return true;
      }
    } catch (webShareErr: any) {
      if (webShareErr?.name === "AbortError") return true;
      console.warn("Web Share failed:", webShareErr);
    }
  }

  // Direct Save as last resort
  await saveDataUriToDevice(dataUri, filename);
  return false;
}
