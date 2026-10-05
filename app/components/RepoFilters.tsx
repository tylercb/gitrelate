export default function RepoFilters({
  query,
  onQueryChange,
  owner,
  hideSameOwner,
  onHideSameOwnerChange,
  hideAwesome,
  onHideAwesomeChange,
}: {
  query: string;
  onQueryChange: (query: string) => void;
  owner: string;
  hideSameOwner: boolean;
  onHideSameOwnerChange: (hide: boolean) => void;
  hideAwesome: boolean;
  onHideAwesomeChange: (hide: boolean) => void;
}) {
  return (
    <div className="max-w-screen-lg mx-auto mt-4 flex flex-col sm:flex-row sm:items-center gap-x-6 gap-y-2 text-sm text-gray-700 dark:text-gray-300">
      <input
        type="search"
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        placeholder="Filter by name"
        aria-label="Filter results by name"
        className="w-full sm:w-64 px-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg
          text-foreground placeholder:text-gray-500 dark:placeholder:text-gray-400
          focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 dark:focus:border-blue-400"
      />
      <label className="inline-flex items-center gap-2">
        <input
          type="checkbox"
          checked={hideSameOwner}
          onChange={(e) => onHideSameOwnerChange(e.target.checked)}
        />
        Hide other {owner} repos
      </label>
      <label className="inline-flex items-center gap-2">
        <input
          type="checkbox"
          checked={hideAwesome}
          onChange={(e) => onHideAwesomeChange(e.target.checked)}
        />
        Hide awesome lists
      </label>
    </div>
  );
}
