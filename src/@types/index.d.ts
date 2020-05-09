// @see https://github.com/GoogleChromeLabs/squoosh/blob/553a5041406976719522f9cf85af87be0810a99f/src/components/Output/custom-els/TwoUp/missing-types.d.ts#L34-L52
interface ResizeObserverCallback {
  (entries: ResizeObserverEntry[], observer: ResizeObserver): void
}

interface ResizeObserverEntry {
  readonly target: Element
  readonly contentRect: DOMRectReadOnly
}

interface ResizeObserver {
  observe(target: Element): void
  unobserve(target: Element): void
  disconnect(): void
}

declare let ResizeObserver: {
  prototype: ResizeObserver
  new (callback: ResizeObserverCallback): ResizeObserver
}
