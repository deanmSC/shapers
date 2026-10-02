//! Error reporting module for tracking and logging errors to PostgreSQL
//!
//! This module provides functionality to log errors to a PostgreSQL database
//! with support for error categorization, severity levels, and metadata.

use crate::db::DbPool;
use crate::errors::DbError;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tokio_postgres::Row;

/// Error severity levels
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum ErrorSeverity {
    /// Debug level - for debugging information
    Debug,
    /// Info level - informational messages
    Info,
    /// Warning level - warning messages
    Warning,
    /// Error level - error messages
    Error,
    /// Critical level - critical errors
    Critical,
}

impl ErrorSeverity {
    /// Convert to database string representation
    pub fn as_str(&self) -> &'static str {
        match self {
            ErrorSeverity::Debug => "debug",
            ErrorSeverity::Info => "info",
            ErrorSeverity::Warning => "warning",
            ErrorSeverity::Error => "error",
            ErrorSeverity::Critical => "critical",
        }
    }
}

impl std::fmt::Display for ErrorSeverity {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

/// Error categories
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ErrorCategory {
    /// Circle fitting errors
    CircleFitting,
    /// Ellipsoid intersection errors
    EllipsoidIntersection,
    /// Database errors
    Database,
    /// Validation errors
    Validation,
    /// Optimization errors
    Optimization,
    /// System errors
    System,
    /// Unknown category
    Unknown,
}

impl ErrorCategory {
    /// Convert to database string representation
    pub fn as_str(&self) -> &'static str {
        match self {
            ErrorCategory::CircleFitting => "circle_fitting",
            ErrorCategory::EllipsoidIntersection => "ellipsoid_intersection",
            ErrorCategory::Database => "database",
            ErrorCategory::Validation => "validation",
            ErrorCategory::Optimization => "optimization",
            ErrorCategory::System => "system",
            ErrorCategory::Unknown => "unknown",
        }
    }
}

impl std::fmt::Display for ErrorCategory {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.as_str())
    }
}

/// Error record structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorRecord {
    /// Unique error ID
    pub id: Option<i64>,
    /// Error code
    pub error_code: String,
    /// Error type
    pub error_type: String,
    /// Severity level
    pub severity: ErrorSeverity,
    /// Error category
    pub category: ErrorCategory,
    /// Error message
    pub message: String,
    /// Stack trace (optional)
    pub stack_trace: Option<String>,
    /// Context data as JSON
    pub context: Option<serde_json::Value>,
    /// Whether the error is resolved
    pub resolved: bool,
}

impl ErrorRecord {
    /// Create a new error record
    pub fn new(
        error_code: impl Into<String>,
        error_type: impl Into<String>,
        message: impl Into<String>,
    ) -> Self {
        Self {
            id: None,
            error_code: error_code.into(),
            error_type: error_type.into(),
            severity: ErrorSeverity::Error,
            category: ErrorCategory::Unknown,
            message: message.into(),
            stack_trace: None,
            context: None,
            resolved: false,
        }
    }

    /// Set severity level
    pub fn with_severity(mut self, severity: ErrorSeverity) -> Self {
        self.severity = severity;
        self
    }

    /// Set error category
    pub fn with_category(mut self, category: ErrorCategory) -> Self {
        self.category = category;
        self
    }

    /// Set stack trace
    pub fn with_stack_trace(mut self, stack_trace: impl Into<String>) -> Self {
        self.stack_trace = Some(stack_trace.into());
        self
    }

    /// Set context data
    pub fn with_context(mut self, context: serde_json::Value) -> Self {
        self.context = Some(context);
        self
    }

    /// Mark as resolved
    pub fn mark_resolved(mut self) -> Self {
        self.resolved = true;
        self
    }
}

/// Error reporter for logging errors to the database
pub struct ErrorReporter {
    pool: DbPool,
}

impl ErrorReporter {
    /// Create a new error reporter
    pub fn new(pool: DbPool) -> Self {
        Self { pool }
    }

    /// Log an error to the database
    ///
    /// # Arguments
    ///
    /// * `error` - The error record to log
    ///
    /// # Returns
    ///
    /// Returns the ID of the logged error
    pub async fn log_error(&self, error: &ErrorRecord) -> Result<i64, DbError> {
        let client = self.pool.get_connection().await?;

        let context_json = error.context.as_ref().map(|c| serde_json::to_string(c).ok()).flatten();

        let row = client
            .query_one(
                "INSERT INTO errors (error_code, error_type, severity, category, message, stack_trace, context, resolved)
                 VALUES ($1, $2, $3::error_severity, $4::error_category, $5, $6, $7::jsonb, $8)
                 RETURNING id",
                &[
                    &error.error_code,
                    &error.error_type,
                    &error.severity.as_str(),
                    &error.category.as_str(),
                    &error.message,
                    &error.stack_trace,
                    &context_json,
                    &error.resolved,
                ],
            )
            .await?;

        let error_id: i64 = row.get(0);
        Ok(error_id)
    }

    /// Log an error occurrence
    ///
    /// # Arguments
    ///
    /// * `error_id` - The ID of the error
    /// * `environment` - Optional environment name
    /// * `hostname` - Optional hostname
    ///
    /// # Returns
    ///
    /// Returns the ID of the error log entry
    pub async fn log_occurrence(
        &self,
        error_id: i64,
        environment: Option<&str>,
        hostname: Option<&str>,
    ) -> Result<i64, DbError> {
        let client = self.pool.get_connection().await?;

        let row = client
            .query_one(
                "SELECT increment_error_occurrence($1, $2, $3)",
                &[&error_id, &environment, &hostname],
            )
            .await?;

        let log_id: i64 = row.get(0);
        Ok(log_id)
    }

    /// Add metadata to an error
    ///
    /// # Arguments
    ///
    /// * `error_id` - The ID of the error
    /// * `key` - Metadata key
    /// * `value` - Metadata value
    pub async fn add_metadata(
        &self,
        error_id: i64,
        key: &str,
        value: &str,
    ) -> Result<i64, DbError> {
        let client = self.pool.get_connection().await?;

        let row = client
            .query_one(
                "INSERT INTO error_metadata (error_id, key, value) VALUES ($1, $2, $3) RETURNING id",
                &[&error_id, &key, &value],
            )
            .await?;

        let metadata_id: i64 = row.get(0);
        Ok(metadata_id)
    }

    /// Get error by ID
    pub async fn get_error(&self, error_id: i64) -> Result<Option<ErrorRecord>, DbError> {
        let client = self.pool.get_connection().await?;

        let rows = client
            .query(
                "SELECT id, error_code, error_type, severity::text, category::text, message, stack_trace, context::text, resolved
                 FROM errors WHERE id = $1",
                &[&error_id],
            )
            .await?;

        if rows.is_empty() {
            return Ok(None);
        }

        let row = &rows[0];
        Ok(Some(self.row_to_error_record(row)?))
    }

    /// Get errors by code
    pub async fn get_errors_by_code(&self, error_code: &str) -> Result<Vec<ErrorRecord>, DbError> {
        let client = self.pool.get_connection().await?;

        let rows = client
            .query(
                "SELECT id, error_code, error_type, severity::text, category::text, message, stack_trace, context::text, resolved
                 FROM errors WHERE error_code = $1 ORDER BY created_at DESC",
                &[&error_code],
            )
            .await?;

        let mut errors = Vec::new();
        for row in rows {
            errors.push(self.row_to_error_record(&row)?);
        }

        Ok(errors)
    }

    /// Get recent errors
    pub async fn get_recent_errors(&self, limit: i64) -> Result<Vec<ErrorRecord>, DbError> {
        let client = self.pool.get_connection().await?;

        let rows = client
            .query(
                "SELECT id, error_code, error_type, severity::text, category::text, message, stack_trace, context::text, resolved
                 FROM errors ORDER BY created_at DESC LIMIT $1",
                &[&limit],
            )
            .await?;

        let mut errors = Vec::new();
        for row in rows {
            errors.push(self.row_to_error_record(&row)?);
        }

        Ok(errors)
    }

    /// Get unresolved errors
    pub async fn get_unresolved_errors(&self) -> Result<Vec<ErrorRecord>, DbError> {
        let client = self.pool.get_connection().await?;

        let rows = client
            .query(
                "SELECT id, error_code, error_type, severity::text, category::text, message, stack_trace, context::text, resolved
                 FROM errors WHERE resolved = false ORDER BY created_at DESC",
                &[],
            )
            .await?;

        let mut errors = Vec::new();
        for row in rows {
            errors.push(self.row_to_error_record(&row)?);
        }

        Ok(errors)
    }

    /// Mark error as resolved
    pub async fn resolve_error(
        &self,
        error_id: i64,
        resolved_by: &str,
        notes: Option<&str>,
    ) -> Result<(), DbError> {
        let client = self.pool.get_connection().await?;

        client
            .execute(
                "UPDATE errors SET resolved = true, resolved_at = NOW(), resolved_by = $1, resolution_notes = $2
                 WHERE id = $3",
                &[&resolved_by, &notes, &error_id],
            )
            .await?;

        Ok(())
    }

    /// Get error statistics
    pub async fn get_error_stats(&self) -> Result<HashMap<String, i64>, DbError> {
        let client = self.pool.get_connection().await?;

        let rows = client
            .query(
                "SELECT 
                    COUNT(*) as total,
                    COUNT(*) FILTER (WHERE resolved = false) as unresolved,
                    COUNT(*) FILTER (WHERE severity::text = 'critical') as critical,
                    COUNT(*) FILTER (WHERE severity::text = 'error') as errors,
                    COUNT(*) FILTER (WHERE severity::text = 'warning') as warnings
                 FROM errors",
                &[],
            )
            .await?;

        let mut stats = HashMap::new();
        if let Some(row) = rows.first() {
            stats.insert("total".to_string(), row.get::<_, i64>(0));
            stats.insert("unresolved".to_string(), row.get::<_, i64>(1));
            stats.insert("critical".to_string(), row.get::<_, i64>(2));
            stats.insert("errors".to_string(), row.get::<_, i64>(3));
            stats.insert("warnings".to_string(), row.get::<_, i64>(4));
        }

        Ok(stats)
    }

    /// Helper function to convert a database row to ErrorRecord
    fn row_to_error_record(&self, row: &Row) -> Result<ErrorRecord, DbError> {
        let severity_str: String = row.get(3);
        let category_str: String = row.get(4);
        let context_str: Option<String> = row.get(7);

        let severity = match severity_str.as_str() {
            "debug" => ErrorSeverity::Debug,
            "info" => ErrorSeverity::Info,
            "warning" => ErrorSeverity::Warning,
            "error" => ErrorSeverity::Error,
            "critical" => ErrorSeverity::Critical,
            _ => ErrorSeverity::Error,
        };

        let category = match category_str.as_str() {
            "circle_fitting" => ErrorCategory::CircleFitting,
            "ellipsoid_intersection" => ErrorCategory::EllipsoidIntersection,
            "database" => ErrorCategory::Database,
            "validation" => ErrorCategory::Validation,
            "optimization" => ErrorCategory::Optimization,
            "system" => ErrorCategory::System,
            _ => ErrorCategory::Unknown,
        };

        let context = context_str
            .and_then(|s| serde_json::from_str(&s).ok());

        Ok(ErrorRecord {
            id: Some(row.get(0)),
            error_code: row.get(1),
            error_type: row.get(2),
            severity,
            category,
            message: row.get(5),
            stack_trace: row.get(6),
            context,
            resolved: row.get(8),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_error_severity_display() {
        assert_eq!(ErrorSeverity::Debug.to_string(), "debug");
        assert_eq!(ErrorSeverity::Error.to_string(), "error");
        assert_eq!(ErrorSeverity::Critical.to_string(), "critical");
    }

    #[test]
    fn test_error_category_display() {
        assert_eq!(ErrorCategory::CircleFitting.to_string(), "circle_fitting");
        assert_eq!(ErrorCategory::Database.to_string(), "database");
    }

    #[test]
    fn test_error_record_builder() {
        let error = ErrorRecord::new("TEST_001", "TestError", "Test message")
            .with_severity(ErrorSeverity::Warning)
            .with_category(ErrorCategory::Validation);

        assert_eq!(error.error_code, "TEST_001");
        assert_eq!(error.severity, ErrorSeverity::Warning);
        assert_eq!(error.category, ErrorCategory::Validation);
    }
}
