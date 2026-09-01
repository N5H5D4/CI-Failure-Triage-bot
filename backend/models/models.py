# backend/models/models.py
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from database import Base

class RepositoryConfig(Base):
    __tablename__ = "repository_config"

    id = Column(Integer, primary_key=True, index=True)
    owner = Column(String(100), nullable=False)
    name = Column(String(100), nullable=False)
    webhook_secret_ref = Column(String(255), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    triage_results = relationship("TriageResult", back_populates="repository", cascade="all, delete-orphan")


class TriageResult(Base):
    __tablename__ = "triage_results"

    id = Column(Integer, primary_key=True, index=True)
    repository_id = Column(Integer, ForeignKey("repository_config.id"), nullable=True)
    repo_name = Column(String(255), index=True, nullable=False)
    run_id = Column(Integer, index=True, nullable=False)
    pr_number = Column(Integer, nullable=True)
    failure_category = Column(String(50), default="unknown")  # flaky_test, test_failure, dependency_issue, syntax_error, configuration_error, infrastructure_timeout, unknown
    confidence_score = Column(Float, default=0.0)  # 0.0 to 1.0
    root_cause = Column(Text, nullable=True)
    suggested_fix = Column(Text, nullable=True)
    trimmed_log = Column(Text, nullable=True)
    raw_response = Column(Text, nullable=True)
    status = Column(String(30), default="pending")  # pending / posted / error
    is_simulated = Column(Boolean, default=False, nullable=True)
    github_comment_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    repository = relationship("RepositoryConfig", back_populates="triage_results")
