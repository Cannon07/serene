import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore } from '@/stores/userStore';

export function useRequireUser() {
  const router = useRouter();
  const user = useUserStore((s) => s.user);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (useUserStore.persist.hasHydrated()) {
      setHydrated(true);
    } else {
      const unsub = useUserStore.persist.onFinishHydration(() => {
        unsub();
        setHydrated(true);
      });
    }
  }, []);

  useEffect(() => {
    if (hydrated && !user) {
      router.replace('/');
    }
  }, [hydrated, user, router]);

  return { user, isLoading: !hydrated };
}
