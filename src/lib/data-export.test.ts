import { describe, expect, it, vi } from 'vitest';

vi.mock('@/integrations/supabase/untyped', () => ({ supabaseUntyped: {} }));

import { dataExportFileName } from '@/lib/data-export';

describe('dataExportFileName', () => {
  const day = new Date('2026-10-06T12:00:00Z');

  it('uses a safe version of the username and the date', () => {
    expect(dataExportFileName('Ana.Petrosyan', day)).toBe('civizen-data-ana-petrosyan-2026-10-06.json');
  });

  it('falls back when there is no username', () => {
    expect(dataExportFileName(null, day)).toBe('civizen-data-me-2026-10-06.json');
    expect(dataExportFileName('***', day)).toBe('civizen-data-me-2026-10-06.json');
  });
});
