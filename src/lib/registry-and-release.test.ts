import { describe, expect, it } from 'vitest';

import { APP_PERMISSIONS } from '@/lib/access-control';
import { pageRegistry, sectionRegistry } from '@/lib/feature-registry';
import { permissionMetadata } from '@/lib/permission-metadata';
import { APP_RELEASE_ID, APP_VERSION, APP_VERSION_TAG, ANDROID_VERSION_CODE } from '@/lib/app-release';
import { appPageLinks, getAccessiblePageLinks, getProfileMenuPageLinks } from '@/lib/app-pages';
import { MAIN_NAV_ITEMS, PROFILE_MENU_EXCLUDED_PAGE_IDS } from '@/lib/main-nav';
import { manageableRoles } from '@/lib/users-admin';

describe('feature-registry', () => {
  it('registers core pages used by admin and navigation', () => {
    expect(pageRegistry.home).toBeTruthy();
    expect(pageRegistry.earnings).toBeTruthy();
    expect(pageRegistry.happiness).toBeTruthy();
    expect(pageRegistry.adminUsers).toBeTruthy();
    expect(pageRegistry.settings).toBeTruthy();
    expect(Object.keys(sectionRegistry).length).toBeGreaterThan(0);
  });

  it('gives Endorse a distinct icon from Professional credentials', () => {
    const professions = appPageLinks.find((page) => page.id === 'professions');
    expect(professions).toBeTruthy();
    expect(pageRegistry.endorse.icon).not.toBe(professions!.icon);
  });
});

describe('permission-metadata', () => {
  it('covers every app permission exactly once', () => {
    const listed = permissionMetadata.map((entry) => entry.permission);
    expect(new Set(listed).size).toBe(listed.length);
    for (const permission of APP_PERMISSIONS) {
      expect(listed).toContain(permission);
    }
  });
});

describe('app-release', () => {
  it('keeps version metadata aligned', () => {
    expect(APP_VERSION_TAG).toBe(`v${APP_VERSION}`);
    expect(APP_RELEASE_ID).toContain(APP_VERSION);
    expect(ANDROID_VERSION_CODE).toBeGreaterThan(0);
  });
});

describe('app-pages', () => {
  it('exposes navigable links and filters by permissions', () => {
    expect(appPageLinks.some((page) => (page.id as string) === 'home')).toBe(false);
    expect(appPageLinks.some((page) => page.id === 'earnings')).toBe(true);
    const filtered = getAccessiblePageLinks(['settings.manage', 'role.assign']);
    expect(filtered.some((page) => page.id === 'adminUsers')).toBe(true);
  });

  it('omits main-nav, Search, Download, Edit Profile, and Endorse from the profile menu', () => {
    const menu = getProfileMenuPageLinks([
      'profile.read',
      'profile.update_self',
      'content.read',
      'endorsement.create',
    ]);
    for (const id of PROFILE_MENU_EXCLUDED_PAGE_IDS) {
      if (id === 'home') continue;
      expect(menu.some((page) => page.id === id)).toBe(false);
    }
    expect(menu.some((page) => page.id === 'endorse')).toBe(false);
    expect(menu.some((page) => page.id === 'settings')).toBe(true);
    expect(MAIN_NAV_ITEMS.map((item) => item.path)).toEqual([
      '/',
      '/study',
      '/contribute',
      '/market',
      '/messaging',
    ]);
  });
});

describe('users-admin exports used by UI', () => {
  it('exports manageableRoles without system', () => {
    expect(manageableRoles).toContain('founder');
    expect(manageableRoles).not.toContain('system');
  });
});
