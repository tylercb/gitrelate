const GITHUB_API = 'https://api.github.com';

export async function getStargazers(repo: string) {
  const response = await fetch(`${GITHUB_API}/repos/${repo}/stargazers`, {
    headers: {
      Accept: "application/vnd.github.v3.star+json",
      Authorization: `token ${process.env.GITHUB_TOKEN}`,
    },
  });
  return response.ok ? response.json() : [];
}

export async function getStarredRepos(username: string) {
  const response = await fetch(`${GITHUB_API}/users/${username}/starred`, {
    headers: {
      Accept: "application/vnd.github.v3.star+json",
      Authorization: `token ${process.env.GITHUB_TOKEN}`,
    },
  });
  return response.ok ? response.json() : [];
}

export async function getRepo(repo: string) {
  const response = await fetch(`${GITHUB_API}/repos/${repo}`, {
    headers: {
      Accept: "application/vnd.github.v3.star+json",
      Authorization: `token ${process.env.GITHUB_TOKEN}`,
    },
  });
  return response.ok ? response.json() : [];
}
