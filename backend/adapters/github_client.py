# backend/adapters/github_client.py
import os
import base64
import httpx
from typing import Optional, Dict, Any


class GitHubClient:
    """Infrastructure Adapter for interacting with GitHub REST API."""

    def __init__(self, token: Optional[str] = None, base_url: str = "https://api.github.com"):
        self.explicit_token = token
        self.base_url = base_url.rstrip("/")

    def get_token(self) -> Optional[str]:
        """Dynamically retrieves the latest configured GitHub Token."""
        if self.explicit_token:
            return self.explicit_token
        try:
            from controllers.settings import get_effective_github_token
            dyn_token = get_effective_github_token()
            if dyn_token:
                return dyn_token
        except Exception:
            pass
        return os.getenv("GITHUB_TOKEN")

    def _get_headers(self) -> Dict[str, str]:
        headers = {
            "Accept": "application/vnd.github+json",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "CI-Failure-Triage-Bot/1.0"
        }
        token = self.get_token()
        if token:
            token_val = token.strip()
            # Ignore masked tokens
            if "..." not in token_val and "***" not in token_val:
                if not token_val.startswith("Bearer ") and not token_val.startswith("token "):
                    headers["Authorization"] = f"Bearer {token_val}"
                else:
                    headers["Authorization"] = token_val
        return headers

    async def get_workflow_log(self, repo_name: str, run_id: int) -> str:
        """Downloads raw workflow log or job log for a given run with proper redirect support."""
        try:
            headers = self._get_headers()
            has_auth = "Authorization" in headers

            async with httpx.AsyncClient(timeout=30.0) as client:
                # Step 1: List all jobs for this workflow run
                jobs_url = f"{self.base_url}/repos/{repo_name}/actions/runs/{run_id}/jobs"
                jobs_resp = await client.get(jobs_url, headers=headers)

                if jobs_resp.status_code == 200:
                    jobs_data = jobs_resp.json()
                    jobs_list = jobs_data.get("jobs", [])

                    # Sort to find failed jobs first
                    failed_jobs = [j for j in jobs_list if j.get(
                        "conclusion") == "failure"]
                    target_jobs = failed_jobs if failed_jobs else jobs_list

                    for target_job in target_jobs:
                        job_id = target_job.get("id")
                        if not job_id:
                            continue
                        job_log_url = f"{self.base_url}/repos/{repo_name}/actions/jobs/{job_id}/logs"

                        # GitHub returns 302 redirect to Azure blob storage download URL.
                        # Important: When following 302 to external Azure storage, do NOT pass GitHub Authorization header!
                        job_resp = await client.get(job_log_url, headers=headers, follow_redirects=False)

                        if job_resp.status_code in (302, 301, 307):
                            redirect_url = job_resp.headers.get(
                                "location") or job_resp.headers.get("Location")
                            if redirect_url:
                                # Fetch raw log plain text from S3/Azure storage without Authorization header
                                raw_log_resp = await client.get(redirect_url, timeout=30.0)
                                if raw_log_resp.status_code == 200 and raw_log_resp.text:
                                    return raw_log_resp.text
                        elif job_resp.status_code == 200 and job_resp.text:
                            return job_resp.text

                # Step 2: Fallback to run logs endpoint with manual redirect handling
                run_logs_url = f"{self.base_url}/repos/{repo_name}/actions/runs/{run_id}/logs"
                run_resp = await client.get(run_logs_url, headers=headers, follow_redirects=False)
                if run_resp.status_code in (302, 301, 307):
                    redirect_url = run_resp.headers.get(
                        "location") or run_resp.headers.get("Location")
                    if redirect_url:
                        raw_zip_resp = await client.get(redirect_url, timeout=30.0)
                        if raw_zip_resp.status_code == 200:
                            try:
                                import zipfile
                                import io
                                with zipfile.ZipFile(io.BytesIO(raw_zip_resp.content)) as z:
                                    combined_logs = []
                                    for name in z.namelist():
                                        if name.endswith(".txt") or not "." in name:
                                            try:
                                                log_str = z.read(name).decode(
                                                    "utf-8", errors="replace")
                                                combined_logs.append(
                                                    f"--- LOG: {name} ---\n{log_str}")
                                            except Exception:
                                                pass
                                    if combined_logs:
                                        return "\n\n".join(combined_logs)
                            except Exception:
                                if raw_zip_resp.text:
                                    return raw_zip_resp.text

                # Step 3: Check attempt 1 logs as additional fallback
                attempt_url = f"{self.base_url}/repos/{repo_name}/actions/runs/{run_id}/attempts/1/logs"
                attempt_resp = await client.get(attempt_url, headers=headers, follow_redirects=False)
                if attempt_resp.status_code in (302, 301, 307):
                    redirect_url = attempt_resp.headers.get(
                        "location") or attempt_resp.headers.get("Location")
                    if redirect_url:
                        raw_zip_resp = await client.get(redirect_url, timeout=30.0)
                        if raw_zip_resp.status_code == 200:
                            try:
                                import zipfile
                                import io
                                with zipfile.ZipFile(io.BytesIO(raw_zip_resp.content)) as z:
                                    combined_logs = []
                                    for name in z.namelist():
                                        if name.endswith(".txt") or not "." in name:
                                            try:
                                                log_str = z.read(name).decode(
                                                    "utf-8", errors="replace")
                                                combined_logs.append(
                                                    f"--- LOG: {name} ---\n{log_str}")
                                            except Exception:
                                                pass
                                    if combined_logs:
                                        return "\n\n".join(combined_logs)
                            except Exception:
                                if raw_zip_resp.text:
                                    return raw_zip_resp.text

                # If failed to retrieve
                job_code = jobs_resp.status_code if 'jobs_resp' in locals() else 'N/A'
                run_code = run_resp.status_code if 'run_resp' in locals() else 'N/A'
                token_hint = "Configured" if has_auth else "Missing / Unset"
                return f"[GitHub API Error] Unable to retrieve logs (Token Status: {token_hint}, Job API HTTP {job_code}, Run API HTTP {run_code}). Check if GITHUB_TOKEN has `actions:read` permission."
        except Exception as e:
            return f"[Error fetching logs from GitHub]: {str(e)}"

    async def get_file_content(self, repo_name: str, file_path: str, ref: Optional[str] = None) -> Optional[str]:
        """Retrieves raw source file content from GitHub repository for deep code-level triage."""
        clean_path = file_path.strip().lstrip("/")
        url = f"{self.base_url}/repos/{repo_name}/contents/{clean_path}"
        params = {}
        if ref:
            params["ref"] = ref

        try:
            async with httpx.AsyncClient(follow_redirects=True, timeout=15.0) as client:
                resp = await client.get(url, headers=self._get_headers(), params=params)
                if resp.status_code == 200:
                    data = resp.json()
                    if isinstance(data, dict) and "content" in data and data.get("encoding") == "base64":
                        content_raw = data["content"].replace(
                            "\n", "").replace("\r", "")
                        return base64.b64decode(content_raw).decode("utf-8", errors="replace")
                    elif isinstance(data, dict) and data.get("download_url"):
                        raw_resp = await client.get(data["download_url"], headers=self._get_headers())
                        if raw_resp.status_code == 200:
                            return raw_resp.text
                else:
                    print(
                        f"[GitHub get_file_content] Failed for {clean_path}: HTTP {resp.status_code} - {resp.text}")
                return None
        except Exception as e:
            print(f"[GitHub get_file_content Error]: {str(e)}")
            return None

    async def get_workflow_run_info(self, repo_name: str, run_id: int) -> Optional[Dict[str, Any]]:
        """Retrieves workflow run metadata such as head_sha and pull_requests."""
        url = f"{self.base_url}/repos/{repo_name}/actions/runs/{run_id}"
        try:
            async with httpx.AsyncClient(timeout=15.0) as client:
                response = await client.get(url, headers=self._get_headers())
                if response.status_code == 200:
                    return response.json()
        except Exception as e:
            print(f"[GitHub get_workflow_run_info Error]: {e}")
        return None

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
                print(
                    f"[GitHub API Error posting PR comment]: HTTP {response.status_code} - {response.text}")
                return None
        except Exception as e:
            print(f"[GitHub PR Comment Exception]: {str(e)}")
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
                print(
                    f"[GitHub API Error posting Commit comment]: HTTP {response.status_code} - {response.text}")
                return None
        except Exception as e:
            print(f"[GitHub Commit Comment Error]: {str(e)}")
            return None
