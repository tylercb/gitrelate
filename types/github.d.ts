export interface Repo {
  id: number;
  name: string;
  full_name: string;
  description: string;
  stargazers_count: number;
}

export interface User {
  login: string;
  avatar_url: string;
}

export interface RelatedRepo {
  repoName: string;
  githubUrl: string;
  // Stargazers and forkers shared with the repo being viewed, not overall counts
  stargazers: number;
  forkers: number;
  ratio: number;
  // Stars the repo received within the dataset's time span, once looked up
  totalStars?: number;
}

// What GitHub itself says about a repo, shown on demand
export interface RepoDetails {
  // The name as GitHub spells it, which can differ in letter case from what was typed
  fullName: string;
  description: string | null;
  language: string | null;
  stars: number;
  topics: string[];
  archived: boolean;
  homepage: string | null;
}

// "unavailable" covers GitHub's hourly request limit and network failures
export type RepoDetailsResult =
  | { status: "found"; details: RepoDetails }
  | { status: "not-found" }
  | { status: "unavailable" };

// First and last day the dataset has stars for, as YYYY-MM-DD
export interface DataWindow {
  start: string;
  end: string;
}
