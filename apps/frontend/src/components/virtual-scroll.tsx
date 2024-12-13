import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useIntersectionObserver } from '@/hooks/use-intersection-observer';
import { debounce } from 'lodash';

interface VirtualScrollProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
  onEndReached?: () => void;
  endReachedThreshold?: number;
  className?: string;
  loading?: boolean;
  loadingComponent?: React.ReactNode;
}

export function VirtualScroll<T>({
  items,
  renderItem,
  itemHeight,
  containerHeight,
  overscan = 3,
  onEndReached,
  endReachedThreshold = 0.8,
  className = '',
  loading = false,
  loadingComponent = <div>Loading...</div>,
}: VirtualScrollProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [isEndReached, setIsEndReached] = useState(false);

  // Calculate visible items
  const totalHeight = items.length * itemHeight;
  const visibleItems = Math.ceil(containerHeight / itemHeight);
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length,
    Math.floor((scrollTop + containerHeight) / itemHeight) + overscan
  );

  // Create array of visible items
  const visibleItemsArray = items.slice(startIndex, endIndex + 1);

  // Handle scroll
  const handleScroll = useCallback(
    debounce((e: React.UIEvent<HTMLDivElement>) => {
      const target = e.target as HTMLDivElement;
      setScrollTop(target.scrollTop);

      // Check if end is reached
      const scrollPercentage =
        (target.scrollTop + target.clientHeight) / target.scrollHeight;
      
      if (
        scrollPercentage > endReachedThreshold &&
        !isEndReached &&
        !loading &&
        onEndReached
      ) {
        setIsEndReached(true);
        onEndReached();
      }
    }, 16),
    [endReachedThreshold, isEndReached, loading, onEndReached]
  );

  // Reset end reached state when items change
  useEffect(() => {
    setIsEndReached(false);
  }, [items]);

  // Intersection observer for lazy loading
  const bottomRef = useRef<HTMLDivElement>(null);
  useIntersectionObserver(bottomRef, ([entry]) => {
    if (entry?.isIntersecting && !loading && onEndReached && !isEndReached) {
      setIsEndReached(true);
      onEndReached();
    }
  });

  return (
    <div
      ref={containerRef}
      className={`overflow-auto relative ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItemsArray.map((item, index) => (
          <div
            key={startIndex + index}
            style={{
              position: 'absolute',
              top: (startIndex + index) * itemHeight,
              height: itemHeight,
              width: '100%',
            }}
          >
            {renderItem(item, startIndex + index)}
          </div>
        ))}
      </div>
      
      {/* Loading indicator */}
      {loading && (
        <div className="absolute bottom-0 left-0 right-0">
          {loadingComponent}
        </div>
      )}
      
      {/* Intersection observer target */}
      <div ref={bottomRef} style={{ height: 1 }} />
    </div>
  );
}

// Example usage:
// const items = Array.from({ length: 10000 }, (_, i) => ({ id: i, text: `Item ${i}` }));
// 
// function MyList() {
//   return (
//     <VirtualScroll
//       items={items}
//       renderItem={(item) => (
//         <div className="p-4 border-b">
//           {item.text}
//         </div>
//       )}
//       itemHeight={64}
//       containerHeight={400}
//       onEndReached={() => {
//         console.log('Load more items');
//       }}
//     />
//   );
// }
