import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import {
  Input,
  Button,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/shared/ui';
import { TASK_STATUSES, PRIORITIES } from '@/shared/config/constants';
import { useDebounce } from '@/shared/hooks/use-debounce';

type TaskFiltersProps = {
  filters: {
    status?: string;
    priority?: string;
    search?: string;
  };
  onFilterChange: (updates: Record<string, string | undefined>) => void;
};

export function TaskFilters({ filters, onFilterChange }: TaskFiltersProps) {
  const [searchValue, setSearchValue] = useState(filters.search ?? '');
  const debouncedSearch = useDebounce(searchValue, 300);

  useEffect(() => {
    if (debouncedSearch !== (filters.search ?? '')) {
      onFilterChange({
        search: debouncedSearch || undefined,
      });
    }
  }, [debouncedSearch]); // eslint-disable-line react-hooks/exhaustive-deps

  const hasActiveFilters = !!(filters.status || filters.priority || filters.search);

  function handleClearFilters() {
    setSearchValue('');
    onFilterChange({ status: undefined, priority: undefined, search: undefined });
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search tasks..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="pl-9"
        />
      </div>

      <Select
        value={filters.status ?? 'all'}
        onValueChange={(value) =>
          onFilterChange({ status: value === 'all' ? undefined : value })
        }
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All Statuses" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Statuses</SelectItem>
          {TASK_STATUSES.map((s) => (
            <SelectItem key={s.value} value={s.value}>
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.priority ?? 'all'}
        onValueChange={(value) =>
          onFilterChange({ priority: value === 'all' ? undefined : value })
        }
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="All Priorities" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Priorities</SelectItem>
          {PRIORITIES.map((p) => (
            <SelectItem key={p.value} value={p.value}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClearFilters}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="mr-1 h-4 w-4" />
          Clear
        </Button>
      )}
    </div>
  );
}
