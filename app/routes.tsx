import type { RouteObject } from "react-router";
import RootLayout from "@/app/layout";
import GitHubPathPage from "@/app/pages/GitHubPathPage";
import HomePage from "@/app/pages/HomePage";
import RepoPage from "@/app/pages/RepoPage";

export const routes: RouteObject[] = [
  {
    element: <RootLayout />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/:org/:repo", element: <RepoPage /> },
      // Anything else is treated as a path copied from github.com
      { path: "*", element: <GitHubPathPage /> },
    ],
  },
];
