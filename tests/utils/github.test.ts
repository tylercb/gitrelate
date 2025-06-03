import { describe, it, expect } from 'vitest';
import { parseGitHubURL } from '../../utils/github';

describe('parseGitHubURL', () => {
  it('handles plain owner/repo format', () => {
    expect(parseGitHubURL('owner/repo')).toBe('owner/repo');
  });

  it('parses full GitHub URL', () => {
    expect(parseGitHubURL('https://github.com/owner/repo')).toBe('owner/repo');
  });

  it('parses GitHub URL with www', () => {
    expect(parseGitHubURL('https://www.github.com/owner/repo')).toBe('owner/repo');
  });

  it('handles trailing slashes', () => {
    expect(parseGitHubURL('https://github.com/owner/repo/')).toBe('owner/repo');
  });

  it('parses URLs with extra path segments', () => {
    expect(parseGitHubURL('https://github.com/owner/repo/issues')).toBe('owner/repo');
  });

  it('returns null for non-GitHub URLs', () => {
    expect(parseGitHubURL('https://example.com/owner/repo')).toBeNull();
  });

  it('returns null for invalid input', () => {
    expect(parseGitHubURL('not a url')).toBeNull();
  });

  it('returns null for incomplete repo names', () => {
    expect(parseGitHubURL('owner')).toBeNull();
  });
});
