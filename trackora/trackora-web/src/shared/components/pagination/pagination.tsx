import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import { Button } from '@/shared/ui/button';

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  /** Maximum number of page buttons to show */
  siblingCount?: number;
};

function getPageNumbers(
  current: number,
  total: number,
  siblings: number,
): (number | '...')[] {
  const totalSlots = siblings * 2 + 5; // first + last + 2 dots + current + 2*siblings

  if (total <= totalSlots) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const leftSibling = Math.max(current - siblings, 1);
  const rightSibling = Math.min(current + siblings, total);

  const showLeftDots = leftSibling > 2;
  const showRightDots = rightSibling < total - 1;

  if (!showLeftDots && showRightDots) {
    const leftCount = 3 + 2 * siblings;
    const leftRange = Array.from({ length: leftCount }, (_, i) => i + 1);
    return [...leftRange, '...', total];
  }

  if (showLeftDots && !showRightDots) {
    const rightCount = 3 + 2 * siblings;
    const rightRange = Array.from(
      { length: rightCount },
      (_, i) => total - rightCount + 1 + i,
    );
    return [1, '...', ...rightRange];
  }

  return [
    1,
    '...',
    ...Array.from(
      { length: rightSibling - leftSibling + 1 },
      (_, i) => leftSibling + i,
    ),
    '...',
    total,
  ];
}

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
  siblingCount = 1,
}: PaginationProps) {
  if (totalPages <= 1) return null;

  const pages = getPageNumbers(currentPage, totalPages, siblingCount);

  return (
    <nav
      role="navigation"
      aria-label="Pagination"
      className={cn('flex items-center gap-1', className)}
    >
      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {pages.map((page, idx) =>
        page === '...' ? (
          <span
            key={`dots-${idx}`}
            className="flex h-9 w-9 items-center justify-center text-sm text-muted-foreground"
            aria-hidden="true"
          >
            …
          </span>
        ) : (
          <Button
            key={page}
            variant={page === currentPage ? 'primary' : 'outline'}
            size="icon"
            onClick={() => onPageChange(page)}
            aria-label={`Page ${page}`}
            aria-current={page === currentPage ? 'page' : undefined}
          >
            {page}
          </Button>
        ),
      )}

      <Button
        variant="outline"
        size="icon"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      <span className="ml-2 text-sm text-muted-foreground">
        Page {currentPage} of {totalPages}
      </span>
    </nav>
  );
}

export { Pagination };
export type { PaginationProps };
