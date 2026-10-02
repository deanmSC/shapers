//! Example: Error Tracking Usage
//!
//! This example demonstrates how to use the error tracking system
//! to log and monitor errors in the Shapers library.

use shapers::db::{DbConfig, DbPool};
use shapers::error_reporting::{
    ErrorReporter, ErrorRecord, ErrorSeverity, ErrorCategory
};
use serde_json::json;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    println!("=== Shapers Error Tracking Example ===\n");

    // 1. Setup database connection
    println!("1. Setting up database connection...");
    let config = DbConfig::new()
        .with_host("localhost")
        .with_port(5432)
        .with_dbname("postgres")
        .with_user("postgres")
        .with_password("");

    let pool = DbPool::new(config).await?;
    println!("   ✓ Connected to database\n");

    // 2. Create error reporter
    println!("2. Creating error reporter...");
    let reporter = ErrorReporter::new(pool);
    println!("   ✓ Error reporter created\n");

    // 3. Log a simple error
    println!("3. Logging a simple error...");
    let error1 = ErrorRecord::new(
        "LSQ_001",
        "LSQError",
        "Least squares optimization failed to converge"
    )
    .with_severity(ErrorSeverity::Error)
    .with_category(ErrorCategory::CircleFitting);

    let error_id1 = reporter.log_error(&error1).await?;
    println!("   ✓ Error logged with ID: {}\n", error_id1);

    // 4. Log an error with context
    println!("4. Logging an error with context...");
    let error2 = ErrorRecord::new(
        "DB_001",
        "DbError",
        "Database connection timeout"
    )
    .with_severity(ErrorSeverity::Critical)
    .with_category(ErrorCategory::Database)
    .with_context(json!({
        "host": "localhost",
        "port": 5432,
        "timeout_seconds": 30,
        "retry_count": 3
    }));

    let error_id2 = reporter.log_error(&error2).await?;
    println!("   ✓ Error logged with ID: {}\n", error_id2);

    // 5. Log error occurrence
    println!("5. Logging error occurrence...");
    let log_id = reporter.log_occurrence(
        error_id1,
        Some("development"),
        Some("localhost")
    ).await?;
    println!("   ✓ Occurrence logged with ID: {}\n", log_id);

    // 6. Add metadata to error
    println!("6. Adding metadata to error...");
    reporter.add_metadata(error_id1, "user_id", "12345").await?;
    reporter.add_metadata(error_id1, "session_id", "sess-abc-123").await?;
    reporter.add_metadata(error_id1, "version", "0.3.3").await?;
    println!("   ✓ Metadata added\n");

    // 7. Query errors
    println!("7. Querying errors...");
    
    // Get error by ID
    if let Some(error) = reporter.get_error(error_id1).await? {
        println!("   Error {}: {}", error.error_code, error.message);
        println!("   Severity: {:?}", error.severity);
        println!("   Category: {:?}", error.category);
    }
    println!();

    // Get errors by code
    let errors = reporter.get_errors_by_code("LSQ_001").await?;
    println!("   Found {} error(s) with code LSQ_001", errors.len());
    println!();

    // Get recent errors
    let recent = reporter.get_recent_errors(5).await?;
    println!("   Recent errors (last 5):");
    for error in recent {
        println!("     - [{}] {} ({})", 
            error.severity.as_str().to_uppercase(),
            error.message,
            error.error_code
        );
    }
    println!();

    // Get unresolved errors
    let unresolved = reporter.get_unresolved_errors().await?;
    println!("   Unresolved errors: {}", unresolved.len());
    println!();

    // 8. Get statistics
    println!("8. Getting error statistics...");
    let stats = reporter.get_error_stats().await?;
    println!("   Total errors: {}", stats.get("total").unwrap_or(&0));
    println!("   Unresolved: {}", stats.get("unresolved").unwrap_or(&0));
    println!("   Critical: {}", stats.get("critical").unwrap_or(&0));
    println!("   Errors: {}", stats.get("errors").unwrap_or(&0));
    println!("   Warnings: {}", stats.get("warnings").unwrap_or(&0));
    println!();

    // 9. Resolve an error
    println!("9. Resolving an error...");
    reporter.resolve_error(
        error_id1,
        "admin",
        Some("Fixed by adjusting optimization parameters")
    ).await?;
    println!("   ✓ Error {} resolved\n", error_id1);

    // 10. Verify resolution
    println!("10. Verifying resolution...");
    if let Some(error) = reporter.get_error(error_id1).await? {
        println!("   Error {} is resolved: {}", error_id1, error.resolved);
    }
    println!();

    // 11. Log multiple error types
    println!("11. Logging various error types...");
    
    let errors_to_log = vec![
        ErrorRecord::new("VAL_001", "ValidationError", "Invalid input parameters")
            .with_severity(ErrorSeverity::Warning)
            .with_category(ErrorCategory::Validation),
        
        ErrorRecord::new("OPT_001", "OptimizationError", "Optimization diverged")
            .with_severity(ErrorSeverity::Error)
            .with_category(ErrorCategory::Optimization),
        
        ErrorRecord::new("SYS_001", "SystemError", "Out of memory")
            .with_severity(ErrorSeverity::Critical)
            .with_category(ErrorCategory::System),
    ];

    for error in errors_to_log {
        let id = reporter.log_error(&error).await?;
        println!("   ✓ Logged {} (ID: {})", error.error_code, id);
    }
    println!();

    // 12. Final statistics
    println!("12. Final statistics...");
    let final_stats = reporter.get_error_stats().await?;
    println!("   Total errors: {}", final_stats.get("total").unwrap_or(&0));
    println!("   Unresolved: {}", final_stats.get("unresolved").unwrap_or(&0));
    println!();

    println!("=== Example completed successfully! ===");
    println!("\nNext steps:");
    println!("  - View errors in database: SELECT * FROM error_summary;");
    println!("  - Check recent errors: SELECT * FROM recent_errors;");
    println!("  - Open config-panel.html to configure error tracking");

    Ok(())
}
