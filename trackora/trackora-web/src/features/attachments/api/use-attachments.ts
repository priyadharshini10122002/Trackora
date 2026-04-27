import { useQuery } from '@tanstack/react-query';

import type { Attachment, PaginatedResponse } from '@/shared/types/api';
import { api } from '@/shared/api/client';
import { ep } from '@/shared/api/endpoints';

import { attachmentKeys } from './keys';

export function useAttachments(taskId: string) {
  return useQuery({
    queryKey: attachmentKeys.list(taskId),
    queryFn: async () => {
      const { data } = await api.get<PaginatedResponse<Attachment>>(
        ep.attachments,
        { params: { task: taskId } },
      );
      return data;
    },
    enabled: !!taskId,
    staleTime: 30_000,
  });
}
