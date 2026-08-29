import { TriageResult, DashboardMetrics, RepositoryConfig } from '../types';

export const INITIAL_MOCK_RUNS: TriageResult[] = [
  {
    id: 1,
    repo_name: 'octocat/auth-service',
    run_id: 88219,
    pr_number: 128,
    failure_category: 'dependency_issue',
    confidence_score: 0.94,
    root_cause: "Dependency conflict between `requests==2.31.0` and `urllib3==2.2.1` specified in requirements.txt (pinned conflict on line 14).",
    suggested_fix: "Pin `urllib3<2.2.0` or upgrade `requests` to `>=2.32.0` in requirements.txt to satisfy peer version constraints.",
    trimmed_log: `[info] Running pip install -r requirements.txt
Collecting requests==2.31.0
  Downloading requests-2.31.0-py3-none-any.whl (62 kB)
ERROR: Cannot install -r requirements.txt (line 14) and urllib3==2.2.1 because these package versions have conflicting dependencies.
The conflict is caused by:
    requests 2.31.0 depends on urllib3<3,>=1.21.1
    The user requested urllib3==2.2.1
##[error]Process completed with exit code 1.`,
    raw_response: JSON.stringify({
      failure_category: "dependency_issue",
      confidence_score: 0.94,
      root_cause: "Dependency conflict between requests==2.31.0 and urllib3==2.2.1 specified in requirements.txt.",
      suggested_fix: "Pin urllib3<2.2.0 or upgrade requests to >=2.32.0 in requirements.txt."
    }, null, 2),
    status: 'posted',
    github_comment_url: 'https://github.com/octocat/auth-service/pull/128#issuecomment-19827361',
    created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
  },
  {
    id: 2,
    repo_name: 'HCMUS/shopping-cart',
    run_id: 88214,
    pr_number: 94,
    failure_category: 'syntax_error',
    confidence_score: 0.98,
    root_cause: "TypeScript compilation failed in `src/cart/calculator.ts` at line 42: Property `discountRate` does not exist on type `CartItem`.",
    suggested_fix: "Add `discountRate?: number;` to the `CartItem` interface in `src/types/cart.ts` or calculate discount via `item.promotion?.rate`.",
    trimmed_log: `[info] Running tsc --noEmit
src/cart/calculator.ts(42,18): error TS2339: Property 'discountRate' does not exist on type 'CartItem'.
src/cart/calculator.ts(55,5): error TS1005: ',' expected.
[error] Found 2 TypeScript compilation errors in src/cart/calculator.ts
##[error]Process completed with exit code 2.`,
    raw_response: JSON.stringify({
      failure_category: "syntax_error",
      confidence_score: 0.98,
      root_cause: "TypeScript compilation failed in src/cart/calculator.ts: Property discountRate does not exist on type CartItem.",
      suggested_fix: "Add discountRate?: number to CartItem interface."
    }, null, 2),
    status: 'posted',
    github_comment_url: 'https://github.com/HCMUS/shopping-cart/pull/94#issuecomment-18491023',
    created_at: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
  },
  {
    id: 3,
    repo_name: 'HCMUS/weather-app',
    run_id: 88212,
    pr_number: 61,
    failure_category: 'test_failure',
    confidence_score: 0.96,
    root_cause: "Unit test `test_celsius_to_fahrenheit` failed assertion: expected `98.6`, received `98.0` due to integer division in `math_utils.py`.",
    suggested_fix: "Replace integer division `temp * (9 // 5) + 32` with float division `temp * (9 / 5) + 32` in `src/utils/converter.py`.",
    trimmed_log: `============================= test session starts ==============================
collected 18 items
tests/test_converter.py ...F.............. [100%]
=================================== FAILURES ===================================
___________________________ test_celsius_to_fahrenheit ___________________________
    def test_celsius_to_fahrenheit():
>       assert convert_c_to_f(37.0) == 98.6
E       AssertionError: assert 98.0 == 98.6
tests/test_converter.py:24: AssertionError
=========================== 1 failed, 17 passed in 1.42s ===========================
##[error]Process completed with exit code 1.`,
    raw_response: JSON.stringify({
      failure_category: "test_failure",
      confidence_score: 0.96,
      root_cause: "Unit test test_celsius_to_fahrenheit failed assertion: expected 98.6, received 98.0.",
      suggested_fix: "Use float division 9 / 5 instead of 9 // 5 in temperature formula."
    }, null, 2),
    status: 'posted',
    github_comment_url: 'https://github.com/HCMUS/weather-app/pull/61#issuecomment-17382910',
    created_at: new Date(Date.now() - 1000 * 60 * 110).toISOString(),
  },
  {
    id: 4,
    repo_name: 'octocat/auth-service',
    run_id: 88208,
    pr_number: 125,
    failure_category: 'flaky_test',
    confidence_score: 0.91,
    root_cause: "Integration test `test_redis_session_lock` timed out after 5000ms due to socket connection contention under parallel worker threads.",
    suggested_fix: "Increase test client lock wait timeout to 10s or configure isolated mock redis instances per worker.",
    trimmed_log: `[info] Running Cypress & Pytest Parallel Tests
tests/integration/test_session.py:44: TimeoutError: Lock acquisition timed out waiting for key 'lock:session_user_882' after 5000ms
##[error]Process completed with exit code 1.`,
    raw_response: JSON.stringify({
      failure_category: "flaky_test",
      confidence_score: 0.91,
      root_cause: "Integration test timed out waiting for Redis session lock under high worker concurrency.",
      suggested_fix: "Increase lock acquisition timeout from 5000ms to 10000ms or mock Redis per test process."
    }, null, 2),
    status: 'posted',
    created_at: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
  },
  {
    id: 5,
    repo_name: 'cloud-infra/gateway',
    run_id: 88195,
    pr_number: null,
    failure_category: 'infrastructure_timeout',
    confidence_score: 0.89,
    root_cause: "Docker container build step exceeded maximum GitHub Actions job runner timeout (360 minutes / 6 hours) during image cache export.",
    suggested_fix: "Use multi-stage Docker build and GitHub Actions cache backend (`type=gha`) to avoid re-uploading uncompressed layers.",
    trimmed_log: `##[error]The job running on runner Hosted Agent has exceeded the maximum execution time of 360 minutes.
##[error]Operation timed out. Build step aborted.`,
    raw_response: JSON.stringify({
      failure_category: "infrastructure_timeout",
      confidence_score: 0.89,
      root_cause: "Docker build step exceeded 360-minute GitHub runner timeout during image cache export.",
      suggested_fix: "Enable GitHub Actions layer cache backend (type=gha) and optimize Dockerfile layers."
    }, null, 2),
    status: 'posted',
    created_at: new Date(Date.now() - 1000 * 60 * 480).toISOString(),
  }
];

export const INITIAL_METRICS: DashboardMetrics = {
  triaged_this_week: 142,
  most_common_cause: 'Dependency issue',
  avg_response_time_seconds: 18,
};

export const INITIAL_REPOS: RepositoryConfig[] = [
  {
    id: 1,
    owner: 'octocat',
    name: 'auth-service',
    is_active: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 7).toISOString(),
  },
  {
    id: 2,
    owner: 'HCMUS',
    name: 'shopping-cart',
    is_active: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5).toISOString(),
  },
  {
    id: 3,
    owner: 'HCMUS',
    name: 'weather-app',
    is_active: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24 * 3).toISOString(),
  },
];
