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
  stargazers: number;
  forkers: number;
  ratio: number;
}
