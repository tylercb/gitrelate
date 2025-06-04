import Link from "next/link";

export default function Header() {
  return (
    <header className="bg-gray-100 dark:bg-gray-800 py-4">
      <div className="container mx-auto px-4">
        <h1 className="text-2xl md:text-3xl font-bold text-center my-0">
          <Link
            className="hover:underline text-gray-800 dark:text-gray-200"
            href="/"
          >
            GitRelate(d)
          </Link>
        </h1>
      </div>
    </header>
  );
}
