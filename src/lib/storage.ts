import { supabase } from "@/integrations/supabase/client";

// FIXED: Added 'videos' to the BucketName type
export type BucketName = 'avatars' | 'covers' | 'posts' | 'stories' | 'marketplace' | 'events' | 'circles' | 'lost-found' | 'chat' | 'videos';

/**
 * Helper: Compress image using Browser Canvas API
 */
async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith('image/')) return file;
  if (file.size < 1024 * 1024 || file.type === 'image/gif') return file;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(file);

      const MAX_SIZE = 1920;
      let width = img.width, height = img.height;
      if (width > height) { if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; } } 
      else { if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; } }

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob((blob) => {
        if (!blob) return resolve(file);
        resolve(new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", { type: 'image/jpeg', lastModified: Date.now() }));
      }, 'image/jpeg', 0.8);
    };
    img.src = url;
  });
}

/**
 * Upload a single file to a specific bucket
 */
export async function uploadFile(
  bucket: BucketName,
  file: File,
  userId: string
): Promise<{ url: string | null; error: Error | null }> {
  try {
    const processedFile = await compressImage(file);
    const fileExt = processedFile.name.split('.').pop();
    const fileName = `${userId}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(fileName, processedFile, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) return { url: null, error: uploadError as any };

    const { data } = supabase.storage.from(bucket).getPublicUrl(fileName);
    return { url: data.publicUrl, error: null };
  } catch (error) {
    return { url: null, error: error as Error };
  }
}

/**
 * NEW: Upload multiple files at once (Used by Circles)
 */
export async function uploadMultipleFiles(
  bucket: BucketName,
  files: File[],
  userId: string
): Promise<{ urls: string[]; errors: Error[] }> {
  const results = await Promise.all(
    files.map(file => uploadFile(bucket, file, userId))
  );

  return {
    urls: results.filter(r => r.url).map(r => r.url!),
    errors: results.filter(r => r.error).map(r => r.error!)
  };
}

/**
 * Delete a file from storage
 */
export async function deleteFile(
  bucket: BucketName,
  filePath: string
): Promise<{ error: Error | null }> {
  const { error } = await supabase.storage.from(bucket).remove([filePath]);
  return { error: error as any };
}

/**
 * Get public URL helper
 */
export function getPublicUrl(bucket: BucketName, path: string): string {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}