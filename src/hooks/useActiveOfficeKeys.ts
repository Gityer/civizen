import { useEffect, useState } from 'react';

import { supabase } from '@/integrations/supabase/client';
import type { ConstitutionalOfficeKey } from '@/lib/governance-ui.types';

/** Constitutional offices the given member currently holds (empty while loading or on error). */
export function useActiveOfficeKeys(profileId: string | undefined): ConstitutionalOfficeKey[] {
  const [officeKeys, setOfficeKeys] = useState<ConstitutionalOfficeKey[]>([]);

  useEffect(() => {
    if (!profileId) {
      setOfficeKeys([]);
      return undefined;
    }

    let cancelled = false;
    void supabase
      .from('constitutional_offices')
      .select('office_key')
      .eq('profile_id', profileId)
      .eq('is_active', true)
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) {
          console.error('Failed to load office assignments:', error);
          setOfficeKeys([]);
          return;
        }
        setOfficeKeys((data ?? []).map((row) => row.office_key));
      });

    return () => {
      cancelled = true;
    };
  }, [profileId]);

  return officeKeys;
}
