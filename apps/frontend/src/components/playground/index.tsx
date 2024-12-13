import React, { useState, useEffect, Suspense } from 'react';
import { LiveProvider, LiveEditor, LiveError, LivePreview } from 'react-live';
import { Resizable } from 're-resizable';
import { useTheme } from '@/hooks/use-theme';
import { useLocalStorage } from '@/hooks/use-local-storage';
import * as components from '@/components';
import * as icons from '@/components/icons';
import { cn } from '@/lib/utils';

interface PlaygroundProps {
  code?: string;
  scope?: Record<string, any>;
  theme?: 'light' | 'dark';
  direction?: 'horizontal' | 'vertical';
  showEditor?: boolean;
  className?: string;
}

export function Playground({
  code: initialCode = '',
  scope = {},
  theme: initialTheme,
  direction = 'horizontal',
  showEditor = true,
  className,
}: PlaygroundProps) {
  const { theme } = useTheme();
  const [code, setCode] = useLocalStorage('playground-code', initialCode);
  const [error, setError] = useState<string | null>(null);
  const [size, setSize] = useState({ width: '100%', height: '100%' });

  // Merge built-in scope with custom scope
  const mergedScope = {
    ...components,
    ...icons,
    ...scope,
  };

  // Handle code change
  const handleCodeChange = (newCode: string) => {
    setCode(newCode);
    setError(null);
  };

  // Handle error
  const handleError = (err: Error) => {
    setError(err.message);
  };

  // Reset code
  const handleReset = () => {
    setCode(initialCode);
    setError(null);
  };

  // Copy code
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch (err) {
      console.error('Failed to copy code:', err);
    }
  };

  return (
    <div className={cn('w-full h-full', className)}>
      <LiveProvider
        code={code}
        scope={mergedScope}
        theme={initialTheme || theme}
        noInline={false}
      >
        <div
          className={cn(
            'flex',
            direction === 'horizontal' ? 'flex-row' : 'flex-col'
          )}
        >
          {showEditor && (
            <Resizable
              size={size}
              onResizeStop={(e, direction, ref, d) => {
                setSize({
                  width: size.width + d.width,
                  height: size.height + d.height,
                });
              }}
              enable={{
                top: direction === 'vertical',
                right: direction === 'horizontal',
                bottom: direction === 'vertical',
                left: direction === 'horizontal',
              }}
              className="border border-gray-200 dark:border-gray-800"
            >
              <div className="h-full">
                <div className="flex items-center justify-between p-2 border-b border-gray-200 dark:border-gray-800">
                  <div className="flex space-x-2">
                    <button
                      onClick={handleReset}
                      className="p-1 text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                    >
                      Reset
                    </button>
                    <button
                      onClick={handleCopy}
                      className="p-1 text-sm text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
                    >
                      Copy
                    </button>
                  </div>
                </div>
                <LiveEditor
                  onChange={handleCodeChange}
                  className="h-full overflow-auto"
                />
              </div>
            </Resizable>
          )}
          <div className="flex-1 p-4">
            <Suspense fallback={<div>Loading...</div>}>
              <LivePreview />
            </Suspense>
            {error && (
              <LiveError
                className="p-4 mt-4 text-sm text-red-500 bg-red-50 dark:bg-red-900/20 rounded"
              />
            )}
          </div>
        </div>
      </LiveProvider>
    </div>
  );
}

// Example usage:
// const initialCode = `
// function Example() {
//   const [count, setCount] = useState(0)
//   return (
//     <div>
//       <p>Count: {count}</p>
//       <button onClick={() => setCount(count + 1)}>
//         Increment
//       </button>
//     </div>
//   )
// }
// `;
//
// function App() {
//   return (
//     <Playground
//       code={initialCode}
//       scope={{ useState }}
//       theme="dark"
//       direction="horizontal"
//     />
//   );
// }
