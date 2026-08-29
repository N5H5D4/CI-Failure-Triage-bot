# backend/services/markdown_formatter.py
from models.schemas import AIAnalysisOutput

class MarkdownFormatter:
    """Formats validated triage results into polished GitHub PR/Commit Markdown comments."""

    CATEGORY_BADGES = {
        "dependency_issue": "📦 **Lỗi Thư Viện (Dependency Issue)**",
        "syntax_error": "✍️ **Lỗi Cú Pháp / Compile (Syntax Error)**",
        "test_failure": "🧪 **Test Thất Bại (Test Failure)**",
        "flaky_test": "⚠️ **Test Chập Chờn (Flaky Test)**",
        "configuration_error": "⚙️ **Lỗi Cấu Hình (Configuration Error)**",
        "infrastructure_timeout": "⏱️ **Quá Thời Gian Chạy (Timeout)**",
        "unknown": "❓ **Lỗi Hệ Thống Khác (Unknown Error)**"
    }

    @classmethod
    def format_report(cls, analysis: AIAnalysisOutput, repo_name: str = "", run_id: int = 0) -> str:
        badge = cls.CATEGORY_BADGES.get(analysis.failure_category, "❓ **Lỗi Khác**")
        score_percent = round(analysis.confidence_score * 100, 1)

        markdown = f"""### 🤖 CI Failure Triage Bot Analysis

| **Phân loại lỗi (Category)** | **Độ tin cậy (Confidence)** |
| :--- | :--- |
| {badge} | `{score_percent}%` |

#### 🔍 Nguyên nhân gốc rễ (Root Cause)
> {analysis.root_cause}

#### 💡 Đề xuất sửa lỗi (Suggested Fix)
```text
{analysis.suggested_fix}
```

---
*Báo cáo được tạo tự động bởi **CI Failure Triage Bot** (Anthropic Claude AI) | Repository: `{repo_name}` | Run #{run_id}*
"""
        return markdown
