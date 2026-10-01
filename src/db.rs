//! Database connection module for PostgreSQL
//!
//! This module provides functionality to connect to PostgreSQL databases
//! with connection pooling support.

use deadpool_postgres::{Config, Manager, ManagerConfig, Pool, RecyclingMethod, Runtime};
use tokio_postgres::NoTls;
use crate::errors::DbError;

/// Configuration for database connection
#[derive(Debug, Clone)]
pub struct DbConfig {
    /// Database host
    pub host: String,
    /// Database port
    pub port: u16,
    /// Database name
    pub dbname: String,
    /// Database user
    pub user: String,
    /// Database password
    pub password: String,
    /// Maximum pool size
    pub max_pool_size: usize,
}

impl Default for DbConfig {
    fn default() -> Self {
        Self {
            host: "localhost".to_string(),
            port: 5432,
            dbname: "postgres".to_string(),
            user: "postgres".to_string(),
            password: "".to_string(),
            max_pool_size: 16,
        }
    }
}

impl DbConfig {
    /// Create a new database configuration with default values
    pub fn new() -> Self {
        Self::default()
    }

    /// Set the database host
    pub fn with_host(mut self, host: impl Into<String>) -> Self {
        self.host = host.into();
        self
    }

    /// Set the database port
    pub fn with_port(mut self, port: u16) -> Self {
        self.port = port;
        self
    }

    /// Set the database name
    pub fn with_dbname(mut self, dbname: impl Into<String>) -> Self {
        self.dbname = dbname.into();
        self
    }

    /// Set the database user
    pub fn with_user(mut self, user: impl Into<String>) -> Self {
        self.user = user.into();
        self
    }

    /// Set the database password
    pub fn with_password(mut self, password: impl Into<String>) -> Self {
        self.password = password.into();
        self
    }

    /// Set the maximum pool size
    pub fn with_max_pool_size(mut self, size: usize) -> Self {
        self.max_pool_size = size;
        self
    }
}

/// Database connection pool wrapper
pub struct DbPool {
    pool: Pool,
}

impl DbPool {
    /// Create a new database connection pool from configuration
    ///
    /// # Arguments
    ///
    /// * `config` - Database configuration
    ///
    /// # Returns
    ///
    /// Returns a Result containing the DbPool or an error
    ///
    /// # Example
    ///
    /// ```no_run
    /// use shapers::db::{DbConfig, DbPool};
    ///
    /// #[tokio::main]
    /// async fn main() -> Result<(), Box<dyn std::error::Error>> {
    ///     let config = DbConfig::new()
    ///         .with_host("localhost")
    ///         .with_port(5432)
    ///         .with_dbname("mydb")
    ///         .with_user("myuser")
    ///         .with_password("mypassword");
    ///
    ///     let pool = DbPool::new(config).await?;
    ///     Ok(())
    /// }
    /// ```
    pub async fn new(config: DbConfig) -> Result<Self, DbError> {
        let mut pg_config = Config::new();
        pg_config.host = Some(config.host);
        pg_config.port = Some(config.port);
        pg_config.dbname = Some(config.dbname);
        pg_config.user = Some(config.user);
        pg_config.password = Some(config.password);
        
        pg_config.manager = Some(ManagerConfig {
            recycling_method: RecyclingMethod::Fast,
        });

        let pool = pg_config.create_pool(Some(Runtime::Tokio1), NoTls)?;

        Ok(Self { pool })
    }

    /// Get a connection from the pool
    ///
    /// # Returns
    ///
    /// Returns a Result containing a connection from the pool or an error
    ///
    /// # Example
    ///
    /// ```no_run
    /// use shapers::db::{DbConfig, DbPool};
    ///
    /// #[tokio::main]
    /// async fn main() -> Result<(), Box<dyn std::error::Error>> {
    ///     let config = DbConfig::new()
    ///         .with_host("localhost")
    ///         .with_dbname("mydb");
    ///
    ///     let pool = DbPool::new(config).await?;
    ///     let client = pool.get_connection().await?;
    ///     
    ///     // Use the client to execute queries
    ///     let rows = client.query("SELECT 1", &[]).await?;
    ///     
    ///     Ok(())
    /// }
    /// ```
    pub async fn get_connection(&self) -> Result<deadpool_postgres::Client, DbError> {
        let client = self.pool.get().await?;
        Ok(client)
    }

    /// Get the underlying pool
    pub fn get_pool(&self) -> &Pool {
        &self.pool
    }
}

/// Create a database connection pool from a connection string
///
/// # Arguments
///
/// * `connection_string` - PostgreSQL connection string (e.g., "host=localhost user=postgres dbname=mydb")
///
/// # Returns
///
/// Returns a Result containing the DbPool or an error
///
/// # Example
///
/// ```no_run
/// use shapers::db::create_pool_from_connection_string;
///
/// #[tokio::main]
/// async fn main() -> Result<(), Box<dyn std::error::Error>> {
///     let pool = create_pool_from_connection_string(
///         "host=localhost port=5432 user=postgres dbname=mydb password=mypassword"
///     ).await?;
///     
///     let client = pool.get_connection().await?;
///     Ok(())
/// }
/// ```
pub async fn create_pool_from_connection_string(
    connection_string: &str,
) -> Result<DbPool, DbError> {
    let pg_config: tokio_postgres::Config = connection_string
        .parse()
        .map_err(|e: tokio_postgres::Error| DbError::ConfigError(e.to_string()))?;
    
    let mut config = Config::new();
    config.host = pg_config.get_hosts().first().and_then(|h| {
        match h {
            tokio_postgres::config::Host::Tcp(s) => Some(s.clone()),
            _ => None,
        }
    });
    config.port = pg_config.get_ports().first().copied();
    config.dbname = pg_config.get_dbname().map(|s| s.to_string());
    config.user = pg_config.get_user().map(|s| s.to_string());
    config.password = pg_config.get_password().map(|p| {
        String::from_utf8_lossy(p).to_string()
    });

    config.manager = Some(ManagerConfig {
        recycling_method: RecyclingMethod::Fast,
    });

    let pool = config.create_pool(Some(Runtime::Tokio1), NoTls)?;

    Ok(DbPool { pool })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_db_config_builder() {
        let config = DbConfig::new()
            .with_host("testhost")
            .with_port(5433)
            .with_dbname("testdb")
            .with_user("testuser")
            .with_password("testpass")
            .with_max_pool_size(10);

        assert_eq!(config.host, "testhost");
        assert_eq!(config.port, 5433);
        assert_eq!(config.dbname, "testdb");
        assert_eq!(config.user, "testuser");
        assert_eq!(config.password, "testpass");
        assert_eq!(config.max_pool_size, 10);
    }

    #[test]
    fn test_db_config_default() {
        let config = DbConfig::default();
        assert_eq!(config.host, "localhost");
        assert_eq!(config.port, 5432);
        assert_eq!(config.dbname, "postgres");
        assert_eq!(config.user, "postgres");
        assert_eq!(config.max_pool_size, 16);
    }
}
