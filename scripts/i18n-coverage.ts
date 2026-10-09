import { baseTranslations } from '../src/lib/i18n.base';
import { applyCuratedTranslations } from '../src/lib/i18n/curated/index';

type Tree = Record<string, unknown>;
function count(node: unknown): number {
  if (typeof node === 'string') return 1;
  if (Array.isArray(node)) return node.reduce((n, item) => n + count(item), 0);
  if (node && typeof node === 'object') return Object.values(node as Tree).reduce((n, v) => n + count(v), 0);
  return 0;
}
function covered(base: unknown, cur: unknown): number {
  if (typeof base === 'string') return typeof cur === 'string' && cur !== base ? 1 : 0;
  if (Array.isArray(base)) return base.reduce((n, item, i) => n + covered(item, Array.isArray(cur) ? cur[i] : undefined), 0);
  if (base && typeof base === 'object') {
    const c = (cur && typeof cur === 'object' ? cur : {}) as Tree;
    return Object.entries(base as Tree).reduce((n, [k, v]) => n + covered(v, c[k]), 0);
  }
  return 0;
}
const hy = applyCuratedTranslations('hy', baseTranslations as unknown as Tree) as Tree;
const rows = Object.entries(baseTranslations as unknown as Tree)
  .map(([group, node]) => ({ group, total: count(node), hy: covered(node, hy[group]) }))
  .sort((a, b) => b.total - a.total);
for (const r of rows) console.log(`${r.group.padEnd(28)} total=${String(r.total).padStart(4)} hy=${String(r.hy).padStart(4)}`);
console.log('TOTAL', rows.reduce((n, r) => n + r.total, 0), 'HY', rows.reduce((n, r) => n + r.hy, 0));
