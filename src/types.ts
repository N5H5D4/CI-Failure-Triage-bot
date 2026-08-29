export interface TriageResult {
  id?: number;
  repo_name: string;
  run_id: number;
  pr_number?: number | null;
  failure_category: string;
  confidence_score: number;
  root_cause?: string | null;
  suggested_fix?: string | null;
  trimmed_log?: string | null;
  raw_response?: string | null;
  status: 'pending' | 'posted' | 'error';
  github_comment_url?: string | null;
  created_at?: string;
}

export interface DashboardMetrics {
  triaged_this_week: number;
  most_common_cause: string;
  avg_response_time_seconds: number;
}

export interface RepositoryConfig {
  id: number;
  owner: string;
  name: string;
  is_active: boolean;
  created_at: string;
}

export interface SystemSettings {
  claude_api_key?: string;
  github_token?: string;
  webhook_secret?: string;
  max_log_tokens: number;
  rate_limit_per_min: number;
  debug_mode: boolean;
}
