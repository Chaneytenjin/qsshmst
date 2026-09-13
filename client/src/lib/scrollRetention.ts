export interface ScrollableElement {
  scrollTop: number;
}

/**
 * Retains a scroll container position across an intentional DOM remount.
 * AppLayout has separate instances for desktop and mobile navigation.
 */
export function createScrollRetentionController() {
  let scrollTop = 0;

  return {
    save(element: ScrollableElement) {
      scrollTop = Math.max(0, element.scrollTop);
    },
    restore(element: ScrollableElement) {
      element.scrollTop = scrollTop;
    },
    getScrollTop() {
      return scrollTop;
    },
  };
}
