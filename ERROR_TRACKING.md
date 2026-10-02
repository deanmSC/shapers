# Error Tracking System Documentation

## Overview

The Shapers error tracking system provides comprehensive error logging and monitoring capabilities using PostgreSQL. It tracks errors with severity levels, categories, metadata, and occurrence statistics.

## Features

- 📊 **Error Categorization**: Organize errors by type (circle fitting, database, validation, etc.)
- 🎯 **Severity Levels**: Debug, Info, Warning, Error, Critical
- 📈 **Occurrence Tracking**: Track how many times each error occurs
- 🔍 **Metadata Support**: Attach additional context to errors
- 📉 **Statistics**: Aggregated error statistics by date
- ✅ **Resolution Tracking**: Mark errors as resolved with notes
- 🔄 **Auto-increment**: Automatic occurrence counting

## Database Schema

### Tables

#### `errors`
Main table for storing error information.

| Column | Type | Description |
|--------|------|-------------|
| id | BIGSERIAL | Primary key |
| error_code | VARCHAR(50) | Unique error code (e.g., "LSQ_001") |
| error_type | VARCHAR(100) | Error type name (e.g., "LSQError") |
| severity | error_severity | Severity level enum |
| category | error_category | Category enum |
| message | TEXT | Error message |
| stack_trace | TEXT | Optional stack trace |
| context | JSONB | JSON context data |
| created_at | TIMESTAMP | When error was first logged |
| updated_at | TIMESTAMP | Last update time |
| resolved | BOOLEAN | Whether error is resolved |
| resolved_at | TIMESTAMP | When error was resolved |
| resolved_by | VARCHAR(100) | Who resolved the error |
| resolution_notes | TEXT | Resolution notes |

#### `error_logs`
Tracks occurrences of errors over time.

| Column | Type | Description |
|--------|------|-------------|
| id | BIGSERIAL | Primary key |
| error_id | BIGINT | Foreign key to errors |
| occurrence_count | INTEGER | Number of occurrences |
| first_occurred_at | TIMESTAMP | First occurrence time |
| last_occurred_at | TIMESTAMP | Last occurrence time |
| environment | VARCHAR(50) | Environment name |
| hostname | VARCHAR(255) | Server hostname |
| process_id | INTEGER | Process ID |
| thread_id | VARCHAR(100) | Thread ID |
| user_context | JSONB | User context data |
| additional_data | JSONB | Additional metadata |

#### `error_metadata`
Stores additional metadata for errors.

| Column | Type | Description |
|--------|------|-------------|
| id | BIGSERIAL | Primary key |
| error_id | BIGINT | Foreign key to errors |
| key | VARCHAR(100) | Metadata key |
| value | TEXT | Metadata value |
| created_at | TIMESTAMP | Creation time |

#### `error_statistics`
Aggregated error statistics by date.

| Column | Type | Description |
|--------|------|-------------|
| id | BIGSERIAL | Primary key |
| error_code | VARCHAR(50) | Error code |
| date | DATE | Statistics date |
| occurrence_count | INTEGER | Occurrences on this date |
| unique_users | INTEGER | Number of unique users affected |
| avg_resolution_time | INTERVAL | Average time to resolve |

### Enums

#### `error_severity`
- `debug`: Debug level information
- `info`: Informational messages
- `warning`: Warning messages
- `error`: Error messages
- `critical`: Critical errors

#### `error_category`
- `circle_fitting`: Circle fitting errors
- `ellipsoid_intersection`: Ellipsoid intersection errors
- `database`: Database errors
- `validation`: Validation errors
- `optimization`: Optimization errors
- `system`: System errors
- `unknown`: Unknown category

### Views

#### `error_summary`
Provides a summary of all errors with occurrence counts.

#### `recent_errors`
Shows errors from the last 7 days.

## Setup

### 1. Run Database Migrations

```bash
# Set environment variables
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=postgres
export DB_USER=postgres
export DB_PASSWORD=your_password

# Run migrations
cd migrations
./run_migrations.sh
```

Or manually:

```bash
psql -h localhost -U postgres -d postgres -f migrations/001_create_error_tracking_tables.sql
```

### 2. Configure Database Connection

```rust
use shapers::db::{DbConfig, DbPool};

let config = DbConfig::new()
    .with_host("localhost")
    .with_port(5432)
    .with_dbname("postgres")
    .with_user("postgres")
    .with_password("password");

let pool = DbPool::new(config).await?;
```

## Usage

### Rust API

#### Creating an Error Reporter

```rust
use shapers::db::{DbConfig, DbPool};
use shapers::error_reporting::{ErrorReporter, ErrorRecord, ErrorSeverity, ErrorCategory};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Create database pool
    let config = DbConfig::new()
        .with_host("localhost")
        .with_dbname("postgres");
    
    let pool = DbPool::new(config).await?;
    
    // Create error reporter
    let reporter = ErrorReporter::new(pool);
    
    Ok(())
}
```

#### Logging an Error

```rust
use serde_json::json;

// Create error record
let error = ErrorRecord::new(
    "LSQ_001",
    "LSQError",
    "Least squares optimization failed to converge"
)
.with_severity(ErrorSeverity::Error)
.with_category(ErrorCategory::CircleFitting)
.with_context(json!({
    "precision": 0.0001,
    "max_iterations": 100,
    "actual_iterations": 100
}));

// Log the error
let error_id = reporter.log_error(&error).await?;
println!("Error logged with ID: {}", error_id);
```

#### Logging an Error Occurrence

```rust
// Log that the error occurred again
let log_id = reporter.log_occurrence(
    error_id,
    Some("production"),
    Some("server-01")
).await?;
```

#### Adding Metadata

```rust
// Add metadata to an error
reporter.add_metadata(
    error_id,
    "user_id",
    "12345"
).await?;

reporter.add_metadata(
    error_id,
    "request_id",
    "req-abc-123"
).await?;
```

#### Querying Errors

```rust
// Get error by ID
if let Some(error) = reporter.get_error(error_id).await? {
    println!("Error: {:?}", error);
}

// Get errors by code
let errors = reporter.get_errors_by_code("LSQ_001").await?;
for error in errors {
    println!("Error: {}", error.message);
}

// Get recent errors
let recent = reporter.get_recent_errors(10).await?;

// Get unresolved errors
let unresolved = reporter.get_unresolved_errors().await?;
```

#### Resolving Errors

```rust
// Mark error as resolved
reporter.resolve_error(
    error_id,
    "admin",
    Some("Fixed by updating optimization parameters")
).await?;
```

#### Getting Statistics

```rust
// Get error statistics
let stats = reporter.get_error_stats().await?;
println!("Total errors: {}", stats.get("total").unwrap_or(&0));
println!("Unresolved: {}", stats.get("unresolved").unwrap_or(&0));
println!("Critical: {}", stats.get("critical").unwrap_or(&0));
```

### Integration with Existing Error Types

The existing error types (`LSQError`, `DbError`) now have helper methods for error tracking:

```rust
use shapers::errors::{LSQError, DbError};

// LSQError example
let lsq_error = LSQError::from(argmin_error);
let error_code = lsq_error.error_code(); // "LSQ_001"
let error_type = lsq_error.error_type(); // "LSQError"
let message = lsq_error.message();

// DbError example
let db_error = DbError::ConnectionError("Failed to connect".to_string());
let error_code = db_error.error_code(); // "DB_001"
let error_type = db_error.error_type(); // "DbError"
let message = db_error.message();
```

### Example: Complete Error Tracking Flow

```rust
use shapers::db::{DbConfig, DbPool};
use shapers::error_reporting::{ErrorReporter, ErrorRecord, ErrorSeverity, ErrorCategory};
use shapers::errors::DbError;
use serde_json::json;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Setup
    let config = DbConfig::new()
        .with_host("localhost")
        .with_dbname("postgres");
    
    let pool = DbPool::new(config).await?;
    let reporter = ErrorReporter::new(pool);
    
    // Simulate an error
    match perform_circle_fitting() {
        Ok(result) => println!("Success: {:?}", result),
        Err(e) => {
            // Log the error
            let error = ErrorRecord::new(
                "LSQ_001",
                "LSQError",
                format!("Circle fitting failed: {}", e)
            )
            .with_severity(ErrorSeverity::Error)
            .with_category(ErrorCategory::CircleFitting)
            .with_context(json!({
                "timestamp": chrono::Utc::now().to_rfc3339(),
                "function": "perform_circle_fitting"
            }));
            
            let error_id = reporter.log_error(&error).await?;
            
            // Log occurrence
            reporter.log_occurrence(
                error_id,
                Some("production"),
                Some(hostname::get()?.to_string_lossy().as_ref())
            ).await?;
            
            // Add metadata
            reporter.add_metadata(error_id, "version", "0.3.3").await?;
            
            eprintln!("Error logged with ID: {}", error_id);
        }
    }
    
    Ok(())
}

fn perform_circle_fitting() -> Result<(), String> {
    // Your circle fitting logic here
    Err("Convergence failed".to_string())
}
```

## Configuration Panel

The error tracking system can be configured through the web-based configuration panel:

1. Open `config-panel.html` in a web browser
2. Navigate to "Error Reporting Configuration" section
3. Configure:
   - Enable/disable error tracking
   - Set minimum severity level
   - Configure auto-resolve behavior
   - Set error retention period

## SQL Queries

### View All Errors

```sql
SELECT * FROM error_summary ORDER BY last_occurred_at DESC;
```

### View Recent Errors

```sql
SELECT * FROM recent_errors;
```

### Get Error Statistics

```sql
SELECT 
    severity,
    COUNT(*) as count,
    COUNT(*) FILTER (WHERE resolved = false) as unresolved
FROM errors
GROUP BY severity;
```

### Get Most Common Errors

```sql
SELECT 
    e.error_code,
    e.message,
    el.occurrence_count
FROM errors e
JOIN error_logs el ON e.id = el.error_id
ORDER BY el.occurrence_count DESC
LIMIT 10;
```

### Get Errors by Date

```sql
SELECT 
    DATE(created_at) as date,
    COUNT(*) as error_count
FROM errors
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

## Best Practices

1. **Use Appropriate Severity Levels**
   - `debug`: Development/debugging information
   - `info`: Normal operational messages
   - `warning`: Potential issues that don't prevent operation
   - `error`: Errors that prevent specific operations
   - `critical`: System-wide failures

2. **Add Context**
   - Include relevant parameters and state in the context JSON
   - Add stack traces for debugging
   - Include timestamps and environment information

3. **Use Metadata**
   - Add user IDs, request IDs, session IDs
   - Include version information
   - Track deployment information

4. **Monitor Regularly**
   - Check unresolved errors daily
   - Review error trends weekly
   - Set up alerts for critical errors

5. **Resolve Errors**
   - Mark errors as resolved when fixed
   - Add resolution notes for future reference
   - Track resolution time

## Maintenance

### Clean Up Old Errors

```sql
-- Delete errors older than 90 days
DELETE FROM errors WHERE created_at < NOW() - INTERVAL '90 days';
```

### Archive Old Errors

```sql
-- Create archive table
CREATE TABLE errors_archive AS SELECT * FROM errors WHERE created_at < NOW() - INTERVAL '90 days';

-- Delete archived errors
DELETE FROM errors WHERE created_at < NOW() - INTERVAL '90 days';
```

### Vacuum Tables

```sql
VACUUM ANALYZE errors;
VACUUM ANALYZE error_logs;
VACUUM ANALYZE error_metadata;
```

## Troubleshooting

### Connection Issues

If you can't connect to the database:
1. Check PostgreSQL is running: `pg_isready`
2. Verify connection parameters
3. Check firewall settings
4. Verify user permissions

### Migration Failures

If migrations fail:
1. Check PostgreSQL version (requires 9.5+)
2. Verify user has CREATE permissions
3. Check for existing tables with same names
4. Review migration logs

### Performance Issues

If queries are slow:
1. Check indexes are created
2. Run VACUUM ANALYZE
3. Review query plans with EXPLAIN
4. Consider partitioning large tables

## Security Considerations

- **Passwords**: Never log passwords or sensitive data
- **PII**: Be careful with personally identifiable information
- **Access Control**: Restrict database access appropriately
- **Encryption**: Use SSL/TLS for database connections in production
- **Retention**: Implement data retention policies

## License

This error tracking system is part of the Shapers project and follows the same license.
