import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { useLocation } from 'react-router-dom';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Box,
  ChevronDown,
  ChevronRight,
  Component,
  Folder,
  GripVertical,
  Hammer,
  Image as ImageIcon,
  Link as LinkIcon,
  RotateCcw,
  Shapes,
  SquareMousePointer,
  TextCursorInput,
  Type as TypeIcon,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useAuth } from '@/contexts/AuthContext';

type StoredOffset = {
  x: number;
  y: number;
  label: string;
  width?: number;
  height?: number;
  fontSize?: number;
  color?: string;
  backgroundColor?: string;
};

type BuildStorage = Record<string, Record<string, StoredOffset>>;
type BuildGroup = {
  id: string;
  label: string;
  members: string[];
};
type BuildGroupStorage = Record<string, BuildGroup[]>;
type BuildParentStorage = Record<string, Record<string, string>>;
type BuildOrderStorage = Record<string, Record<string, number>>;

const STORAGE_KEY = 'civizen-global-build-v1';
const GROUP_STORAGE_KEY = 'civizen-global-build-groups-v1';
const PARENT_STORAGE_KEY = 'civizen-global-build-parents-v1';
const ORDER_STORAGE_KEY = 'civizen-global-build-orders-v1';
const BUTTON_POSITION_STORAGE_KEY = 'civizen-build-button-position-v1';
const BUILD_STORAGE_EVENT = 'civizen-build-storage-updated';
const BUTTON_SIZE = 48;
const EDGE_GAP = 16;
const BUILD_PANEL_WIDTH = 288;
const LAYERS_PANEL_WIDTH = 320;
const PANEL_MIN_WIDTH = 288;
const PANEL_MAX_WIDTH = 520;
const BUILD_PANEL_HEIGHT = 720;
const LAYERS_PANEL_HEIGHT = 640;
const PANEL_MIN_HEIGHT = 260;
const PANEL_HEADER_HEIGHT = 44;
const PANEL_RESIZE_HANDLE_SIZE = 14;
const PANEL_RESIZE_CORNER_SIZE = 18;

type ButtonPosition = {
  x: number;
  y: number;
};

type PanelFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
};

type PanelResizeEdge = 'right' | 'bottom' | 'bottom-right' | 'bottom-left';

type SelectionLayer = {
  selector: string;
  label: string;
};

type TargetType = 'group' | 'icon' | 'button' | 'input' | 'text' | 'image' | 'link' | 'container' | 'other';

type AvailableTarget = {
  kind: 'element' | 'group';
  selector: string;
  label: string;
  targetType: TargetType;
  targetName: string;
  hierarchyDepth: number;
  hierarchyOrder: number;
  parentSelector?: string | null;
  iconMarkup?: string;
  isManualGroup?: boolean;
  groupId?: string;
  members?: string[];
  sortOrder?: number;
};

type SelectedRect = {
  left: number;
  top: number;
  width: number;
  height: number;
  selector: string;
};

type StyleControlState = {
  width: string;
  height: string;
  fontSize: string;
  color: string;
  backgroundColor: string;
};

type AlignmentGuideSegment = {
  key: string;
  orientation: 'vertical' | 'horizontal';
  position: number;
  start: number;
  end: number;
  distance: number;
  diff: number;
};

type ResizeEdge = 'left' | 'right' | 'top' | 'bottom' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

const MAX_SELECTION_LAYERS = 5;
const ALIGNMENT_TOLERANCE = 4;
const MAX_GUIDE_DISTANCE = 180;
const MAX_GUIDES_PER_ORIENTATION = 2;
const MIN_RESIZE_DIMENSION = 12;
const RESIZE_HANDLE_THICKNESS = 14;
const RESIZE_HANDLE_INSET = 6;
const CORNER_HANDLE_SIZE = 16;
const TARGET_TYPE_ORDER: TargetType[] = ['group', 'icon', 'button', 'input', 'text', 'image', 'link', 'container', 'other'];

const TARGET_TYPE_LABEL: Record<TargetType, string> = {
  group: 'group',
  icon: 'icon',
  button: 'button',
  input: 'input',
  text: 'text',
  image: 'image',
  link: 'link',
  container: 'container',
  other: 'other',
};

type BuildElement = HTMLElement | SVGElement;

const LINKED_POSITION_SELECTOR_SETS = [
  [
    '[data-build-key="wcFrontBirthPlaceCompact"]',
    '[data-build-key="wcFrontBirthPlaceFrame"]',
    '[data-build-key="wcFrontBirthPlaceTrigger"]',
  ],
] as const;

const LINKED_POSITION_SELECTOR_LOOKUP = LINKED_POSITION_SELECTOR_SETS.reduce<Map<string, readonly string[]>>((map, selectors) => {
  selectors.forEach((selector) => map.set(selector, selectors));
  return map;
}, new Map());

function getNthOfTypeIndex(element: BuildElement) {
  if (!element.parentElement) return 1;
  const siblings = Array.from(element.parentElement.children).filter(
    (child) => child.tagName === element.tagName,
  );
  return siblings.indexOf(element) + 1;
}

function buildPathFromRoot(element: BuildElement, root: HTMLElement) {
  const segments: string[] = [];
  let current: BuildElement | null = element;

  while (current && current !== root) {
    if (current.id) {
      segments.unshift(`${current.tagName.toLowerCase()}#${CSS.escape(current.id)}`);
      break;
    }

    const nth = getNthOfTypeIndex(current);
    segments.unshift(`${current.tagName.toLowerCase()}:nth-of-type(${nth})`);
    current = current.parentElement;
  }

  return segments.join(' > ');
}

function isAutoBuildCandidate(element: BuildElement) {
  if (element.dataset.buildIgnore === 'true') return false;
  if (element.closest('[data-build-ignore="true"]')) return false;

  const tag = element.tagName.toLowerCase();
  const candidateTags = new Set([
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'p', 'span', 'div', 'strong', 'em', 'small',
    'img', 'svg', 'button', 'a',
    'label', 'input', 'textarea', 'select',
    'section', 'article', 'aside', 'header', 'footer', 'nav', 'form',
    'li', 'figure'
  ]);
  const structuralContainerTags = new Set([
    'div', 'section', 'article', 'aside', 'header', 'footer', 'nav', 'form', 'li', 'figure',
  ]);

  const rect = element.getBoundingClientRect();
  if (rect.width < 4 || rect.height < 4) return false;

  if (element.getAttribute('role') === 'button') return true;
  if (element.getAttribute('role') === 'img') return true;
  if (element.dataset.buildKey) return true;
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
    return true;
  }
  if (element instanceof HTMLImageElement || element instanceof SVGElement) {
    return true;
  }
  if (structuralContainerTags.has(tag) && element.children.length > 0) {
    return true;
  }
  if (candidateTags.has(tag) && (hasDirectReadableText(element) || element.children.length <= 2)) return true;

  const text = element.textContent?.trim().replace(/\s+/g, ' ') || '';
  if (text && text.length <= 80 && hasDirectReadableText(element)) return true;

  return false;
}

function isBuildElement(value: EventTarget | null): value is BuildElement {
  return value instanceof HTMLElement || value instanceof SVGElement;
}

function humanizeBuildLabel(value: string) {
  const normalized = value
    .replace(/^lucide-/, '')
    .replace(/[-_]+/g, ' ')
    .trim()
    .toLowerCase();

  if (!normalized) return '';
  return normalized.replace(/\b\w/g, (char) => char.toUpperCase());
}

function getNearestControlLabel(element: BuildElement) {
  const labelledAncestor = element.closest('[aria-label]');
  if (labelledAncestor && labelledAncestor !== element) {
    const label = labelledAncestor.getAttribute('aria-label')?.trim();
    if (label) return label;
  }

  const controlAncestor = element.closest('button,a,[role="button"]');
  if (controlAncestor && controlAncestor !== element) {
    const text = controlAncestor.textContent?.trim().replace(/\s+/g, ' ');
    if (text) return text.slice(0, 42);
  }

  return '';
}

function getSvgPreviewMarkup(element: SVGElement) {
  const clone = element.cloneNode(true) as SVGElement;
  clone.removeAttribute('class');
  clone.removeAttribute('style');
  clone.removeAttribute('id');
  clone.setAttribute('width', '14');
  clone.setAttribute('height', '14');
  clone.setAttribute('stroke', 'currentColor');
  clone.setAttribute('fill', clone.getAttribute('fill') || 'none');
  clone.setAttribute('aria-hidden', 'true');
  clone.setAttribute('focusable', 'false');

  clone.querySelectorAll('*').forEach((node) => {
    if (!(node instanceof Element)) return;
    node.removeAttribute('class');
    node.removeAttribute('style');
    node.removeAttribute('id');
  });

  return clone.outerHTML;
}

function summarizeElement(element: BuildElement) {
  const explicitLabel = element.dataset.buildLabel || element.getAttribute('aria-label');
  if (explicitLabel) return explicitLabel;

  if (element instanceof HTMLInputElement) {
    return element.placeholder || element.name || 'input';
  }

  if (element instanceof HTMLTextAreaElement) {
    return element.placeholder || element.name || 'textarea';
  }

  if (element instanceof HTMLSelectElement) {
    return element.name || 'select';
  }

  if (element instanceof HTMLImageElement) {
    return element.alt || 'image';
  }

  if (element instanceof SVGElement) {
    const svgAriaLabel = element.getAttribute('aria-label')?.trim();
    if (svgAriaLabel) return svgAriaLabel;

    const dataLucide = element.getAttribute('data-lucide');
    if (dataLucide) {
      return `${humanizeBuildLabel(dataLucide)} icon`;
    }

    const lucideClassName = Array.from(element.classList).find(
      (className) => className.startsWith('lucide-') && className !== 'lucide',
    );
    if (lucideClassName) {
      return `${humanizeBuildLabel(lucideClassName)} icon`;
    }

    const nearestControlLabel = getNearestControlLabel(element);
    if (nearestControlLabel) {
      return `${nearestControlLabel} icon`;
    }

    return 'Vector icon';
  }

  const text = element.textContent?.trim().replace(/\s+/g, ' ');
  if (text) return text.slice(0, 42);

  return element.tagName.toLowerCase();
}

function getElementSelector(element: BuildElement) {
  const explicitKey = element.dataset.buildKey;
  if (explicitKey) {
    return `[data-build-key="${CSS.escape(explicitKey)}"]`;
  }

  const segments: string[] = [];
  let current: BuildElement | null = element;

  while (current && current.tagName.toLowerCase() !== 'body') {
    if (current.dataset.buildRoot === 'true') break;

    if (current.id) {
      segments.unshift(`${current.tagName.toLowerCase()}#${CSS.escape(current.id)}`);
      break;
    }

    const nth = getNthOfTypeIndex(current);
    segments.unshift(`${current.tagName.toLowerCase()}:nth-of-type(${nth})`);
    current = current.parentElement;
  }

  return segments.join(' > ');
}

function hasDirectReadableText(element: BuildElement) {
  return Array.from(element.childNodes).some(
    (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
  );
}

function getAutoBuildRoot() {
  return (document.querySelector('[data-build-root="true"]') as HTMLElement | null) || document.body;
}

function registerAutoBuildTarget(element: BuildElement, pathname: string, root: HTMLElement) {
  if (element.dataset.buildIgnore === 'true') return;
  if (element.closest('[data-build-ignore="true"]')) return;

  if (!isAutoBuildCandidate(element)) return;

  const autoKey = `auto:${pathname}:${buildPathFromRoot(element, root)}`;
  if (!element.dataset.buildKey || element.dataset.buildAuto === 'true') {
    element.dataset.buildKey = autoKey;
    element.dataset.buildAuto = 'true';
  }

  if (!element.dataset.buildLabel || element.dataset.buildAuto === 'true') {
    element.dataset.buildLabel = summarizeElement(element);
  }
}

function clearAutoBuildTargets(root: HTMLElement) {
  if (root.dataset.buildAuto === 'true') {
    delete root.dataset.buildKey;
    delete root.dataset.buildAuto;
    delete root.dataset.buildLabel;
  }

  root.querySelectorAll('[data-build-auto="true"]').forEach((element) => {
    if (!(element instanceof HTMLElement || element instanceof SVGElement)) return;
    delete element.dataset.buildKey;
    delete element.dataset.buildAuto;
    delete element.dataset.buildLabel;
  });
}

function readStorage(): BuildStorage {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as BuildStorage;
  } catch {
    return {};
  }
}

function readGroupStorage(): BuildGroupStorage {
  try {
    const raw = window.localStorage.getItem(GROUP_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as BuildGroupStorage;
  } catch {
    return {};
  }
}

function readParentStorage(): BuildParentStorage {
  try {
    const raw = window.localStorage.getItem(PARENT_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as BuildParentStorage;
  } catch {
    return {};
  }
}

function readOrderStorage(): BuildOrderStorage {
  try {
    const raw = window.localStorage.getItem(ORDER_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as BuildOrderStorage;
  } catch {
    return {};
  }
}

function writeStorage(next: BuildStorage) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(BUILD_STORAGE_EVENT));
}

function writeGroupStorage(next: BuildGroupStorage) {
  window.localStorage.setItem(GROUP_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(BUILD_STORAGE_EVENT));
}

function writeParentStorage(next: BuildParentStorage) {
  window.localStorage.setItem(PARENT_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(BUILD_STORAGE_EVENT));
}

function writeOrderStorage(next: BuildOrderStorage) {
  window.localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new CustomEvent(BUILD_STORAGE_EVENT));
}

function sanitizePageOffsets(offsets: Record<string, StoredOffset>) {
  const next = { ...offsets };
  const styleOnlySelectors = [
    '[data-build-key="wcFrontBirthPlaceCompact"]',
    '[data-build-key="wcFrontEditWindowCompact"]',
    '[data-build-key="wcBackMrzLine1"]',
    '[data-build-key="wcBackMrzLine2"]',
    '[data-build-key="wcBackMrzLine3"]',
  ];

  styleOnlySelectors.forEach((selector) => {
    const offset = next[selector];
    if (!offset) return;

    next[selector] = {
      x: offset.x,
      y: offset.y,
      label: offset.label,
      fontSize: offset.fontSize,
      color: offset.color,
    };
  });

  return next;
}

function applyStoredOffsets(offsets: Record<string, StoredOffset>) {
  Object.entries(offsets).forEach(([selector, offset]) => {
    applyOffset(selector, offset);
  });
}

function clearStoredOffsetsBySelectors(selectors: Iterable<string>) {
  Array.from(selectors).forEach((selector) => {
    const element = document.querySelector(selector);
    if (!isBuildElement(element)) return;
    clearOffset(element);
  });
}

function detectTargetType(element: BuildElement): TargetType {
  if (element instanceof SVGElement) return 'icon';
  if (element instanceof HTMLButtonElement || element.getAttribute('role') === 'button') return 'button';
  if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) return 'input';
  if (element instanceof HTMLImageElement) return 'image';
  if (element instanceof HTMLAnchorElement) return 'link';

  const tag = element.tagName.toLowerCase();
  if (['h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'span', 'strong', 'em', 'small', 'label'].includes(tag)) return 'text';
  if (['div', 'section', 'article', 'aside', 'header', 'footer', 'nav', 'form', 'li', 'figure'].includes(tag)) return 'container';
  return 'other';
}

function normalizeTargetName(rawLabel: string, targetType: TargetType) {
  const cleaned = rawLabel.replace(/^Group:\s*/i, '').trim();
  if (!cleaned) return targetType === 'group' ? 'Selection' : 'Untitled';
  if (targetType === 'icon') {
    return cleaned.replace(/\s+icon$/i, '').trim() || 'Icon';
  }
  return cleaned;
}

function formatTargetLabel(targetType: TargetType, targetName: string) {
  if (targetType === 'group' || targetType === 'container') return targetName;
  return `${TARGET_TYPE_LABEL[targetType]} ${targetName}`.trim();
}

function isInBuildIgnoredPopoverWrapper(element: BuildElement) {
  const wrapper = element.closest('[data-radix-popper-content-wrapper]');
  if (!(wrapper instanceof HTMLElement)) return false;
  return Boolean(wrapper.querySelector('[data-build-ignore="true"]'));
}

function isOverflowClippingValue(value: string) {
  return value === 'hidden' || value === 'clip' || value === 'scroll' || value === 'auto';
}

function isVisibleBuildTarget(element: BuildElement) {
  if (element.closest('[aria-hidden="true"]')) return false;

  const computed = window.getComputedStyle(element);
  if (computed.display === 'none' || computed.visibility === 'hidden') return false;

  const rect = element.getBoundingClientRect();
  if (rect.width < 1 || rect.height < 1) return false;

  let clipLeft = 0;
  let clipTop = 0;
  let clipRight = window.innerWidth;
  let clipBottom = window.innerHeight;

  let ancestor = element.parentElement;
  while (ancestor) {
    const ancestorStyle = window.getComputedStyle(ancestor);
    if (ancestorStyle.display === 'none' || ancestorStyle.visibility === 'hidden') return false;

    const clipsX = isOverflowClippingValue(ancestorStyle.overflowX);
    const clipsY = isOverflowClippingValue(ancestorStyle.overflowY);

    if (clipsX || clipsY) {
      const ancestorRect = ancestor.getBoundingClientRect();
      if (clipsX) {
        clipLeft = Math.max(clipLeft, ancestorRect.left);
        clipRight = Math.min(clipRight, ancestorRect.right);
      }
      if (clipsY) {
        clipTop = Math.max(clipTop, ancestorRect.top);
        clipBottom = Math.min(clipBottom, ancestorRect.bottom);
      }
    }

    ancestor = ancestor.parentElement;
  }

  const visibleWidth = Math.min(rect.right, clipRight) - Math.max(rect.left, clipLeft);
  const visibleHeight = Math.min(rect.bottom, clipBottom) - Math.max(rect.top, clipTop);
  return visibleWidth >= 1 && visibleHeight >= 1;
}

function getAvailableTargets(
  groups: BuildGroup[],
  parentAssignments: Record<string, string>,
  targetOrder: Record<string, number>,
) {
  const allBuildElements = Array.from(document.querySelectorAll('[data-build-key]'))
    .filter((element): element is BuildElement => isBuildElement(element))
    .filter((element) => !element.closest('[data-build-ignore="true"]'))
    .filter((element) => !isInBuildIgnoredPopoverWrapper(element))
    .filter((element) => isVisibleBuildTarget(element));
  const explicitBuildRoots = allBuildElements.filter(
    (element) => element.dataset.buildRoot === 'true' && element.dataset.buildAuto !== 'true',
  );
  const scopedBuildElements = explicitBuildRoots.length
    ? allBuildElements.filter((element) => explicitBuildRoots.some((root) => root === element || root.contains(element)))
    : allBuildElements;
  const explicitBuildElements = scopedBuildElements.filter((element) => element.dataset.buildAuto !== 'true');
  const shouldExposeNestedAutoTarget = (element: BuildElement) => {
    if (element.dataset.buildAuto !== 'true') return true;

    let explicitAncestor: BuildElement | null = null;
    let ancestor = element.parentElement;
    while (ancestor) {
      if (isBuildElement(ancestor) && ancestor.dataset.buildKey && ancestor.dataset.buildAuto !== 'true') {
        explicitAncestor = ancestor;
        break;
      }
      ancestor = ancestor.parentElement;
    }

    if (!explicitAncestor) return true;

    const targetType = detectTargetType(element);
    const hasNestedBuildChildren = Array.from(element.children).some(
      (child) => isBuildElement(child) && child.dataset.buildKey,
    );
    const hasDirectText = hasDirectReadableText(element);
    const isInteractive =
      element instanceof HTMLButtonElement ||
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement ||
      element instanceof HTMLSelectElement ||
      element instanceof HTMLAnchorElement ||
      element.getAttribute('role') === 'button';
    const isGraphic = element instanceof HTMLImageElement || element instanceof SVGElement;

    if (targetType === 'text') return true;
    if (isInteractive || isGraphic) return true;
    if (hasDirectText && !hasNestedBuildChildren) return true;

    return false;
  };
  const buildElements = explicitBuildRoots.length
    ? explicitBuildElements
    : scopedBuildElements.filter((element) => {
      if (element.dataset.buildAuto !== 'true') return true;
      if (!explicitBuildElements.some((explicitElement) => explicitElement !== element && explicitElement.contains(element))) {
        return true;
      }
      return shouldExposeNestedAutoTarget(element);
    });
  const seenSelectors = new Set<string>();

  const selectorByElement = new Map<BuildElement, string>();
  buildElements.forEach((element) => {
    const selector = getElementSelector(element);
    if (!selector || seenSelectors.has(selector)) return;
    seenSelectors.add(selector);
    selectorByElement.set(element, selector);
  });

  const elementBySelector = new Map<string, BuildElement>();
  selectorByElement.forEach((selector, element) => {
    elementBySelector.set(selector, element);
  });

  const preliminaryElementTargets = Array.from(selectorByElement.entries()).map(([element, selector], index) => {
    let hierarchyDepth = 0;
    let ancestor = element.parentElement;
    while (ancestor) {
      if (isBuildElement(ancestor) && selectorByElement.has(ancestor)) {
        hierarchyDepth += 1;
      }
      ancestor = ancestor.parentElement;
    }

    const baseTargetType = detectTargetType(element);
    const hasBuildDescendant = buildElements.some(
      (candidate) => candidate !== element && element.contains(candidate),
    );
    const isStructuralGroup = baseTargetType === 'container' && hasBuildDescendant;
    const targetType = isStructuralGroup ? 'group' : baseTargetType;
    const targetName = normalizeTargetName(summarizeElement(element), targetType);

    return {
      kind: 'element' as const,
      selector,
      targetType,
      targetName,
      label: formatTargetLabel(targetType, targetName),
      hierarchyDepth,
      hierarchyOrder: index,
      parentSelector: null,
      iconMarkup: element instanceof SVGElement ? getSvgPreviewMarkup(element) : undefined,
      sortOrder: targetOrder[selector],
    };
  });

  const elementTargets = preliminaryElementTargets.map((target) => {
    const element = elementBySelector.get(target.selector);
    if (!element) return target;

    let parentSelector: string | null = null;
    let ancestor = element.parentElement;
    while (ancestor) {
      if (isBuildElement(ancestor)) {
        const ancestorSelector = selectorByElement.get(ancestor);
        if (ancestorSelector) {
          parentSelector = ancestorSelector;
          break;
        }
      }
      ancestor = ancestor.parentElement;
    }

    return {
      ...target,
      parentSelector,
    };
  });

  const applyParentOverrides = (targets: AvailableTarget[]) => {
    const targetBySelector = new Map(targets.map((target) => [target.selector, target]));
    const getParentChain = (selector: string) => {
      const visited = new Set<string>();
      let current = targetBySelector.get(selector)?.parentSelector || null;

      while (current) {
        if (visited.has(current)) return visited;
        visited.add(current);
        current = targetBySelector.get(current)?.parentSelector || null;
      }

      return visited;
    };

    return targets.map((target) => {
      const overrideParent = parentAssignments[target.selector];
      if (!overrideParent) return target;
      if (overrideParent === target.selector) return target;
      if (!targetBySelector.has(overrideParent)) return target;
      if (getParentChain(overrideParent).has(target.selector)) return target;

      return {
        ...target,
        parentSelector: overrideParent,
      };
    });
  };

  const elementTargetsWithOverrides = applyParentOverrides(elementTargets);

  const topLevelExplicitTarget = elementTargetsWithOverrides.find((target) => {
    if (target.parentSelector) return false;
    const element = elementBySelector.get(target.selector);
    return Boolean(element && element.dataset.buildAuto !== 'true');
  });

  const groupTargets = explicitBuildRoots.length
    ? []
    : groups
      .map((group) => ({
        ...group,
        members: group.members.filter((selector) => elementBySelector.has(selector)),
      }))
      .filter((group) => group.members.length > 0)
      .map((group, index) => {
        const targetType = 'group' as const;
        const targetName = normalizeTargetName(group.label, targetType);
        return {
          kind: 'group' as const,
          selector: `group:${group.id}`,
          targetType,
          targetName,
          label: formatTargetLabel(targetType, targetName),
          hierarchyDepth: 0,
          hierarchyOrder: Number.MAX_SAFE_INTEGER - groups.length + index,
          parentSelector: topLevelExplicitTarget?.selector || null,
          isManualGroup: true,
          groupId: group.id,
          members: group.members,
          sortOrder: targetOrder[`group:${group.id}`],
        };
      });

  const allTargets = [...groupTargets, ...elementTargetsWithOverrides];
  const childrenByParent = new Map<string | null, AvailableTarget[]>();

  allTargets.forEach((target) => {
    const parentKey = target.parentSelector || null;
    const bucket = childrenByParent.get(parentKey);
    if (bucket) {
      bucket.push(target);
      return;
    }
    childrenByParent.set(parentKey, [target]);
  });

  const compareTargets = (a: AvailableTarget, b: AvailableTarget) => {
    if (typeof a.sortOrder === 'number' || typeof b.sortOrder === 'number') {
      if (typeof a.sortOrder !== 'number') return 1;
      if (typeof b.sortOrder !== 'number') return -1;
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }
    }

    if (Boolean(a.isManualGroup) !== Boolean(b.isManualGroup)) {
      return a.isManualGroup ? 1 : -1;
    }
    if (a.hierarchyOrder !== b.hierarchyOrder) {
      return a.hierarchyOrder - b.hierarchyOrder;
    }

    const typeDiff = TARGET_TYPE_ORDER.indexOf(a.targetType) - TARGET_TYPE_ORDER.indexOf(b.targetType);
    if (typeDiff !== 0) {
      return typeDiff;
    }

    const nameDiff = a.targetName.localeCompare(b.targetName, undefined, { sensitivity: 'base' });
    if (nameDiff !== 0) {
      return nameDiff;
    }
    return a.selector.localeCompare(b.selector);
  };

  const orderedTargets: AvailableTarget[] = [];
  const walk = (parentSelector: string | null, depth: number) => {
    const children = (childrenByParent.get(parentSelector) || []).sort(compareTargets);
    children.forEach((child) => {
      orderedTargets.push({
        ...child,
        hierarchyDepth: depth,
      });

      if (!child.isManualGroup) {
        walk(child.selector, depth + 1);
      }
    });
  };

  walk(null, 0);
  return orderedTargets;
}

function cssColorToHex(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '#000000';
  if (trimmed.startsWith('#')) {
    if (trimmed.length === 4) {
      return `#${trimmed[1]}${trimmed[1]}${trimmed[2]}${trimmed[2]}${trimmed[3]}${trimmed[3]}`.toLowerCase();
    }
    return trimmed.toLowerCase();
  }

  const match = trimmed.match(/rgba?\(([^)]+)\)/i);
  if (!match) return '#000000';
  const channels = match[1].split(',').map((part) => part.trim());
  if (channels.length < 3) return '#000000';
  const [red, green, blue, alpha] = channels.map(Number);
  if (!Number.isFinite(red) || !Number.isFinite(green) || !Number.isFinite(blue)) return '#000000';
  if (Number.isFinite(alpha) && alpha === 0) return '#000000';

  return `#${[red, green, blue]
    .map((channel) => Math.max(0, Math.min(255, Math.round(channel))).toString(16).padStart(2, '0'))
    .join('')}`;
}

function getStyleControlState(selector: string): StyleControlState {
  const found = document.querySelector(selector);
  if (!isBuildElement(found)) {
    return {
      width: '',
      height: '',
      fontSize: '',
      color: '#ffffff',
      backgroundColor: '#000000',
    };
  }

  const computed = window.getComputedStyle(found);
  const rect = found.getBoundingClientRect();
  const fontSize = Number.parseFloat(computed.fontSize);

  return {
    width: `${Math.round(rect.width)}`,
    height: `${Math.round(rect.height)}`,
    fontSize: Number.isFinite(fontSize) ? `${Math.round(fontSize)}` : '',
    color: cssColorToHex(computed.color),
    backgroundColor: cssColorToHex(computed.backgroundColor),
  };
}

function clearOffset(element: BuildElement) {
  if (element.dataset.buildPositioned === 'true') {
    element.style.position = '';
    delete element.dataset.buildPositioned;
  }
  if (element.dataset.buildInlineSized === 'true') {
    element.style.display = '';
    delete element.dataset.buildInlineSized;
  }
  element.style.translate = '';
  element.style.left = '';
  element.style.top = '';
  element.style.width = '';
  element.style.minWidth = '';
  element.style.maxWidth = '';
  element.style.height = '';
  element.style.minHeight = '';
  element.style.maxHeight = '';
  element.style.boxSizing = '';
  element.style.justifySelf = '';
  element.style.alignSelf = '';
  element.style.fontSize = '';
  element.style.color = '';
  element.style.backgroundColor = '';
}

function expandLinkedPositionSelectors(selectors: string[]) {
  const next = new Set(selectors.filter(Boolean));
  selectors.forEach((selector) => {
    const linkedSelectors = LINKED_POSITION_SELECTOR_LOOKUP.get(selector);
    if (!linkedSelectors) return;
    linkedSelectors.forEach((linkedSelector) => next.add(linkedSelector));
  });
  return Array.from(next);
}

function getIndependentPositionSelectors(selectors: string[]) {
  const uniqueSelectors = Array.from(new Set(selectors.filter(Boolean)));
  const entries = uniqueSelectors
    .map((selector) => ({ selector, element: document.querySelector(selector) }))
    .filter((entry): entry is { selector: string; element: BuildElement } => isBuildElement(entry.element));

  return uniqueSelectors.filter((selector) => {
    const entry = entries.find((candidate) => candidate.selector === selector);
    if (!entry) return true;

    return !entries.some(
      (candidate) => candidate.selector !== selector && candidate.element.contains(entry.element),
    );
  });
}

function resolvePositionSelectors(selectors: string[]) {
  const expandedSelectors = expandLinkedPositionSelectors(selectors);
  return getIndependentPositionSelectors(expandedSelectors);
}

function isSelectorDomDescendant(parentSelector: string, childSelector: string) {
  const parent = document.querySelector(parentSelector);
  const child = document.querySelector(childSelector);
  if (!isBuildElement(parent) || !isBuildElement(child)) return false;
  return parent !== child && parent.contains(child);
}

function getAssignedDescendantSelectors(rootSelector: string, parentAssignments: Record<string, string>) {
  const visited = new Set<string>();
  const descendants: string[] = [];

  const walk = (parentSelector: string) => {
    Object.entries(parentAssignments).forEach(([childSelector, assignedParent]) => {
      if (assignedParent !== parentSelector || visited.has(childSelector)) return;
      visited.add(childSelector);
      descendants.push(childSelector);
      walk(childSelector);
    });
  };

  walk(rootSelector);
  return descendants;
}

function resolveMotionSelectors(selectors: string[], parentAssignments: Record<string, string>) {
  const baseSelectors = Array.from(new Set(selectors.filter(Boolean)));
  const next = new Set<string>(baseSelectors);

  baseSelectors.forEach((selector) => {
    getAssignedDescendantSelectors(selector, parentAssignments).forEach((childSelector) => {
      if (!isSelectorDomDescendant(selector, childSelector)) {
        next.add(childSelector);
      }
    });
  });

  return resolvePositionSelectors(Array.from(next));
}

function measureIntrinsicContentSize(element: BuildElement) {
  const rect = element.getBoundingClientRect();
  if (!(element instanceof HTMLElement)) {
    return {
      width: Math.ceil(rect.width),
      height: Math.ceil(rect.height),
    };
  }

  const clone = element.cloneNode(true);
  if (!(clone instanceof HTMLElement)) {
    return {
      width: Math.ceil(rect.width),
      height: Math.ceil(rect.height),
    };
  }

  clone.style.position = 'fixed';
  clone.style.left = '-100000px';
  clone.style.top = '0';
  clone.style.margin = '0';
  clone.style.translate = '0';
  clone.style.transform = 'none';
  clone.style.width = 'max-content';
  clone.style.minWidth = '0';
  clone.style.maxWidth = 'none';
  clone.style.height = 'max-content';
  clone.style.minHeight = '0';
  clone.style.maxHeight = 'none';
  clone.style.pointerEvents = 'none';
  clone.style.visibility = 'hidden';
  clone.style.contain = 'layout style';
  clone.dataset.buildIgnore = 'true';

  document.body.appendChild(clone);
  const cloneRect = clone.getBoundingClientRect();
  clone.remove();

  return {
    width: Math.ceil(cloneRect.width || rect.width),
    height: Math.ceil(cloneRect.height || rect.height),
  };
}

function getSelectionSelectorsWithPrimary(selectedSelector: string | null, selectedSelectors: string[]) {
  const next = new Set<string>();
  if (selectedSelector) {
    next.add(selectedSelector);
  }
  selectedSelectors.forEach((selector) => {
    if (selector) next.add(selector);
  });
  return Array.from(next);
}

function getMotionRootSelectors(
  selectedSelector: string | null,
  selectedSelectors: string[],
  selectedGroupId: string | null,
) {
  if (!selectedSelector) return [];
  if (selectedGroupId) {
    return getSelectionSelectorsWithPrimary(selectedSelector, selectedSelectors);
  }
  if (selectedSelectors.length > 1 && selectedSelectors.includes(selectedSelector)) {
    return getSelectionSelectorsWithPrimary(selectedSelector, selectedSelectors);
  }
  return [selectedSelector];
}

function getDefaultButtonPosition() {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  return {
    x: Math.round(Math.max(EDGE_GAP, viewportWidth - BUTTON_SIZE - EDGE_GAP)),
    y: Math.round(Math.max(EDGE_GAP, viewportHeight - BUTTON_SIZE - 96)),
  };
}

function clampButtonPosition(position: ButtonPosition) {
  return {
    x: Math.round(Math.min(Math.max(position.x, EDGE_GAP), Math.max(EDGE_GAP, window.innerWidth - BUTTON_SIZE - EDGE_GAP))),
    y: Math.round(Math.min(Math.max(position.y, EDGE_GAP), Math.max(EDGE_GAP, window.innerHeight - BUTTON_SIZE - EDGE_GAP))),
  };
}

function clampPanelFrame(frame: PanelFrame, minWidth = PANEL_MIN_WIDTH) {
  const maxWidth = Math.max(minWidth, Math.min(PANEL_MAX_WIDTH, window.innerWidth - EDGE_GAP * 2));
  const width = Math.min(Math.max(frame.width, minWidth), maxWidth);
  const maxHeight = Math.max(PANEL_MIN_HEIGHT, window.innerHeight - EDGE_GAP * 2);
  const height = Math.min(Math.max(frame.height, PANEL_MIN_HEIGHT), maxHeight);
  return {
    width,
    height,
    x: Math.min(Math.max(frame.x, EDGE_GAP), Math.max(EDGE_GAP, window.innerWidth - width - EDGE_GAP)),
    y: Math.min(Math.max(frame.y, EDGE_GAP), Math.max(EDGE_GAP, window.innerHeight - height - EDGE_GAP)),
  };
}

function getDefaultBuildPanelFrame(buttonPosition: ButtonPosition) {
  const width = Math.min(BUILD_PANEL_WIDTH, Math.max(PANEL_MIN_WIDTH, window.innerWidth - EDGE_GAP * 2));
  const height = Math.min(BUILD_PANEL_HEIGHT, Math.max(PANEL_MIN_HEIGHT, window.innerHeight - EDGE_GAP * 2));
  const preferredX = buttonPosition.x > window.innerWidth / 2
    ? buttonPosition.x - width + BUTTON_SIZE
    : buttonPosition.x;
  const preferredY = buttonPosition.y;

  return clampPanelFrame({
    x: preferredX,
    y: preferredY,
    width,
    height,
  });
}

function getDefaultLayersPanelFrame(buildPanelFrame: PanelFrame) {
  return clampPanelFrame({
    x: buildPanelFrame.x + buildPanelFrame.width + 12,
    y: buildPanelFrame.y,
    width: LAYERS_PANEL_WIDTH,
    height: Math.min(LAYERS_PANEL_HEIGHT, Math.max(PANEL_MIN_HEIGHT, window.innerHeight - EDGE_GAP * 2)),
  });
}

function applyOffset(selector: string, offset: StoredOffset) {
  const found = document.querySelector(selector);
  if (!isBuildElement(found)) return;
  const element = found;

  const display = window.getComputedStyle(element).display;
  if (display === 'inline') {
    if (window.getComputedStyle(element).position === 'static') {
      element.style.position = 'relative';
      element.dataset.buildPositioned = 'true';
    }
    element.style.left = `${offset.x}px`;
    element.style.top = `${offset.y}px`;
    element.style.translate = '';
  } else {
    element.style.translate = `${offset.x}px ${offset.y}px`;
    element.style.left = '';
    element.style.top = '';
  }

  const hasWidth = typeof offset.width === 'number' && offset.width > 0;
  const hasHeight = typeof offset.height === 'number' && offset.height > 0;
  const hasExplicitSize = hasWidth || hasHeight;

  if (hasWidth) {
    if (display === 'inline' && element instanceof HTMLElement) {
      element.style.display = 'inline-block';
      element.dataset.buildInlineSized = 'true';
    }
    element.style.width = `${offset.width}px`;
    element.style.minWidth = '0px';
    element.style.maxWidth = `${offset.width}px`;
    element.style.boxSizing = 'border-box';
  } else {
    element.style.width = '';
    element.style.minWidth = '';
    element.style.maxWidth = '';
  }

  if (hasHeight) {
    if (display === 'inline' && element instanceof HTMLElement) {
      element.style.display = 'inline-block';
      element.dataset.buildInlineSized = 'true';
    }
    element.style.height = `${offset.height}px`;
    element.style.minHeight = '0px';
    element.style.maxHeight = `${offset.height}px`;
    element.style.boxSizing = 'border-box';
  } else {
    element.style.height = '';
    element.style.minHeight = '';
    element.style.maxHeight = '';
  }

  if (hasExplicitSize && element instanceof HTMLElement) {
    element.style.justifySelf = 'start';
    element.style.alignSelf = 'start';
  } else {
    element.style.boxSizing = '';
    element.style.justifySelf = '';
    element.style.alignSelf = '';
  }

  element.style.fontSize = typeof offset.fontSize === 'number' && offset.fontSize > 0 ? `${offset.fontSize}px` : '';
  element.style.color = offset.color || '';
  element.style.backgroundColor = offset.backgroundColor || '';
}

function findMovableElement(target: BuildElement, root: HTMLElement) {
  let current: BuildElement | null = target;

  while (current && root.contains(current)) {
    if (current.dataset.buildIgnore === 'true') return null;
    if (current.dataset.buildKey) return current;

    const style = window.getComputedStyle(current);
    const rect = current.getBoundingClientRect();
    const isUsable =
      style.display !== 'contents' &&
      rect.width > 6 &&
      rect.height > 6 &&
      current.tagName.toLowerCase() !== 'main' &&
      current.tagName.toLowerCase() !== 'body';

    if (isUsable) {
      return current;
    }

    current = current.parentElement;
  }

  return null;
}

function isMeaningfulLayer(element: BuildElement) {
  if (element.dataset.buildKey) return true;

  const style = window.getComputedStyle(element);
  const hasVisibleBackground =
    style.backgroundColor !== 'rgba(0, 0, 0, 0)' &&
    style.backgroundColor !== 'transparent';
  const hasBorder =
    Number.parseFloat(style.borderTopWidth) > 0 ||
    Number.parseFloat(style.borderRightWidth) > 0 ||
    Number.parseFloat(style.borderBottomWidth) > 0 ||
    Number.parseFloat(style.borderLeftWidth) > 0;
  const hasDirectText = hasDirectReadableText(element);
  const isFormControl =
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element instanceof HTMLSelectElement ||
    element instanceof HTMLButtonElement;
  const isGraphic = element instanceof HTMLImageElement || element instanceof SVGElement;

  return hasDirectText || hasVisibleBackground || hasBorder || isFormControl || isGraphic;
}

function preserveOrderedSelectionLayers(layers: SelectionLayer[]) {
  const seen = new Set<string>();
  const limited: SelectionLayer[] = [];

  for (const layer of layers) {
    if (!layer.selector || seen.has(layer.selector)) continue;
    const found = document.querySelector(layer.selector);
    if (!isBuildElement(found)) continue;
    if (!isMeaningfulLayer(found)) continue;
    seen.add(layer.selector);
    limited.push(layer);
    if (limited.length >= MAX_SELECTION_LAYERS) break;
  }

  return limited;
}

function getPrimarySelectableTarget(target: BuildElement, root: HTMLElement) {
  if (target.closest('[data-build-ignore="true"]')) return null;

  const explicitTarget = target.closest('[data-build-key]:not([data-build-auto="true"])');
  if (isBuildElement(explicitTarget)) {
    return explicitTarget;
  }

  const autoTarget = target.closest('[data-build-key]');
  if (isBuildElement(autoTarget)) {
    return autoTarget;
  }

  return findMovableElement(target, root);
}

function getElementArea(element: BuildElement) {
  const rect = element.getBoundingClientRect();
  return rect.width * rect.height;
}

function getElementDepth(element: BuildElement, root: HTMLElement) {
  let depth = 0;
  let current: Element | null = element;

  while (current && current !== root) {
    depth += 1;
    current = current.parentElement;
  }

  return depth;
}

function getElementsAtPoint(clientX: number, clientY: number, root: HTMLElement) {
  return document
    .elementsFromPoint(clientX, clientY)
    .filter((element): element is BuildElement => isBuildElement(element))
    .filter((element) => root.contains(element))
    .filter((element) => !element.closest('[data-build-ignore="true"]'));
}

function getPrimarySelectableTargetAtPoint(
  clientX: number,
  clientY: number,
  root: HTMLElement,
  fallbackTarget?: BuildElement | null,
) {
  const stack = getElementsAtPoint(clientX, clientY, root);

  const explicitCandidates = stack
    .map((element) => element.closest('[data-build-key]'))
    .filter((element): element is BuildElement => isBuildElement(element))
    .filter((element, index, array) => array.indexOf(element) === index)
    .filter((element) => root.contains(element))
    .filter((element) => isMeaningfulLayer(element));

  const prioritizedCandidates = explicitCandidates.some((element) => element.dataset.buildRoot !== 'true')
    ? explicitCandidates.filter((element) => element.dataset.buildRoot !== 'true')
    : explicitCandidates;

  const orderedCandidates = prioritizedCandidates.sort((a, b) => {
      const explicitnessDiff = Number(a.dataset.buildAuto === 'true') - Number(b.dataset.buildAuto === 'true');
      if (explicitnessDiff !== 0) return explicitnessDiff;
      const areaDiff = getElementArea(a) - getElementArea(b);
      if (areaDiff !== 0) return areaDiff;
      return getElementDepth(b, root) - getElementDepth(a, root);
    });

  if (orderedCandidates.length) {
    return orderedCandidates[0];
  }

  if (fallbackTarget) {
    return getPrimarySelectableTarget(fallbackTarget, root);
  }

  return null;
}

function shouldIncludeAncestorLayer(element: BuildElement, preferredTarget?: BuildElement | null) {
  if (element.dataset.buildIgnore === 'true') return false;
  if (element.closest('[data-build-ignore="true"]')) return false;
  if (element.dataset.buildRoot === 'true') return false;
  if (!isMeaningfulLayer(element)) return false;

  const tag = element.tagName.toLowerCase();
  if (tag === 'body' || tag === 'html' || tag === 'main') return false;

  const rect = element.getBoundingClientRect();
  const viewportArea = window.innerWidth * window.innerHeight;
  const area = rect.width * rect.height;
  const preferredArea = preferredTarget ? getElementArea(preferredTarget) : 0;

  if (preferredArea > 0 && area > preferredArea * 8) {
    return false;
  }

  return area > 24 && area < viewportArea * 0.7;
}

function buildSelectionLayersForPoint(target: BuildElement, clientX: number, clientY: number, root: HTMLElement) {
  const preferredTarget = getPrimarySelectableTargetAtPoint(clientX, clientY, root, target);
  if (!preferredTarget) return [];

  const rawStack = getElementsAtPoint(clientX, clientY, root);

  const orderedLayers: SelectionLayer[] = [
    {
      selector: getElementSelector(preferredTarget),
      label: summarizeElement(preferredTarget),
    },
  ];

  let ancestor = preferredTarget.parentElement;
  while (ancestor && root.contains(ancestor)) {
    if (isBuildElement(ancestor) && shouldIncludeAncestorLayer(ancestor, preferredTarget)) {
      orderedLayers.push({
        selector: getElementSelector(ancestor),
        label: summarizeElement(ancestor),
      });
    }
    ancestor = ancestor.parentElement;
  }

  rawStack.forEach((element) => {
    if (element === preferredTarget) return;
    if (!preferredTarget.contains(element)) return;

    const innerTarget =
      (element.dataset.buildKey ? element : null) ||
      (isMeaningfulLayer(element) ? element : null) ||
      findMovableElement(element, preferredTarget as unknown as HTMLElement);

    if (!innerTarget || innerTarget === preferredTarget) return;

    orderedLayers.push({
      selector: getElementSelector(innerTarget),
      label: summarizeElement(innerTarget),
    });
  });

  return preserveOrderedSelectionLayers(orderedLayers);
}

function getConnectorRange(
  orientation: 'vertical' | 'horizontal',
  selectedRect: DOMRect,
  candidateRect: DOMRect,
) {
  if (orientation === 'vertical') {
    if (selectedRect.bottom <= candidateRect.top) {
      return { start: selectedRect.bottom, end: candidateRect.top };
    }

    if (candidateRect.bottom <= selectedRect.top) {
      return { start: candidateRect.bottom, end: selectedRect.top };
    }

    return {
      start: Math.max(selectedRect.top, candidateRect.top),
      end: Math.min(selectedRect.bottom, candidateRect.bottom),
    };
  }

  if (selectedRect.right <= candidateRect.left) {
    return { start: selectedRect.right, end: candidateRect.left };
  }

  if (candidateRect.right <= selectedRect.left) {
    return { start: candidateRect.right, end: selectedRect.left };
  }

  return {
    start: Math.max(selectedRect.left, candidateRect.left),
    end: Math.min(selectedRect.right, candidateRect.right),
  };
}

function getAlignmentGuidesForSelector(selector: string | null): AlignmentGuideSegment[] {
  if (!selector) {
    return [];
  }

  const selectedElement = document.querySelector(selector);
  if (!isBuildElement(selectedElement)) {
    return [];
  }

  const selectedRect = selectedElement.getBoundingClientRect();
  if (selectedRect.width < 1 || selectedRect.height < 1) {
    return [];
  }

  const selectedXPositions = [
    { name: 'left', value: selectedRect.left },
    { name: 'center', value: selectedRect.left + selectedRect.width / 2 },
    { name: 'right', value: selectedRect.right },
  ];
  const selectedYPositions = [
    { name: 'top', value: selectedRect.top },
    { name: 'middle', value: selectedRect.top + selectedRect.height / 2 },
    { name: 'bottom', value: selectedRect.bottom },
  ];

  const guides: AlignmentGuideSegment[] = [];
  const seen = new Set<string>();

  const candidates = document.querySelectorAll('[data-build-key]');
  candidates.forEach((candidate) => {
    if (!isBuildElement(candidate)) return;
    if (candidate === selectedElement) return;
    if (candidate.closest('[data-build-ignore="true"]')) return;

    const rect = candidate.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;

    const xPositions = [
      { name: 'left', value: rect.left },
      { name: 'center', value: rect.left + rect.width / 2 },
      { name: 'right', value: rect.right },
    ];
    const yPositions = [
      { name: 'top', value: rect.top },
      { name: 'middle', value: rect.top + rect.height / 2 },
      { name: 'bottom', value: rect.bottom },
    ];

    for (const selectedX of selectedXPositions) {
      for (const candidateX of xPositions) {
        const diff = Math.abs(selectedX.value - candidateX.value);
        if (diff <= ALIGNMENT_TOLERANCE) {
          const range = getConnectorRange('vertical', selectedRect, rect);
          const distance = Math.abs(range.end - range.start);
          if (distance > MAX_GUIDE_DISTANCE) continue;
          const key = `v:${candidate.dataset.buildKey || candidate.tagName}:${selectedX.name}:${candidateX.name}:${Math.round(candidateX.value)}:${Math.round(range.start)}:${Math.round(range.end)}`;
          if (seen.has(key)) continue;
          seen.add(key);
          guides.push({
            key,
            orientation: 'vertical',
            position: candidateX.value,
            start: range.start,
            end: range.end,
            distance,
            diff,
          });
        }
      }
    }

    for (const selectedY of selectedYPositions) {
      for (const candidateY of yPositions) {
        const diff = Math.abs(selectedY.value - candidateY.value);
        if (diff <= ALIGNMENT_TOLERANCE) {
          const range = getConnectorRange('horizontal', selectedRect, rect);
          const distance = Math.abs(range.end - range.start);
          if (distance > MAX_GUIDE_DISTANCE) continue;
          const key = `h:${candidate.dataset.buildKey || candidate.tagName}:${selectedY.name}:${candidateY.name}:${Math.round(candidateY.value)}:${Math.round(range.start)}:${Math.round(range.end)}`;
          if (seen.has(key)) continue;
          seen.add(key);
          guides.push({
            key,
            orientation: 'horizontal',
            position: candidateY.value,
            start: range.start,
            end: range.end,
            distance,
            diff,
          });
        }
      }
    }
  });

  const pickBest = (orientation: 'vertical' | 'horizontal') =>
    guides
      .filter((guide) => guide.orientation === orientation)
      .sort((a, b) => {
        if (a.distance !== b.distance) return a.distance - b.distance;
        if (a.diff !== b.diff) return a.diff - b.diff;
        return a.key.localeCompare(b.key);
      })
      .slice(0, MAX_GUIDES_PER_ORIENTATION);

  return [...pickBest('vertical'), ...pickBest('horizontal')];
}

function TargetTypeGlyph({ targetType, className }: { targetType: TargetType; className?: string }) {
  switch (targetType) {
    case 'group':
      return <Folder className={className} />;
    case 'icon':
      return <Shapes className={className} />;
    case 'button':
      return <SquareMousePointer className={className} />;
    case 'input':
      return <TextCursorInput className={className} />;
    case 'text':
      return <TypeIcon className={className} />;
    case 'image':
      return <ImageIcon className={className} />;
    case 'link':
      return <LinkIcon className={className} />;
    case 'container':
      return <Box className={className} />;
    default:
      return <Component className={className} />;
  }
}

function TargetOptionIcon({ target }: { target: AvailableTarget }) {
  if (target.targetType === 'icon' && target.iconMarkup) {
    return (
      <span
        className="inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center text-muted-foreground [&_svg]:h-3.5 [&_svg]:w-3.5"
        dangerouslySetInnerHTML={{ __html: target.iconMarkup }}
      />
    );
  }

  return <TargetTypeGlyph targetType={target.targetType} className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />;
}

export function BuildOverlay() {
  const { pathname } = useLocation();
  const { profile } = useAuth();
  const [active, setActive] = useState(false);
  const [selectedSelector, setSelectedSelector] = useState<string | null>(null);
  const [selectedSelectors, setSelectedSelectors] = useState<string[]>([]);
  const [selectedLabel, setSelectedLabel] = useState<string>('Click an element');
  const [selectionLayers, setSelectionLayers] = useState<SelectionLayer[]>([]);
  const [selectedLayerIndex, setSelectedLayerIndex] = useState(0);
  const [availableTargets, setAvailableTargets] = useState<AvailableTarget[]>([]);
  const [pageGroups, setPageGroups] = useState<BuildGroup[]>([]);
  const [pageParentAssignments, setPageParentAssignments] = useState<Record<string, string>>({});
  const [pageTargetOrder, setPageTargetOrder] = useState<Record<string, number>>({});
  const [pageOffsets, setPageOffsets] = useState<Record<string, StoredOffset>>({});
  const [selectedRects, setSelectedRects] = useState<SelectedRect[]>([]);
  const [hoveredRect, setHoveredRect] = useState<SelectedRect | null>(null);
  const [styleControls, setStyleControls] = useState<StyleControlState>({
    width: '',
    height: '',
    fontSize: '',
    color: '#ffffff',
    backgroundColor: '#000000',
  });
  const [alignmentGuides, setAlignmentGuides] = useState<AlignmentGuideSegment[]>([]);
  const [showAlignmentGuides, setShowAlignmentGuides] = useState(false);
  const [buttonPosition, setButtonPosition] = useState<ButtonPosition | null>(null);
  const [buildPanelFrame, setBuildPanelFrame] = useState<PanelFrame | null>(null);
  const [layersPanelFrame, setLayersPanelFrame] = useState<PanelFrame | null>(null);
  const [multiSelectMode, setMultiSelectMode] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [targetMenuOpen, setTargetMenuOpen] = useState(false);
  const [layersPanelOpen, setLayersPanelOpen] = useState(false);
  const [expandedTargetSelectors, setExpandedTargetSelectors] = useState<Set<string>>(() => new Set());
  const [draggedLayerSelector, setDraggedLayerSelector] = useState<string | null>(null);
  const [layerDropIndicator, setLayerDropIndicator] = useState<{ targetSelector: string | null; position: 'before' | 'after' | 'inside' | 'root' } | null>(null);
  const suppressClickRef = useRef(false);
  const suppressSelectionClickRef = useRef(false);
  const dragStateRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    moved: boolean;
  } | null>(null);
  const panelDragRef = useRef<{
    pointerId: number;
    panel: 'build' | 'layers';
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const panelResizeRef = useRef<{
    pointerId: number;
    panel: 'build' | 'layers';
    edge: PanelResizeEdge;
    startX: number;
    startY: number;
    origin: PanelFrame;
  } | null>(null);
  const selectedDragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    origins: Record<string, { x: number; y: number; label: string }>;
    detachedOrigins: Record<string, { x: number; y: number; label: string }>;
    moved: boolean;
  } | null>(null);
  const selectedResizeRef = useRef<{
    pointerId: number;
    edge: ResizeEdge;
    startX: number;
    startY: number;
    selector: string;
    origin: {
      x: number;
      y: number;
      width: number;
      height: number;
      label: string;
      fontSize?: number;
      color?: string;
      backgroundColor?: string;
    };
    minWidth: number;
    minHeight: number;
    aspectRatio: number;
    childOrigins: Record<string, { x: number; y: number; label: string }>;
    detachedOrigins: Record<string, { x: number; y: number; label: string }>;
    moved: boolean;
  } | null>(null);
  const guideHideTimeoutRef = useRef<number | null>(null);
  const layersTreeScrollRef = useRef<HTMLDivElement | null>(null);
  const appliedOffsetSelectorsRef = useRef<Set<string>>(new Set());

  const canBuild = useMemo(
    () => Boolean(profile?.effective_permissions?.includes('build.use')),
    [profile?.effective_permissions],
  );
  const selectedTargetValue = selectedGroupId ? `group:${selectedGroupId}` : (selectedSelector || undefined);
  const selectedTargetOption = useMemo(
    () => availableTargets.find((target) => target.selector === selectedTargetValue) || null,
    [availableTargets, selectedTargetValue],
  );
  const availableTargetMap = useMemo(
    () => new Map(availableTargets.map((target) => [target.selector, target])),
    [availableTargets],
  );
  const targetChildrenByParent = useMemo(() => {
    const next = new Map<string | null, AvailableTarget[]>();
    availableTargets.forEach((target) => {
      const parentKey = target.parentSelector || null;
      const existing = next.get(parentKey);
      if (existing) {
        existing.push(target);
        return;
      }
      next.set(parentKey, [target]);
    });
    return next;
  }, [availableTargets]);
  const selectedElementTarget = useMemo(
    () => availableTargets.find((target) => target.kind === 'element' && target.selector === selectedSelector) || null,
    [availableTargets, selectedSelector],
  );
  const selectedTargetDescendants = useMemo(() => {
    if (!selectedSelector) return new Set<string>();
    const next = new Set<string>();
    const walk = (parentSelector: string) => {
      const children = targetChildrenByParent.get(parentSelector) || [];
      children.forEach((child) => {
        next.add(child.selector);
        walk(child.selector);
      });
    };
    walk(selectedSelector);
    return next;
  }, [selectedSelector, targetChildrenByParent]);
  const reparentCandidateTargets = useMemo(
    () => availableTargets.filter((target) => (
      target.kind === 'element' &&
      target.selector !== selectedSelector &&
      !selectedTargetDescendants.has(target.selector)
    )),
    [availableTargets, selectedSelector, selectedTargetDescendants],
  );
  const isLogicallyDescendantOf = (rootSelector: string, candidateSelector: string) => {
    let current = availableTargetMap.get(candidateSelector)?.parentSelector || null;
    while (current) {
      if (current === rootSelector) return true;
      current = availableTargetMap.get(current)?.parentSelector || null;
    }
    return false;
  };
  const getDetachedDomDescendantSelectors = (rootSelector: string) => {
    const detachedSelectors = availableTargets
      .filter((target) => target.kind === 'element')
      .map((target) => target.selector)
      .filter((candidateSelector) => (
        candidateSelector !== rootSelector &&
        isSelectorDomDescendant(rootSelector, candidateSelector) &&
        !isLogicallyDescendantOf(rootSelector, candidateSelector)
      ));

    return resolvePositionSelectors(detachedSelectors);
  };
  useEffect(() => {
    setExpandedTargetSelectors((current) => {
      const valid = new Set<string>();
      current.forEach((selector) => {
        const children = targetChildrenByParent.get(selector);
        if (children?.length) valid.add(selector);
      });
      if (valid.size === current.size) {
        let unchanged = true;
        current.forEach((selector) => {
          if (!valid.has(selector)) unchanged = false;
        });
        if (unchanged) return current;
      }
      return valid;
    });
  }, [targetChildrenByParent]);
  useEffect(() => {
    if (!selectedTargetValue) return;

    const nextAncestors = new Set<string>();
    let current = availableTargetMap.get(selectedTargetValue)?.parentSelector || null;

    while (current) {
      nextAncestors.add(current);
      current = availableTargetMap.get(current)?.parentSelector || null;
    }

    if (!nextAncestors.size) return;

    setExpandedTargetSelectors((currentExpanded) => {
      let changed = false;
      const next = new Set(currentExpanded);
      nextAncestors.forEach((selector) => {
        if (!next.has(selector)) {
          next.add(selector);
          changed = true;
        }
      });
      return changed ? next : currentExpanded;
    });
  }, [availableTargetMap, selectedTargetValue]);
  useEffect(() => {
    if (!layersPanelOpen || !selectedTargetValue) return;

    const scrollToSelectedRow = () => {
      const container = layersTreeScrollRef.current;
      if (!container) return;

      const selectedRow = container.querySelector<HTMLElement>(`[data-build-layer-row="${CSS.escape(selectedTargetValue)}"]`);
      if (!selectedRow) return;

      selectedRow.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
      });
    };

    const frame = window.requestAnimationFrame(scrollToSelectedRow);
    return () => window.cancelAnimationFrame(frame);
  }, [expandedTargetSelectors, layersPanelOpen, selectedTargetValue]);

  const reloadPageOffsets = () => {
    const storage = readStorage();
    const nextPageOffsets = sanitizePageOffsets(storage[pathname] || {});
    const nextGroups = readGroupStorage()[pathname] || [];
    const nextParentAssignments = readParentStorage()[pathname] || {};
    const nextTargetOrder = readOrderStorage()[pathname] || {};
    setPageGroups(nextGroups);
    setPageParentAssignments(nextParentAssignments);
    setPageTargetOrder(nextTargetOrder);
    setPageOffsets(nextPageOffsets);
  };

  useEffect(() => {
    if (!canBuild) {
      setActive(false);
      setSelectedSelector(null);
      setSelectedSelectors([]);
      setSelectedLabel('Click an element');
      setSelectionLayers([]);
      setSelectedLayerIndex(0);
      setAvailableTargets([]);
      setPageGroups([]);
      setPageParentAssignments({});
      setPageTargetOrder({});
      setPageOffsets({});
      setSelectedGroupId(null);
      setTargetMenuOpen(false);
      setLayersPanelOpen(false);
      setExpandedTargetSelectors(new Set());
      return;
    }

    const storage = readStorage();
    const nextPageOffsets = sanitizePageOffsets(storage[pathname] || {});
    const nextGroups = readGroupStorage()[pathname] || [];
    const nextParentAssignments = readParentStorage()[pathname] || {};
    const nextTargetOrder = readOrderStorage()[pathname] || {};
    setPageGroups(nextGroups);
    setPageParentAssignments(nextParentAssignments);
    setPageTargetOrder(nextTargetOrder);
    setPageOffsets(nextPageOffsets);
    window.requestAnimationFrame(() => {
      setAvailableTargets(getAvailableTargets(nextGroups, nextParentAssignments, nextTargetOrder));
    });
  }, [canBuild, pathname]);

  useEffect(() => {
    if (!canBuild || !active) return;

    const handleStorageUpdate = () => {
      reloadPageOffsets();
      window.requestAnimationFrame(() => {
        setAvailableTargets(getAvailableTargets(
          readGroupStorage()[pathname] || [],
          readParentStorage()[pathname] || {},
          readOrderStorage()[pathname] || {},
        ));
      });
    };

    window.addEventListener(BUILD_STORAGE_EVENT, handleStorageUpdate);
    return () => window.removeEventListener(BUILD_STORAGE_EVENT, handleStorageUpdate);
  }, [active, canBuild, pathname]);

  useEffect(() => {
    if (!canBuild || !active) return;

    const root = getAutoBuildRoot();
    let animationFrame = 0;

    const scan = () => {
      clearAutoBuildTargets(root);
      const elements = root.querySelectorAll('*');
      elements.forEach((element) => {
        if (isBuildElement(element)) {
          registerAutoBuildTarget(element, pathname, root);
        }
      });
      if (active) {
        applyStoredOffsets(pageOffsets);
      }
      setAvailableTargets(getAvailableTargets(pageGroups, pageParentAssignments, pageTargetOrder));
    };

    const scheduleScan = () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(scan);
    };

    scheduleScan();

    const observer = new MutationObserver(() => {
      scheduleScan();
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'data-build-ignore', 'aria-label'],
    });

    return () => {
      if (animationFrame) cancelAnimationFrame(animationFrame);
      observer.disconnect();
    };
  }, [active, canBuild, pageGroups, pageOffsets, pageParentAssignments, pageTargetOrder, pathname]);

  useEffect(() => {
    const previouslyAppliedSelectors = appliedOffsetSelectorsRef.current;

    if (!canBuild || !active) {
      clearStoredOffsetsBySelectors(previouslyAppliedSelectors);
      appliedOffsetSelectorsRef.current = new Set();
      return;
    }

    const nextSelectors = new Set(Object.keys(pageOffsets));
    const selectorsToClear: string[] = [];

    previouslyAppliedSelectors.forEach((selector) => {
      if (!nextSelectors.has(selector)) {
        selectorsToClear.push(selector);
      }
    });

    clearStoredOffsetsBySelectors(selectorsToClear);
    applyStoredOffsets(pageOffsets);
    appliedOffsetSelectorsRef.current = nextSelectors;
  }, [active, canBuild, pageOffsets]);

  useEffect(() => (
    () => {
      clearStoredOffsetsBySelectors(appliedOffsetSelectorsRef.current);
      appliedOffsetSelectorsRef.current = new Set();
    }
  ), []);

  useEffect(() => {
    if (!canBuild) {
      setButtonPosition(null);
      return;
    }

    try {
      const raw = window.localStorage.getItem(BUTTON_POSITION_STORAGE_KEY);
      if (!raw) {
        setButtonPosition(getDefaultButtonPosition());
        return;
      }

      const parsed = JSON.parse(raw) as ButtonPosition;
      setButtonPosition(clampButtonPosition(parsed));
    } catch {
      setButtonPosition(getDefaultButtonPosition());
    }
  }, [canBuild]);

  useEffect(() => {
    if (!buttonPosition) return;
    window.localStorage.setItem(BUTTON_POSITION_STORAGE_KEY, JSON.stringify(buttonPosition));
  }, [buttonPosition]);

  useEffect(() => {
    if (!active || !buttonPosition) return;
    setBuildPanelFrame((current) => current || getDefaultBuildPanelFrame(buttonPosition));
  }, [active, buttonPosition]);

  useEffect(() => {
    if (!active || !layersPanelOpen) return;
    setLayersPanelFrame((current) => current || getDefaultLayersPanelFrame(buildPanelFrame || getDefaultBuildPanelFrame(buttonPosition || getDefaultButtonPosition())));
  }, [active, buildPanelFrame, buttonPosition, layersPanelOpen]);

  useEffect(() => {
    return () => {
      if (guideHideTimeoutRef.current) {
        window.clearTimeout(guideHideTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!canBuild) {
      delete document.body.dataset.buildModeActive;
      return;
    }

    if (active) {
      document.body.dataset.buildModeActive = 'true';
    } else {
      delete document.body.dataset.buildModeActive;
    }

    return () => {
      delete document.body.dataset.buildModeActive;
    };
  }, [active, canBuild]);

  useEffect(() => {
    if (!buttonPosition || !active) return;

    const handleResize = () => {
      setBuildPanelFrame((current) => (current ? clampPanelFrame(current) : current));
      setLayersPanelFrame((current) => (current ? clampPanelFrame(current) : current));
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [active, buttonPosition]);

  useEffect(() => {
    if (!active) return;

    const root = getAutoBuildRoot();

    const handlePointerMove = (event: PointerEvent) => {
      if (selectedDragRef.current?.moved) return;
      if (!isBuildElement(event.target)) {
        setHoveredRect(null);
        return;
      }

      const primaryTarget = getPrimarySelectableTargetAtPoint(event.clientX, event.clientY, root, event.target);
      if (!primaryTarget) {
        setHoveredRect(null);
        return;
      }

      const rect = primaryTarget.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) {
        setHoveredRect(null);
        return;
      }

      setHoveredRect({
        selector: getElementSelector(primaryTarget),
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      });
    };

    const handlePointerLeaveWindow = () => {
      setHoveredRect(null);
    };

    const handleClick = (event: MouseEvent) => {
      if (suppressSelectionClickRef.current) {
        suppressSelectionClickRef.current = false;
        return;
      }
      if (event.target instanceof Element && event.target.closest('[data-build-overlay-ui="true"]')) {
        return;
      }
      const fallbackTarget = isBuildElement(event.target) ? event.target : null;
      const primaryTarget = getPrimarySelectableTargetAtPoint(event.clientX, event.clientY, root, fallbackTarget);
      if (!primaryTarget) return;

      const filteredLayers = buildSelectionLayersForPoint(primaryTarget, event.clientX, event.clientY, root);

      if (!filteredLayers.length) return;

      event.preventDefault();
      event.stopPropagation();

      const additiveMode = event.shiftKey || multiSelectMode;

      if (additiveMode) {
        const targetLayer = filteredLayers[0];
        const isAlreadySelected = selectedSelectors.includes(targetLayer.selector);
        const nextSelectedSelectors = isAlreadySelected
          ? selectedSelectors.filter((selector) => selector !== targetLayer.selector)
          : [...selectedSelectors, targetLayer.selector];

        setSelectionLayers(filteredLayers);
        setSelectedLayerIndex(0);
        setSelectedSelector(targetLayer.selector);
        setSelectedLabel(targetLayer.label);
        setSelectedSelectors(nextSelectedSelectors.length ? nextSelectedSelectors : [targetLayer.selector]);
        setSelectedGroupId(null);
        setStyleControls(getStyleControlState(targetLayer.selector));
        setLayersPanelOpen(true);
        return;
      }

      setSelectionLayers(filteredLayers);
      setSelectedLayerIndex(0);
      setSelectedSelector(filteredLayers[0].selector);
      setSelectedLabel(filteredLayers[0].label);
      setSelectedSelectors([filteredLayers[0].selector]);
      setSelectedGroupId(null);
      setStyleControls(getStyleControlState(filteredLayers[0].selector));
      setLayersPanelOpen(true);
    };

    document.addEventListener('pointermove', handlePointerMove, true);
    window.addEventListener('blur', handlePointerLeaveWindow);
    document.addEventListener('click', handleClick, true);
    return () => {
      document.removeEventListener('pointermove', handlePointerMove, true);
      window.removeEventListener('blur', handlePointerLeaveWindow);
      document.removeEventListener('click', handleClick, true);
    };
  }, [active, multiSelectMode, selectedSelectors]);

  useEffect(() => {
    if (!active || !selectedSelector) return;
    const root = getAutoBuildRoot();

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      if (event.target instanceof Element && event.target.closest('[data-build-resize-handle="true"]')) return;

      const selectedElement = document.querySelector(selectedSelector);
      if (!isBuildElement(selectedElement)) return;
      const pointerTarget = getPrimarySelectableTargetAtPoint(
        event.clientX,
        event.clientY,
        root,
        isBuildElement(event.target) ? event.target : null,
      );
      const dragTarget = isBuildElement(event.target) ? event.target : null;
      const isInsideSelectedElement =
        (dragTarget && (selectedElement === dragTarget || selectedElement.contains(dragTarget))) ||
        (pointerTarget && (selectedElement === pointerTarget || selectedElement.contains(pointerTarget)));
      if (!isInsideSelectedElement) return;

      event.preventDefault();
      const motionRootSelectors = getMotionRootSelectors(selectedSelector, selectedSelectors, selectedGroupId);
      const dragSelectors = resolveMotionSelectors(motionRootSelectors, pageParentAssignments);
      const origins = dragSelectors.reduce<Record<string, { x: number; y: number; label: string }>>((acc, selector) => {
        acc[selector] = {
          x: pageOffsets[selector]?.x || 0,
          y: pageOffsets[selector]?.y || 0,
          label: pageOffsets[selector]?.label || availableTargets.find((target) => target.selector === selector)?.label || selectedLabel,
        };
        return acc;
      }, {});
      const detachedSelectors = Array.from(new Set(
        motionRootSelectors
          .flatMap((selector) => getDetachedDomDescendantSelectors(selector))
          .filter((selector) => !dragSelectors.includes(selector)),
      ));
      const detachedOrigins = detachedSelectors.reduce<Record<string, { x: number; y: number; label: string }>>((acc, selector) => {
        acc[selector] = {
          x: pageOffsets[selector]?.x || 0,
          y: pageOffsets[selector]?.y || 0,
          label: pageOffsets[selector]?.label || availableTargets.find((target) => target.selector === selector)?.label || selector,
        };
        return acc;
      }, {});

      selectedDragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        origins,
        detachedOrigins,
        moved: false,
      };
    };

    const handlePointerMove = (event: PointerEvent) => {
      const dragState = selectedDragRef.current;
      if (!dragState || dragState.pointerId !== event.pointerId) return;

      const deltaX = event.clientX - dragState.startX;
      const deltaY = event.clientY - dragState.startY;
      if (!dragState.moved && (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3)) {
        dragState.moved = true;
        setShowAlignmentGuides(true);
      }

      if (!dragState.moved) return;

      setPageOffsets((current) => {
        const next = { ...current };
        Object.entries(dragState.origins).forEach(([selector, origin]) => {
          next[selector] = {
            ...(current[selector] || { label: origin.label }),
            x: origin.x + deltaX,
            y: origin.y + deltaY,
            label: current[selector]?.label || origin.label,
          };
        });
        Object.entries(dragState.detachedOrigins).forEach(([selector, origin]) => {
          next[selector] = {
            ...(current[selector] || { label: origin.label }),
            x: origin.x - deltaX,
            y: origin.y - deltaY,
            label: current[selector]?.label || origin.label,
          };
        });
        const storage = readStorage();
        writeStorage({
          ...storage,
          [pathname]: next,
        });
        return next;
      });
      Object.entries(dragState.origins).forEach(([selector, origin]) => {
        applyOffset(selector, {
          ...(pageOffsets[selector] || { label: origin.label }),
          x: origin.x + deltaX,
          y: origin.y + deltaY,
          label: pageOffsets[selector]?.label || origin.label,
        });
      });
      Object.entries(dragState.detachedOrigins).forEach(([selector, origin]) => {
        applyOffset(selector, {
          ...(pageOffsets[selector] || { label: origin.label }),
          x: origin.x - deltaX,
          y: origin.y - deltaY,
          label: pageOffsets[selector]?.label || origin.label,
        });
      });
    };

    const handlePointerUp = (event: PointerEvent) => {
      const dragState = selectedDragRef.current;
      if (!dragState || dragState.pointerId !== event.pointerId) return;
      suppressSelectionClickRef.current = dragState.moved;
      selectedDragRef.current = null;
      setShowAlignmentGuides(false);
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('pointermove', handlePointerMove, true);
    document.addEventListener('pointerup', handlePointerUp, true);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('pointermove', handlePointerMove, true);
      document.removeEventListener('pointerup', handlePointerUp, true);
    };
  }, [active, availableTargets, pageOffsets, pageParentAssignments, pathname, selectedGroupId, selectedLabel, selectedSelector, selectedSelectors]);

  useEffect(() => {
    if (!active || !selectedSelector || selectedGroupId) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      if (!(event.target instanceof HTMLElement)) return;

      const handle = event.target.closest<HTMLElement>('[data-build-resize-handle="true"]');
      if (!handle) return;

      const edge = handle.dataset.buildResizeEdge as ResizeEdge | undefined;
      const selector = handle.dataset.buildResizeSelector;
      if (!edge || selector !== selectedSelector) return;

      const selectedElement = document.querySelector(selectedSelector);
      if (!isBuildElement(selectedElement)) return;

      const rect = selectedElement.getBoundingClientRect();
      const currentOffset = pageOffsets[selectedSelector];
      const intrinsicSize = measureIntrinsicContentSize(selectedElement);
      const selectedTarget = availableTargets.find((target) => target.selector === selectedSelector) || null;
      const selectedComputedStyle = window.getComputedStyle(selectedElement);
      const allowsTextShrink =
        selectedTarget?.targetType === 'text' ||
        (selectedElement instanceof HTMLElement && (
          selectedElement.classList.contains('truncate') ||
          selectedComputedStyle.textOverflow === 'ellipsis' ||
          isOverflowClippingValue(selectedComputedStyle.overflowX)
        ));

      event.preventDefault();
      event.stopPropagation();

      selectedResizeRef.current = {
        childOrigins: resolveMotionSelectors([selectedSelector], pageParentAssignments)
          .filter((childSelector) => childSelector !== selectedSelector)
          .reduce<Record<string, { x: number; y: number; label: string }>>((acc, childSelector) => {
            if (isSelectorDomDescendant(selectedSelector, childSelector)) return acc;
            acc[childSelector] = {
              x: pageOffsets[childSelector]?.x || 0,
              y: pageOffsets[childSelector]?.y || 0,
              label: pageOffsets[childSelector]?.label || availableTargets.find((target) => target.selector === childSelector)?.label || childSelector,
            };
            return acc;
          }, {}),
        detachedOrigins: getDetachedDomDescendantSelectors(selectedSelector)
          .reduce<Record<string, { x: number; y: number; label: string }>>((acc, childSelector) => {
            acc[childSelector] = {
              x: pageOffsets[childSelector]?.x || 0,
              y: pageOffsets[childSelector]?.y || 0,
              label: pageOffsets[childSelector]?.label || availableTargets.find((target) => target.selector === childSelector)?.label || childSelector,
            };
            return acc;
          }, {}),
        pointerId: event.pointerId,
        edge,
        startX: event.clientX,
        startY: event.clientY,
        selector: selectedSelector,
        origin: {
          x: currentOffset?.x || 0,
          y: currentOffset?.y || 0,
          width: currentOffset?.width || rect.width,
          height: currentOffset?.height || rect.height,
          label: currentOffset?.label || selectedLabel,
          fontSize: currentOffset?.fontSize,
          color: currentOffset?.color,
          backgroundColor: currentOffset?.backgroundColor,
        },
        minWidth: allowsTextShrink
          ? MIN_RESIZE_DIMENSION
          : Math.max(MIN_RESIZE_DIMENSION, Math.min(Math.ceil(rect.width), intrinsicSize.width)),
        minHeight: allowsTextShrink
          ? MIN_RESIZE_DIMENSION
          : Math.max(MIN_RESIZE_DIMENSION, Math.min(Math.ceil(rect.height), intrinsicSize.height)),
        aspectRatio: rect.height > 0 ? rect.width / rect.height : 1,
        moved: false,
      };
    };

    const handlePointerMove = (event: PointerEvent) => {
      const resizeState = selectedResizeRef.current;
      if (!resizeState || resizeState.pointerId !== event.pointerId) return;

      const rawDeltaX = event.clientX - resizeState.startX;
      const rawDeltaY = event.clientY - resizeState.startY;
      if (!resizeState.moved && (Math.abs(rawDeltaX) > 2 || Math.abs(rawDeltaY) > 2)) {
        resizeState.moved = true;
      }

      let nextX = resizeState.origin.x;
      let nextY = resizeState.origin.y;
      let nextWidth = resizeState.origin.width;
      let nextHeight = resizeState.origin.height;
      let appliedDeltaX = 0;
      let appliedDeltaY = 0;
      const lockAspectRatio = event.shiftKey || event.ctrlKey;
      const isLeftEdge = resizeState.edge === 'left' || resizeState.edge === 'top-left' || resizeState.edge === 'bottom-left';
      const isRightEdge = resizeState.edge === 'right' || resizeState.edge === 'top-right' || resizeState.edge === 'bottom-right';
      const isTopEdge = resizeState.edge === 'top' || resizeState.edge === 'top-left' || resizeState.edge === 'top-right';
      const isBottomEdge = resizeState.edge === 'bottom' || resizeState.edge === 'bottom-left' || resizeState.edge === 'bottom-right';
      const isCornerHandle = resizeState.edge.includes('-');

      const minWidthForAspect = resizeState.aspectRatio > 0
        ? Math.max(resizeState.minWidth, resizeState.minHeight * resizeState.aspectRatio)
        : resizeState.minWidth;
      const minHeightForAspect = resizeState.aspectRatio > 0
        ? Math.max(resizeState.minHeight, resizeState.minWidth / resizeState.aspectRatio)
        : resizeState.minHeight;

      if (lockAspectRatio && isCornerHandle && resizeState.aspectRatio > 0) {
        const horizontalRatioDelta = Math.abs(rawDeltaX) / Math.max(1, resizeState.origin.width);
        const verticalRatioDelta = Math.abs(rawDeltaY) / Math.max(1, resizeState.origin.height);

        if (horizontalRatioDelta >= verticalRatioDelta) {
          nextWidth = Math.max(minWidthForAspect, resizeState.origin.width + (isRightEdge ? rawDeltaX : -rawDeltaX));
          nextHeight = Math.max(minHeightForAspect, nextWidth / resizeState.aspectRatio);
        } else {
          nextHeight = Math.max(minHeightForAspect, resizeState.origin.height + (isBottomEdge ? rawDeltaY : -rawDeltaY));
          nextWidth = Math.max(minWidthForAspect, nextHeight * resizeState.aspectRatio);
        }
      } else {
        if (isLeftEdge) {
          nextWidth = Math.max(resizeState.minWidth, resizeState.origin.width - rawDeltaX);
        } else if (isRightEdge) {
          nextWidth = Math.max(resizeState.minWidth, resizeState.origin.width + rawDeltaX);
        }

        if (isTopEdge) {
          nextHeight = Math.max(resizeState.minHeight, resizeState.origin.height - rawDeltaY);
        } else if (isBottomEdge) {
          nextHeight = Math.max(resizeState.minHeight, resizeState.origin.height + rawDeltaY);
        }
      }

      if (isLeftEdge) {
        appliedDeltaX = resizeState.origin.width - nextWidth;
        nextX = resizeState.origin.x + appliedDeltaX;
      }

      if (isTopEdge) {
        appliedDeltaY = resizeState.origin.height - nextHeight;
        nextY = resizeState.origin.y + appliedDeltaY;
      }

      setPageOffsets((current) => {
        const next = { ...current };
        next[resizeState.selector] = {
          ...(current[resizeState.selector] || { label: resizeState.origin.label }),
          x: nextX,
          y: nextY,
          width: nextWidth,
          height: nextHeight,
          label: current[resizeState.selector]?.label || resizeState.origin.label,
          fontSize: current[resizeState.selector]?.fontSize ?? resizeState.origin.fontSize,
          color: current[resizeState.selector]?.color ?? resizeState.origin.color,
          backgroundColor: current[resizeState.selector]?.backgroundColor ?? resizeState.origin.backgroundColor,
        };

        Object.entries(resizeState.childOrigins).forEach(([childSelector, childOrigin]) => {
          next[childSelector] = {
            ...(current[childSelector] || { label: childOrigin.label }),
            x: childOrigin.x + appliedDeltaX,
            y: childOrigin.y + appliedDeltaY,
            label: current[childSelector]?.label || childOrigin.label,
          };
        });
        Object.entries(resizeState.detachedOrigins).forEach(([childSelector, childOrigin]) => {
          next[childSelector] = {
            ...(current[childSelector] || { label: childOrigin.label }),
            x: childOrigin.x - appliedDeltaX,
            y: childOrigin.y - appliedDeltaY,
            label: current[childSelector]?.label || childOrigin.label,
          };
        });

        const storage = readStorage();
        writeStorage({
          ...storage,
          [pathname]: next,
        });

        applyOffset(resizeState.selector, next[resizeState.selector]);
        Object.keys(resizeState.childOrigins).forEach((childSelector) => {
          applyOffset(childSelector, next[childSelector]);
        });
        Object.keys(resizeState.detachedOrigins).forEach((childSelector) => {
          applyOffset(childSelector, next[childSelector]);
        });

        return next;
      });

      setStyleControls((current) => ({
        ...current,
        width: `${Math.max(1, Math.round(nextWidth))}`,
        height: `${Math.max(1, Math.round(nextHeight))}`,
      }));
    };

    const handlePointerUp = (event: PointerEvent) => {
      const resizeState = selectedResizeRef.current;
      if (!resizeState || resizeState.pointerId !== event.pointerId) return;
      suppressSelectionClickRef.current = resizeState.moved;
      selectedResizeRef.current = null;
    };

    document.addEventListener('pointerdown', handlePointerDown, true);
    document.addEventListener('pointermove', handlePointerMove, true);
    document.addEventListener('pointerup', handlePointerUp, true);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown, true);
      document.removeEventListener('pointermove', handlePointerMove, true);
      document.removeEventListener('pointerup', handlePointerUp, true);
    };
  }, [active, availableTargets, pageOffsets, pageParentAssignments, pathname, selectedGroupId, selectedLabel, selectedSelector]);

  useEffect(() => {
    if (!active || !selectedSelector) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const step = event.shiftKey ? 10 : 1;
      let deltaX = 0;
      let deltaY = 0;

      switch (event.key) {
        case 'ArrowUp':
          deltaY = -step;
          break;
        case 'ArrowDown':
          deltaY = step;
          break;
        case 'ArrowLeft':
          deltaX = -step;
          break;
        case 'ArrowRight':
          deltaX = step;
          break;
        default:
          return;
      }

      event.preventDefault();

      setPageOffsets((current) => {
        const selectors = resolveMotionSelectors(
          getMotionRootSelectors(selectedSelector, selectedSelectors, selectedGroupId),
          pageParentAssignments,
        );
        const next = { ...current };
        selectors.forEach((selector) => {
          const label = current[selector]?.label || availableTargets.find((target) => target.selector === selector)?.label || selectedLabel;
          const existing = current[selector] || { x: 0, y: 0, label };
          next[selector] = {
            ...existing,
            x: existing.x + deltaX,
            y: existing.y + deltaY,
            label: existing.label || label,
          };
        });

        const storage = readStorage();
        writeStorage({
          ...storage,
          [pathname]: next,
        });
        selectors.forEach((selector) => applyOffset(selector, next[selector]));
        return next;
      });
      pulseAlignmentGuides();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [active, availableTargets, pageParentAssignments, pathname, selectedGroupId, selectedLabel, selectedSelector, selectedSelectors]);

  useEffect(() => {
    if (!selectedSelector) {
      setSelectedRects([]);
      setStyleControls({
        width: '',
        height: '',
        fontSize: '',
        color: '#ffffff',
        backgroundColor: '#000000',
      });
      return;
    }

    setStyleControls(getStyleControlState(selectedSelector));
  }, [selectedSelector]);

  useEffect(() => {
    if (!active || !(selectedSelectors.length || selectedSelector)) {
      setSelectedRects([]);
      return;
    }

    let frame = 0;

    const updateRect = () => {
      const selectors = getSelectionSelectorsWithPrimary(selectedSelector, selectedSelectors);
      const nextRects = selectors.reduce<SelectedRect[]>((acc, selector) => {
        const element = document.querySelector(selector);
        if (!isBuildElement(element)) return acc;
        const rect = element.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          acc.push({
            selector,
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height,
          });
        }
        return acc;
      }, []);
      setSelectedRects(nextRects);

      frame = window.requestAnimationFrame(updateRect);
    };

    frame = window.requestAnimationFrame(updateRect);
    return () => window.cancelAnimationFrame(frame);
  }, [active, pageOffsets, selectedSelector, selectedSelectors]);

  useEffect(() => {
    if (!active) {
      setHoveredRect(null);
    }
  }, [active]);

  useEffect(() => {
    if (!active || !selectedSelector || !showAlignmentGuides) {
      setAlignmentGuides([]);
      return;
    }

    const frame = window.requestAnimationFrame(() => {
      setAlignmentGuides(getAlignmentGuidesForSelector(selectedSelector));
    });

    return () => window.cancelAnimationFrame(frame);
  }, [active, pageOffsets, selectedSelector, showAlignmentGuides]);

  const pulseAlignmentGuides = (duration = 450) => {
    setShowAlignmentGuides(true);
    if (guideHideTimeoutRef.current) {
      window.clearTimeout(guideHideTimeoutRef.current);
    }
    guideHideTimeoutRef.current = window.setTimeout(() => {
      setShowAlignmentGuides(false);
      guideHideTimeoutRef.current = null;
    }, duration);
  };

  const selectLayerByIndex = (index: number) => {
    if (!selectionLayers.length) return;
    const safeIndex = ((index % selectionLayers.length) + selectionLayers.length) % selectionLayers.length;
    setSelectedLayerIndex(safeIndex);
    setSelectedSelector(selectionLayers[safeIndex].selector);
    setSelectedLabel(selectionLayers[safeIndex].label);
    setSelectedSelectors([selectionLayers[safeIndex].selector]);
    setSelectedGroupId(null);
    setStyleControls(getStyleControlState(selectionLayers[safeIndex].selector));
  };

  const handleTargetSelect = (value: string) => {
    const nextTarget = availableTargets.find((target) => target.selector === value);
    if (!nextTarget) return;

    if (nextTarget.kind === 'group' && nextTarget.members?.length) {
      setSelectedGroupId(nextTarget.groupId || null);
      setSelectedSelectors(nextTarget.members);
      setSelectedSelector(nextTarget.members[0]);
      setSelectedLabel(nextTarget.label);
      setSelectionLayers([]);
      setSelectedLayerIndex(0);
      setStyleControls(getStyleControlState(nextTarget.members[0]));
      setTargetMenuOpen(false);
      return;
    }

    setSelectedGroupId(null);
    setSelectedSelector(nextTarget.selector);
    setSelectedLabel(nextTarget.label);
    setSelectedSelectors([nextTarget.selector]);
    setSelectionLayers([]);
    setSelectedLayerIndex(0);
    setStyleControls(getStyleControlState(nextTarget.selector));
    setTargetMenuOpen(false);
  };

  const persistParentAssignments = (nextPageAssignments: Record<string, string>) => {
    const storage = readParentStorage();
    const nextStorage = { ...storage };
    if (Object.keys(nextPageAssignments).length) {
      nextStorage[pathname] = nextPageAssignments;
    } else {
      delete nextStorage[pathname];
    }

    writeParentStorage(nextStorage);
    setPageParentAssignments(nextPageAssignments);
    window.requestAnimationFrame(() => {
      setAvailableTargets(getAvailableTargets(
        readGroupStorage()[pathname] || [],
        nextPageAssignments,
        readOrderStorage()[pathname] || {},
      ));
    });
  };

  const reparentSelectedTarget = (nextParentSelector: string | null) => {
    if (!selectedSelector || selectedGroupId) return;
    if (nextParentSelector === selectedSelector) return;
    if (nextParentSelector && selectedTargetDescendants.has(nextParentSelector)) return;

    const nextPageAssignments = { ...pageParentAssignments };
    if (nextParentSelector) {
      nextPageAssignments[selectedSelector] = nextParentSelector;
    } else {
      delete nextPageAssignments[selectedSelector];
    }

    persistParentAssignments(nextPageAssignments);
  };

  const toggleTargetFolder = (selector: string) => {
    setExpandedTargetSelectors((current) => {
      const next = new Set(current);
      if (next.has(selector)) {
        next.delete(selector);
      } else {
        next.add(selector);
      }
      return next;
    });
  };

  const persistTargetOrder = (nextPageOrder: Record<string, number>) => {
    const storage = readOrderStorage();
    const nextStorage = { ...storage };

    if (Object.keys(nextPageOrder).length) {
      nextStorage[pathname] = nextPageOrder;
    } else {
      delete nextStorage[pathname];
    }

    writeOrderStorage(nextStorage);
    setPageTargetOrder(nextPageOrder);
    window.requestAnimationFrame(() => {
      setAvailableTargets(getAvailableTargets(
        readGroupStorage()[pathname] || [],
        readParentStorage()[pathname] || {},
        nextPageOrder,
      ));
    });
  };

  const collectTargetDescendants = (selector: string) => {
    const descendants = new Set<string>();
    const walk = (parentSelector: string) => {
      const children = targetChildrenByParent.get(parentSelector) || [];
      children.forEach((child) => {
        descendants.add(child.selector);
        walk(child.selector);
      });
    };
    walk(selector);
    return descendants;
  };

  const canAssignTargetParent = (dragSelector: string, nextParentSelector: string | null) => {
    if (nextParentSelector === dragSelector) return false;
    if (!nextParentSelector) return true;
    return !collectTargetDescendants(dragSelector).has(nextParentSelector);
  };

  const applyTargetHierarchyMove = (
    dragSelector: string,
    dropSelector: string | null,
    position: 'before' | 'after' | 'inside' | 'root',
  ) => {
    const dragTarget = availableTargetMap.get(dragSelector);
    if (!dragTarget) return;

    const dropTarget = dropSelector ? availableTargetMap.get(dropSelector) : null;
    const currentParentSelector = dragTarget.parentSelector || null;
    const nextParentSelector =
      position === 'inside'
        ? (dropTarget?.kind === 'element' ? dropTarget.selector : null)
        : position === 'root'
          ? null
          : (dropTarget?.parentSelector || null);

    if (!canAssignTargetParent(dragSelector, nextParentSelector)) return;

    const nextPageAssignments = { ...pageParentAssignments };
    if (nextParentSelector) {
      nextPageAssignments[dragSelector] = nextParentSelector;
    } else {
      delete nextPageAssignments[dragSelector];
    }

    const nextPageOrder = { ...pageTargetOrder };
    const assignOrderForParent = (parentSelector: string | null, orderedSelectors: string[]) => {
      orderedSelectors.forEach((selector, index) => {
        nextPageOrder[selector] = index;
      });
    };

    const getSiblingSelectors = (parentSelector: string | null) => (
      (targetChildrenByParent.get(parentSelector) || [])
        .map((target) => target.selector)
        .filter((selector) => selector !== dragSelector)
    );

    const currentParentSiblings = getSiblingSelectors(currentParentSelector);
    const nextParentSiblings = getSiblingSelectors(nextParentSelector);

    if (position === 'inside') {
      nextParentSiblings.push(dragSelector);
      if (dropSelector) {
        setExpandedTargetSelectors((current) => new Set(current).add(dropSelector));
      }
    } else if (position === 'root') {
      nextParentSiblings.push(dragSelector);
    } else if (dropTarget) {
      const targetIndex = nextParentSiblings.indexOf(dropTarget.selector);
      if (targetIndex < 0) return;
      nextParentSiblings.splice(position === 'before' ? targetIndex : targetIndex + 1, 0, dragSelector);
    } else {
      return;
    }

    assignOrderForParent(currentParentSelector, currentParentSiblings);
    assignOrderForParent(nextParentSelector, nextParentSiblings);

    persistParentAssignments(nextPageAssignments);
    persistTargetOrder(nextPageOrder);
  };

  const getLayerDropMode = (dragSelector: string, dropSelector: string, clientY: number, rect: DOMRect) => {
    const dropTarget = availableTargetMap.get(dropSelector);
    if (!dropTarget || dropSelector === dragSelector) return null;

    const beforeThreshold = rect.top + rect.height * 0.25;
    const afterThreshold = rect.bottom - rect.height * 0.25;
    if (clientY <= beforeThreshold) return 'before' as const;
    if (clientY >= afterThreshold) return 'after' as const;
    if (dropTarget.kind === 'element' && canAssignTargetParent(dragSelector, dropTarget.selector)) {
      return 'inside' as const;
    }
    return 'after' as const;
  };

  const renderLayerDropIndicator = (position: 'before' | 'after' | 'inside' | null) => {
    if (!position) return null;
    if (position === 'inside') {
      return <div className="pointer-events-none absolute inset-0 rounded-md border-2 border-cyan-300/90 bg-cyan-200/5" />;
    }
    return (
      <div
        className={`pointer-events-none absolute left-2 right-2 h-0 border-t-2 border-cyan-300 ${
          position === 'before' ? 'top-0' : 'bottom-0'
        }`}
      />
    );
  };

  const renderTargetTree = (parentSelector: string | null, depth = 0): JSX.Element[] => {
    const children = targetChildrenByParent.get(parentSelector) || [];
    return children.flatMap((target) => {
      const nestedChildren = targetChildrenByParent.get(target.selector) || [];
      const isExpandable = !target.isManualGroup && nestedChildren.length > 0;
      const isExpanded = isExpandable && expandedTargetSelectors.has(target.selector);
      const isSelected = selectedTargetValue === target.selector;
      const isDragged = draggedLayerSelector === target.selector;
      const dropPosition = layerDropIndicator?.targetSelector === target.selector ? layerDropIndicator.position : null;

      const row = (
        <div key={target.selector} className="relative">
          {renderLayerDropIndicator(dropPosition === 'root' ? null : dropPosition)}
          <div
            className={`flex items-center gap-1 rounded-md transition-colors ${
              isDragged ? 'opacity-45' : ''
            }`}
            onDragOver={(event) => {
              if (!draggedLayerSelector || draggedLayerSelector === target.selector) return;
              const mode = getLayerDropMode(
                draggedLayerSelector,
                target.selector,
                event.clientY,
                event.currentTarget.getBoundingClientRect(),
              );
              if (!mode) return;
              event.preventDefault();
              if (
                layerDropIndicator?.targetSelector !== target.selector ||
                layerDropIndicator.position !== mode
              ) {
                setLayerDropIndicator({ targetSelector: target.selector, position: mode });
              }
            }}
            onDrop={(event) => {
              if (!draggedLayerSelector || draggedLayerSelector === target.selector) return;
              const mode = getLayerDropMode(
                draggedLayerSelector,
                target.selector,
                event.clientY,
                event.currentTarget.getBoundingClientRect(),
              );
              if (!mode) return;
              event.preventDefault();
              applyTargetHierarchyMove(draggedLayerSelector, target.selector, mode);
              setDraggedLayerSelector(null);
              setLayerDropIndicator(null);
            }}
            onDragLeave={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setLayerDropIndicator((current) => (
                  current?.targetSelector === target.selector ? null : current
                ));
              }
            }}
          >
            <span
              draggable
              onDragStart={(event) => {
                event.stopPropagation();
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', target.selector);
                setDraggedLayerSelector(target.selector);
                setLayerDropIndicator(null);
              }}
              onDragEnd={() => {
                setDraggedLayerSelector(null);
                setLayerDropIndicator(null);
              }}
              className="inline-flex h-7 w-6 shrink-0 cursor-grab items-center justify-center rounded-md text-muted-foreground hover:bg-accent/60 active:cursor-grabbing"
              aria-label={`Drag ${target.label} to reorder`}
              title="Drag to reorder among sibling layers"
            >
              <GripVertical className="h-3.5 w-3.5" />
            </span>
            <button
              type="button"
              onClick={() => handleTargetSelect(target.selector)}
              data-build-layer-row={target.selector}
              className={`flex min-w-0 flex-1 items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs transition-colors ${
                isSelected ? 'bg-accent text-accent-foreground' : 'text-foreground hover:bg-accent/60'
              }`}
              style={{ paddingLeft: `${Math.min(88, 8 + depth * 14)}px` }}
            >
              {isExpandable ? (
                <span
                  role="button"
                  tabIndex={0}
                  aria-label={isExpanded ? 'Collapse folder' : 'Expand folder'}
                  className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-sm text-muted-foreground hover:bg-accent"
                  onClick={(event) => {
                    event.preventDefault();
                    event.stopPropagation();
                    toggleTargetFolder(target.selector);
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter' && event.key !== ' ') return;
                    event.preventDefault();
                    event.stopPropagation();
                    toggleTargetFolder(target.selector);
                  }}
                >
                  {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </span>
              ) : (
                <span className="h-4 w-4 shrink-0" />
              )}
              <TargetOptionIcon target={target} />
              <span className="truncate">{target.label}</span>
            </button>
          </div>
          {isExpandable && isExpanded ? renderTargetTree(target.selector, depth + 1) : null}
        </div>
      );

      return [row];
    });
  };

  const groupSelection = () => {
    const selectors = selectedSelectors.length ? selectedSelectors : (selectedSelector ? [selectedSelector] : []);
    if (selectors.length < 2) return;

    const labelBase = selectedLabel && selectedLabel !== 'Click an element' ? selectedLabel : 'Custom group';
    const group: BuildGroup = {
      id: `group-${Date.now()}`,
      label: labelBase.replace(/^Group:\s*/, ''),
      members: Array.from(new Set(selectors)),
    };

    const storage = readGroupStorage();
    const nextGroups = [...(storage[pathname] || []), group];
    writeGroupStorage({
      ...storage,
      [pathname]: nextGroups,
    });
    setPageGroups(nextGroups);
    setSelectedGroupId(group.id);
    setSelectedLabel(`Group: ${group.label}`);
  };

  const ungroupSelection = () => {
    if (!selectedGroupId) return;
    const storage = readGroupStorage();
    const nextGroups = (storage[pathname] || []).filter((group) => group.id !== selectedGroupId);
    writeGroupStorage({
      ...storage,
      [pathname]: nextGroups,
    });
    setPageGroups(nextGroups);
    setSelectedGroupId(null);
    if (selectedSelectors.length) {
      setSelectedSelector(selectedSelectors[0]);
      setSelectedLabel(availableTargets.find((target) => target.selector === selectedSelectors[0])?.label || selectedLabel);
      setStyleControls(getStyleControlState(selectedSelectors[0]));
    }
  };

  useEffect(() => {
    const handlePointerMove = (event: PointerEvent) => {
      const panelDrag = panelDragRef.current;
      if (panelDrag && panelDrag.pointerId === event.pointerId) {
        const currentFrame = panelDrag.panel === 'build'
          ? (buildPanelFrame || getDefaultBuildPanelFrame(buttonPosition || getDefaultButtonPosition()))
          : (layersPanelFrame || getDefaultLayersPanelFrame(buildPanelFrame || getDefaultBuildPanelFrame(buttonPosition || getDefaultButtonPosition())));
        const nextFrame = clampPanelFrame({
          x: panelDrag.originX + (event.clientX - panelDrag.startX),
          y: panelDrag.originY + (event.clientY - panelDrag.startY),
          width: currentFrame.width,
          height: currentFrame.height,
        });
        if (panelDrag.panel === 'build') {
          setBuildPanelFrame(nextFrame);
        } else {
          setLayersPanelFrame(nextFrame);
        }
      }

      const panelResize = panelResizeRef.current;
      if (panelResize && panelResize.pointerId === event.pointerId) {
        const deltaX = event.clientX - panelResize.startX;
        const deltaY = event.clientY - panelResize.startY;
        const nextFrame = { ...panelResize.origin };

        if (panelResize.edge === 'right' || panelResize.edge === 'bottom-right') {
          nextFrame.width = panelResize.origin.width + deltaX;
        }

        if (panelResize.edge === 'bottom' || panelResize.edge === 'bottom-right' || panelResize.edge === 'bottom-left') {
          nextFrame.height = panelResize.origin.height + deltaY;
        }

        if (panelResize.edge === 'bottom-left') {
          nextFrame.x = panelResize.origin.x + deltaX;
          nextFrame.width = panelResize.origin.width - deltaX;
        }

        const clampedFrame = clampPanelFrame(nextFrame);
        if (panelResize.panel === 'build') {
          setBuildPanelFrame(clampedFrame);
        } else {
          setLayersPanelFrame(clampedFrame);
        }
      }
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (panelDragRef.current?.pointerId === event.pointerId) {
        panelDragRef.current = null;
      }
      if (panelResizeRef.current?.pointerId === event.pointerId) {
        panelResizeRef.current = null;
      }
    };

    document.addEventListener('pointermove', handlePointerMove, true);
    document.addEventListener('pointerup', handlePointerUp, true);
    return () => {
      document.removeEventListener('pointermove', handlePointerMove, true);
      document.removeEventListener('pointerup', handlePointerUp, true);
    };
  }, [buildPanelFrame, buttonPosition, layersPanelFrame]);

  if (!canBuild) return null;
  if (!buttonPosition) return null;

  const handleButtonPointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragStateRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: buttonPosition.x,
      originY: buttonPosition.y,
      moved: false,
    };
  };

  const handleButtonPointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;

    const deltaX = event.clientX - dragState.startX;
    const deltaY = event.clientY - dragState.startY;
    if (!dragState.moved && (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3)) {
      dragState.moved = true;
    }

    if (!dragState.moved) return;
    event.preventDefault();

    setButtonPosition(
      clampButtonPosition({
        x: dragState.originX + deltaX,
        y: dragState.originY + deltaY,
      }),
    );
  };

  const handleButtonPointerUp = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const dragState = dragStateRef.current;
    if (!dragState || dragState.pointerId !== event.pointerId) return;
    suppressClickRef.current = dragState.moved;
    event.currentTarget.releasePointerCapture(event.pointerId);
    dragStateRef.current = null;
  };

  const handleButtonClick = () => {
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if (dragStateRef.current?.moved) return;
    setActive((current) => !current);
  };

  const startPanelDrag = (panel: 'build' | 'layers', event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    const frame = panel === 'build' ? buildPanelFrame : layersPanelFrame;
    if (!frame) return;
    panelDragRef.current = {
      pointerId: event.pointerId,
      panel,
      startX: event.clientX,
      startY: event.clientY,
      originX: frame.x,
      originY: frame.y,
    };
  };

  const startPanelResize = (panel: 'build' | 'layers', edge: PanelResizeEdge, event: ReactPointerEvent<HTMLDivElement>) => {
    const frame = panel === 'build' ? buildPanelFrame : layersPanelFrame;
    if (event.button !== 0 || !frame) return;
    event.preventDefault();
    event.stopPropagation();
    panelResizeRef.current = {
      pointerId: event.pointerId,
      panel,
      edge,
      startX: event.clientX,
      startY: event.clientY,
      origin: frame,
    };
  };

  const nudgeSelected = (deltaX: number, deltaY: number) => {
    if (!selectedSelector) return;
    const rootSelectors = getMotionRootSelectors(selectedSelector, selectedSelectors, selectedGroupId);
    const selectors = resolveMotionSelectors(rootSelectors, pageParentAssignments);
    const detachedSelectors = Array.from(new Set(
      rootSelectors
        .flatMap((selector) => getDetachedDomDescendantSelectors(selector))
        .filter((selector) => !selectors.includes(selector)),
    ));

    setPageOffsets((current) => {
      const next = { ...current };
      selectors.forEach((selector) => {
        const label = current[selector]?.label || availableTargets.find((target) => target.selector === selector)?.label || selectedLabel;
        const existing = current[selector] || { x: 0, y: 0, label };
        next[selector] = {
          ...existing,
          x: existing.x + deltaX,
          y: existing.y + deltaY,
          label: existing.label || label,
        };
      });
      detachedSelectors.forEach((selector) => {
        const label = current[selector]?.label || availableTargets.find((target) => target.selector === selector)?.label || selector;
        const existing = current[selector] || { x: 0, y: 0, label };
        next[selector] = {
          ...existing,
          x: existing.x - deltaX,
          y: existing.y - deltaY,
          label: existing.label || label,
        };
      });
      const storage = readStorage();
      writeStorage({
        ...storage,
        [pathname]: next,
      });
      [...selectors, ...detachedSelectors].forEach((selector) => applyOffset(selector, next[selector]));
      return next;
    });
    pulseAlignmentGuides();
  };

  const updateSelectedStyles = (partial: Partial<StyleControlState>) => {
    if (!selectedSelector) return;
    const selectors = selectedGroupId
      ? getSelectionSelectorsWithPrimary(selectedSelector, selectedSelectors)
      : [selectedSelector];

    const nextControls = { ...styleControls, ...partial };
    setStyleControls(nextControls);

    setPageOffsets((current) => {
      const next = { ...current };
      selectors.forEach((selector) => {
        const label = current[selector]?.label || availableTargets.find((target) => target.selector === selector)?.label || selectedLabel;
        const nextEntry: StoredOffset = {
          ...(current[selector] || { x: 0, y: 0, label }),
          label,
        };

        if ('width' in partial) {
          nextEntry.width = nextControls.width ? Number(nextControls.width) : undefined;
        }
        if ('height' in partial) {
          nextEntry.height = nextControls.height ? Number(nextControls.height) : undefined;
        }
        if ('fontSize' in partial) {
          nextEntry.fontSize = nextControls.fontSize ? Number(nextControls.fontSize) : undefined;
        }
        if ('color' in partial) {
          nextEntry.color = nextControls.color || undefined;
        }
        if ('backgroundColor' in partial) {
          nextEntry.backgroundColor = nextControls.backgroundColor || undefined;
        }
        next[selector] = nextEntry;
      });

      const storage = readStorage();
      writeStorage({
        ...storage,
        [pathname]: next,
      });
      selectors.forEach((selector) => applyOffset(selector, next[selector]));
      return next;
    });
  };

  const resetSelected = () => {
    if (!selectedSelector) return;
    const selectors = selectedGroupId
      ? getSelectionSelectorsWithPrimary(selectedSelector, selectedSelectors)
      : [selectedSelector];
    setPageOffsets((current) => {
      const next = { ...current };
      selectors.forEach((selector) => {
        delete next[selector];
        const element = document.querySelector(selector);
        if (isBuildElement(element)) {
          clearOffset(element);
        }
      });
      const storage = readStorage();
      writeStorage({
        ...storage,
        [pathname]: next,
      });
      return next;
    });
    window.requestAnimationFrame(() => {
      setStyleControls(getStyleControlState(selectedSelector));
    });
  };

  const resetPage = () => {
    Object.keys(pageOffsets).forEach((selector) => {
      const element = document.querySelector(selector);
      if (isBuildElement(element)) {
        clearOffset(element);
      }
    });

    const storage = readStorage();
    delete storage[pathname];
    writeStorage(storage);
    const groupStorage = readGroupStorage();
    delete groupStorage[pathname];
    writeGroupStorage(groupStorage);
    const parentStorage = readParentStorage();
    delete parentStorage[pathname];
    writeParentStorage(parentStorage);
    const orderStorage = readOrderStorage();
    delete orderStorage[pathname];
    writeOrderStorage(orderStorage);
    setPageOffsets({});
    setPageGroups([]);
    setPageParentAssignments({});
    setPageTargetOrder({});
    setSelectedGroupId(null);
  };

  const resetAllBuildChanges = () => {
    Object.keys(pageOffsets).forEach((selector) => {
      const element = document.querySelector(selector);
      if (isBuildElement(element)) {
        clearOffset(element);
      }
    });

    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(GROUP_STORAGE_KEY);
    window.localStorage.removeItem(PARENT_STORAGE_KEY);
    window.localStorage.removeItem(ORDER_STORAGE_KEY);
    window.localStorage.removeItem(BUTTON_POSITION_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent(BUILD_STORAGE_EVENT));
    setPageOffsets({});
    setPageGroups([]);
    setPageParentAssignments({});
    setPageTargetOrder({});
    setSelectedSelector(null);
    setSelectedSelectors([]);
    setSelectedGroupId(null);
    setSelectedLabel('Click an element');
    setSelectionLayers([]);
    setSelectedLayerIndex(0);
    setLayersPanelOpen(false);
    setButtonPosition(getDefaultButtonPosition());
  };

  const renderPanelResizeHandles = (panel: 'build' | 'layers') => (
    <>
      <div
        className="absolute inset-y-3 right-0 cursor-ew-resize"
        style={{ width: `${PANEL_RESIZE_HANDLE_SIZE}px` }}
        onPointerDown={(event) => startPanelResize(panel, 'right', event)}
        aria-label={`Resize ${panel} panel width`}
      />
      <div
        className="absolute inset-x-3 bottom-0 cursor-ns-resize"
        style={{ height: `${PANEL_RESIZE_HANDLE_SIZE}px` }}
        onPointerDown={(event) => startPanelResize(panel, 'bottom', event)}
        aria-label={`Resize ${panel} panel height`}
      />
      <div
        className="absolute bottom-0 left-0 cursor-nesw-resize"
        style={{ height: `${PANEL_RESIZE_CORNER_SIZE}px`, width: `${PANEL_RESIZE_CORNER_SIZE}px` }}
        onPointerDown={(event) => startPanelResize(panel, 'bottom-left', event)}
        aria-label={`Resize ${panel} panel from bottom left corner`}
      />
      <div
        className="absolute bottom-0 right-0 cursor-nwse-resize"
        style={{ height: `${PANEL_RESIZE_CORNER_SIZE}px`, width: `${PANEL_RESIZE_CORNER_SIZE}px` }}
        onPointerDown={(event) => startPanelResize(panel, 'bottom-right', event)}
        aria-label={`Resize ${panel} panel from bottom right corner`}
      />
      <div className="pointer-events-none absolute bottom-1 left-1 h-3 w-3 rounded-full border border-border/60 bg-background/70" />
      <div className="pointer-events-none absolute bottom-1 right-1 h-3 w-3 rounded-full border border-border/60 bg-background/70" />
    </>
  );

  const primarySelectedRect = selectedRects.find((rect) => rect.selector === selectedSelector) || null;
  const showResizeHandles = Boolean(active && primarySelectedRect && selectedSelector && !selectedGroupId);
  const primarySelectedRectRight = primarySelectedRect ? primarySelectedRect.left + primarySelectedRect.width : null;
  const primarySelectedRectBottom = primarySelectedRect ? primarySelectedRect.top + primarySelectedRect.height : null;

  return (
    <div
      data-build-ignore="true"
      data-build-overlay-ui="true"
      className="pointer-events-none fixed inset-0 z-[70]"
    >
      {active ? (
        <>
          {hoveredRect && !selectedRects.some((rect) => rect.selector === hoveredRect.selector) ? (
            <div
              className="fixed rounded-xl border border-cyan-300/85 bg-cyan-200/5 shadow-[0_0_0_1px_rgba(34,211,238,0.25)]"
              style={{
                left: `${hoveredRect.left}px`,
                top: `${hoveredRect.top}px`,
                width: `${hoveredRect.width}px`,
                height: `${hoveredRect.height}px`,
              }}
            />
          ) : null}
          {selectedRects.map((rect) => {
            const isPrimaryRect = rect.selector === selectedSelector;
            return (
              <div
                key={rect.selector}
                className={isPrimaryRect
                  ? 'fixed rounded-xl border-2 border-amber-300/95 bg-amber-200/6 shadow-[0_0_0_1px_rgba(252,211,77,0.35),0_0_18px_rgba(252,211,77,0.2)]'
                  : 'fixed rounded-xl border border-cyan-300/70 bg-transparent shadow-[0_0_0_1px_rgba(34,211,238,0.18)]'}
                style={{
                  left: `${rect.left}px`,
                  top: `${rect.top}px`,
                  width: `${rect.width}px`,
                  height: `${rect.height}px`,
                }}
              />
            );
          })}
          {showResizeHandles && primarySelectedRect && primarySelectedRectRight !== null && primarySelectedRectBottom !== null ? (
            <>
              <div
                data-build-ignore="true"
                data-build-resize-handle="true"
                data-build-resize-edge="top-left"
                data-build-resize-selector={selectedSelector || undefined}
                className="pointer-events-auto fixed z-[76]"
                style={{
                  left: `${primarySelectedRect.left - CORNER_HANDLE_SIZE / 2}px`,
                  top: `${primarySelectedRect.top - CORNER_HANDLE_SIZE / 2}px`,
                  width: `${CORNER_HANDLE_SIZE}px`,
                  height: `${CORNER_HANDLE_SIZE}px`,
                  cursor: 'nwse-resize',
                }}
              >
                <div className="absolute inset-[3px] rounded-full border-2 border-amber-300/95 bg-background/80 shadow-[0_0_12px_rgba(252,211,77,0.35)]" />
              </div>
              <div
                data-build-ignore="true"
                data-build-resize-handle="true"
                data-build-resize-edge="left"
                data-build-resize-selector={selectedSelector || undefined}
                className="pointer-events-auto fixed z-[75]"
                style={{
                  left: `${primarySelectedRect.left - RESIZE_HANDLE_THICKNESS / 2}px`,
                  top: `${primarySelectedRect.top + RESIZE_HANDLE_INSET}px`,
                  width: `${RESIZE_HANDLE_THICKNESS}px`,
                  height: `${Math.max(MIN_RESIZE_DIMENSION, primarySelectedRect.height - RESIZE_HANDLE_INSET * 2)}px`,
                  cursor: 'ew-resize',
                }}
              >
                <div className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 rounded-full bg-amber-300/95 shadow-[0_0_12px_rgba(252,211,77,0.4)]" />
              </div>
              <div
                data-build-ignore="true"
                data-build-resize-handle="true"
                data-build-resize-edge="top-right"
                data-build-resize-selector={selectedSelector || undefined}
                className="pointer-events-auto fixed z-[76]"
                style={{
                  left: `${primarySelectedRectRight - CORNER_HANDLE_SIZE / 2}px`,
                  top: `${primarySelectedRect.top - CORNER_HANDLE_SIZE / 2}px`,
                  width: `${CORNER_HANDLE_SIZE}px`,
                  height: `${CORNER_HANDLE_SIZE}px`,
                  cursor: 'nesw-resize',
                }}
              >
                <div className="absolute inset-[3px] rounded-full border-2 border-amber-300/95 bg-background/80 shadow-[0_0_12px_rgba(252,211,77,0.35)]" />
              </div>
              <div
                data-build-ignore="true"
                data-build-resize-handle="true"
                data-build-resize-edge="right"
                data-build-resize-selector={selectedSelector || undefined}
                className="pointer-events-auto fixed z-[75]"
                style={{
                  left: `${primarySelectedRectRight - RESIZE_HANDLE_THICKNESS / 2}px`,
                  top: `${primarySelectedRect.top + RESIZE_HANDLE_INSET}px`,
                  width: `${RESIZE_HANDLE_THICKNESS}px`,
                  height: `${Math.max(MIN_RESIZE_DIMENSION, primarySelectedRect.height - RESIZE_HANDLE_INSET * 2)}px`,
                  cursor: 'ew-resize',
                }}
              >
                <div className="absolute inset-y-0 left-1/2 w-[2px] -translate-x-1/2 rounded-full bg-amber-300/95 shadow-[0_0_12px_rgba(252,211,77,0.4)]" />
              </div>
              <div
                data-build-ignore="true"
                data-build-resize-handle="true"
                data-build-resize-edge="top"
                data-build-resize-selector={selectedSelector || undefined}
                className="pointer-events-auto fixed z-[75]"
                style={{
                  left: `${primarySelectedRect.left + RESIZE_HANDLE_INSET}px`,
                  top: `${primarySelectedRect.top - RESIZE_HANDLE_THICKNESS / 2}px`,
                  width: `${Math.max(MIN_RESIZE_DIMENSION, primarySelectedRect.width - RESIZE_HANDLE_INSET * 2)}px`,
                  height: `${RESIZE_HANDLE_THICKNESS}px`,
                  cursor: 'ns-resize',
                }}
              >
                <div className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-amber-300/95 shadow-[0_0_12px_rgba(252,211,77,0.4)]" />
              </div>
              <div
                data-build-ignore="true"
                data-build-resize-handle="true"
                data-build-resize-edge="bottom"
                data-build-resize-selector={selectedSelector || undefined}
                className="pointer-events-auto fixed z-[75]"
                style={{
                  left: `${primarySelectedRect.left + RESIZE_HANDLE_INSET}px`,
                  top: `${primarySelectedRectBottom - RESIZE_HANDLE_THICKNESS / 2}px`,
                  width: `${Math.max(MIN_RESIZE_DIMENSION, primarySelectedRect.width - RESIZE_HANDLE_INSET * 2)}px`,
                  height: `${RESIZE_HANDLE_THICKNESS}px`,
                  cursor: 'ns-resize',
                }}
              >
                <div className="absolute inset-x-0 top-1/2 h-[2px] -translate-y-1/2 rounded-full bg-amber-300/95 shadow-[0_0_12px_rgba(252,211,77,0.4)]" />
              </div>
              <div
                data-build-ignore="true"
                data-build-resize-handle="true"
                data-build-resize-edge="bottom-left"
                data-build-resize-selector={selectedSelector || undefined}
                className="pointer-events-auto fixed z-[76]"
                style={{
                  left: `${primarySelectedRect.left - CORNER_HANDLE_SIZE / 2}px`,
                  top: `${primarySelectedRectBottom - CORNER_HANDLE_SIZE / 2}px`,
                  width: `${CORNER_HANDLE_SIZE}px`,
                  height: `${CORNER_HANDLE_SIZE}px`,
                  cursor: 'nesw-resize',
                }}
              >
                <div className="absolute inset-[3px] rounded-full border-2 border-amber-300/95 bg-background/80 shadow-[0_0_12px_rgba(252,211,77,0.35)]" />
              </div>
              <div
                data-build-ignore="true"
                data-build-resize-handle="true"
                data-build-resize-edge="bottom-right"
                data-build-resize-selector={selectedSelector || undefined}
                className="pointer-events-auto fixed z-[76]"
                style={{
                  left: `${primarySelectedRectRight - CORNER_HANDLE_SIZE / 2}px`,
                  top: `${primarySelectedRectBottom - CORNER_HANDLE_SIZE / 2}px`,
                  width: `${CORNER_HANDLE_SIZE}px`,
                  height: `${CORNER_HANDLE_SIZE}px`,
                  cursor: 'nwse-resize',
                }}
              >
                <div className="absolute inset-[3px] rounded-full border-2 border-amber-300/95 bg-background/80 shadow-[0_0_12px_rgba(252,211,77,0.35)]" />
              </div>
            </>
          ) : null}
          {alignmentGuides.map((guide) => {
            if (guide.orientation === 'vertical') {
              const length = Math.max(0, guide.end - guide.start);
              const segmentLength = Math.min(10, Math.max(4, length / 3));
              return (
                <div key={guide.key}>
                  <div
                    className="fixed w-0 border-l border-dashed border-cyan-300/80"
                    style={{
                      left: `${guide.position}px`,
                      top: `${guide.start}px`,
                      height: `${length}px`,
                    }}
                  />
                  <div
                    className="fixed w-0 border-l-2 border-dashed border-emerald-400"
                    style={{
                      left: `${guide.position}px`,
                      top: `${guide.start}px`,
                      height: `${segmentLength}px`,
                    }}
                  />
                  <div
                    className="fixed w-0 border-l-2 border-dashed border-emerald-400"
                    style={{
                      left: `${guide.position}px`,
                      top: `${Math.max(guide.start, guide.end - segmentLength)}px`,
                      height: `${segmentLength}px`,
                    }}
                  />
                </div>
              );
            }

            const length = Math.max(0, guide.end - guide.start);
            const segmentLength = Math.min(10, Math.max(4, length / 3));
            return (
              <div key={guide.key}>
                <div
                  className="fixed h-0 border-t border-dashed border-cyan-300/80"
                  style={{
                    left: `${guide.start}px`,
                    top: `${guide.position}px`,
                    width: `${length}px`,
                  }}
                />
                <div
                  className="fixed h-0 border-t-2 border-dashed border-emerald-400"
                  style={{
                    left: `${guide.start}px`,
                    top: `${guide.position}px`,
                    width: `${segmentLength}px`,
                  }}
                />
                <div
                  className="fixed h-0 border-t-2 border-dashed border-emerald-400"
                  style={{
                    left: `${Math.max(guide.start, guide.end - segmentLength)}px`,
                    top: `${guide.position}px`,
                    width: `${segmentLength}px`,
                  }}
                />
              </div>
            );
          })}
        </>
      ) : null}

      {active ? (
        <div
          className="pointer-events-none"
        >
          <div
            className="pointer-events-auto fixed flex flex-col overflow-hidden rounded-3xl border border-border/70 bg-background/95 p-3 shadow-2xl backdrop-blur"
            style={{
              left: `${(buildPanelFrame || getDefaultBuildPanelFrame(buttonPosition)).x}px`,
              top: `${(buildPanelFrame || getDefaultBuildPanelFrame(buttonPosition)).y}px`,
              width: `${(buildPanelFrame || getDefaultBuildPanelFrame(buttonPosition)).width}px`,
              height: `${(buildPanelFrame || getDefaultBuildPanelFrame(buttonPosition)).height}px`,
              maxWidth: `calc(100vw - ${EDGE_GAP * 2}px)`,
            }}
          >
          <div
            className="flex cursor-move items-start justify-between gap-3"
            onPointerDown={(event) => startPanelDrag('build', event)}
          >
            <div className="min-w-0">
              <p className="text-xs font-medium text-foreground">Build mode</p>
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                Click any element, then nudge it into place. Shift-click adds more on desktop.
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 rounded-full"
              onPointerDown={(event) => event.stopPropagation()}
              onClick={() => setActive(false)}
              aria-label="Close build mode"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
          <div className="rounded-2xl border border-border/70 bg-muted/35 px-3 py-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Selected</p>
              <button
                type="button"
                className="text-[10px] uppercase tracking-[0.16em] text-cyan-300 transition-colors hover:text-cyan-200"
                onClick={() => setLayersPanelOpen((current) => !current)}
              >
                Layers
              </button>
            </div>
            <p className="mt-1 text-sm font-medium text-foreground">{selectedLabel}</p>
            <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
              <span>{selectedSelectors.length > 1 ? `${selectedSelectors.length} elements selected` : '1 element selected'}</span>
              <div className="flex items-center gap-1">
                {selectedSelectors.length > 1 && !selectedGroupId ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 rounded-full px-2"
                    onClick={groupSelection}
                  >
                    Group
                  </Button>
                ) : null}
                {selectedGroupId ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 rounded-full px-2"
                    onClick={ungroupSelection}
                  >
                    Ungroup
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant={multiSelectMode ? 'secondary' : 'ghost'}
                  size="sm"
                  className="h-7 rounded-full px-2"
                  onClick={() => setMultiSelectMode((current) => !current)}
                >
                  Multi-select
                </Button>
              </div>
            </div>
            {availableTargets.length ? (
              <label className="mt-2 block">
                <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Target</span>
                <Popover open={targetMenuOpen} onOpenChange={setTargetMenuOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className="mt-1 flex h-8 w-full items-center justify-between rounded-xl border border-border/70 bg-background px-2 text-xs"
                      data-build-ignore="true"
                    >
                      {selectedTargetOption ? (
                        <span className="flex min-w-0 items-center gap-2">
                          <TargetOptionIcon target={selectedTargetOption} />
                          <span className="truncate text-foreground">{selectedTargetOption.label}</span>
                        </span>
                      ) : (
                        <span className="truncate text-muted-foreground">Select a target</span>
                      )}
                      <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    align="start"
                    sideOffset={6}
                    className="z-[120] max-h-72 w-[--radix-popover-trigger-width] overflow-y-auto rounded-2xl border-border/70 bg-background p-2"
                    data-build-ignore="true"
                  >
                    <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      Targets
                    </p>
                    <div className="space-y-0.5">{renderTargetTree(null, 0)}</div>
                  </PopoverContent>
                </Popover>
              </label>
            ) : null}
            {selectionLayers.length > 1 ? (
              <div className="mt-2 flex items-center justify-between gap-2 text-[11px] text-muted-foreground">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 rounded-full px-2"
                  onClick={() => selectLayerByIndex(selectedLayerIndex - 1)}
                >
                  Prev
                </Button>
                <span>
                  Layer {selectedLayerIndex + 1} of {selectionLayers.length}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 rounded-full px-2"
                  onClick={() => selectLayerByIndex(selectedLayerIndex + 1)}
                >
                  Next
                </Button>
              </div>
            ) : null}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="rounded-full"
              onClick={resetSelected}
              disabled={!selectedSelector}
            >
              <RotateCcw className="mr-2 h-3.5 w-3.5" />
              Reset selected
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-full"
              onClick={resetPage}
            >
              Reset page
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="rounded-full text-destructive hover:text-destructive"
              onClick={resetAllBuildChanges}
            >
              Reset everything
            </Button>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="rounded-2xl border border-border/70 bg-muted/20 px-3 py-2 text-left">
              <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Width</span>
              <input
                type="number"
                min="1"
                value={styleControls.width}
                onChange={(event) => updateSelectedStyles({ width: event.target.value })}
                disabled={!selectedSelector}
                className="mt-1 w-full bg-transparent text-sm text-foreground outline-none disabled:opacity-50"
              />
            </label>
            <label className="rounded-2xl border border-border/70 bg-muted/20 px-3 py-2 text-left">
              <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Height</span>
              <input
                type="number"
                min="1"
                value={styleControls.height}
                onChange={(event) => updateSelectedStyles({ height: event.target.value })}
                disabled={!selectedSelector}
                className="mt-1 w-full bg-transparent text-sm text-foreground outline-none disabled:opacity-50"
              />
            </label>
            <label className="rounded-2xl border border-border/70 bg-muted/20 px-3 py-2 text-left">
              <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Font size</span>
              <input
                type="number"
                min="1"
                value={styleControls.fontSize}
                onChange={(event) => updateSelectedStyles({ fontSize: event.target.value })}
                disabled={!selectedSelector}
                className="mt-1 w-full bg-transparent text-sm text-foreground outline-none disabled:opacity-50"
              />
            </label>
            <label className="rounded-2xl border border-border/70 bg-muted/20 px-3 py-2 text-left">
              <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Text color</span>
              <input
                type="color"
                value={styleControls.color}
                onChange={(event) => updateSelectedStyles({ color: event.target.value })}
                disabled={!selectedSelector}
                className="mt-1 h-8 w-full cursor-pointer rounded-lg border-0 bg-transparent p-0 disabled:opacity-50"
              />
            </label>
          </div>

          <label className="mt-2 block rounded-2xl border border-border/70 bg-muted/20 px-3 py-2 text-left">
            <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Background color</span>
            <input
              type="color"
              value={styleControls.backgroundColor}
              onChange={(event) => updateSelectedStyles({ backgroundColor: event.target.value })}
              disabled={!selectedSelector}
              className="mt-1 h-8 w-full cursor-pointer rounded-lg border-0 bg-transparent p-0 disabled:opacity-50"
            />
          </label>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <div />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-full rounded-2xl"
              onClick={() => nudgeSelected(0, -1)}
              disabled={!selectedSelector}
              aria-label="Move up"
            >
              <ArrowUp className="h-4 w-4" />
            </Button>
            <div />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-full rounded-2xl"
              onClick={() => nudgeSelected(-1, 0)}
              disabled={!selectedSelector}
              aria-label="Move left"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center justify-center rounded-2xl border border-dashed border-border/70 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
              1px
            </div>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-full rounded-2xl"
              onClick={() => nudgeSelected(1, 0)}
              disabled={!selectedSelector}
              aria-label="Move right"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <div />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-10 w-full rounded-2xl"
              onClick={() => nudgeSelected(0, 1)}
              disabled={!selectedSelector}
              aria-label="Move down"
            >
              <ArrowDown className="h-4 w-4" />
            </Button>
            <div />
          </div>

          <p className="mt-3 text-[11px] leading-snug text-muted-foreground">
            Tip: drag an edge or corner to resize, hold Shift or Ctrl on corners to lock proportions, use keyboard arrows for 1px moves, hold Shift for 10px, and use Shift-click or Multi-select to move several elements together.
          </p>
          </div>
          {renderPanelResizeHandles('build')}
          </div>

          {layersPanelOpen ? (
            <div
              className="pointer-events-auto fixed flex flex-col overflow-hidden rounded-3xl border border-border/70 bg-background/95 p-3 shadow-2xl backdrop-blur"
              style={{
                left: `${(layersPanelFrame || getDefaultLayersPanelFrame(buildPanelFrame || getDefaultBuildPanelFrame(buttonPosition))).x}px`,
                top: `${(layersPanelFrame || getDefaultLayersPanelFrame(buildPanelFrame || getDefaultBuildPanelFrame(buttonPosition))).y}px`,
                width: `${(layersPanelFrame || getDefaultLayersPanelFrame(buildPanelFrame || getDefaultBuildPanelFrame(buttonPosition))).width}px`,
                height: `${(layersPanelFrame || getDefaultLayersPanelFrame(buildPanelFrame || getDefaultBuildPanelFrame(buttonPosition))).height}px`,
                maxWidth: `calc(100vw - ${EDGE_GAP * 2}px)`,
              }}
            >
              <div
                className="flex cursor-move items-start justify-between gap-3"
                onPointerDown={(event) => startPanelDrag('layers', event)}
              >
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground">Layers</p>
                  <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
                    View the current hierarchy and reassign the selected element to a different layer.
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0 rounded-full"
                  onPointerDown={(event) => event.stopPropagation()}
                  onClick={() => setLayersPanelOpen(false)}
                  aria-label="Close layers panel"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="mt-3 flex min-h-0 flex-1 flex-col rounded-2xl border border-border/70 bg-muted/25 p-2">
                <div
                  className={`mb-2 rounded-xl border border-dashed px-3 py-2 text-[11px] text-muted-foreground transition-colors ${
                    layerDropIndicator?.position === 'root'
                      ? 'border-cyan-300 bg-cyan-200/10 text-cyan-100'
                      : 'border-border/70'
                  }`}
                  onDragOver={(event) => {
                    if (!draggedLayerSelector) return;
                    event.preventDefault();
                    setLayerDropIndicator({ targetSelector: null, position: 'root' });
                  }}
                  onDrop={(event) => {
                    if (!draggedLayerSelector) return;
                    event.preventDefault();
                    applyTargetHierarchyMove(draggedLayerSelector, null, 'root');
                    setDraggedLayerSelector(null);
                    setLayerDropIndicator(null);
                  }}
                >
                  Drop here to move the dragged layer to the page root.
                </div>
                <div ref={layersTreeScrollRef} className="min-h-0 flex-1 overflow-y-auto">
                  <div className="space-y-0.5">{renderTargetTree(null, 0)}</div>
                </div>
              </div>

              {selectedElementTarget ? (
                <label className="mt-3 block rounded-2xl border border-border/70 bg-muted/20 px-3 py-2 text-left">
                  <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Parent layer</span>
                  <select
                    value={selectedElementTarget.parentSelector || '__root__'}
                    onChange={(event) => reparentSelectedTarget(event.target.value === '__root__' ? null : event.target.value)}
                    className="mt-2 w-full rounded-xl border border-border/70 bg-background px-3 py-2 text-sm text-foreground outline-none"
                  >
                    <option value="__root__">No parent override</option>
                    {reparentCandidateTargets.map((target) => (
                      <option key={target.selector} value={target.selector}>
                        {target.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="mt-3 rounded-2xl border border-border/70 bg-muted/20 px-3 py-2 text-[11px] leading-snug text-muted-foreground">
                  Select a single element to reassign it to another layer.
                </div>
              )}
              {renderPanelResizeHandles('layers')}
            </div>
          ) : null}
        </div>
      ) : null}

      <Button
        type="button"
        size="icon"
        className="pointer-events-auto fixed h-12 w-12 touch-none select-none rounded-full border border-primary/30 bg-primary text-primary-foreground shadow-[0_18px_40px_rgba(15,23,42,0.32)] [&_svg]:!h-7 [&_svg]:!w-7"
        style={{
          left: `${Math.round(buttonPosition.x)}px`,
          top: `${Math.round(buttonPosition.y)}px`,
        }}
        onClick={handleButtonClick}
        onPointerDown={handleButtonPointerDown}
        onPointerMove={handleButtonPointerMove}
        onPointerUp={handleButtonPointerUp}
        onPointerCancel={handleButtonPointerUp}
        data-testid="build-overlay-toggle"
        data-build-ignore="true"
        data-build-overlay-ui="true"
        aria-label={active ? 'Exit build mode' : 'Open build mode'}
      >
        <Hammer />
      </Button>
    </div>
  );
}
