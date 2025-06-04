"use client";

import { useState } from "react";
import { Switch } from "@headlessui/react";

interface FilterOptions {
  hideAwesome: boolean;
  excludeKeywords: string[];
  includeKeywords: string[];
  minStars: number;
  minForks: number;
  minRatio: number;
}

interface RepoFilterProps {
  onFilterChange: (filters: FilterOptions) => void;
}

export default function RepoFilter({ onFilterChange }: RepoFilterProps) {
  const [hideAwesome, setHideAwesome] = useState(false);
  const [excludeKeywords, setExcludeKeywords] = useState("");
  const [includeKeywords, setIncludeKeywords] = useState("");
  const [minStars, setMinStars] = useState(0);
  const [minForks, setMinForks] = useState(0);
  const [minRatio, setMinRatio] = useState(0);

  const handleApplyFilters = () => {
    onFilterChange({
      hideAwesome,
      excludeKeywords: excludeKeywords.split(",").map((k) => k.trim()),
      includeKeywords: includeKeywords.split(",").map((k) => k.trim()),
      minStars,
      minForks,
      minRatio,
    });
  };

  return (
    <div className="space-y-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
      <h2 className="text-lg font-semibold">Filter Repositories</h2>

      <div className="flex items-center space-x-2">
        <Switch
          checked={hideAwesome}
          onChange={setHideAwesome}
          className={`${
            hideAwesome ? "bg-blue-600" : "bg-gray-200"
          } relative inline-flex h-6 w-11 items-center rounded-full`}
        >
          <span className="sr-only">Hide &quot;Awesome&quot; repositories</span>
          <span
            className={`${
              hideAwesome ? "translate-x-6" : "translate-x-1"
            } inline-block h-4 w-4 transform rounded-full bg-white transition`}
          />
        </Switch>
        <span className="text-sm">Hide &quot;Awesome&quot; repositories</span>
      </div>

      <div className="space-y-2">
        <label
          htmlFor="excludeKeywords"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Exclude Keywords (comma-separated)
        </label>
        <input
          id="excludeKeywords"
          type="text"
          value={excludeKeywords}
          onChange={(e) => setExcludeKeywords(e.target.value)}
          placeholder="e.g., tutorial, free"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="includeKeywords"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Include Keywords (comma-separated)
        </label>
        <input
          id="includeKeywords"
          type="text"
          value={includeKeywords}
          onChange={(e) => setIncludeKeywords(e.target.value)}
          placeholder="e.g., react, typescript"
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="minStars"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Minimum Stars
        </label>
        <input
          id="minStars"
          type="number"
          value={minStars}
          onChange={(e) => setMinStars(Number(e.target.value))}
          min={0}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="minForks"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Minimum Forks
        </label>
        <input
          id="minForks"
          type="number"
          value={minForks}
          onChange={(e) => setMinForks(Number(e.target.value))}
          min={0}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="minRatio"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          Minimum Star-to-Fork Ratio
        </label>
        <input
          id="minRatio"
          type="number"
          value={minRatio}
          onChange={(e) => setMinRatio(Number(e.target.value))}
          min={0}
          step={0.1}
          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
        />
      </div>

      <button
        onClick={handleApplyFilters}
        className="w-full px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-opacity-75"
      >
        Apply Filters
      </button>
    </div>
  );
}
