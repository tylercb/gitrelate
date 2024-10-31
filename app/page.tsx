import RepoInput from '@/app/components/RepoInput';

export default function HomePage() {
  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold mb-4 text-center">Find Related Repositories</h2>
      <RepoInput />
      <p className="mt-8 text-sm text-gray-600 dark:text-gray-400">
        Data for this project is sourced from the{' '}
        <a
          href="https://ghe.clickhouse.tech/"
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          ClickHouse GitHub event dataset
        </a>{' '}
        provided by ClickHouse Inc. and licensed under CC-BY-4.0 or Apache 2.0.
      </p>
    </div>
  );
}