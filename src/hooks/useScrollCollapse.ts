import { ref, Ref, onMounted, onUnmounted, watch } from 'vue';
import { useScroll } from '@vueuse/core';

interface ScrollCollapseOptions {
  threshold?: number;        // Scroll distance threshold to trigger collapse/expand
  topOffset?: number;        // Distance from top where bar is always visible
  pixelsPerRem?: number;     // Conversion factor for rem to pixels
  immediate?: boolean;       // Whether to setup listeners immediately
  target?: Ref<HTMLElement | null> | Window | Document | null; // Element to watch scrolling on
  throttle?: number;         // Throttle duration for scroll events
}

/**
 * Hook to handle collapsing/expanding element (typically a header/navbar) based on scroll direction
 * 
 * @param options Configuration options
 * @returns Object containing state and methods to control the collapsing behavior
 */
export function useScrollCollapse(options: ScrollCollapseOptions = {}) {
  const {
    threshold = 50,
    topOffset = 20,
    pixelsPerRem = 16,
    immediate = true,
    target = window,
    throttle = 300
  } = options;
  
  const isCollapsed = ref(false);
  const lastScrollY = ref(0);
  const topThreshold = topOffset * pixelsPerRem;
  
  // Use VueUse's useScroll hook for all scroll handling
  const { y, isScrolling, arrivedState } = useScroll(target as any, {
    throttle,
    behavior: 'smooth'
  });
  
  // Handle scroll logic using watch on the y value
  const stopWatch = ref<Function | null>(null);
  
  const setupScrollWatch = () => {
    if (stopWatch.value) stopWatch.value();
    
    stopWatch.value = watch(y, (currentScrollY) => {
      const scrollDifference = currentScrollY - lastScrollY.value;
      
      // If scrolled down more than threshold, collapse the bar
      if (scrollDifference > threshold) {
        isCollapsed.value = true;
      } 
      // If scrolled up more than threshold, expand the bar
      else if (scrollDifference < -threshold) {
        isCollapsed.value = false;
      }
      
      // Always show at the top of page
      if (currentScrollY === 0 || currentScrollY < topThreshold) {
        isCollapsed.value = false;
      }
      
      lastScrollY.value = currentScrollY;
    });
  };
  
  // Setup and cleanup functions
  const setup = () => {
    setupScrollWatch();
  };
  
  const cleanup = () => {
    if (stopWatch.value) {
      stopWatch.value();
      stopWatch.value = null;
    }
  };
  
  // Automatically setup on mount if immediate is true
  if (immediate) {
    onMounted(setup);
    onUnmounted(cleanup);
  }
  
  // Expose the scroll state and control methods
  return {
    isCollapsed,
    scrollY: y,
    isScrolling,
    arrivedState,
    setup,
    cleanup,
    toggle: () => {
      isCollapsed.value = !isCollapsed.value;
    },
    collapse: () => {
      isCollapsed.value = true;
    },
    expand: () => {
      isCollapsed.value = false;
    },
  };
}