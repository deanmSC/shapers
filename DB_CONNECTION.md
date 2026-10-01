# Database Connection Module

This module provides PostgreSQL database connection functionality with connection pooling support.

## Features

- Connection pooling using `deadpool-postgres`
- Async/await support with `tokio`
- Builder pattern for configuration
- Custom error handling
- Support for connection strings

## Usage Examples

### Basic Usage with Configuration Builder

```rust
use shapers::db::{DbConfig, DbPool};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Create database configuration
    let config = DbConfig::new()
        .with_host("localhost")
        .with_port(5432)
        .with_dbname("mydb")
        .with_user("myuser")
        .with_password("mypassword")
        .with_max_pool_size(16);

    // Create connection pool
    let pool = DbPool::new(config).await?;

    // Get a connection from the pool
    let client = pool.get_connection().await?;

    // Execute a query
    let rows = client.query("SELECT * FROM users WHERE id = $1", &[&1]).await?;

    for row in rows {
        let id: i32 = row.get(0);
        let name: String = row.get(1);
        println!("User: {} - {}", id, name);
    }

    Ok(())
}
```

### Using Connection String

```rust
use shapers::db::create_pool_from_connection_string;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Create pool from connection string
    let pool = create_pool_from_connection_string(
        "host=localhost port=5432 user=postgres dbname=mydb password=mypassword"
    ).await?;

    // Get a connection and use it
    let client = pool.get_connection().await?;
    let rows = client.query("SELECT version()", &[]).await?;

    for row in rows {
        let version: String = row.get(0);
        println!("PostgreSQL version: {}", version);
    }

    Ok(())
}
```

### Using Environment Variables

```rust
use shapers::db::{DbConfig, DbPool};
use std::env;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let config = DbConfig::new()
        .with_host(env::var("DB_HOST").unwrap_or_else(|_| "localhost".to_string()))
        .with_port(env::var("DB_PORT")
            .unwrap_or_else(|_| "5432".to_string())
            .parse()
            .unwrap_or(5432))
        .with_dbname(env::var("DB_NAME").unwrap_or_else(|_| "postgres".to_string()))
        .with_user(env::var("DB_USER").unwrap_or_else(|_| "postgres".to_string()))
        .with_password(env::var("DB_PASSWORD").unwrap_or_else(|_| "".to_string()));

    let pool = DbPool::new(config).await?;
    let client = pool.get_connection().await?;

    // Use the connection...

    Ok(())
}
```

### Transaction Example

```rust
use shapers::db::{DbConfig, DbPool};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let config = DbConfig::new()
        .with_host("localhost")
        .with_dbname("mydb");

    let pool = DbPool::new(config).await?;
    let mut client = pool.get_connection().await?;

    // Start a transaction
    let transaction = client.transaction().await?;

    // Execute multiple queries in the transaction
    transaction.execute(
        "INSERT INTO users (name, email) VALUES ($1, $2)",
        &[&"John Doe", &"john@example.com"]
    ).await?;

    transaction.execute(
        "UPDATE accounts SET balance = balance - 100 WHERE user_id = $1",
        &[&1]
    ).await?;

    // Commit the transaction
    transaction.commit().await?;

    Ok(())
}
```

## Configuration Options

The `DbConfig` struct supports the following options:

- `host`: Database host (default: "localhost")
- `port`: Database port (default: 5432)
- `dbname`: Database name (default: "postgres")
- `user`: Database user (default: "postgres")
- `password`: Database password (default: "")
- `max_pool_size`: Maximum number of connections in the pool (default: 16)

## Error Handling

The module provides custom error types through `DbError`:

- `ConnectionError`: Errors related to establishing connections
- `QueryError`: Errors during query execution
- `PoolError`: Errors related to connection pool management
- `ConfigError`: Configuration-related errors

```rust
use shapers::db::{DbConfig, DbPool};
use shapers::errors::DbError;

#[tokio::main]
async fn main() {
    let config = DbConfig::new()
        .with_host("invalid-host")
        .with_dbname("mydb");

    match DbPool::new(config).await {
        Ok(pool) => {
            println!("Connected successfully!");
        }
        Err(e) => {
            eprintln!("Database error: {}", e);
        }
    }
}
```

## Requirements

Add the following dependencies to your `Cargo.toml`:

```toml
[dependencies]
shapers = "0.3.3"
tokio = { version = "1", features = ["full"] }
```

## Notes

- The connection pool uses `NoTls` by default. For production use with SSL/TLS, you may need to configure TLS support.
- The pool uses the `Fast` recycling method for better performance.
- All operations are async and require a tokio runtime.
