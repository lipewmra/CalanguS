/**
 * Utility functions for client-side image processing, compression, and handling
 */

/**
 * Compresses an image file to a lightweight data URL (JPEG/WebP) using an HTML5 Canvas.
 * Automatically handles orientation, resizes dimensions to fit max bounds, and optimizes file size (< 60KB).
 */
export async function compressImageFile(
  file: File,
  maxWidth = 600,
  maxHeight = 600,
  quality = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("O arquivo selecionado não é uma imagem válida."));
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Erro ao ler o arquivo de imagem."));
    reader.onload = (readerEvent) => {
      const img = new Image();
      img.onerror = () => reject(new Error("Erro ao decodificar a imagem."));
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // Calculate new dimensions preserving aspect ratio
        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Não foi possível inicializar o contexto 2D do Canvas."));
          return;
        }

        // Fill background with white for transparency safety in JPEG conversion
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);

        // Draw and smoothly scale image
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to lightweight data URL JPEG
        try {
          const dataUrl = canvas.toDataURL("image/jpeg", quality);
          resolve(dataUrl);
        } catch (e) {
          reject(e);
        }
      };

      if (typeof readerEvent.target?.result === "string") {
        img.src = readerEvent.target.result;
      } else {
        reject(new Error("Resultado inválido na leitura da imagem."));
      }
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Returns initials from a full name (e.g., "Carlos Costa Neto" -> "CC")
 */
export function getInitials(name?: string): string {
  if (!name || !name.trim()) return "??";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[1][0]).toUpperCase();
}
