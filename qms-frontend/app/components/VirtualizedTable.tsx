'use client';

import React, { useMemo, useCallback } from 'react';
import { FixedSizeList as List } from 'react-window';

interface VirtualizedTableProps {
  data: any[];
  columns: {
    key: string;
    header: string;
    width: number;
    render?: (value: any, item: any) => React.ReactNode;
  }[];
  height: number;
  itemHeight: number;
  onRowClick?: (item: any) => void;
  className?: string;
}

// Memoized row component to prevent unnecessary re-renders
const TableRow = React.memo(({ index, style, data }: any) => {
  const { items, columns, onRowClick } = data;
  const item = items[index];

  const handleClick = useCallback(() => {
    if (onRowClick) {
      onRowClick(item);
    }
  }, [item, onRowClick]);

  return (
    <div
      style={style}
      className={`flex border-b border-gray-200 hover:bg-gray-50 cursor-pointer ${
        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
      }`}
      onClick={handleClick}
    >
      {columns.map((column: any) => (
        <div
          key={column.key}
          className="px-4 py-3 flex items-center"
          style={{ width: column.width, minWidth: column.width }}
        >
          <div className="text-sm text-gray-900 truncate">
            {column.render 
              ? column.render(item[column.key], item)
              : item[column.key] || '-'
            }
          </div>
        </div>
      ))}
    </div>
  );
});

TableRow.displayName = 'TableRow';

// Virtualized table component for handling large datasets
export const VirtualizedTable: React.FC<VirtualizedTableProps> = ({
  data,
  columns,
  height,
  itemHeight,
  onRowClick,
  className = ''
}) => {
  // Memoize item data to prevent unnecessary re-renders
  const itemData = useMemo(() => ({
    items: data,
    columns,
    onRowClick
  }), [data, columns, onRowClick]);

  // Calculate total width for horizontal scrolling
  const totalWidth = useMemo(() => 
    columns.reduce((sum, col) => sum + col.width, 0), 
    [columns]
  );

  if (data.length === 0) {
    return (
      <div className={`bg-white rounded-lg shadow-md ${className}`}>
        <div className="p-8 text-center">
          <p className="text-gray-500">No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-md overflow-hidden ${className}`}>
      {/* Table Header */}
      <div className="bg-gray-50 border-b border-gray-200">
        <div className="flex" style={{ width: totalWidth }}>
          {columns.map((column) => (
            <div
              key={column.key}
              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
              style={{ width: column.width, minWidth: column.width }}
            >
              {column.header}
            </div>
          ))}
        </div>
      </div>

      {/* Virtualized Table Body */}
      <div style={{ height }}>
        <List
          height={height}
          itemCount={data.length}
          itemSize={itemHeight}
          itemData={itemData}
          width="100%"
        >
          {TableRow}
        </List>
      </div>

      {/* Footer with row count */}
      <div className="bg-gray-50 px-4 py-2 border-t border-gray-200">
        <p className="text-sm text-gray-500">
          Showing {data.length} rows
        </p>
      </div>
    </div>
  );
};

// Hook for managing virtualized table state
export const useVirtualizedTable = (
  initialData: any[] = [],
  pageSize: number = 50
) => {
  const [data, setData] = React.useState(initialData);
  const [loading, setLoading] = React.useState(false);
  const [hasMore, setHasMore] = React.useState(true);

  const loadMore = useCallback(async (loadFn: () => Promise<any>) => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const response = await loadFn();
      const newData = response.data || [];
      
      setData(prev => [...prev, ...newData]);
      setHasMore(newData.length === pageSize);
    } catch (error) {
      console.error('Error loading more data:', error);
    } finally {
      setLoading(false);
    }
  }, [loading, hasMore, pageSize]);

  const reset = useCallback((newData: any[] = []) => {
    setData(newData);
    setHasMore(true);
  }, []);

  return {
    data,
    loading,
    hasMore,
    loadMore,
    reset,
    setData
  };
};
