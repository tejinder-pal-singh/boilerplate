import { render as rtlRender } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { configureStore } from '@reduxjs/toolkit';
import { Provider } from 'react-redux';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';

// Create a custom render function that includes providers
export function render(
  ui: React.ReactElement,
  {
    preloadedState = {},
    store = configureStore({ reducer: {}, preloadedState }),
    route = '/',
    ...renderOptions
  } = {}
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <Provider store={store}>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={[route]}>
            {children}
          </MemoryRouter>
        </QueryClientProvider>
      </Provider>
    );
  }

  return {
    ...rtlRender(ui, { wrapper: Wrapper, ...renderOptions }),
    store,
    queryClient,
  };
}

// Re-export everything
export * from '@testing-library/react';
export { userEvent };

// Mock Intersection Observer
export function mockIntersectionObserver() {
  const mockIntersectionObserver = jest.fn();
  mockIntersectionObserver.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null,
  });
  window.IntersectionObserver = mockIntersectionObserver;
}

// Mock ResizeObserver
export function mockResizeObserver() {
  const mockResizeObserver = jest.fn();
  mockResizeObserver.mockReturnValue({
    observe: () => null,
    unobserve: () => null,
    disconnect: () => null,
  });
  window.ResizeObserver = mockResizeObserver;
}

// Create a mock server
export function createMockServer(handlers: any[]) {
  const server = setupServer(...handlers);
  
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());
  
  return server;
}

// Mock window.matchMedia
export function mockMatchMedia(matches: boolean) {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

// Create test data factory
export function createTestData<T>(
  factory: () => T,
  count: number = 1
): T[] {
  return Array.from({ length: count }, factory);
}

// Wait for element to be removed
export async function waitForElementToBeRemoved(
  callback: () => Element | null | undefined
) {
  let element;
  try {
    element = callback();
  } catch (error) {
    return;
  }
  
  if (!element) return;
  
  const observer = new MutationObserver(() => {
    if (!callback()) {
      observer.disconnect();
    }
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });
  
  while (callback()) {
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  
  observer.disconnect();
}

// Mock fetch
export function mockFetch(response: any) {
  const mockFetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => response,
  });
  
  global.fetch = mockFetch;
  return mockFetch;
}

// Create form submit handler
export function createSubmitHandler(onSubmit: (data: any) => void) {
  return jest.fn((e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const data = Object.fromEntries(formData.entries());
    onSubmit(data);
  });
}

// Mock local storage
export function mockLocalStorage() {
  const store: { [key: string]: string } = {};
  
  return {
    getItem: jest.fn((key: string) => store[key]),
    setItem: jest.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: jest.fn((key: string) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      Object.keys(store).forEach(key => delete store[key]);
    }),
  };
}

// Create async validator
export function createAsyncValidator<T>(
  validator: (value: T) => Promise<boolean>,
  errorMessage: string
) {
  return async (value: T) => {
    const isValid = await validator(value);
    if (!isValid) {
      throw new Error(errorMessage);
    }
  };
}

// Mock WebSocket
export function mockWebSocket() {
  const mockWebSocket = jest.fn();
  const mockInstance = {
    send: jest.fn(),
    close: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    readyState: WebSocket.OPEN,
  };
  
  mockWebSocket.mockImplementation(() => mockInstance);
  global.WebSocket = mockWebSocket;
  
  return { mockWebSocket, mockInstance };
}

// Create test context
export function createTestContext<T>(initialValue: T) {
  return {
    value: initialValue,
    setValue: jest.fn((newValue: T) => {
      context.value = newValue;
    }),
  };
}

// Mock window location
export function mockWindowLocation(location: Partial<Location>) {
  const oldLocation = window.location;
  delete (window as any).location;
  
  window.location = {
    ...oldLocation,
    ...location,
  };
  
  return () => {
    window.location = oldLocation;
  };
}
export default ExperimentManager;
