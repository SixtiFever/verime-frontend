export function getOrgInitials(name: string): string {
  const trimmed = name.trim();
  if (!trimmed) return "?";
  return trimmed.charAt(0).toUpperCase();
}

export function validateLogoFile(file: File): Promise<void> {
  const allowed = ["image/png", "image/jpeg", "image/webp"];
  if (!allowed.includes(file.type)) {
    return Promise.reject(new Error("Logo must be a PNG, JPEG, or WebP image"));
  }
  if (file.size > 2 * 1024 * 1024) {
    return Promise.reject(new Error("Logo file must be 2 MB or smaller"));
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const { width, height } = img;
      if (width !== height) {
        reject(new Error("Logo must be square (width equals height)"));
      } else if (width < 512 || height < 512) {
        reject(new Error("Logo must be at least 512×512 pixels"));
      } else if (width > 2048 || height > 2048) {
        reject(new Error("Logo must be at most 2048×2048 pixels"));
      } else {
        resolve();
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image file"));
    };
    img.src = url;
  });
}
