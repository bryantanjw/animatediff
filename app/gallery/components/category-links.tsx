"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";

const categories = [
  { _id: 1, category: "toon" },
  { _id: 2, category: "realistic" },
  { _id: 3, category: "3d" },
];

export default function CategoryLinks() {
  const pathname = usePathname();

  return (
    <nav className="mt-6 text-sm md:mt-8">
      <ul className="flex gap-5">
        <li
          className={clsx(
            "hover:underline",
            pathname === "/gallery" && "text-rose-seven dark:text-rose-five"
          )}
        >
          <Link href="/gallery">All</Link>
        </li>
        {categories.map(({ _id, category }) => (
          <li
            key={_id}
            className={clsx(
              "hover:underline",
              pathname === `/gallery/${category}` &&
                "text-rose-seven dark:text-rose-five"
            )}
          >
            <Link className="capitalize" href={`/gallery/${category}`}>
              {category}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
