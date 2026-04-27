import { useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '@/shared/api/client';
import { ep } from '@/shared/api/endpoints';

type RegisterPayload = {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
};

export function useRegister() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (payload: RegisterPayload) => {
      const { data } = await api.post(ep.auth.register, payload);
      return data;
    },
    onSuccess: () => {
      navigate('/login', { replace: true });
    },
  });
}
