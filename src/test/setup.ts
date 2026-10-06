import "@testing-library/jest-dom/vitest";
import { webcrypto } from "node:crypto";
import { beforeEach } from "vitest";

// jsdom exposes `crypto` without `subtle`; governance signing tests need Web Crypto.
Object.defineProperty(globalThis, "crypto", {
  configurable: true,
  value: webcrypto,
});

const storageState = new Map<string, string>();

const localStorageMock: Storage = {
  get length() {
    return storageState.size;
  },
  clear() {
    storageState.clear();
  },
  getItem(key: string) {
    return storageState.has(key) ? storageState.get(key) ?? null : null;
  },
  key(index: number) {
    return Array.from(storageState.keys())[index] ?? null;
  },
  removeItem(key: string) {
    storageState.delete(key);
  },
  setItem(key: string, value: string) {
    storageState.set(key, String(value));
  },
};

Object.defineProperty(window, "localStorage", {
  configurable: true,
  value: localStorageMock,
});

beforeEach(() => {
  window.localStorage.clear();
});

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
