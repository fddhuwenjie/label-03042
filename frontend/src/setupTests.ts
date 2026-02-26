// jest-dom 扩展了 jest 的匹配器，用于断言 DOM 节点
import '@testing-library/jest-dom';

// Mock matchMedia - 完整实现以支持 antd 的响应式组件
const createMatchMedia = (width: number) => (query: string) => {
  const mediaQueryList = {
    matches: query.includes('min-width') 
      ? width >= parseInt(query.match(/\d+/)?.[0] || '0', 10)
      : width <= parseInt(query.match(/\d+/)?.[0] || '0', 10),
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  };
  return mediaQueryList;
};

window.matchMedia = jest.fn().mockImplementation(createMatchMedia(1024));

// Mock localStorage - 使用真实的存储实现
const localStorageData: Record<string, string> = {};
const localStorageMock = {
  getItem: jest.fn((key: string) => localStorageData[key] || null),
  setItem: jest.fn((key: string, value: string) => {
    localStorageData[key] = value;
  }),
  removeItem: jest.fn((key: string) => {
    delete localStorageData[key];
  }),
  clear: jest.fn(() => {
    Object.keys(localStorageData).forEach(key => delete localStorageData[key]);
  }),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock scrollTo
window.scrollTo = jest.fn();

// Mock ResizeObserver
class ResizeObserverMock {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}
window.ResizeObserver = ResizeObserverMock;

// Mock IntersectionObserver
class IntersectionObserverMock {
  observe = jest.fn();
  unobserve = jest.fn();
  disconnect = jest.fn();
}
window.IntersectionObserver = IntersectionObserverMock as any;

// Mock getComputedStyle
const originalGetComputedStyle = window.getComputedStyle;
window.getComputedStyle = (elt: Element) => {
  const style = originalGetComputedStyle(elt);
  return {
    ...style,
    getPropertyValue: (prop: string) => {
      return style.getPropertyValue(prop) || '';
    },
  };
};

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'blob:test');
global.URL.revokeObjectURL = jest.fn();

// Suppress antd warning messages in tests
const originalError = console.error;
const originalWarn = console.warn;

console.error = (...args: any[]) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning:') ||
      args[0].includes('validateDOMNesting') ||
      args[0].includes('act(...)') ||
      args[0].includes('Not implemented'))
  ) {
    return;
  }
  originalError.call(console, ...args);
};

console.warn = (...args: any[]) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('Warning:')
  ) {
    return;
  }
  originalWarn.call(console, ...args);
};
