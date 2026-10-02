-- Migration: Create Error Tracking Tables
-- Description: Creates tables for tracking application errors with metadata
-- Version: 001
-- Date: 2024-10-01

-- Create enum for error severity levels
CREATE TYPE error_severity AS ENUM ('debug', 'info', 'warning', 'error', 'critical');

-- Create enum for error categories
CREATE TYPE error_category AS ENUM (
    'circle_fitting',
    'ellipsoid_intersection',
    'database',
    'validation',
    'optimization',
    'system',
    'unknown'
);

-- Main errors table
CREATE TABLE IF NOT EXISTS errors (
    id BIGSERIAL PRIMARY KEY,
    error_code VARCHAR(50) NOT NULL,
    error_type VARCHAR(100) NOT NULL,
    severity error_severity NOT NULL DEFAULT 'error',
    category error_category NOT NULL DEFAULT 'unknown',
    message TEXT NOT NULL,
    stack_trace TEXT,
    context JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    resolved BOOLEAN NOT NULL DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by VARCHAR(100),
    resolution_notes TEXT
);

-- Error logs table for tracking error occurrences
CREATE TABLE IF NOT EXISTS error_logs (
    id BIGSERIAL PRIMARY KEY,
    error_id BIGINT REFERENCES errors(id) ON DELETE CASCADE,
    occurrence_count INTEGER NOT NULL DEFAULT 1,
    first_occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    last_occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    environment VARCHAR(50),
    hostname VARCHAR(255),
    process_id INTEGER,
    thread_id VARCHAR(100),
    user_context JSONB,
    additional_data JSONB
);

-- Error metadata table for storing additional error information
CREATE TABLE IF NOT EXISTS error_metadata (
    id BIGSERIAL PRIMARY KEY,
    error_id BIGINT REFERENCES errors(id) ON DELETE CASCADE,
    key VARCHAR(100) NOT NULL,
    value TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Error statistics table for aggregated error data
CREATE TABLE IF NOT EXISTS error_statistics (
    id BIGSERIAL PRIMARY KEY,
    error_code VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    occurrence_count INTEGER NOT NULL DEFAULT 0,
    unique_users INTEGER NOT NULL DEFAULT 0,
    avg_resolution_time INTERVAL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    UNIQUE(error_code, date)
);

-- Create indexes for better query performance
CREATE INDEX idx_errors_error_code ON errors(error_code);
CREATE INDEX idx_errors_severity ON errors(severity);
CREATE INDEX idx_errors_category ON errors(category);
CREATE INDEX idx_errors_created_at ON errors(created_at);
CREATE INDEX idx_errors_resolved ON errors(resolved);
CREATE INDEX idx_error_logs_error_id ON error_logs(error_id);
CREATE INDEX idx_error_logs_last_occurred ON error_logs(last_occurred_at);
CREATE INDEX idx_error_metadata_error_id ON error_metadata(error_id);
CREATE INDEX idx_error_metadata_key ON error_metadata(key);
CREATE INDEX idx_error_statistics_error_code ON error_statistics(error_code);
CREATE INDEX idx_error_statistics_date ON error_statistics(date);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for errors table
CREATE TRIGGER update_errors_updated_at
    BEFORE UPDATE ON errors
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create trigger for error_statistics table
CREATE TRIGGER update_error_statistics_updated_at
    BEFORE UPDATE ON error_statistics
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create function to increment error occurrence count
CREATE OR REPLACE FUNCTION increment_error_occurrence(
    p_error_id BIGINT,
    p_environment VARCHAR(50) DEFAULT NULL,
    p_hostname VARCHAR(255) DEFAULT NULL,
    p_process_id INTEGER DEFAULT NULL,
    p_thread_id VARCHAR(100) DEFAULT NULL,
    p_user_context JSONB DEFAULT NULL,
    p_additional_data JSONB DEFAULT NULL
)
RETURNS BIGINT AS $$
DECLARE
    v_log_id BIGINT;
BEGIN
    -- Insert or update error log
    INSERT INTO error_logs (
        error_id,
        occurrence_count,
        first_occurred_at,
        last_occurred_at,
        environment,
        hostname,
        process_id,
        thread_id,
        user_context,
        additional_data
    ) VALUES (
        p_error_id,
        1,
        NOW(),
        NOW(),
        p_environment,
        p_hostname,
        p_process_id,
        p_thread_id,
        p_user_context,
        p_additional_data
    )
    ON CONFLICT (error_id) DO UPDATE SET
        occurrence_count = error_logs.occurrence_count + 1,
        last_occurred_at = NOW(),
        environment = COALESCE(EXCLUDED.environment, error_logs.environment),
        hostname = COALESCE(EXCLUDED.hostname, error_logs.hostname),
        process_id = COALESCE(EXCLUDED.process_id, error_logs.process_id),
        thread_id = COALESCE(EXCLUDED.thread_id, error_logs.thread_id),
        user_context = COALESCE(EXCLUDED.user_context, error_logs.user_context),
        additional_data = COALESCE(EXCLUDED.additional_data, error_logs.additional_data)
    RETURNING id INTO v_log_id;
    
    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- Create view for error summary
CREATE OR REPLACE VIEW error_summary AS
SELECT 
    e.id,
    e.error_code,
    e.error_type,
    e.severity,
    e.category,
    e.message,
    e.created_at,
    e.resolved,
    COALESCE(el.occurrence_count, 0) AS total_occurrences,
    el.last_occurred_at,
    COUNT(em.id) AS metadata_count
FROM errors e
LEFT JOIN error_logs el ON e.id = el.error_id
LEFT JOIN error_metadata em ON e.id = em.error_id
GROUP BY e.id, e.error_code, e.error_type, e.severity, e.category, 
         e.message, e.created_at, e.resolved, el.occurrence_count, el.last_occurred_at
ORDER BY el.last_occurred_at DESC NULLS LAST;

-- Create view for recent errors
CREATE OR REPLACE VIEW recent_errors AS
SELECT 
    e.id,
    e.error_code,
    e.error_type,
    e.severity,
    e.category,
    e.message,
    el.occurrence_count,
    el.last_occurred_at,
    e.resolved
FROM errors e
LEFT JOIN error_logs el ON e.id = el.error_id
WHERE e.created_at >= NOW() - INTERVAL '7 days'
ORDER BY el.last_occurred_at DESC NULLS LAST
LIMIT 100;

-- Insert some example error codes for reference
INSERT INTO errors (error_code, error_type, severity, category, message, resolved) VALUES
    ('LSQ_001', 'LSQError', 'error', 'circle_fitting', 'Least squares optimization failed to converge', true),
    ('DB_001', 'DbError', 'critical', 'database', 'Database connection failed', false),
    ('DB_002', 'DbError', 'error', 'database', 'Query execution timeout', false),
    ('VAL_001', 'ValidationError', 'warning', 'validation', 'Invalid input parameters', false)
ON CONFLICT DO NOTHING;

COMMENT ON TABLE errors IS 'Main table for storing error information';
COMMENT ON TABLE error_logs IS 'Tracks occurrences of errors over time';
COMMENT ON TABLE error_metadata IS 'Stores additional metadata for errors';
COMMENT ON TABLE error_statistics IS 'Aggregated error statistics by date';
COMMENT ON COLUMN errors.context IS 'JSON context data about the error (e.g., input parameters, state)';
COMMENT ON COLUMN errors.resolved IS 'Whether the error has been resolved or acknowledged';
