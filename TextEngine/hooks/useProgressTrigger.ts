/**
 * @fileoverview A React hook for creating scroll-triggered progress animations.
 *
 * Features:
 * - Configurable trigger points using element positions (top/center/bottom)
 * - GSAP-style offset syntax: "top bottom+=500" or "bottom top-=200"
 * - Mobile device handling with optional disabling
 * - Frame rate control for performance optimization
 * - Progress tracking and change notifications
 * - Spring configuration customization
 * - SSR-safe implementation
 *
 * @param {Object} props - Hook configuration options
 * @param {boolean} [props.enabled=true] - Whether the trigger is enabled
 * @param {RefObject<HTMLElement>} [props.trigger] - Optional trigger element ref
 * @param {TriggerPos} [props.start="top bottom"] - Starting trigger position
 * @param {TriggerPos} [props.end="bottom top"] - Ending trigger position
 * @param {Function} [props.onChange] - Callback when progress changes
 * @param {boolean} [props.disableOnMobile=false] - Whether to disable on mobile
 * @param {SpringConfig} [props.config] - Spring animation configuration
 * @param {number} [props.frameInterval=10] - Frame rate interval in ms
 * @param {RefObject<HTMLElement>} props.elementRef - Target element ref
 *
 * @returns {Object} Progress values
 * @returns {number} .progress - Raw progress value (0-1)
 * @returns {SpringValue} .interpolatedProgress - Spring-animated progress
 */

import { RefObject, useEffect, useMemo, useRef } from "react";
import { SpringConfig, useSpring } from "@react-spring/web";
import { useWindowWidth } from "./useWindowSize";
// import { isMobileDisabled, springsConfig } from "@/components/Springs/config";
import { useLoopInView } from "./useLoopInView";
import { TriggerPos } from "../ProgressTrigger";

interface UseProgressTriggerProps {
  enabled?: boolean;
  trigger?: RefObject<HTMLElement> | undefined;
  start?: TriggerPos;
  end?: TriggerPos;
  onChange?: (state: {
    progress: number;
    interpolatedProgress: number;
  }) => void;
  disableOnMobile?: boolean;
  config?: SpringConfig;
  frameInterval?: number;
  elementRef: RefObject<HTMLElement>;
}

/**
 * Parses a GSAP-style trigger position string and returns its pixel value.
 *
 * Supported formats:
 *   "top bottom"        — element edge vs viewport edge (no offset)
 *   "top bottom+=500"   — adds 500px to the base position
 *   "bottom top-=200"   — subtracts 200px from the base position
 *
 * The += / -= semantics follow GSAP ScrollTrigger conventions:
 * += shifts the trigger point further in the scroll direction (later trigger),
 * -= shifts it earlier.
 */
function parseTriggerPos(pos: string, poses: Record<string, number>): number {
  const match = pos.match(
    /^(top|center|bottom)\s+(top|center|bottom)(?:([+-])=(\d+(?:\.\d+)?))?$/
  );
  if (!match) return 0;
  const base = poses[`${match[1]}_${match[2]}`] ?? 0;
  if (!match[3]) return base;
  return base + (match[3] === "+" ? 1 : -1) * parseFloat(match[4]);
}

export function useProgressTrigger({
  start = "top bottom",
  end = "bottom top",
  trigger,
  onChange,
  enabled = true,
  disableOnMobile = false,
  frameInterval = 10,
  config: springConfig,
  elementRef,
}: UseProgressTriggerProps) {
  const width = useWindowWidth();
  const savedProgress = useRef(-1);
  const activeRef = useRef(false);

  const [{ interpolatedProgress }, springApi] = useSpring(() => ({
    interpolatedProgress: 0,
    config: springConfig,
  }));

  const active = useMemo(() => {
    // if (
    //   isMobileDisabled(
    //     springsConfig.disableOnMobile.springtrigger || disableOnMobile
    //   )
    // ) {
    //   return false;
    // }
    if (!enabled) {
      return false;
    }
    return true;
  }, [enabled, disableOnMobile, width]);

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useLoopInView(
    // @ts-expect-error
    trigger || elementRef,
    () => {
      if (typeof window === "undefined") return;
      const _ref = trigger || elementRef;
      if (!activeRef.current || !_ref.current) return;

      const bb = _ref.current.getBoundingClientRect();
      const clientHeight = window.innerHeight;

      const poses = {
        top_top: bb.top,
        center_top: bb.top + bb.height / 2,
        bottom_top: bb.bottom,
        top_bottom: bb.top - clientHeight,
        center_bottom: bb.top + bb.height / 2 - clientHeight,
        bottom_bottom: bb.bottom - clientHeight,
        top_center: bb.top - clientHeight / 2,
        center_center: bb.top + bb.height / 2 - clientHeight / 2,
        bottom_center: bb.bottom - clientHeight / 2,
      };

      const scrollStart = parseTriggerPos(start as string, poses);
      const scrollEnd = parseTriggerPos(end as string, poses);
      const length = Math.abs(scrollStart - scrollEnd);
      const progress = Math.min(
        Math.max(0, 1 - (scrollStart + length) / length),
        1
      );

      if (progress !== savedProgress.current) {
        savedProgress.current = progress;
        springApi.start({ interpolatedProgress: progress });
        onChange?.({
          progress,
          interpolatedProgress: interpolatedProgress.get(),
        });
      }
    },
    { framerate: frameInterval }
  );

  return {
    interpolatedProgress,
    progress: savedProgress.current,
  };
}
