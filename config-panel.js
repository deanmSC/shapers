// Configuration Panel JavaScript
// Handles theme toggling, configuration management, and persistence

class ConfigPanel {
    constructor() {
        this.config = this.loadConfig();
        this.initTheme();
        this.initEventListeners();
        this.loadFormValues();
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

        // Auto-save on input change (debounced)
        const inputs = document.querySelectorAll('input, select');
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
