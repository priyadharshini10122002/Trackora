import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';

import { api } from '@/shared/api/client';
import { ep } from '@/shared/api/endpoints';
import { queryClient } from '@/shared/api/query-client';

import { attachmentKeys } from './keys';

interface UploadAttachmentParams {
  taskId: string;
  file: File;
  onProgress?: (pct: number) => void;
}

export function useUploadAttachment() {
  return useMutation({
    mutationFn: async ({ taskId, file, onProgress }: UploadAttachmentParams) => {
      const formData = new FormData();
      formData.append('task', taskId);
      formData.append('file', file);

      const { data } = await api.post(ep.attachments, formData, {
        onUploadProgress(event) {
          if (event.total) {
            const pct = Math.round((event.loaded * 100) / event.total);
            onProgress?.(pct);
          }
        },
      });

      return data;
    },
    onSuccess: (_data, { taskId }) => {
      queryClient.invalidateQueries({ queryKey: attachmentKeys.list(taskId) });
      toast.success('File uploaded');
    },
  });
}
