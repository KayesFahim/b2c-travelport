/**
 * `*.svg?react` imports: webpack + @svgr often default-export the component;
 * Turbopack may expose `{ default: ... }` (sometimes nested). SVGR may wrap SVGs in
 * `forwardRef`, which is an object — not `typeof === "function"`.
 */

const REACT_FORWARD_REF = Symbol.for("react.forward_ref");
const REACT_MEMO = Symbol.for("react.memo");
const REACT_LAZY = Symbol.for("react.lazy");

function isReactComponentType(type) {
  if (type == null) return false;
  if (typeof type === "string") return true;
  if (typeof type === "function") return true;
  if (typeof type === "object") {
    const t = type.$$typeof;
    return t === REACT_FORWARD_REF || t === REACT_MEMO || t === REACT_LAZY;
  }
  return false;
}

export default function reactSvg(Imported) {
  if (Imported == null) return Imported;

  let cur = Imported;
  for (let i = 0; i < 8; i++) {
    if (isReactComponentType(cur)) return cur;
    if (typeof cur === "object" && cur.ReactComponent != null) {
      cur = cur.ReactComponent;
      continue;
    }
    if (typeof cur === "object" && cur.default != null) {
      cur = cur.default;
      continue;
    }
    break;
  }

  return Imported;
}
