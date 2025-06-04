import React from 'react';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';
import { Button } from './Button';
import { cn } from '../../lib/utils';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  showingCount?: number;
  totalCount?: number;
  className?: string;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  showingCount,
  totalCount,
  className
}) => {
  if (totalPages <= 1) return null;

  const getVisiblePages = () => {
    const delta = 2;
    const pages: (number | 'ellipsis')[] = [];

    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      pages.push(i);
    }

    if (currentPage - delta > 2) {
      pages.unshift('ellipsis');
    }

    if (currentPage + delta < totalPages - 1) {
      pages.push('ellipsis');
    }

    pages.unshift(1);
    if (totalPages !== 1) {
      pages.push(totalPages);
    }

    return pages;
  };

  const visiblePages = getVisiblePages();

  return (
    <div className={cn("flex flex-col items-center gap-4", className)}>
      {/* 結果表示情報 */}
      {showingCount !== undefined && totalCount !== undefined && (
        <div className="text-sm text-gray-400">
          {totalCount === 0 
            ? "結果がありません"
            : `${Math.min((currentPage - 1) * showingCount + 1, totalCount)}〜${Math.min(currentPage * showingCount, totalCount)}件目 / 全${totalCount}件`
          }
        </div>
      )}

      {/* ページネーションボタン */}
      <div className="flex items-center gap-2">
        {/* 前のページボタン */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="border-gray-700 text-gray-400 hover:text-white hover:border-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
          leftIcon={<ChevronLeft className="h-4 w-4" />}
        >
          前へ
        </Button>

        {/* ページ番号ボタン */}
        <div className="flex items-center gap-1">
          {visiblePages.map((page, index) => (
            page === 'ellipsis' ? (
              <div key={`ellipsis-${index}`} className="px-3 py-2">
                <MoreHorizontal className="h-4 w-4 text-gray-500" />
              </div>
            ) : (
              <Button
                key={page}
                variant={currentPage === page ? "primary" : "outline"}
                size="sm"
                onClick={() => onPageChange(page as number)}
                className={
                  currentPage === page 
                    ? "bg-cyan-500 text-white min-w-[40px]" 
                    : "border-gray-700 text-gray-400 hover:text-white hover:border-cyan-500/50 min-w-[40px]"
                }
              >
                {page}
              </Button>
            )
          ))}
        </div>

        {/* 次のページボタン */}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="border-gray-700 text-gray-400 hover:text-white hover:border-cyan-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
          rightIcon={<ChevronRight className="h-4 w-4" />}
        >
          次へ
        </Button>
      </div>

      {/* ページジャンプ */}
      {totalPages > 10 && (
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-400">ページへ移動:</span>
          <input
            type="number"
            min={1}
            max={totalPages}
            value={currentPage}
            onChange={(e) => {
              const page = parseInt(e.target.value);
              if (page >= 1 && page <= totalPages) {
                onPageChange(page);
              }
            }}
            className="w-16 px-2 py-1 bg-gray-800 border border-gray-700 text-white text-center rounded focus:outline-none focus:border-cyan-500"
          />
          <span className="text-gray-400">/ {totalPages}</span>
        </div>
      )}
    </div>
  );
}; 