# backend/adapters/github_client.py
import os
import httpx
from typing import Optional, Dict, Any

class GitHubClient:
    """Infrastructure Adapter for interacting with GitHub REST API."""

    def __init__(self, token: Optional[str] = None, base_url: str = "https://api.github.com"):
        self.token = token or os.getenv("GITHUB_TOKEN")
        self.base_url = base_url.rstrip("/")

    def _get_headers(self) -> Dict[str, str]:
        headers = {
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "CI-Failure-Triage-Bot/1.0"
        }
        if self.token:
            headers["Authorization"] = f"Bearer {self.token}"
        return headers

    async def get_workflow_log(self, repo_name: str, run_id: int) -> str:
        """Downloads raw workflow run log or job log for a given run."""
        url = f"{self.base_url}/repos/{repo_name}/actions/runs/{run_id}/logs"
        try:
            async with httpx.AsyncClient(follow_redirects=True, timeout=30.0) as client:
                response = await client.get(url, headers=self._get_headers())
                if response.status_code == 200:
                    return response.text
                elif response.status_code == 404:
                    # Fallback to job list if zip archive redirect is not direct
                    jobs_url = f"{self.base_url}/repos/{repo_name}/actions/runs/{run_id}/jobs"
                    jobs_resp = await client.get(jobs_url, headers=self._get_headers())
                    if jobs_resp.status_code == 200:
                        jobs_data = jobs_resp.json()
                        failed_jobs = [j for j in jobs_data.get("jobs", []) if j.get("conclusion") == "failure"]
                        if failed_jobs:
                            job_id = failed_jobs[0]["id"]
                            job_log_url = f"{self.base_url}/repos/{repo_name}/actions/jobs/{job_id}/logs"
                            job_log_resp = await client.get(job_log_url, headers=self._get_headers())
                            if job_log_resp.status_code == 200:
                                return job_log_resp.text
                    return f"[GitHub API] Logs not found (HTTP {response.status_code})"
                else:
                    return f"[GitHub API Error] Status {response.status_code}: {response.text}"
        except Exception as e:
            return f"[Error fetching logs from GitHub]: {str(e)}"

    async def post_pr_comment(self, repo_name: str, pr_number: int, markdown_body: str) -> Optional[Dict[str, Any]]:
        """Posts triage markdown comment to a Pull Request or Issue."""
        url = f"{self.base_url}/repos/{repo_name}/issues/{pr_number}/comments"
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(
                    url,
                    headers=self._get_headers(),
                    json={"body": markdown_body}
                )
                if response.status_code in (200, 201):
                    return response.json()
                print(f"[GitHub API Error posting comment]: HTTP {response.status_code} - {response.text}")
                return None
        except Exception as e:
            print(f"[GitHub Exception]: {str(e)}")
            return None

    async def post_commit_comment(self, repo_name: str, commit_sha: str, markdown_body: str) -> Optional[Dict[str, Any]]:
        """Posts triage markdown comment directly to a commit SHA."""
        url = f"{self.base_url}/repos/{repo_name}/commits/{commit_sha}/comments"
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.post(
                    url,
                    headers=self._get_headers(),
                    json={"body": markdown_body}
                )
                if response.status_code in (200, 201):
                    return response.json()
                return None
        except Exception as e:
            print(f"[GitHub Commit Comment Error]: {str(e)}")
            return None
