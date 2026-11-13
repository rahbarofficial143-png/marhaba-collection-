import React from 'react';
import { SlidersHorizontal, RotateCcw } from 'lucide-react';
import { FilterState } from '../types';

interface FacetFilterBarProps {
  filters: FilterState;
  onChangeFilters: (newFilters: FilterState) => void;
  onResetFilters: () => void;
  totalResults: number;
}

export const FacetFilterBar: React.FC<FacetFilterBarProps> = ({
  filters,
  onChangeFilters,
  onResetFilters,
  totalResults
}) => {
  const toggleFilter = (key: keyof FilterState, val?: any) => {
    if (typeof filters[key] === 'boolean') {
      onChangeFilters({
        ...filters,
        [key]: !filters[key]
      });
    } else {
      onChangeFilters({
        ...filters,
        [key]: filters[key] === val ? (key === 'cluster' ? '' : null) : val
      });
    }
  };

  const hasActiveFilters =
    filters.cluster !== '' ||
    filters.maxPrice !== null ||
    filters.minRating !== null ||
    filters.onlyPureSilk ||
    filters.onlyReadyToShip ||
    filters.onlyFreeDelivery ||
    filters.onlyBridal ||
    filters.searchQuery !== '';

  return (
    <div className="bg-white py-3 border-b border-[#E8E8E8]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Quick Facet Chips */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-0.5">
          {/* Under ₹499 */}
          <button
            onClick={() => toggleFilter('maxPrice', 500)}
            className={`whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-md transition-all shrink-0 ${
              filters.maxPrice === 500
                ? 'bg-[#9F2089] text-white shadow-2xs'
                : 'bg-[#FAF8F5] text-[#444444] border border-[#E8E8E8] hover:border-[#9F2089]'
            }`}
          >
            Under ₹499
          </button>

          {/* Under ₹999 */}
          <button
            onClick={() => toggleFilter('maxPrice', 1000)}
            className={`whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-md transition-all shrink-0 ${
              filters.maxPrice === 1000
                ? 'bg-[#9F2089] text-white shadow-2xs'
                : 'bg-[#FAF8F5] text-[#444444] border border-[#E8E8E8] hover:border-[#9F2089]'
            }`}
          >
            Under ₹999
          </button>

          {/* Under ₹2499 */}
          <button
            onClick={() => toggleFilter('maxPrice', 2500)}
            className={`whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-md transition-all shrink-0 ${
              filters.maxPrice === 2500
                ? 'bg-[#9F2089] text-white shadow-2xs'
                : 'bg-[#FAF8F5] text-[#444444] border border-[#E8E8E8] hover:border-[#9F2089]'
            }`}
          >
            Under ₹2,499
          </button>

          {/* Pure Silk */}
          <button
            onClick={() => toggleFilter('onlyPureSilk')}
            className={`whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-md transition-all shrink-0 ${
              filters.onlyPureSilk
                ? 'bg-[#9F2089] text-white shadow-2xs'
                : 'bg-[#FAF8F5] text-[#444444] border border-[#E8E8E8] hover:border-[#9F2089]'
            }`}
          >
            Silk Mark Verified
          </button>

          {/* Ready to Ship 24h */}
          <button
            onClick={() => toggleFilter('onlyReadyToShip')}
            className={`whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-md transition-all shrink-0 ${
              filters.onlyReadyToShip
                ? 'bg-[#9F2089] text-white shadow-2xs'
                : 'bg-[#FAF8F5] text-[#444444] border border-[#E8E8E8] hover:border-[#9F2089]'
            }`}
          >
            Dispatch in 24h
          </button>

          {/* Top Rated 4.5+ */}
          <button
            onClick={() => toggleFilter('minRating', 4.5)}
            className={`whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-md transition-all shrink-0 ${
              filters.minRating === 4.5
                ? 'bg-[#9F2089] text-white shadow-2xs'
                : 'bg-[#FAF8F5] text-[#444444] border border-[#E8E8E8] hover:border-[#9F2089]'
            }`}
          >
            ★ 4.5+ Rating
          </button>

          {/* Bridal Trousseau */}
          <button
            onClick={() => toggleFilter('onlyBridal')}
            className={`whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-md transition-all shrink-0 ${
              filters.onlyBridal
                ? 'bg-[#9F2089] text-white shadow-2xs'
                : 'bg-[#FAF8F5] text-[#444444] border border-[#E8E8E8] hover:border-[#9F2089]'
            }`}
          >
            Bridal Special
          </button>

          {/* Varanasi Guild */}
          <button
            onClick={() => toggleFilter('cluster', 'Varanasi')}
            className={`whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-md transition-all shrink-0 ${
              filters.cluster === 'Varanasi'
                ? 'bg-[#80182E] text-white shadow-2xs'
                : 'bg-[#FAF8F5] text-[#444444] border border-[#E8E8E8] hover:border-[#9F2089]'
            }`}
          >
            Varanasi Loom
          </button>

          {/* Surat Direct */}
          <button
            onClick={() => toggleFilter('cluster', 'Surat')}
            className={`whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-md transition-all shrink-0 ${
              filters.cluster === 'Surat'
                ? 'bg-[#80182E] text-white shadow-2xs'
                : 'bg-[#FAF8F5] text-[#444444] border border-[#E8E8E8] hover:border-[#9F2089]'
            }`}
          >
            Surat Direct
          </button>

          {hasActiveFilters && (
            <button
              onClick={onResetFilters}
              className="whitespace-nowrap px-2.5 py-1.5 text-xs font-bold text-[#9F2089] hover:underline flex items-center gap-1 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Sort Dropdown */}
        <div className="flex items-center justify-between sm:justify-end gap-3 text-xs shrink-0">
          <span className="text-[#666666]">
            Showing <strong className="text-[#222222]">{totalResults}</strong> items
          </span>

          <div className="flex items-center gap-2">
            <label htmlFor="sort-select" className="text-[#777777] font-medium hidden sm:inline">
              Sort by:
            </label>
            <select
              id="sort-select"
              value={filters.sortBy}
              onChange={(e) =>
                onChangeFilters({
                  ...filters,
                  sortBy: e.target.value as FilterState['sortBy']
                })
              }
              className="bg-white border border-[#CCCCCC] rounded px-2.5 py-1.5 text-xs font-bold text-[#222222] focus:border-[#9F2089] focus:outline-none cursor-pointer"
            >
              <option value="featured">Relevance</option>
              <option value="price-asc">Price (Low to High)</option>
              <option value="price-desc">Price (High to Low)</option>
              <option value="rating">Customer Rating</option>
              <option value="discount">Discount %</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
};
