/**
 * @fileoverview TextEngine — scroll-aware, spring-animated text component.
 *
 * Splits children into letter / word / line spring slots and animates them
 * independently.  Mixed children (plain strings alongside React elements such
 * as <span>, <strong>, or SVGs) are fully supported: elements with text
 * children are animated word-by-word while preserving the wrapper tag and its
 * props; non-text elements (SVGs, images, components) are treated as a single
 * word unit.  Nested elements at any depth are handled recursively.
 *
 * ─── Modes ───────────────────────────────────────────────────────────────────
 * @param {"always"|"once"|"forward"|"manual"|"progress"} mode
 *   always   — plays in when the element enters the viewport; plays out when it
 *              leaves.  Repeats every time visibility changes.  (default)
 *   once     — plays in the first time the element enters the viewport and
 *              never animates out automatically.
 *   forward  — plays in on downward scroll into view; does NOT replay on upward
 *              scroll back into view.
 *   manual   — animation is fully controlled via the ref instance (playIn /
 *              playOut / togglePause) or by writing a 0–1 value to
 *              instance.progress.current.
 *   progress — animation is driven by scroll progress between `start` and `end`
 *              trigger positions (uses ProgressTrigger internally).
 *
 * ─── Core ────────────────────────────────────────────────────────────────────
 * @param {boolean}           [enabled=true]       - Master enable switch.
 * @param {number|"inherit"}  [columnGap=0.3]      - Gap between words in `em`.
 *                                                   Pass "inherit" to use the
 *                                                   parent's CSS column-gap.
 * @param {HtmlTags}          [tag="span"]         - HTML tag for the container.
 * @param {boolean}           [overflow=false]     - Clip children during
 *                                                   animation (sets
 *                                                   overflow:hidden on each
 *                                                   word / line wrapper).
 * @param {string}            [rootMargin="0px"]   - IntersectionObserver
 *                                                   rootMargin for viewport
 *                                                   trigger offset (e.g.
 *                                                   "-100px 0px").  Only used
 *                                                   in non-progress modes.
 * @param {RefObject|Element} [scrollRoot]          - Custom IntersectionObserver
 *                                                   root element.  Pass the
 *                                                   scrollable container ref so
 *                                                   that `always` / `once` /
 *                                                   `forward` modes detect
 *                                                   visibility relative to that
 *                                                   container instead of the
 *                                                   window viewport.
 *
 * ─── Progress / scroll-trigger (mode="progress") ────────────────────────────
 * @param {"toggle"|"interpolate"} [type="toggle"]
 *   toggle      — each unit snaps between its `in` and `out` state as the
 *                 scroll position crosses its stagger threshold.
 *   interpolate — each unit smoothly interpolates between `in` and `out` as
 *                 scroll progresses.
 * @param {number}      [interpolationStaggerCoefficient=0.3] - Controls how
 *   much the per-unit progress range is offset from the global progress in
 *   interpolate mode.  Higher values spread units further apart in time.
 * @param {RefObject}   [trigger]  - External element ref whose position is used
 *   as the scroll reference instead of the component itself.
 * @param {TriggerPos}  [start="top bottom"] - Scroll position where progress
 *   equals 0.  GSAP-style offsets are supported: "top bottom+=200".
 * @param {TriggerPos}  [end="bottom top"]   - Scroll position where progress
 *   equals 1.  GSAP-style offsets are supported: "bottom top-=100".
 *
 * ─── Animation values ────────────────────────────────────────────────────────
 * Each layer has an `In` (enter) and `Out` (exit) spring target object.
 * The keys must be valid react-spring animated style properties (y, opacity,
 * scale, rotate, etc.).  If an `In` object is empty the layer is not rendered
 * at all, keeping the DOM flat when a layer is unused.
 *
 * Layers, outermost → innermost:
 *   wrapLine  — wraps every word; used as the overflow-clip container per line.
 *   line      — animates the entire line as one unit (stagger by line index).
 *   wrapWord  — outer wrap around a single word; good for overflow clipping.
 *   word      — the word itself.
 *   wrapLetter — outer wrap around a single letter.
 *   letter    — the letter itself.
 *
 * @param {Object} [wrapLineIn]    - wrapLine enter spring target  (default {})
 * @param {Object} [wrapLineOut]   - wrapLine exit spring target   (default {})
 * @param {Object} [lineIn]        - line enter spring target       (default {})
 * @param {Object} [lineOut]       - line exit spring target        (default {})
 * @param {Object} [wrapWordIn]    - wrapWord enter spring target  (default {})
 * @param {Object} [wrapWordOut]   - wrapWord exit spring target   (default {})
 * @param {Object} [wordIn]        - word enter spring target       (default {})
 * @param {Object} [wordOut]       - word exit spring target        (default {})
 * @param {Object} [wrapLetterIn]  - wrapLetter enter spring target (default {})
 * @param {Object} [wrapLetterOut] - wrapLetter exit spring target  (default {})
 * @param {Object} [letterIn]      - letter enter spring target     (default {})
 * @param {Object} [letterOut]     - letter exit spring target      (default {})
 *
 * ─── Spring configs ──────────────────────────────────────────────────────────
 * Each layer accepts a shared config (used for both in and out) and separate
 * in/out overrides.  All are optional react-spring SpringConfig objects.
 *
 * @param {SpringConfig} [lineConfig]     - Line spring config (in + out)
 * @param {SpringConfig} [wordConfig]     - Word spring config (in + out)
 * @param {SpringConfig} [letterConfig]   - Letter spring config (in + out)
 * @param {SpringConfig} [lineConfigIn]   - Line enter spring config override
 * @param {SpringConfig} [wordConfigIn]   - Word enter spring config override
 * @param {SpringConfig} [letterConfigIn] - Letter enter spring config override
 * @param {SpringConfig} [lineConfigOut]  - Line exit spring config override
 * @param {SpringConfig} [wordConfigOut]  - Word exit spring config override
 * @param {SpringConfig} [letterConfigOut]- Letter exit spring config override
 *
 * ─── Timing ──────────────────────────────────────────────────────────────────
 * All timing values are in milliseconds.
 *
 * Global delays — applied before any per-layer delays:
 * @param {number} [delayIn=0]   - Global delay before the enter animation.
 * @param {number} [delayOut=0]  - Global delay before the exit animation.
 *
 * Per-layer delays — added on top of the global delay:
 * @param {number} [lineDelayIn=0]    @param {number} [lineDelayOut=0]
 * @param {number} [wordDelayIn=0]    @param {number} [wordDelayOut=0]
 * @param {number} [letterDelayIn=0]  @param {number} [letterDelayOut=0]
 *
 * Stagger — extra delay per index (line index for lines, word index for words):
 * @param {number} [lineStagger=100]   - Shared line stagger (in + out).
 * @param {number} [wordStagger=100]   - Shared word stagger (in + out).
 * @param {number} [letterStagger=100] - Shared letter stagger (in + out).
 * Per-direction stagger overrides (take precedence over shared values):
 * @param {number} [lineStaggerIn=0]    @param {number} [lineStaggerOut=0]
 * @param {number} [wordStaggerIn=0]    @param {number} [wordStaggerOut=0]
 * @param {number} [letterStaggerIn=0]  @param {number} [letterStaggerOut=0]
 *
 * ─── Behaviour flags ─────────────────────────────────────────────────────────
 * @param {boolean} [immediateOut=true]
 *   When true the exit animation is instant (no spring, no stagger).  Set to
 *   false to play a full spring exit when the element leaves the viewport or
 *   when children change.
 * @param {boolean} [enableInOutDelayesOnRerender=false]
 *   By default delays are suppressed during reactive content changes so the
 *   swap looks instant.  Set to true to keep full delays on every re-render.
 *
 * ─── SEO ─────────────────────────────────────────────────────────────────────
 * @param {boolean} [seo=true]          - Renders a visually-hidden copy of the
 *   full text so crawlers and screen readers see the unsplit content.
 *
 * ─── CSS class hooks ─────────────────────────────────────────────────────────
 * @param {string} [className]           - Container element class.
 * @param {string} [wrapLineClassName]   - Applied to every wrapLine span.
 * @param {string} [lineClassName]       - Applied to every line span.
 * @param {string} [wrapWordClassName]   - Applied to every wrapWord span.
 * @param {string} [wordClassName]       - Applied to every word span.
 * @param {string} [wrapLetterClassName] - Applied to every wrapLetter span.
 * @param {string} [letterClassName]     - Applied to every letter span.
 *
 * ─── Callbacks ───────────────────────────────────────────────────────────────
 * @param {Function} [onTextEngine]      - Called with the instance ref after
 *   mount so you can store it for external control.
 * @param {TextEngineHandlerType} [onTextStart]   - Fires when any spring starts.
 * @param {TextEngineHandlerType} [onTextChange]  - Fires on every spring frame.
 * @param {TextEngineHandlerType} [onTextResolve] - Fires when any spring settles.
 * @param {(type:"in"|"out") => void} [onTextFullyPlayed]
 *   Fires once after the full animation sequence (including all stagger delays)
 *   has finished for the current direction.
 */

"use client";

import {
  useEffect,
  memo,
  useRef,
  useMemo,
  RefObject,
  useState,
  useCallback,
  forwardRef,
  ReactNode,
  CSSProperties,
  ElementType,
  useImperativeHandle,
  HTMLAttributes,
  ForwardedRef,
  Children,
  Fragment,
  ReactElement,
  isValidElement,
  cloneElement,
} from "react";
import {
  AnimationResult,
  Controller,
  Lookup,
  SpringConfig,
  SpringRef,
  SpringValue,
  useInView,
  useSpringRef,
  useSprings,
} from "@react-spring/web";
import { animated } from "@react-spring/web";
import ResizeObserver from "resize-observer-polyfill";
import { TriggerPos, ProgressTrigger } from "./ProgressTrigger";
import { useLoopInView } from "./hooks/useLoopInView";
import { interpolate, transformRange } from "./utils/math";

export type Tags = 'div' | 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 
    'section' | 'article' | 'nav' | 'aside' | 'header' | 'footer' | 'main' | 
    'form' | 'input' | 'button' | 'a' | 'img' | 'ul' | 'ol' | 'li' | 
    'table' | 'tr' | 'td' | 'th' | 'thead' | 'tbody' | 'label' | 'select' | 'option' | 'textarea' |
    'canvas' | 'svg' | 'path' | 'circle' | 'rect' | 'polygon' | 'video' | 'audio' | 'source' |
    'iframe' | 'figure' | 'figcaption' | 'picture' | 'time' | 'address' | 'blockquote' | 'code' |
    'pre' | 'details' | 'summary' | 'dialog' | 'menu' | 'menuitem' | 'progress' | 'meter' |
    'fieldset' | 'legend' | 'datalist' | 'optgroup' | 'output' | 'template' | 'slot';

export type TextEngineRenderType =
  | "line"
  | "lineWrap"
  | "word"
  | "wordWrap"
  | "letter"
  | "letterWrap";
export type TextEngineHandlerType = (
  type: TextEngineRenderType,
  result: AnimationResult<SpringValue<Lookup<any>>>,
  ctrl: Controller<Lookup<any>>
) => void;

/** A single animated word token parsed from the children string. */
export type TextToken = { type: "word"; chars: string[] };
/** A non-text React element (SVG, img, component) animated as a single word unit. */
export type NodeToken = { type: "node"; node: ReactNode };
/**
 * A React element whose immediate text children are animated word-by-word.
 * The element itself is rendered with `display: contents` so it is flex-transparent.
 */
export type WrapperToken = { type: "wrapper"; element: ReactElement<any>; words: TextToken[] };
export type EngineToken = TextToken | NodeToken | WrapperToken;

/** Recursively extracts all text words from arbitrarily nested ReactNode children. */
function extractWords(children: ReactNode): TextToken[] {
  const words: TextToken[] = [];
  Children.forEach(children, (child) => {
    if (child === null || child === undefined || typeof child === "boolean") return;
    if (typeof child === "string" || typeof child === "number") {
      String(child).split(" ").filter((w) => w.length > 0)
        .forEach((word) => words.push({ type: "word", chars: word.split("") }));
    } else {
      const el = child as ReactElement<any>;
      words.push(...extractWords(el.props?.children));
    }
  });
  return words;
}

/** Split mixed ReactNode children into ordered engine tokens. */
function parseChildren(children: ReactNode): EngineToken[] {
  const tokens: EngineToken[] = [];
  Children.forEach(children, (child) => {
    if (child === null || child === undefined || typeof child === "boolean") return;
    if (typeof child === "string" || typeof child === "number") {
      String(child)
        .split(" ")
        .filter((w) => w.length > 0)
        .forEach((word) => tokens.push({ type: "word", chars: word.split("") }));
    } else {
      const element = child as ReactElement<any>;
      const words = extractWords(element.props?.children);
      if (words.length > 0) {
        tokens.push({ type: "wrapper", element, words });
      } else {
        // SVG, component with no text children → animate as 1 unit
        tokens.push({ type: "node", node: child });
      }
    }
  });
  return tokens;
}

/**
 * Imperative handle exposed via forwardRef / onTextEngine callback.
 * Lets parent components drive the animation without re-rendering TextEngine.
 */
export interface TextEngineInstance {
  /** Current animation mode (read-only reflection of the `mode` prop). */
  mode?: "once" | "forward" | "always" | "manual" | "progress";
  /** Whether the engine is currently active (accounts for enabled, paused, innerEnabled). */
  enabled?: boolean;
  /** Grouped DOM word refs by line, updated whenever layout changes. */
  lines?: { word: HTMLSpanElement; index: number; lineIndex: number }[][];
  /** All text words as char arrays (excludes non-text node tokens). */
  words?: string[][];
  /** Flat array of all animated characters. */
  letters?: string[];
  /** Trigger the enter animation (used in "manual" mode). */
  playIn: () => void;
  /** Trigger the exit animation (used in "manual" mode). */
  playOut: () => void;
  /** Freeze / unfreeze animation in its current state. */
  togglePause: () => void;
  /**
   * Progress ref for "manual" mode with progress-based control.
   * Write a value between 0 and 1 to instance.progress.current and the
   * animation loop will pick it up on the next frame.
   */
  progress?: RefObject<number>;
}

export interface EngineProps extends HTMLAttributes<HTMLSpanElement> {
  enabled?: boolean;
  columnGap?: number | "inherit";
  mode?: "once" | "forward" | "always" | "manual" | "progress";
  // Progress mode: animation driven by scroll position (0-1)
  type?: "toggle" | "interpolate";
  interpolationStaggerCoefficient?: number;
  trigger?: RefObject<HTMLElement | null> | null;
  rootMargin?: string;
  scrollRoot?: RefObject<HTMLElement | null> | HTMLElement | null;
  start?: TriggerPos;
  end?: TriggerPos;
  className?: string;
  wrapLineClassName?: string;
  lineClassName?: string;
  wrapWordClassName?: string;
  wordClassName?: string;
  wrapLetterClassName?: string;
  letterClassName?: string;
  overflow?: boolean;
  wrapLineIn?: { [key: string]: any };
  wrapLineOut?: { [key: string]: any };
  lineIn?: { [key: string]: any };
  lineOut?: { [key: string]: any };
  letterIn?: { [key: string]: any };
  letterOut?: { [key: string]: any };
  wrapLetterIn?: { [key: string]: any };
  wrapLetterOut?: { [key: string]: any };
  wordIn?: { [key: string]: any };
  wordOut?: { [key: string]: any };
  wrapWordIn?: { [key: string]: any };
  wrapWordOut?: { [key: string]: any };
  lineConfig?: SpringConfig;
  wordConfig?: SpringConfig;
  letterConfig?: SpringConfig;
  lineConfigIn?: SpringConfig;
  wordConfigIn?: SpringConfig;
  letterConfigIn?: SpringConfig;
  lineConfigOut?: SpringConfig;
  wordConfigOut?: SpringConfig;
  letterConfigOut?: SpringConfig;
  lineDelayIn?: number;
  letterDelayIn?: number;
  wordDelayIn?: number;
  lineDelayOut?: number;
  letterDelayOut?: number;
  wordDelayOut?: number;
  lineStagger?: number;
  wordStagger?: number;
  letterStagger?: number;
  lineStaggerIn?: number;
  wordStaggerIn?: number;
  letterStaggerIn?: number;
  lineStaggerOut?: number;
  wordStaggerOut?: number;
  letterStaggerOut?: number;
  delayIn?: number;
  delayOut?: number;
  tag?: HtmlTags;
  immediateOut?: boolean;
  children: any;

  enableInOutDelayesOnRerender?: boolean;
  seo?: boolean;

  onTextEngine?: (instance: RefObject<TextEngineInstance>) => void;
  onTextStart?: TextEngineHandlerType;
  onTextChange?: TextEngineHandlerType;
  onTextResolve?: TextEngineHandlerType;
  onTextFullyPlayed?: (type: "in" | "out") => void;
}

const TextEngine = memo(
  forwardRef<HTMLElement, EngineProps & { as?: HtmlTags }>(function TextEngine(
    props,
    ref
  ) {
    // Sets props to the cache, so they dont trigger re-rendering of hooks
    return (
      <Engine
        ref={ref}
        columnGap={props.columnGap || 0.3}
        mode={props.mode || "always"}
        type={props.type || "toggle"}
        interpolationStaggerCoefficient={props.interpolationStaggerCoefficient || 0.3}
        trigger={props.trigger || null}
        rootMargin={props.rootMargin || "0px"}
        scrollRoot={props.scrollRoot ?? null}
        start={props.start || "top bottom"}
        end={props.end || "bottom top"}
        enabled={typeof props.enabled === "boolean" ? props.enabled : true}
        className={props.className || ""}
        wrapLineClassName={props.wrapLineClassName || ""}
        lineClassName={props.lineClassName || ""}
        wrapWordClassName={props.wrapWordClassName || ""}
        wordClassName={props.wordClassName || ""}
        wrapLetterClassName={props.wrapLetterClassName || ""}
        letterClassName={props.letterClassName || ""}
        overflow={props.overflow || false}
        wrapLineIn={props.wrapLineIn || {}}
        wrapLineOut={props.wrapLineOut || {}}
        lineIn={props.lineIn || {}}
        lineOut={props.lineOut || {}}
        wrapWordIn={props.wrapWordIn || {}}
        wrapWordOut={props.wrapWordOut || {}}
        wordIn={props.wordIn || {}}
        wordOut={props.wordOut || {}}
        wrapLetterIn={props.wrapLetterIn || {}}
        wrapLetterOut={props.wrapLetterOut || {}}
        letterIn={props.letterIn || {}}
        letterOut={props.letterOut || {}}
        lineConfig={props.lineConfig || {}}
        wordConfig={props.wordConfig || {}}
        letterConfig={props.letterConfig || {}}
        lineConfigIn={props.lineConfigIn || {}}
        wordConfigIn={props.wordConfigIn || {}}
        letterConfigIn={props.letterConfigIn || {}}
        lineConfigOut={props.lineConfigOut || {}}
        wordConfigOut={props.wordConfigOut || {}}
        letterConfigOut={props.letterConfigOut || {}}
        lineDelayIn={props.lineDelayIn || 0}
        letterDelayIn={props.letterDelayIn || 0}
        wordDelayIn={props.wordDelayIn || 0}
        lineDelayOut={props.lineDelayOut || 0}
        letterDelayOut={props.letterDelayOut || 0}
        wordDelayOut={props.wordDelayOut || 0}
        lineStagger={props.lineStagger || 0}
        wordStagger={props.wordStagger || 0}
        letterStagger={props.letterStagger || 0}
        lineStaggerIn={props.lineStaggerIn || 0}
        wordStaggerIn={props.wordStaggerIn || 0}
        letterStaggerIn={props.letterStaggerIn || 0}
        lineStaggerOut={props.lineStaggerOut || 0}
        wordStaggerOut={props.wordStaggerOut || 0}
        letterStaggerOut={props.letterStaggerOut || 0}
        delayIn={props.delayIn || 0}
        delayOut={props.delayOut || 0}
        tag={props.as || props.tag || "span"}
        seo={props.seo ?? true}
        immediateOut={props.immediateOut || true}
        enableInOutDelayesOnRerender={
          props.enableInOutDelayesOnRerender || false
        }
        onTextEngine={props.onTextEngine || (() => {})}
        onTextStart={props.onTextStart || (() => {})}
        onTextChange={props.onTextChange || (() => {})}
        onTextResolve={props.onTextResolve || (() => {})}
        onTextFullyPlayed={props.onTextFullyPlayed || (() => {})}
        {...props}
      />
    );
  })
);

TextEngine.displayName = "TextEngine";

const Engine = forwardRef(
  (
    {
      // Distance between words in "em"
      columnGap = 0.3,
      // Mode (always=play always, forward=play only on scroll from top to bottom, once=once per page load, progress=scroll-driven)
      mode = "always",
      // Progress mode: how progress value drives animation
      type = "toggle",
      interpolationStaggerCoefficient = 0.3,
      trigger = null,
      rootMargin = "0px",
      scrollRoot = null,
      start = "top bottom",
      end = "bottom top",
      // Animation plays only if true (useful to play animation after page loaded state change)
      enabled = true,

      // ClassNames
      className,
      wrapLineClassName,
      lineClassName,
      wrapWordClassName,
      wordClassName,
      wrapLetterClassName,
      letterClassName,

      // Ability to crop text while animation
      overflow = false,

      // Springs Values for Letters & Words & their wrappers
      wrapLineIn = {},
      wrapLineOut = {},
      lineIn = {},
      lineOut = {},
      wrapWordIn = {},
      wrapWordOut = {},
      wordIn = {},
      wordOut = {},
      wrapLetterIn = {},
      wrapLetterOut = {},
      letterIn = {},
      letterOut = {},

      // Spring Configs for Letters & Words & Lines
      lineConfig = {},
      wordConfig = {},
      letterConfig = {},
      lineConfigIn = {},
      wordConfigIn = {},
      letterConfigIn = {},
      lineConfigOut = {},
      wordConfigOut = {},
      letterConfigOut = {},

      // Delay after which play animation after text is on the screen for Letters & Words & Lines
      lineDelayIn = 0,
      letterDelayIn = 0,
      wordDelayIn = 0,
      lineDelayOut = 0,
      letterDelayOut = 0,
      wordDelayOut = 0,

      // Delay to change delay based on lines' or words' or texts' index, in ms
      lineStagger = 100,
      letterStagger = 100,
      wordStagger = 100,
      lineStaggerIn = 0,
      letterStaggerIn = 0,
      wordStaggerIn = 0,
      lineStaggerOut = 0,
      letterStaggerOut = 0,
      wordStaggerOut = 0,

      // Delay after which set animation to Out/In state after text is Not or On the screen for ALL
      delayIn = 0,
      delayOut = 0,

      // Change the tag is would be used as a parent ("span" by default)
      tag = "span",

      // Change the ability to play animation smoothly on Out
      immediateOut = true,

      // If True, enables delayIn, [letter/word/line]DelayIn on reactive content change
      enableInOutDelayesOnRerender = false,
      // If true, add additional text with the same content but without animation, and use it for SEO and copy
      seo = true,

      // Callbacks
      onTextEngine = () => {},
      onTextStart = () => {},
      onTextChange = () => {},
      onTextResolve = () => {},
      onTextFullyPlayed = () => {},

      // Text to display
      children,
      style,

      ...props
    }: EngineProps,
    outerRef: ForwardedRef<HTMLElement>
  ) => {
    // Stable object reference so useInView's internal effect (which deps on this
    // object) doesn't tear down and recreate the IntersectionObserver on every
    // animation-frame re-render — which would wipe the internal WeakMap tracking
    // "on-leave" callbacks and cause the exit event to be silently dropped.
    const inViewArgs = useMemo(() => ({
      rootMargin,
      ...(scrollRoot ? { root: scrollRoot as React.MutableRefObject<HTMLElement> } : {}),
    }), [rootMargin, scrollRoot]);
    const [ref, inView] = useInView(inViewArgs);
    useImperativeHandle(outerRef, () => ref.current as HTMLElement);

    const scrolledDown = useRef(false);
    const [innerEnabled, setInnerEnabled] = useState(true);

    // Parse mixed children (strings + React elements) into ordered tokens
    const newTokens = useMemo<EngineToken[]>(
      () => parseChildren(children),
      [children]
    );
    const [tokens, setTokens] = useState(newTokens);
    // All text words (from TextToken and WrapperToken) — used for instance exposure
    const textWords = useMemo<string[][]>(() => {
      const result: string[][] = [];
      tokens.forEach((t) => {
        if (t.type === "word") result.push(t.chars);
        if (t.type === "wrapper") t.words.forEach((w) => result.push(w.chars));
      });
      return result;
    }, [tokens]);
    // Total number of word-level spring slots (text words + node tokens each count as 1)
    const wordSlotCount = useMemo(() =>
      tokens.reduce((acc, t) => {
        if (t.type === "word") return acc + 1;
        if (t.type === "node") return acc + 1;
        if (t.type === "wrapper") return acc + t.words.length;
        return acc;
      }, 0),
    [tokens]);
    // Word-slot indices that correspond to NodeTokens — used to apply letter-animation
    // fallback when word targets are empty but letter targets are set.
    // lettersBefore: number of text characters preceding this node in the token stream,
    // so the node gets the correct stagger position within the letter sequence.
    const nodeTokenWordIndices = useMemo(() => {
      const result: { wordIndex: number; lettersBefore: number }[] = [];
      let wordIdx = 0;
      let letterCount = 0;
      tokens.forEach((t) => {
        if (t.type === "node") {
          result.push({ wordIndex: wordIdx, lettersBefore: letterCount });
          wordIdx++;
        } else if (t.type === "word") {
          letterCount += t.chars.length;
          wordIdx++;
        } else if (t.type === "wrapper") {
          t.words.forEach((w) => { letterCount += w.chars.length; wordIdx++; });
        }
      });
      return result;
    }, [tokens]);
    const nodeTokenWordIndicesRef = useRef(nodeTokenWordIndices);
    nodeTokenWordIndicesRef.current = nodeTokenWordIndices;
    const rerenderTimeout = useRef<any>(null);
    const rerendering = useRef(false);

    // Handle reactive changes: non-text element changes apply immediately;
    // text/node changes trigger the animated out → swap → in transition.
    useEffect(() => {
      const toKey = (ts: EngineToken[]) =>
        ts.map((t, i) => {
          if (t.type === "word") return t.chars.join("");
          if (t.type === "wrapper") return t.words.map((w) => w.chars.join("")).join(" ");
          return `__node_${i}__`;
        }).join(" ");
      if (toKey(newTokens) === toKey(tokens)) {
        // Only wrapper/node props changed (className, style, etc.) — update without animation
        setTokens(newTokens);
        return;
      }
      clearTimeout(rerenderTimeout.current);
      rerendering.current = false;

      if (!immediateOut) {
        const { durationOut } = getDurations();
        setInnerEnabled(false);
        rerendering.current = true;
        rerenderTimeout.current = setTimeout(() => {
          setTokens(newTokens);
          setInnerEnabled(true);
          setTimeout(() => {
            rerendering.current = false;
          }, 50);
        }, durationOut + 50);
        return;
      }
      setInnerEnabled(false);
      rerendering.current = true;
      rerenderTimeout.current = setTimeout(() => {
        setTokens(newTokens);
        setInnerEnabled(true);
        setTimeout(() => {
          rerendering.current = false;
        }, 50);
      }, 50);
    }, [newTokens, immediateOut]);

    const letters = useMemo(() => {
      const allChars: string[] = [];
      tokens.forEach((t) => {
        if (t.type === "word") allChars.push(...t.chars);
        if (t.type === "wrapper") t.words.forEach((w) => allChars.push(...w.chars));
        // NodeTokens have no chars
      });
      return allChars;
    }, [tokens]);
    const [lines, _setLines] = useState<
      { word: HTMLSpanElement; index: number; lineIndex: number }[][]
    >([]);

    const setLines = useCallback(
      () => void _setLines(calcLinesRefs(ref)),
      [_setLines]
    );
    useEffect(() => void setLines(), [letters, setLines, tokens]);
    useResizeObserver(ref, setLines);

    // Instance for external imperative usage
    const [paused, setPaused] = useState(false);
    const [isIn, setIsIn] = useState(false);
    // Progress refs declared here so they can be exposed on the instance
    const progress = useRef(0);
    const _progress = useRef(0);
    const instance: RefObject<TextEngineInstance> = useRef({
      mode,
      enabled,
      letters,
      lines,
      words: textWords,
      progress,
      playIn: () => setIsIn(true),
      playOut: () => setIsIn(false),
      togglePause: () => setPaused((prev) => !prev),
    });
    function updateInstance() {
      // @ts-expect-error
      instance.current.letters = letters;
      // @ts-expect-error
      instance.current.lines = lines;
      // @ts-expect-error
      instance.current.words = textWords;
      // @ts-expect-error
      instance.current.mode = mode;
      // Enabled state is not used for manual mode
      // @ts-expect-error
      instance.current.enabled =
        (enabled && innerEnabled && !paused && mode !== "manual") ||
        (innerEnabled && !paused && mode === "manual");
    }
    useEffect(
      () => void updateInstance(),
      [letters, lines, textWords, mode, enabled, innerEnabled, paused]
    );

    // Expose the instance to the parent once on mount. Documented in the README
    // and JSDoc, but the call site was missing — leaving manual-mode users
    // unable to drive playIn / playOut / togglePause through the ref.
    useEffect(() => {
      onTextEngine(instance);
    }, []);

    // For "manual" mode with progress: watch progress.current and call playProgress
    // useLoop captures the callback at mount, so we use playProgressRef to always call the latest version
    useLoopInView(
      ref as RefObject<HTMLDivElement>,
      () => {
        if (mode !== "manual") return;
        if (_progress.current === progress.current) return;
        playProgressRef.current(progress.current);
      },
      { framerate: 10 }
    );

    // Only for "FORWARD" mode
    useEffect(() => {
      if (typeof window === "undefined") return;
      if (mode !== "forward") return;
      const scrollTarget: HTMLElement | Window =
        (scrollRoot as RefObject<HTMLElement> | null)?.current ?? window;
      function handler() {
        if (!ref.current) return;
        const containerTop =
          scrollTarget instanceof Window
            ? 0
            : (scrollTarget as HTMLElement).getBoundingClientRect().top;
        scrolledDown.current =
          ref.current.getBoundingClientRect().top - containerTop < 0;
      }
      scrollTarget.addEventListener("scroll", handler);
      return () => scrollTarget.removeEventListener("scroll", handler);
    }, [mode, scrollRoot]);

    // Only for "ONCE" mode
    useEffect(() => {
      if (inView && enabled && innerEnabled && mode === "once") {
        scrolledDown.current = true;
      }
    }, [inView, enabled, innerEnabled]);

    // Reset scrolledDown when switching away from "forward" or "once" modes
    // so playOut can fire correctly in other modes
    useEffect(() => {
      if (mode !== "forward" && mode !== "once") {
        scrolledDown.current = false;
      }
    }, [mode]);

    const linesRef = useRef(lines);
    linesRef.current = lines;

    // Each useSprings is wired to its own SpringRef. With a `ref:` attached,
    // useSprings' layout-phase re-fire takes the `ctrl.queue.push(update)`
    // branch instead of `ctrl.start(update)` (see @react-spring/core useSprings),
    // so the per-render re-issue never clobbers an in-flight imperative start.
    // Without this, only spring index 0 (delay 0) animates — words/letters with
    // staggered delays get cancelled by the next render's auto-start before
    // their delay elapses. `from:` seeds the resting OUT state for first paint.
    const wrapLineApi = useSpringRef();
    const [wrapLineSprings] = useSprings(wordSlotCount, () => ({
      ref: wrapLineApi,
      from: { ...wrapLineOut },
      onStart: (result, ctrl) => onTextStart("lineWrap", result, ctrl),
      onResolve: (result, ctrl) => onTextResolve("lineWrap", result, ctrl),
      onChange: (result, ctrl) => onTextChange("lineWrap", result, ctrl),
    }));
    const lineApi = useSpringRef();
    const [lineSprings] = useSprings(wordSlotCount, () => ({
      ref: lineApi,
      from: { ...lineOut },
      onStart: (result, ctrl) => onTextStart("line", result, ctrl),
      onResolve: (result, ctrl) => onTextResolve("line", result, ctrl),
      onChange: (result, ctrl) => onTextChange("line", result, ctrl),
    }));
    const wrapWordApi = useSpringRef();
    const [wrapWordSprings] = useSprings(wordSlotCount, () => ({
      ref: wrapWordApi,
      from: { ...wrapWordOut },
      onStart: (result, ctrl) => onTextStart("wordWrap", result, ctrl),
      onResolve: (result, ctrl) => onTextResolve("wordWrap", result, ctrl),
      onChange: (result, ctrl) => onTextChange("wordWrap", result, ctrl),
    }));
    const wordApi = useSpringRef();
    const [wordSprings] = useSprings(wordSlotCount, () => ({
      ref: wordApi,
      from: { ...wordOut },
      onStart: (result, ctrl) => onTextStart("word", result, ctrl),
      onResolve: (result, ctrl) => onTextResolve("word", result, ctrl),
      onChange: (result, ctrl) => onTextChange("word", result, ctrl),
    }));
    const wrapLetterApi = useSpringRef();
    const [wrapLetterSprings] = useSprings(
      letters.length,
      () => ({
        ref: wrapLetterApi,
        from: { ...wrapLetterOut },
        onStart: (result, ctrl) => onTextStart("letterWrap", result, ctrl),
        onResolve: (result, ctrl) => onTextResolve("letterWrap", result, ctrl),
        onChange: (result, ctrl) => onTextChange("letterWrap", result, ctrl),
      })
    );
    const letterApi = useSpringRef();
    const [letterSprings] = useSprings(letters.length, () => ({
      ref: letterApi,
      from: { ...letterOut },
      onStart: (result, ctrl) => onTextStart("letter", result, ctrl),
      onResolve: (result, ctrl) => onTextResolve("letter", result, ctrl),
      onChange: (result, ctrl) => onTextChange("letter", result, ctrl),
    }));

    const fullyPlayedTimeoutIn = useRef<any>(null);
    const fullyPlayedTimeoutOut = useRef<any>(null);
    const [played, setPlayed] = useState(false);

    // Store all volatile animation props in a ref so callbacks always read
    // the latest values without needing them as effect/callback dependencies.
    const propsRef = useRef({
      wrapLineIn, wrapLineOut, lineIn, lineOut,
      wrapWordIn, wrapWordOut, wordIn, wordOut,
      wrapLetterIn, wrapLetterOut, letterIn, letterOut,
      lineConfig, wordConfig, letterConfig,
      lineConfigIn, wordConfigIn, letterConfigIn,
      lineConfigOut, wordConfigOut, letterConfigOut,
      lineDelayIn, wordDelayIn, letterDelayIn,
      lineDelayOut, wordDelayOut, letterDelayOut,
      delayIn, delayOut,
      lineStagger, wordStagger, letterStagger,
      lineStaggerIn, wordStaggerIn, letterStaggerIn,
      lineStaggerOut, wordStaggerOut, letterStaggerOut,
      immediateOut, enableInOutDelayesOnRerender,
      onTextFullyPlayed,
      type, interpolationStaggerCoefficient,
    });
    propsRef.current = {
      wrapLineIn, wrapLineOut, lineIn, lineOut,
      wrapWordIn, wrapWordOut, wordIn, wordOut,
      wrapLetterIn, wrapLetterOut, letterIn, letterOut,
      lineConfig, wordConfig, letterConfig,
      lineConfigIn, wordConfigIn, letterConfigIn,
      lineConfigOut, wordConfigOut, letterConfigOut,
      lineDelayIn, wordDelayIn, letterDelayIn,
      lineDelayOut, wordDelayOut, letterDelayOut,
      delayIn, delayOut,
      lineStagger, wordStagger, letterStagger,
      lineStaggerIn, wordStaggerIn, letterStaggerIn,
      lineStaggerOut, wordStaggerOut, letterStaggerOut,
      immediateOut, enableInOutDelayesOnRerender,
      onTextFullyPlayed,
      type, interpolationStaggerCoefficient,
    };

    // When only letter targets are configured (no word targets), immediately place node
    // token word springs into the letter "out" state so they start hidden/offset just
    // like text letters do.
    useEffect(() => {
      const p = propsRef.current;
      const nodeTokens = nodeTokenWordIndicesRef.current;
      if (nodeTokens.length === 0) return;
      const wordIndexSet = new Set(nodeTokens.map((n) => n.wordIndex));
      if (isNotEmpty(p.wrapWordOut) || isNotEmpty(p.wrapLetterOut)) {
        wrapWordApi.start((index: number) => {
          if (!wordIndexSet.has(index)) return {};
          return { ...p.wrapLetterOut, immediate: true };
        });
      }
      if (isNotEmpty(p.wordOut) || isNotEmpty(p.letterOut)) {
        wordApi.start((index: number) => {
          if (!wordIndexSet.has(index)) return {};
          return { ...p.letterOut, immediate: true };
        });
      }
    }, [tokens, wrapWordApi, wordApi]);

    // Stable ref holding array lengths so the playProgress closure never goes stale
    // even when text or layout changes after mount (since useLoopInView captures at mount)
    const lengthsRef = useRef({ lines: lines.length, words: wordSlotCount, letters: letters.length });
    lengthsRef.current = { lines: lines.length, words: wordSlotCount, letters: letters.length };

    // Tracks last fired toggle state per item so springs are only triggered when the
    // threshold is crossed, not re-started every scroll frame (which resets velocity
    // to zero each time and makes the animation look like linear interpolation).
    const toggleCacheRef = useRef<Map<string, boolean>>(new Map());
    useEffect(() => { toggleCacheRef.current.clear(); }, [wordSlotCount, letters.length, lines.length]);

    // playProgress: drives spring animations based on a 0-1 progress value.
    // All prop reads go through propsRef/lengthsRef so this ref-wrapped function
    // is always up-to-date without needing to be recreated.
    const playProgressFn = (progressValue: number) => {
      const p = propsRef.current;
      const l = lengthsRef.current;
      _progress.current = progressValue;

      // Line layers — stagger by LINE index so all words on the same line animate together.
      // (word-slot index must be mapped to lineIndex via linesRef, not used directly.)
      const lineLayerItems: { api: SpringRef<any>; in: any; out: any; config?: SpringConfig; key: string }[] = [
        { api: wrapLineApi, in: p.wrapLineIn, out: p.wrapLineOut, config: p.lineConfig, key: 'wl' },
        { api: lineApi,     in: p.lineIn,     out: p.lineOut,     config: p.lineConfig, key: 'li' },
      ];
      lineLayerItems.forEach((item) => {
        if (!isNotEmpty(item.in)) return;
        if (p.type === "toggle") {
          // Only fire when threshold changes — avoids velocity-reset on every frame
          item.api.current.forEach((ctrl, idx) => {
            const lineIndex = linesRef.current.flat().find((e) => e.index === idx)?.lineIndex ?? 0;
            const itemPos = l.lines > 1 ? lineIndex / l.lines : 0;
            const next = _progress.current > itemPos;
            const k = `${item.key}_${idx}`;
            if (toggleCacheRef.current.get(k) === next) return;
            toggleCacheRef.current.set(k, next);
            ctrl.start(next ? { ...item.in, config: item.config } : { ...item.out, config: item.config });
          });
        } else {
          item.api.start((index: number) => {
            const lineIndex = linesRef.current.flat().find((e) => e.index === index)?.lineIndex ?? 0;
            const itemPos = l.lines > 1 ? lineIndex / l.lines : 0;
            const itemProgress = transformRange(_progress.current, itemPos - p.interpolationStaggerCoefficient, itemPos, 1, 0);
            return { ...interpolate(item.in, item.out, itemProgress), config: item.config };
          });
        }
      });

      // Word/letter layers — stagger by word/letter index
      const wordLetterItems: { api: SpringRef<any>; in: any; out: any; length: number; config?: SpringConfig; key: string }[] = [
        { api: wrapWordApi,   in: p.wrapWordIn,   out: p.wrapWordOut,   length: l.words,   config: p.wordConfig,   key: 'ww' },
        { api: wordApi,       in: p.wordIn,       out: p.wordOut,       length: l.words,   config: p.wordConfig,   key: 'wo' },
        { api: wrapLetterApi, in: p.wrapLetterIn, out: p.wrapLetterOut, length: l.letters, config: p.letterConfig, key: 'wle' },
        { api: letterApi,     in: p.letterIn,     out: p.letterOut,     length: l.letters, config: p.letterConfig, key: 'le' },
      ];
      wordLetterItems.forEach((item) => {
        if (!isNotEmpty(item.in)) return;
        if (p.type === "toggle") {
          item.api.current.forEach((ctrl, idx) => {
            const itemPos = item.length > 0 ? idx / item.length : 0;
            const next = _progress.current > itemPos;
            const k = `${item.key}_${idx}`;
            if (toggleCacheRef.current.get(k) === next) return;
            toggleCacheRef.current.set(k, next);
            ctrl.start(next ? { ...item.in, config: item.config } : { ...item.out, config: item.config });
          });
        } else {
          item.api.start((index: number) => {
            const itemPos = item.length > 0 ? index / item.length : 0;
            const itemProgress = transformRange(_progress.current, itemPos - p.interpolationStaggerCoefficient, itemPos, 1, 0);
            return { ...interpolate(item.in, item.out, itemProgress), config: item.config };
          });
        }
      });
    };
    // Wrap in a ref so the loop-mounted closure always calls the latest version
    const playProgressRef = useRef(playProgressFn);
    playProgressRef.current = playProgressFn;

    const getDurations = useCallback(() => {
      const p = propsRef.current;
      const isLine = isNotEmpty(p.lineIn) ? 1 : 0;
      const isWord = isNotEmpty(p.wordIn) ? 1 : 0;
      const isLetter = isNotEmpty(p.letterIn) ? 1 : 0;

      const playingLineDurationIn =
        (lines.length - 1) * (p.lineStaggerIn || p.lineStagger) +
        (p.lineConfigIn?.duration || p.lineConfig?.duration || 1200);
      const playingWordDurationIn =
        (wordSlotCount - 1) * (p.wordStaggerIn || p.wordStagger) +
        (p.wordConfigIn?.duration || p.wordConfig?.duration || 1200);
      const playingLetterDurationIn =
        (letters.length - 1) * (p.letterStaggerIn || p.letterStagger) +
        (p.letterConfigIn?.duration || p.letterConfig?.duration || 1200);
      let playingLineDurationOut = 0;
      let playingWordDurationOut = 0;
      let playingLetterDurationOut = 0;

      let delayingLineDurationIn = p.delayIn + p.lineDelayIn;
      let delayingWordDurationIn = p.delayIn + p.wordDelayIn;
      let delayingLetterDurationIn = p.delayIn + p.letterDelayIn;
      let delayingLineDurationOut = p.delayOut + p.lineDelayOut;
      let delayingWordDurationOut = p.delayOut + p.wordDelayOut;
      let delayingLetterDurationOut = p.delayOut + p.letterDelayOut;

      const isNoDelayes =
        (!p.enableInOutDelayesOnRerender && rerendering.current) ||
        (p.immediateOut && rerendering.current);
      if (isNoDelayes) {
        delayingLineDurationIn = 0;
        delayingWordDurationIn = 0;
        delayingLetterDurationIn = 0;
        delayingLineDurationOut = 0;
        delayingWordDurationOut = 0;
        delayingLetterDurationOut = 0;
      }

      if (!p.immediateOut) {
        playingLineDurationOut =
          (lines.length - 1) * (p.lineStaggerOut || p.lineStagger) +
          (p.lineConfigOut?.duration || p.lineConfig?.duration || 1200);
        playingWordDurationOut =
          (wordSlotCount - 1) * (p.wordStaggerOut || p.wordStagger) +
          (p.wordConfigOut?.duration || p.wordConfig?.duration || 1200);
        playingLetterDurationOut =
          (letters.length - 1) * (p.letterStaggerOut || p.letterStagger) +
          (p.letterConfigOut?.duration || p.letterConfig?.duration || 1200);
      }

      const lineDurationIn = delayingLineDurationIn + playingLineDurationIn;
      const wordsDurationIn = delayingWordDurationIn + playingWordDurationIn;
      const letterDurationIn = delayingLetterDurationIn + playingLetterDurationIn;
      const lineDurationOut = delayingLineDurationOut + playingLineDurationOut;
      const wordsDurationOut = delayingWordDurationOut + playingWordDurationOut;
      const letterDurationOut = delayingLetterDurationOut + playingLetterDurationOut;

      const durationIn = Math.max(
        lineDurationIn * isLine,
        Math.max(wordsDurationIn * isWord, letterDurationIn * isLetter)
      );
      const durationOut = Math.max(
        lineDurationOut * isLine,
        Math.max(wordsDurationOut * isWord, letterDurationOut * isLetter)
      );

      return { durationIn, durationOut };
    }, [lines.length, wordSlotCount, letters.length]);

    const _delayIn = useCallback(
      (enter: number, sEnter: number, stagger: number) => {
        const isNoDelayes =
          !propsRef.current.enableInOutDelayesOnRerender && rerendering.current;
        if (isNoDelayes) return stagger;
        return enter + sEnter + stagger;
      },
      []
    );

    const _delayOut = useCallback(
      (enter: number, sEnter: number, stagger: number) => {
        if (!propsRef.current.immediateOut) {
          const isNoDelayes =
            !propsRef.current.enableInOutDelayesOnRerender && rerendering.current;
          if (isNoDelayes) return stagger;
          return enter + sEnter + stagger;
        }
        return 0;
      },
      []
    );

    const playOut = useCallback(
      (durationOut: number) => {
        const p = propsRef.current;
        setPlayed(false);
        clearTimeout(fullyPlayedTimeoutOut.current);
        // line
        isNotEmpty(p.wrapLineOut) &&
          wrapLineApi.start((index: number) => {
            const lineIdx = linesRef.current.flat().find((e) => e.index === index)?.lineIndex ?? 0;
            return {
              ...p.wrapLineOut,
              delay: _delayOut(p.delayOut, p.lineDelayOut, lineIdx * (p.lineStaggerOut || p.lineStagger)),
              config: isNotEmpty(p.lineConfigOut) ? p.lineConfigOut : p.lineConfig,
              immediate: p.immediateOut,
            };
          });
        isNotEmpty(p.lineOut) &&
          lineApi.start((index: number) => {
            const lineIdx = linesRef.current.flat().find((e) => e.index === index)?.lineIndex ?? 0;
            return {
              ...p.lineOut,
              delay: _delayOut(p.delayOut, p.lineDelayOut, lineIdx * (p.lineStaggerOut || p.lineStagger)),
              config: isNotEmpty(p.lineConfigOut) ? p.lineConfigOut : p.lineConfig,
              immediate: p.immediateOut,
            };
          });
        // word
        isNotEmpty(p.wrapWordOut) &&
          wrapWordApi.start((index: number) => ({
            ...p.wrapWordOut,
            delay: _delayOut(p.delayOut, p.wordDelayOut, index * (p.wordStaggerOut || p.wordStagger)),
            config: isNotEmpty(p.wordConfigOut) ? p.wordConfigOut : p.wordConfig,
            immediate: p.immediateOut,
          }));
        isNotEmpty(p.wordOut) &&
          wordApi.start((index: number) => ({
            ...p.wordOut,
            delay: _delayOut(p.delayOut, p.wordDelayOut, index * (p.wordStaggerOut || p.wordStagger)),
            config: isNotEmpty(p.wordConfigOut) ? p.wordConfigOut : p.wordConfig,
            immediate: p.immediateOut,
          }));
        // node token fallback: animate node token word slots with letter targets when word targets are empty
        {
          const nodeTokens = nodeTokenWordIndicesRef.current;
          if (nodeTokens.length > 0) {
            const nodeMap = new Map(nodeTokens.map((n) => [n.wordIndex, n.lettersBefore]));
            if (!isNotEmpty(p.wrapWordOut) && isNotEmpty(p.wrapLetterOut)) {
              wrapWordApi.start((index: number) => {
                if (!nodeMap.has(index)) return {};
                return {
                  ...p.wrapLetterOut,
                  delay: _delayOut(p.delayOut, p.letterDelayOut, nodeMap.get(index)! * (p.letterStaggerOut || p.letterStagger)),
                  config: isNotEmpty(p.letterConfigOut) ? p.letterConfigOut : p.letterConfig,
                  immediate: p.immediateOut,
                };
              });
            }
            if (!isNotEmpty(p.wordOut) && isNotEmpty(p.letterOut)) {
              wordApi.start((index: number) => {
                if (!nodeMap.has(index)) return {};
                return {
                  ...p.letterOut,
                  delay: _delayOut(p.delayOut, p.letterDelayOut, nodeMap.get(index)! * (p.letterStaggerOut || p.letterStagger)),
                  config: isNotEmpty(p.letterConfigOut) ? p.letterConfigOut : p.letterConfig,
                  immediate: p.immediateOut,
                };
              });
            }
          }
        }
        // letter
        isNotEmpty(p.wrapLetterOut) &&
          wrapLetterApi.start((index: number) => ({
            ...p.wrapLetterOut,
            delay: _delayOut(p.delayOut, p.letterDelayOut, index * (p.letterStaggerOut || p.letterStagger)),
            config: isNotEmpty(p.letterConfigOut) ? p.letterConfigOut : p.letterConfig,
            immediate: p.immediateOut,
          }));
        isNotEmpty(p.letterOut) &&
          letterApi.start((index: number) => ({
            ...p.letterOut,
            delay: _delayOut(p.delayOut, p.letterDelayOut, index * (p.letterStaggerOut || p.letterStagger)),
            config: isNotEmpty(p.letterConfigOut) ? p.letterConfigOut : p.letterConfig,
            immediate: p.immediateOut,
          }));
        fullyPlayedTimeoutOut.current = setTimeout(
          () => p.onTextFullyPlayed("out"),
          durationOut
        );
      },
      [wrapLineApi, lineApi, wrapWordApi, wordApi, wrapLetterApi, letterApi, _delayOut]
    );

    const playIn = useCallback(
      (durationIn: number) => {
        const p = propsRef.current;
        setPlayed(true);
        clearTimeout(fullyPlayedTimeoutIn.current);
        // line
        isNotEmpty(p.wrapLineIn) &&
          wrapLineApi.start((index: number) => {
            const lineIdx = linesRef.current.flat().find((e) => e.index === index)?.lineIndex ?? 0;
            return {
              ...p.wrapLineIn,
              delay: _delayIn(p.delayIn, p.lineDelayIn, lineIdx * (p.lineStaggerIn || p.lineStagger)),
              config: isNotEmpty(p.lineConfigIn) ? p.lineConfigIn : p.lineConfig,
            };
          });
        isNotEmpty(p.lineIn) &&
          lineApi.start((index: number) => {
            const lineIdx = linesRef.current.flat().find((e) => e.index === index)?.lineIndex ?? 0;
            return {
              ...p.lineIn,
              delay: _delayIn(p.delayIn, p.lineDelayIn, lineIdx * (p.lineStaggerIn || p.lineStagger)),
              config: isNotEmpty(p.lineConfigIn) ? p.lineConfigIn : p.lineConfig,
            };
          });
        // word
        isNotEmpty(p.wrapWordIn) &&
          wrapWordApi.start((index: number) => ({
            ...p.wrapWordIn,
            delay: _delayIn(p.delayIn, p.wordDelayIn, index * (p.wordStaggerIn || p.wordStagger)),
            config: isNotEmpty(p.wordConfigIn) ? p.wordConfigIn : p.wordConfig,
          }));
        isNotEmpty(p.wordIn) &&
          wordApi.start((index: number) => ({
            ...p.wordIn,
            delay: _delayIn(p.delayIn, p.wordDelayIn, index * (p.wordStaggerIn || p.wordStagger)),
            config: isNotEmpty(p.wordConfigIn) ? p.wordConfigIn : p.wordConfig,
          }));
        // node token fallback: animate node token word slots with letter targets when word targets are empty
        {
          const nodeTokens = nodeTokenWordIndicesRef.current;
          if (nodeTokens.length > 0) {
            const nodeMap = new Map(nodeTokens.map((n) => [n.wordIndex, n.lettersBefore]));
            if (!isNotEmpty(p.wrapWordIn) && isNotEmpty(p.wrapLetterIn)) {
              wrapWordApi.start((index: number) => {
                if (!nodeMap.has(index)) return {};
                return {
                  ...p.wrapLetterIn,
                  delay: _delayIn(p.delayIn, p.letterDelayIn, nodeMap.get(index)! * (p.letterStaggerIn || p.letterStagger)),
                  config: isNotEmpty(p.letterConfigIn) ? p.letterConfigIn : p.letterConfig,
                };
              });
            }
            if (!isNotEmpty(p.wordIn) && isNotEmpty(p.letterIn)) {
              wordApi.start((index: number) => {
                if (!nodeMap.has(index)) return {};
                return {
                  ...p.letterIn,
                  delay: _delayIn(p.delayIn, p.letterDelayIn, nodeMap.get(index)! * (p.letterStaggerIn || p.letterStagger)),
                  config: isNotEmpty(p.letterConfigIn) ? p.letterConfigIn : p.letterConfig,
                };
              });
            }
          }
        }
        // letter
        isNotEmpty(p.wrapLetterIn) &&
          wrapLetterApi.start((index: number) => ({
            ...p.wrapLetterIn,
            delay: _delayIn(p.delayIn, p.letterDelayIn, index * (p.letterStaggerIn || p.letterStagger)),
            config: isNotEmpty(p.letterConfigIn) ? p.letterConfigIn : p.letterConfig,
          }));
        isNotEmpty(p.letterIn) &&
          letterApi.start((index: number) => ({
            ...p.letterIn,
            delay: _delayIn(p.delayIn, p.letterDelayIn, index * (p.letterStaggerIn || p.letterStagger)),
            config: isNotEmpty(p.letterConfigIn) ? p.letterConfigIn : p.letterConfig,
          }));
        fullyPlayedTimeoutIn.current = setTimeout(
          () => p.onTextFullyPlayed("in"),
          durationIn
        );
      },
      [wrapLineApi, lineApi, wrapWordApi, wordApi, wrapLetterApi, letterApi, _delayIn]
    );

    // Only for "ALWAYS" and "FORWARD" and "ONCE" modes (not "manual" or "progress")
    useEffect(() => {
      if (mode === "manual" || mode === "progress") {
        return;
      }
      if (paused) return;
      if (lines.length === 0) return;
      const { durationIn, durationOut } = getDurations();
      if (inView && enabled && innerEnabled && !played) {
        playIn(durationIn);
        return;
      }
      if (
        (!scrolledDown.current && played && !inView) ||
        (played && !scrolledDown.current && (!enabled || !innerEnabled))
      ) {
        playOut(durationOut);
        return;
      }
    }, [
      inView,
      enabled,
      innerEnabled,
      played,
      mode,
      paused,
      lines,
      getDurations,
      playIn,
      playOut,
    ]);

    // Only for "MANUAL" mode
    useEffect(() => {
      if (mode !== "manual") {
        return;
      }
      if (paused) return;
      const { durationIn, durationOut } = getDurations();
      if (isIn && innerEnabled && !played) {
        playIn(durationIn);
        return;
      }
      if ((!isIn && played) || (!innerEnabled && played)) {
        playOut(durationOut);
        return;
      }
    }, [mode, paused, isIn, innerEnabled, played, getDurations, playIn, playOut]);

    const renderText = useMemo(() => {
      const WrapLine = ({
        children,
        wordIndex,
      }: {
        children: ReactNode;
        wordIndex: number;
      }) => {
        return (
          <animated.span
            style={{
              ...wrapLineSprings[wordIndex],
              ...{
                overflow: overflow ? "hidden" : "initial",
                display: "inline-block",
                userSelect: "auto",
              },
            }}
            className={
              "line-word" + (wrapLineClassName ? " " + wrapLineClassName : "")
            }
          >
            {children}
          </animated.span>
        );
      };
      const Line = ({
        children,
        wordIndex,
      }: {
        children: ReactNode;
        wordIndex: number;
      }) => {
        return isNotEmpty(lineIn) ? (
          <animated.span
            style={{
              display: "inline-block",
              ...lineSprings[wordIndex],
              userSelect: "auto",
            }}
            className={lineClassName}
          >
            {children}
          </animated.span>
        ) : (
          <>{children}</>
        );
      };
      const WrapWord = ({
        children,
        wordIndex,
      }: {
        children: ReactNode;
        wordIndex: number;
      }) => {
        return isNotEmpty(wrapWordIn) ? (
          <animated.span
            style={{
              display: "inline-block",
              ...wrapWordSprings[wordIndex],
              ...{ overflow: overflow ? "hidden" : "initial" },
              userSelect: "auto",
            }}
            className={wrapWordClassName}
          >
            {children}
          </animated.span>
        ) : (
          <>{children}</>
        );
      };
      const Word = ({
        children,
        wordIndex,
      }: {
        children: ReactNode;
        wordIndex: number;
      }) => {
        return isNotEmpty(wordIn) ? (
          <animated.span
            style={{
              display: "inline-block",
              userSelect: "auto",
              ...wordSprings[wordIndex],
            }}
            className={wordClassName}
          >
            {children}
          </animated.span>
        ) : (
          <>{children}</>
        );
      };
      const WrapLetter = ({
        children,
        letterIndex,
      }: {
        children: ReactNode;
        letterIndex: number;
      }) => {
        return isNotEmpty(wrapLetterIn) ? (
          <animated.span
            style={{
              display: "inline-block",
              userSelect: "auto",
              ...wrapLetterSprings[letterIndex],
              ...{ overflow: overflow ? "hidden" : "initial" },
            }}
            className={wrapLetterClassName}
          >
            {children}
          </animated.span>
        ) : (
          <>{children}</>
        );
      };
      const Letter = ({
        children,
        letterIndex,
      }: {
        children: ReactNode;
        letterIndex: number;
      }) => {
        return isNotEmpty(letterIn) ? (
          <animated.span
            style={{
              display: "inline-block",
              userSelect: "auto",
              ...letterSprings[letterIndex],
            }}
            className={letterClassName}
          >
            {children}
          </animated.span>
        ) : (
          <>{children}</>
        );
      };

      const WordLetters = ({
        word,
        letterStart,
      }: {
        word: string[];
        // global letter index of the first character in this word
        letterStart: number;
      }) => {
        return isNotEmpty(wrapLetterIn) || isNotEmpty(letterIn) ? (
          word.map((letter: string, letterIndex: number) => {
            const index = letterStart + letterIndex;
            return (
              <WrapLetter key={letterIndex} letterIndex={index}>
                <Letter letterIndex={index}>{letter}</Letter>
              </WrapLetter>
            );
          })
        ) : (
          <>{word}</>
        );
      };

      const containerStyle = {
        position: "relative" as const,
        columnGap: typeof columnGap === "number" ? `${columnGap}em` : columnGap,
        display: "flex",
        flexWrap: "wrap" as const,
        ...style,
      };

      // Running indices for spring lookup
      let wordSlotIdx = 0;
      let letterIdx = 0;

      const innerContent = (
        <>
          {seo && (
            <span
              style={{
                // Visually hidden — accessible to screen readers and crawlers,
                // invisible and non-interactive for sighted users.
                position: "absolute",
                width: "1px",
                height: "1px",
                padding: 0,
                margin: "-1px",
                overflow: "hidden",
                clip: "rect(0,0,0,0)",
                whiteSpace: "nowrap",
                border: 0,
                pointerEvents: "none",
                userSelect: "none",
              }}
            >
              {stripNonTextChildren(children)}
            </span>
          )}
          {/* aria-hidden when seo=true: screen readers and crawlers use the SEO copy above.
              display:contents keeps flex layout intact. */}
          <span {...(seo ? { "aria-hidden": "true" } : {})} style={{ display: "contents" }}>
          {tokens.map((token, tokenIdx) => {
            if (token.type === "node") {
              // Non-text element (SVG, img, component) — animated as a single word unit.
              // Falls back to letter targets when word targets are empty so that inline
              // images/icons participate in letter-only animations.
              const wordIndex = wordSlotIdx++;
              const nodeLetterFallback = !isNotEmpty(wordIn) && isNotEmpty(letterIn);
              const nodeWrapLetterFallback = !isNotEmpty(wrapWordIn) && isNotEmpty(wrapLetterIn);
              const inner = (isNotEmpty(wordIn) || nodeLetterFallback) ? (
                <animated.span
                  style={{ display: "inline-block", userSelect: "auto", ...wordSprings[wordIndex] }}
                  className={wordClassName}
                >
                  {token.node}
                </animated.span>
              ) : token.node;
              const wrapped = (isNotEmpty(wrapWordIn) || nodeWrapLetterFallback) ? (
                <animated.span
                  style={{
                    display: "inline-block",
                    ...wrapWordSprings[wordIndex],
                    overflow: overflow ? "hidden" : "initial",
                    userSelect: "auto",
                  }}
                  className={wrapWordClassName}
                >
                  {inner}
                </animated.span>
              ) : inner;
              return (
                <WrapLine wordIndex={wordIndex} key={`node-${tokenIdx}`}>
                  <Line wordIndex={wordIndex}>
                    {wrapped}
                  </Line>
                </WrapLine>
              );
            }
            if (token.type === "wrapper") {
              // Element with text children — animate words as direct flex items, apply the
              // wrapper element's tag + props as an inner wrap around the letters in each word.
              const WrapElem = token.element.type as ElementType;
              const { children: _omit, ...wrapElemProps } = token.element.props;
              return (
                <Fragment key={`wrapper-${tokenIdx}`}>
                  {token.words.map((word, wIdx) => {
                    const wordIndex = wordSlotIdx++;
                    const letterStart = letterIdx;
                    letterIdx += word.chars.length;
                    return (
                      <WrapLine wordIndex={wordIndex} key={`wrapper-word-${tokenIdx}-${wIdx}`}>
                        <Line wordIndex={wordIndex}>
                          <WrapWord wordIndex={wordIndex}>
                            <Word wordIndex={wordIndex}>
                              <WrapElem {...wrapElemProps}>
                                <WordLetters word={word.chars} letterStart={letterStart} />
                              </WrapElem>
                            </Word>
                          </WrapWord>
                        </Line>
                      </WrapLine>
                    );
                  })}
                </Fragment>
              );
            }
            // TextToken — regular word
            const wordIndex = wordSlotIdx++;
            const letterStart = letterIdx;
            letterIdx += token.chars.length;
            return (
              <WrapLine wordIndex={wordIndex} key={`word-${tokenIdx}`}>
                <Line wordIndex={wordIndex}>
                  <WrapWord wordIndex={wordIndex}>
                    <Word wordIndex={wordIndex}>
                      <WordLetters word={token.chars} letterStart={letterStart} />
                    </Word>
                  </WrapWord>
                </Line>
              </WrapLine>
            );
          })}
          </span>
        </>
      );

      if (mode === "progress") {
        return (
          <ProgressTrigger
            tag={tag}
            ref={ref as any}
            trigger={trigger as any}
            start={start}
            end={end}
            style={containerStyle}
            className={className}
            {...props}
            onChange={(values) => playProgressRef.current(values.progress)}
          >
            {innerContent}
          </ProgressTrigger>
        );
      }

      return (
        <VarTextTag
          tag={tag}
          ref={ref}
          style={containerStyle}
          className={className}
          {...props}
        >
          {innerContent}
        </VarTextTag>
      );
    }, [
      tokens,
      mode,
      className,
      wrapLetterClassName,
      wrapWordClassName,
      lineClassName,
      wrapLineClassName,
      tag,
      columnGap,
      start,
      end,
      // Only *In props needed: render conditions use isNotEmpty(xIn) to decide structure
      wrapLineIn,
      lineIn,
      wrapWordIn,
      wordIn,
      wrapLetterIn,
      letterIn,
    ]);

    return renderText;
  }
);

Engine.displayName = "Engine";

export type HtmlTags = Tags;

export interface VarTextTagProps {
  tag?: HtmlTags;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export const VarTextTag = forwardRef<HTMLElement, VarTextTagProps>(
  ({ tag = "span", children, className, style, ...props }, outerRef) => {
    const ref = useRef<HTMLElement | null>(null);
    useImperativeHandle(outerRef, () => ref.current as HTMLElement);
    const Tag = tag as ElementType;

    return (
      <Tag ref={ref} className={className} style={style} {...props}>
        {children}
      </Tag>
    );
  }
);
VarTextTag.displayName = "VarTextTag";

export const useResizeObserver = (
  trigger: RefObject<any>,
  rerender: (newWidth: number, oldWidth: number) => void
) => {
  const width = useRef<number>(0);

  useEffect(() => {
    const divElement = trigger.current;
    if (!divElement) return;

    const handleResize = (entries: any) => {
      for (let entry of entries) {
        if (entry.target === divElement) {
          const oldWidth = width.current;
          const newWidth = entry.contentRect.width;
          width.current = newWidth;
          rerender(newWidth, oldWidth);
        }
      }
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(divElement);

    return () => {
      resizeObserver.unobserve(divElement);
    };
  }, [rerender]);
};

export function calcLinesRefs(containerRef: RefObject<any>) {
  if (!containerRef.current) {
    return [];
  }
  const { top: containerTop } = containerRef.current.getBoundingClientRect();
  const _words = containerRef.current.querySelectorAll(".line-word");
  if (!_words.length) {
    return [];
  }
  const lines: { word: HTMLSpanElement; index: number; lineIndex: number }[][] =
    [];
  // IMPORTANT: Calc lines count based on height, be carefull with adding *row-gap*
  // IMPORTANT: *All words same height*
  const wordHeight = _words[0].getBoundingClientRect().height;

  _words.forEach((w: HTMLSpanElement, index: number) => {
    const { top: wordTop } = w.getBoundingClientRect();
    const lineIndex = Math.floor((wordTop - containerTop) / wordHeight);
    lines[lineIndex] = [
      ...(lines[lineIndex] || []),
      { word: w, index, lineIndex },
    ];
  });

  return lines;
}

export function isNotEmpty(obj: { [key: string]: any }): boolean {
  return Object.keys(obj).length > 0;
}

/**
 * Recursively strips non-text nodes (img, svg, video, canvas, etc.) from React
 * children so that the SEO copy only contains readable text content.
 */
function stripNonTextChildren(children: ReactNode): ReactNode {
  const VISUAL_ONLY_TAGS = new Set(["img", "svg", "video", "canvas", "picture", "iframe"]);
  return Children.map(children, (child) => {
    if (child == null || typeof child === "boolean") return null;
    if (typeof child === "string" || typeof child === "number") return child;
    if (isValidElement(child)) {
      if (VISUAL_ONLY_TAGS.has(child.type as string)) return null;
      const nested = (child.props as any).children;
      return nested != null
        ? cloneElement(child as ReactElement<any>, {}, stripNonTextChildren(nested))
        : child;
    }
    return null;
  });
}

export default TextEngine;

type TextEngineFactory = {
  [K in HtmlTags]: React.ForwardRefExoticComponent<
    React.PropsWithoutRef<Omit<EngineProps, "as">> &
      React.RefAttributes<HTMLElement>
  >;
};

// Use this function to get a factory for your custom text component
export const getTextFactory = (Component: any): TextEngineFactory => {
  return new Proxy({} as TextEngineFactory, {
    get(_, tag: string) {
      return memo(
        forwardRef((props: Omit<EngineProps, "as">, ref) => (
          <Component as={tag as HtmlTags} ref={ref} {...props} />
        ))
      );
    },
  });
};

export const tengine = getTextFactory(TextEngine);
