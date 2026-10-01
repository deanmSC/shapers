// Configuration Panel JavaScript
// Handles theme toggling, configuration management, and persistence

class ConfigPanel {
    constructor() {
        this.config = this.loadConfig();
        this.initTheme();
        this.initEventListeners();
        this.loadFormValues();
        this.initPageNavigation();
    }

    // Theme Management
    initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        this.setTheme(savedTheme);
    }

    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        
        const checkbox = document.getElementById('theme-toggle-checkbox');
        const label = document.getElementById('theme-label');
        
        if (theme === 'dark') {
            checkbox.checked = true;
            label.textContent = 'Dark Mode';
        } else {
            checkbox.checked = false;
            label.textContent = 'Light Mode';
        }
    }

    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    }

    // Page Navigation
    initPageNavigation() {
        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = e.target.dataset.page;
                this.showPage(page);
            });
        });
    }

    showPage(pageName) {
        // Hide all pages
        const pages = document.querySelectorAll('.page-content');
        pages.forEach(page => page.classList.remove('active'));

        // Show selected page
        const selectedPage = document.getElementById(pageName + '-page');
        if (selectedPage) {
            selectedPage.classList.add('active');
        }

        // Update nav buttons
        const navButtons = document.querySelectorAll('.nav-btn');
        navButtons.forEach(btn => {
            if (btn.dataset.page === pageName) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // Refresh error list if showing error reporting page
        if (pageName === 'error-reporting' && window.errorReporting) {
            this.refreshErrorList();
        }
    }

    // Configuration Management
    getDefaultConfig() {
        return {
            circleFitting: {
                method: 'taubin_svd',
                precision: 0.0001,
                maxIterations: 100,
                optimizer: 'lbfgs'
            },
            ellipsoidIntersection: {
                tolerance: 0.000001,
                maxIterations: 100
            },
            database: {
                host: 'localhost',
                port: 5432,
                dbname: 'postgres',
                user: 'postgres',
                password: '',
                poolSize: 16
            }
        };
    }

    loadConfig() {
        const savedConfig = localStorage.getItem('shapersConfig');
        if (savedConfig) {
            try {
                return JSON.parse(savedConfig);
            } catch (e) {
                console.error('Error parsing saved config:', e);
                return this.getDefaultConfig();
            }
        }
        return this.getDefaultConfig();
    }

    saveConfig() {
        const config = {
            circleFitting: {
                method: document.getElementById('method').value,
                precision: parseFloat(document.getElementById('precision').value),
                maxIterations: parseInt(document.getElementById('max-iterations').value),
                optimizer: document.getElementById('optimizer').value
            },
            ellipsoidIntersection: {
                tolerance: parseFloat(document.getElementById('tolerance').value),
                maxIterations: parseInt(document.getElementById('ellipsoid-max-iters').value)
            },
            database: {
                host: document.getElementById('db-host').value,
                port: parseInt(document.getElementById('db-port').value),
                dbname: document.getElementById('db-name').value,
                user: document.getElementById('db-user').value,
                password: document.getElementById('db-password').value,
                poolSize: parseInt(document.getElementById('pool-size').value)
            }
        };

        localStorage.setItem('shapersConfig', JSON.stringify(config));
        this.config = config;
        this.showStatus('Configuration saved successfully!', 'success');
        
        // Log the configuration for demonstration
        console.log('Saved Configuration:', config);
        this.generateCodeExamples(config);
    }

    loadFormValues() {
        // Circle Fitting
        document.getElementById('method').value = this.config.circleFitting.method;
        document.getElementById('precision').value = this.config.circleFitting.precision;
        document.getElementById('max-iterations').value = this.config.circleFitting.maxIterations;
        document.getElementById('optimizer').value = this.config.circleFitting.optimizer;

        // Ellipsoid Intersection
        document.getElementById('tolerance').value = this.config.ellipsoidIntersection.tolerance;
        document.getElementById('ellipsoid-max-iters').value = this.config.ellipsoidIntersection.maxIterations;

        // Database
        document.getElementById('db-host').value = this.config.database.host;
        document.getElementById('db-port').value = this.config.database.port;
        document.getElementById('db-name').value = this.config.database.dbname;
        document.getElementById('db-user').value = this.config.database.user;
        document.getElementById('db-password').value = this.config.database.password;
        document.getElementById('pool-size').value = this.config.database.poolSize;
    }

    resetConfig() {
        if (confirm('Are you sure you want to reset all settings to defaults?')) {
            this.config = this.getDefaultConfig();
            localStorage.removeItem('shapersConfig');
            this.loadFormValues();
            this.showStatus('Configuration reset to defaults', 'success');
        }
    }

    exportConfig() {
        const configJson = JSON.stringify(this.config, null, 2);
        const blob = new Blob([configJson], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'shapers-config.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.showStatus('Configuration exported successfully!', 'success');
    }

    showStatus(message, type) {
        const statusElement = document.getElementById('status-message');
        statusElement.textContent = message;
        statusElement.className = `status-message show ${type}`;
        
        setTimeout(() => {
            statusElement.classList.remove('show');
        }, 3000);
    }

    generateCodeExamples(config) {
        // Generate Python code example
        const pythonCode = `
# Python Example with Current Configuration
import shapers as shs

# Circle Fitting Parameters
parameters = shs.FitCircleParams()
parameters.method = "${config.circleFitting.optimizer}"
parameters.precision = ${config.circleFitting.precision}
parameters.max_iterations = ${config.circleFitting.maxIterations}

# Fit circle using ${config.circleFitting.method}
x_center, y_center = shs.${config.circleFitting.method}(x_values, y_values, parameters)

# Ellipsoid Intersection Parameters
ellipsoid_params = shs.EllipsoidIntersectionParameters()
ellipsoid_params.tolerance = ${config.ellipsoidIntersection.tolerance}
ellipsoid_params.max_iters = ${config.ellipsoidIntersection.maxIterations}
`;

        // Generate Rust code example
        const rustCode = `
// Rust Example with Current Configuration
use shapers::db::{DbConfig, DbPool};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    // Database Configuration
    let config = DbConfig::new()
        .with_host("${config.database.host}")
        .with_port(${config.database.port})
        .with_dbname("${config.database.dbname}")
        .with_user("${config.database.user}")
        .with_password("${config.database.password}")
        .with_max_pool_size(${config.database.poolSize});

    let pool = DbPool::new(config).await?;
    let client = pool.get_connection().await?;
    
    Ok(())
}
`;

        console.log('Python Code Example:', pythonCode);
        console.log('Rust Code Example:', rustCode);
    }

    // Error Reporting UI Management
    refreshErrorList() {
        if (!window.errorReporting) return;

        const errorList = document.getElementById('error-list');
        const errors = window.errorReporting.getAllErrors();
        const stats = window.errorReporting.getStatistics();

        // Update statistics
        document.getElementById('stat-total').textContent = stats.totalErrors;
        document.getElementById('stat-high').textContent = stats.bySeverity['high'] || 0;
        document.getElementById('stat-session').textContent = Math.min(stats.totalErrors, 5);

        // Clear and rebuild error list
        errorList.innerHTML = '';

        if (errors.length === 0) {
            errorList.innerHTML = '<p class="empty-message">No error reports yet</p>';
            return;
        }

        // Display errors in reverse order (newest first)
        errors.slice().reverse().forEach(error => {
            const errorElement = this.createErrorElement(error);
            errorList.appendChild(errorElement);
        });
    }

    createErrorElement(error) {
        const div = document.createElement('div');
        div.className = `error-item severity-${error.severity}`;
        
        const timestamp = new Date(error.timestamp).toLocaleString();
        
        div.innerHTML = `
            <div class="error-item-header">
                <div class="error-item-title">${this.escapeHtml(error.title)}</div>
                <button class="error-item-delete" data-error-id="${error.id}" title="Delete">✕</button>
            </div>
            <div class="error-item-meta">
                <span class="error-badge type">${this.escapeHtml(error.type)}</span>
                <span class="error-badge severity-${error.severity}">${error.severity}</span>
            </div>
            <div class="error-item-description">${this.escapeHtml(error.description)}</div>
            <div class="error-item-timestamp">${timestamp}</div>
        `;

        // Add delete button listener
        const deleteBtn = div.querySelector('.error-item-delete');
        deleteBtn.addEventListener('click', () => {
            window.errorReporting.deleteError(error.id);
            this.refreshErrorList();
        });

        return div;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Event Listeners
    initEventListeners() {
        // Theme toggle
        const themeToggle = document.getElementById('theme-toggle-checkbox');
        themeToggle.addEventListener('change', () => this.toggleTheme());

        // Save configuration
        const saveButton = document.getElementById('save-config');
        saveButton.addEventListener('click', () => this.saveConfig());

        // Reset configuration
        const resetButton = document.getElementById('reset-config');
        resetButton.addEventListener('click', () => this.resetConfig());

        // Export configuration
        const exportButton = document.getElementById('export-config');
        exportButton.addEventListener('click', () => this.exportConfig());

        // Error reporting form
        const errorForm = document.getElementById('error-report-form');
        if (errorForm) {
            errorForm.addEventListener('submit', (e) => this.handleErrorSubmit(e));
        }

        // Error reporting buttons
        const refreshErrorsBtn = document.getElementById('refresh-errors');
        if (refreshErrorsBtn) {
            refreshErrorsBtn.addEventListener('click', () => this.refreshErrorList());
        }

        const exportErrorsJsonBtn = document.getElementById('export-errors-json');
        if (exportErrorsJsonBtn) {
            exportErrorsJsonBtn.addEventListener('click', () => {
                if (window.errorReporting) {
                    window.errorReporting.exportErrors();
                    this.showErrorStatus('Error reports exported as JSON', 'success');
                }
            });
        }

        const exportErrorsCsvBtn = document.getElementById('export-errors-csv');
        if (exportErrorsCsvBtn) {
            exportErrorsCsvBtn.addEventListener('click', () => {
                if (window.errorReporting) {
                    window.errorReporting.exportErrorsAsCSV();
                    this.showErrorStatus('Error reports exported as CSV', 'success');
                }
            });
        }

        const clearErrorsBtn = document.getElementById('clear-errors');
        if (clearErrorsBtn) {
            clearErrorsBtn.addEventListener('click', () => {
                if (window.errorReporting && window.errorReporting.clearAllErrors()) {
                    this.refreshErrorList();
                    this.showErrorStatus('All error reports cleared', 'success');
                }
            });
        }

        // Auto-save on input change (debounced)
        const inputs = document.querySelectorAll('#config-page input, #config-page select');
        let autoSaveTimeout;
        inputs.forEach(input => {
            input.addEventListener('change', () => {
                clearTimeout(autoSaveTimeout);
                autoSaveTimeout = setTimeout(() => {
                    this.saveConfig();
                }, 1000);
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + S to save
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                this.saveConfig();
            }
            // Ctrl/Cmd + D to toggle theme
            if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
                e.preventDefault();
                this.toggleTheme();
            }
        });
    }

    handleErrorSubmit(e) {
        e.preventDefault();

        if (!window.errorReporting) {
            this.showErrorStatus('Error reporting system not initialized', 'error');
            return;
        }

        const errorType = document.getElementById('error-type').value;
        const errorSeverity = document.getElementById('error-severity').value;
        const errorTitle = document.getElementById('error-title').value;
        const errorDescription = document.getElementById('error-description').value;
        const errorEmail = document.getElementById('error-email').value;

        if (!errorType || !errorTitle || !errorDescription) {
            this.showErrorStatus('Please fill in all required fields', 'error');
            return;
        }

        const report = window.errorReporting.submitErrorReport({
            type: errorType,
            title: errorTitle,
            description: errorDescription,
            severity: errorSeverity,
            userEmail: errorEmail
        });

        this.showErrorStatus('Error report submitted successfully!', 'success');
        document.getElementById('error-report-form').reset();
        this.refreshErrorList();
    }

    showErrorStatus(message, type) {
        const statusElement = document.getElementById('error-status-message');
        if (statusElement) {
            statusElement.textContent = message;
            statusElement.className = `status-message show ${type}`;
            
            setTimeout(() => {
                statusElement.classList.remove('show');
            }, 3000);
        }
    }

    // Validation
    validateConfig() {
        const errors = [];

        // Validate precision
        const precision = parseFloat(document.getElementById('precision').value);
        if (precision <= 0) {
            errors.push('Precision must be greater than 0');
        }

        // Validate max iterations
        const maxIters = parseInt(document.getElementById('max-iterations').value);
        if (maxIters < 1) {
            errors.push('Max iterations must be at least 1');
        }

        // Validate database port
        const port = parseInt(document.getElementById('db-port').value);
        if (port < 1 || port > 65535) {
            errors.push('Database port must be between 1 and 65535');
        }

        // Validate pool size
        const poolSize = parseInt(document.getElementById('pool-size').value);
        if (poolSize < 1 || poolSize > 100) {
            errors.push('Pool size must be between 1 and 100');
        }

        if (errors.length > 0) {
            this.showStatus(errors.join(', '), 'error');
            return false;
        }

        return true;
    }
}

// Initialize the configuration panel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const configPanel = new ConfigPanel();
    
    // Make it globally accessible for debugging
    window.configPanel = configPanel;
    
    console.log('Shapers Configuration Panel initialized');
    console.log('Current configuration:', configPanel.config);
    console.log('Keyboard shortcuts:');
    console.log('  Ctrl/Cmd + S: Save configuration');
    console.log('  Ctrl/Cmd + D: Toggle theme');
});
