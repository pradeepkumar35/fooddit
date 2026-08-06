import '@testing-library/jest-dom/vitest'

// jsdom does not implement scrollTo; provide a no-op stub.
window.scrollTo = () => {}

// jsdom's CSS object lacks the escape helper; PillTabs uses it to select tabs.
if (typeof CSS !== 'undefined' && typeof CSS.escape !== 'function') {
  CSS.escape = (value) => value.replace(/[^a-zA-Z0-9_-]/g, '\\$&')
}

// IntersectionObserver is not implemented in jsdom; some components guard on it.
if (typeof window.IntersectionObserver === 'undefined') {
  window.IntersectionObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}
