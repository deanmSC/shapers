// Error Reporting Module
// Handles error reporting, logging to console and local storage

class ErrorReporting {
    constructor() {
        this.errors = this.loadErrors();
        this.initEventListeners();
    }

    // Load errors from local storage
    loadErrors() {
        const savedErrors = localStorage.getItem('shapersErrors');
        if (savedErrors) {
            try {
                return JSON.parse(savedErrors);
            } catch (e) {
                console.error('Error parsing saved errors:', e);
                return [];
            }
        }
        return [];
    }

    // Save errors to local storage
    saveErrors() {
        localStorage.setItem('shapersErrors', JSON.stringify(this.errors));
    }

    // Submit an error report
    submitErrorReport(errorData) {
        const report = {
            id: this.generateId(),
            timestamp: new Date().toISOString(),
            type: errorData.type || 'general',
            title: errorData.title || 'Untitled Error',
            description: errorData.description || '',
            userEmail: errorData.userEmail || '',
            severity: errorData.severity || 'medium',
            url: window.location.href,
            userAgent: navigator.userAgent
        };

        this.errors.push(report);
        this.saveErrors();

        // Log to console
        console.log('Error Report Submitted:', report);
        console.table(report);

        return report;
    }

    // Generate unique ID
    generateId() {
        return 'error_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    // Get all errors
    getAllErrors() {
        return this.errors;
    }

    // Get errors by type
    getErrorsByType(type) {
        return this.errors.filter(error => error.type === type);
    }

    // Get errors by severity
    getErrorsBySeverity(severity) {
        return this.errors.filter(error => error.severity === severity);
    }

    // Clear all errors
    clearAllErrors() {
        if (confirm('Are you sure you want to delete all error reports?')) {
            this.errors = [];
            this.saveErrors();
            console.log('All error reports cleared');
            return true;
        }
        return false;
    }

    // Delete specific error
    deleteError(errorId) {
        this.errors = this.errors.filter(error => error.id !== errorId);
        this.saveErrors();
        console.log('Error report deleted:', errorId);
    }

    // Export errors as JSON
    exportErrors() {
        const errorsJson = JSON.stringify(this.errors, null, 2);
        const blob = new Blob([errorsJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'shapers-error-reports.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log('Error reports exported');
    }

    // Export errors as CSV
    exportErrorsAsCSV() {
        if (this.errors.length === 0) {
            alert('No error reports to export');
            return;
        }

        const headers = ['ID', 'Timestamp', 'Type', 'Title', 'Description', 'Severity', 'Email', 'URL'];
        const rows = this.errors.map(error => [
            error.id,
            error.timestamp,
            error.type,
            error.title,
            error.description,
            error.severity,
            error.userEmail,
            error.url
        ]);

        let csv = headers.join(',') + '\n';
        rows.forEach(row => {
            csv += row.map(cell => `"${cell}"`).join(',') + '\n';
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'shapers-error-reports.csv';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        console.log('Error reports exported as CSV');
    }

    // Get error statistics
    getStatistics() {
        const stats = {
            totalErrors: this.errors.length,
            byType: {},
            bySeverity: {},
            recentErrors: this.errors.slice(-5)
        };

        this.errors.forEach(error => {
            // Count by type
            stats.byType[error.type] = (stats.byType[error.type] || 0) + 1;
            // Count by severity
            stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;
        });

        return stats;
    }

    // Display error statistics in console
    displayStatistics() {
        const stats = this.getStatistics();
        console.log('=== Error Reporting Statistics ===');
        console.log('Total Errors:', stats.totalErrors);
        console.log('By Type:', stats.byType);
        console.log('By Severity:', stats.bySeverity);
        console.log('Recent Errors:', stats.recentErrors);
    }

    // Initialize event listeners
    initEventListeners() {
        // Listen for global errors
        window.addEventListener('error', (event) => {
            this.submitErrorReport({
                type: 'javascript',
                title: 'JavaScript Error',
                description: event.message,
                severity: 'high'
            });
        });

        // Listen for unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.submitErrorReport({
                type: 'promise',
                title: 'Unhandled Promise Rejection',
                description: event.reason ? event.reason.toString() : 'Unknown error',
                severity: 'high'
            });
        });
    }
}

// Initialize error reporting when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.errorReporting = new ErrorReporting();
    console.log('Error Reporting System initialized');
    console.log('Available methods:');
    console.log('  errorReporting.submitErrorReport(errorData)');
    console.log('  errorReporting.getAllErrors()');
    console.log('  errorReporting.getErrorsByType(type)');
    console.log('  errorReporting.getErrorsBySeverity(severity)');
    console.log('  errorReporting.clearAllErrors()');
    console.log('  errorReporting.deleteError(errorId)');
    console.log('  errorReporting.exportErrors()');
    console.log('  errorReporting.exportErrorsAsCSV()');
    console.log('  errorReporting.displayStatistics()');
});
