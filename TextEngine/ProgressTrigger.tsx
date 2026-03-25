/**
 * @fileoverview Progress trigger component for scroll-based progress tracking
 *
 * This component tracks scroll position relative to trigger points and fires progress updates:
 * 1. Configurable start and end trigger positions
 * 2. Provides normalized progress values (0-1)
 * 3. Supports external trigger elements
 * 4. Optional mobile device handling
 *
 * Trigger position format (GSAP-style):
 *   "<element-edge> <viewport-edge>"          e.g. "top bottom"
 *   "<element-edge> <viewport-edge>+=<px>"    e.g. "top bottom+=200"
 *   "<element-edge> <viewport-edge>-=<px>"    e.g. "bottom top-=100"
 *
 * @param {React.ReactNode} children - Child elements
 * @param {boolean} enabled - Whether progress tracking is enabled
 * @param {React.RefObject<HTMLElement>} trigger - Optional external trigger element ref
 * @param {TriggerPos} start - Start position for trigger (e.g. "top bottom")
 * @param {TriggerPos} end - End position for trigger (e.g. "bottom top")
 * @param {Function} onChange - Callback fired with progress updates
 * @param {boolean} disableOnMobile - Whether to disable on mobile devices
 * @param {SpringConfig} config - Spring animation configuration
 * @param {number} frameInterval - Frame rate throttle interval in ms
 * @param {Tags} tag - HTML tag to use for container
 */

"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { SpringConfig, config } from "@react-spring/web";
import { VarTextTag } from "./TextEngine";
import { useProgressTrigger } from "./hooks/useProgressTrigger";

type EdgePos = "top" | "center" | "bottom";

export type Tags = 'div' | 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 
    'section' | 'article' | 'nav' | 'aside' | 'header' | 'footer' | 'main' | 
    'form' | 'input' | 'button' | 'a' | 'img' | 'ul' | 'ol' | 'li' | 
    'table' | 'tr' | 'td' | 'th' | 'thead' | 'tbody' | 'label' | 'select' | 'option' | 'textarea' |
    'canvas' | 'svg' | 'path' | 'circle' | 'rect' | 'polygon' | 'video' | 'audio' | 'source' |
    'iframe' | 'figure' | 'figcaption' | 'picture' | 'time' | 'address' | 'blockquote' | 'code' |
    'pre' | 'details' | 'summary' | 'dialog' | 'menu' | 'menuitem' | 'progress' | 'meter' |
    'fieldset' | 'legend' | 'datalist' | 'optgroup' | 'output' | 'template' | 'slot';

/**
 * Trigger position for scroll-driven animations.
 *
 * Basic format:   "top bottom" | "center top" | "bottom center" | …
 * With px offset: "top bottom+=200" | "bottom top-=100" | "center center+=50"
 *
 * The first word is the element edge, the second is the viewport edge.
 * += adds pixels (trigger fires later / element must scroll further);
 * -= subtracts pixels (trigger fires earlier).
 */
export type TriggerPos = `${EdgePos} ${EdgePos}` | (string & {});

type ProgressTriggerProps = {
  children?: React.ReactNode;
  enabled?: boolean;
  trigger?: React.RefObject<HTMLElement> | undefined;
  start?: TriggerPos;
  end?: TriggerPos;
  onChange?: (state: {
    progress: number;
    interpolatedProgress: number;
  }) => void;
  disableOnMobile?: boolean;
  config?: SpringConfig;
  frameInterval?: number;
} & Omit<React.HTMLAttributes<HTMLElement>, "onChange">;

export const ProgressTrigger = forwardRef<
  HTMLElement,
  ProgressTriggerProps & { tag?: Tags }
>(
  (
    {
      tag: Tag = "div",
      children,
      start = "top bottom",
      end = "bottom top",
      trigger = undefined,
      onChange,
      enabled = true,
      disableOnMobile = false,
      frameInterval = 10,
      config: springConfig = config.default,
      ...props
    },
    ref
  ) => {
    const innerRef = useRef<HTMLElement>(null);
    useImperativeHandle(ref, () => innerRef.current as HTMLElement);

    useProgressTrigger({
      start,
      end,
      trigger,
      onChange,
      enabled,
      disableOnMobile,
      frameInterval,
      config: springConfig,
      elementRef: innerRef,
    });

    if (trigger && Tag === undefined) {
      return <>{children}</>;
    }

    return (
      <VarTextTag tag={Tag} ref={innerRef} {...props}>
        {children}
      </VarTextTag>
    );
  }
);

ProgressTrigger.displayName = "ProgressTrigger";
