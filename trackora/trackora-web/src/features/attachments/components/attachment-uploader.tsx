import { useCallback, useRef, useState } from 'react';
import { Upload } from 'lucide-react';
import { toast } from 'sonner';

import type { DragEvent, ChangeEvent } from 'react';
import { cn } from '@/shared/lib/cn';
import { Progress } from '@/shared/ui';

import { useUploadAttachment } from '../api/use-upload-attachment';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const ACCEPTED_FILE_TYPES = [
  'image/*',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/zip',
  'text/plain',
  'text/csv',
].join(',');

interface AttachmentUploaderProps {
  taskId: string;
}

export function AttachmentUploader({ taskId }: AttachmentUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadingFileName, setUploadingFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { mutate: upload, isPending } = useUploadAttachment();

  const handleFile = useCallback(
    (file: File) => {
      if (file.size > MAX_FILE_SIZE) {
        toast.error('File too large', {
          description: 'Maximum file size is 10 MB.',
        });
        return;
      }

      setUploadingFileName(file.name);
      setUploadProgress(0);

      upload(
        {
          taskId,
          file,
          onProgress: (pct) => setUploadProgress(pct),
        },
        {
          onSettled: () => {
            setUploadingFileName(null);
            setUploadProgress(0);
          },
        },
      );
    },
    [taskId, upload],
  );

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // Reset so the same file can be re-selected
      e.target.value = '';
    },
    [handleFile],
  );

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed p-8 text-center transition-colors',
          isDragging
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50',
          isPending && 'pointer-events-none opacity-60',
        )}
      >
        <Upload className="h-8 w-8 text-muted-foreground" />
        <p className="text-sm font-medium">
          Drag &amp; drop a file here, or click to browse
        </p>
        <p className="text-xs text-muted-foreground">Max file size: 10 MB</p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_FILE_TYPES}
        onChange={handleInputChange}
        className="hidden"
      />

      {isPending && uploadingFileName && (
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="truncate">{uploadingFileName}</span>
            <span className="text-muted-foreground">{uploadProgress}%</span>
          </div>
          <Progress value={uploadProgress} />
        </div>
      )}
    </div>
  );
}
