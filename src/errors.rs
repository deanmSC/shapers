use pyo3::prelude::*;
use pyo3::exceptions::PyValueError;
use std::fmt;
#[derive(Debug)]
pub struct LSQError(argmin::core::Error);

impl From<LSQError> for PyErr {
    fn from(_error: LSQError) -> Self {
        PyValueError::new_err("LSQError")
    }
}


impl fmt::Display for LSQError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        write!(f, "{}", self.0)
    }
}

impl From<argmin::core::Error> for LSQError {
    fn from(value: argmin::core::Error) -> Self {
        // Self(value)
        LSQError(value)
    }
}

/// Database error type
#[derive(Debug)]
pub enum DbError {
    /// Connection error
    ConnectionError(String),
    /// Query error
    QueryError(String),
    /// Pool error
    PoolError(String),
    /// Configuration error
    ConfigError(String),
}

impl fmt::Display for DbError {
    fn fmt(&self, f: &mut fmt::Formatter) -> fmt::Result {
        match self {
            DbError::ConnectionError(msg) => write!(f, "Database connection error: {}", msg),
            DbError::QueryError(msg) => write!(f, "Database query error: {}", msg),
            DbError::PoolError(msg) => write!(f, "Database pool error: {}", msg),
            DbError::ConfigError(msg) => write!(f, "Database configuration error: {}", msg),
        }
    }
}

impl std::error::Error for DbError {}

impl From<tokio_postgres::Error> for DbError {
    fn from(error: tokio_postgres::Error) -> Self {
        DbError::QueryError(error.to_string())
    }
}

impl From<deadpool_postgres::PoolError> for DbError {
    fn from(error: deadpool_postgres::PoolError) -> Self {
        DbError::PoolError(error.to_string())
    }
}

impl From<deadpool_postgres::CreatePoolError> for DbError {
    fn from(error: deadpool_postgres::CreatePoolError) -> Self {
        DbError::ConfigError(error.to_string())
    }
}
