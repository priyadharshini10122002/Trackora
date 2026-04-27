import { Download, File, FileText, ImageIcon, Paperclip } from 'lucide-react';

import type { Attachment } from '@/shared/types/api';
import { cn } from '@/shared/lib/cn';
import { formatRelative } from '@/shared/lib/date';
import { Card, CardContent, Skeleton } from '@/shared/ui';
import { EmptyState } from '@/shared/components/empty-state';

import { useAttachments } from '../api/use-attachments';

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'];

function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toLowerCase() ?? '';
}

function isImageFile(fileName: string): boolean {
  return IMAGE_EXTENSIONS.includes(getFileExtension(fileName));
}

function getFileIcon(fileName: string) {
  const ext = getFileExtension(fileName);

  if (IMAGE_EXTENSIONS.includes(ext)) return ImageIcon;
  if (ext === 'pdf') return FileText;
  if (ext === 'doc' || ext === 'docx') return FileText;
  return File;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileTypeLabel(fileName: string): string {
  const ext = getFileExtension(fileName).toUpperCase();
  return ext || 'FILE';
}

interface AttachmentListProps {
  taskId: string;
}

function AttachmentCard({ attachment }: { attachment: Attachment }) {
  const Icon = getFileIcon(attachment.file_name);

  return (
    <Card className="card-hover border-border/50 overflow-hidden transition-all duration-200">
      <CardContent className="p-4">
        {isImageFile(attachment.file_name) ? (
          <div className="mb-3 flex h-32 items-center justify-center overflow-hidden rounded-lg bg-muted/50">
            <img
              src={attachment.file}
              alt={attachment.file_name}
              className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
            />
          </div>
        ) : (
          <div className="mb-3 flex h-32 items-center justify-center rounded-lg bg-gradient-to-br from-muted/50 to-muted/30">
            <div className="flex flex-col items-center gap-2">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
                <Icon className="h-6 w-6 text-primary" />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {getFileTypeLabel(attachment.file_name)}
              </span>
            </div>
          </div>
        )}

        <div className="space-y-1">
          <p
            className="truncate text-sm font-medium"
            title={attachment.file_name}
          >
            {attachment.file_name}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatFileSize(attachment.file_size)}
          </p>
          <p className="text-xs text-muted-foreground">
            {formatRelative(attachment.created_at)}
          </p>
        </div>

        <a
          href={attachment.file}
          download
          className={cn(
            'mt-3 inline-flex w-full items-center justify-center gap-2 rounded-lg',
            'border border-border/50 bg-background px-3 py-1.5 text-sm font-medium',
            'transition-all duration-200 hover:bg-primary/5 hover:border-primary/30 hover:text-primary hover:shadow-sm',
          )}
        >
          <Download className="h-4 w-4" />
          Download
        </a>
      </CardContent>
    </Card>
  );
}

function LoadingSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i} className="border-border/50">
          <CardContent className="p-4">
            <Skeleton className="mb-3 h-32 w-full rounded-lg" />
            <Skeleton className="mb-1 h-4 w-3/4" />
            <Skeleton className="mb-1 h-3 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function AttachmentList({ taskId }: AttachmentListProps) {
  const { data, isLoading, isError } = useAttachments(taskId);

  if (isLoading) return <LoadingSkeleton />;

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center text-sm text-destructive">
        Failed to load attachments. Please try again.
      </div>
    );
  }

  const attachments = data?.results ?? [];

  if (attachments.length === 0) {
    return (
      <EmptyState
        icon={Paperclip}
        title="No attachments"
        description="Upload files to share with your team"
      />
    );
  }

  return (
    <div className="stagger-children grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {attachments.map((attachment) => (
        <AttachmentCard key={attachment.id} attachment={attachment} />
      ))}
    </div>
  );
}
