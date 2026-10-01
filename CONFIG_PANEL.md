# Configuration Panel Documentation

## Overview

The Shapers Configuration Panel is a web-based interface for managing configuration settings for the Shapers library. It features a modern, responsive design with light and dark theme support.

## Features

### 🎨 Theme Toggle
- **Light Mode**: Clean, bright interface for daytime use
- **Dark Mode**: Easy on the eyes for low-light environments
- **Persistent**: Theme preference is saved in browser localStorage
- **Keyboard Shortcut**: `Ctrl/Cmd + D` to toggle theme

### ⚙️ Configuration Sections

#### 1. Circle Fitting Parameters
Configure parameters for circle fitting algorithms:
- **Fitting Method**: Choose between Taubin SVD, Geometrical, or Least Squares (LSQ)
- **Precision**: Set the precision for optimization (default: 1e-4)
- **Max Iterations**: Maximum number of iterations for optimization
- **Optimizer**: Select optimizer for LSQ method (L-BFGS, Nelder-Mead, Gradient Descent)

#### 2. Ellipsoid Intersection Parameters
Configure parameters for ellipsoid intersection checks:
- **Tolerance**: Set the tolerance for intersection calculations (default: 1e-6)
- **Max Iterations**: Maximum iterations for intersection check

#### 3. Database Configuration
Configure PostgreSQL database connection:
- **Host**: Database server hostname
- **Port**: Database server port (default: 5432)
- **Database Name**: Name of the database
- **User**: Database username
- **Password**: Database password (stored securely in localStorage)
- **Connection Pool Size**: Maximum number of connections in the pool (default: 16)

### 💾 Configuration Management

#### Save Configuration
- Click "Save Configuration" button or use `Ctrl/Cmd + S`
- Configuration is saved to browser localStorage
- Auto-save feature: Changes are automatically saved after 1 second of inactivity

#### Reset to Defaults
- Click "Reset to Defaults" button
- Restores all settings to their default values
- Requires confirmation to prevent accidental resets

#### Export Configuration
- Click "Export Config" button
- Downloads configuration as a JSON file (`shapers-config.json`)
- Can be used for backup or sharing configurations

## Usage

### Opening the Panel

1. Open `config-panel.html` in a web browser
2. The panel will load with default or previously saved settings

### Changing Settings

1. Modify any field in the configuration panel
2. Changes are automatically saved after 1 second
3. Or click "Save Configuration" to save immediately

### Switching Themes

**Method 1**: Click the theme toggle switch at the top of the panel
**Method 2**: Use keyboard shortcut `Ctrl/Cmd + D`

The theme preference is saved and will be remembered on your next visit.

## Keyboard Shortcuts

- `Ctrl/Cmd + S`: Save configuration
- `Ctrl/Cmd + D`: Toggle light/dark theme

## Technical Details

### Browser Compatibility
- Modern browsers (Chrome, Firefox, Safari, Edge)
- Requires JavaScript enabled
- Uses localStorage for persistence

### Data Storage
All configuration data is stored locally in the browser using localStorage:
- `theme`: Current theme preference ('light' or 'dark')
- `shapersConfig`: JSON object containing all configuration settings

### Files
- `config-panel.html`: Main HTML structure
- `config-panel.css`: Styling for both light and dark themes
- `config-panel.js`: JavaScript functionality and logic

## Code Generation

When you save a configuration, the panel automatically generates code examples in the browser console:

### Python Example
```python
import shapers as shs

# Circle Fitting Parameters
parameters = shs.FitCircleParams()
parameters.method = "lbfgs"
parameters.precision = 0.0001
parameters.max_iterations = 100

# Fit circle
x_center, y_center = shs.taubin_svd(x_values, y_values, parameters)
```

### Rust Example
```rust
use shapers::db::{DbConfig, DbPool};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let config = DbConfig::new()
        .with_host("localhost")
        .with_port(5432)
        .with_dbname("postgres")
        .with_user("postgres")
        .with_password("password")
        .with_max_pool_size(16);

    let pool = DbPool::new(config).await?;
    Ok(())
}
```

## Default Configuration

```json
{
  "circleFitting": {
    "method": "taubin_svd",
    "precision": 0.0001,
    "maxIterations": 100,
    "optimizer": "lbfgs"
  },
  "ellipsoidIntersection": {
    "tolerance": 0.000001,
    "maxIterations": 100
  },
  "database": {
    "host": "localhost",
    "port": 5432,
    "dbname": "postgres",
    "user": "postgres",
    "password": "",
    "poolSize": 16
  }
}
```

## Validation

The panel includes validation for:
- Precision must be greater than 0
- Max iterations must be at least 1
- Database port must be between 1 and 65535
- Pool size must be between 1 and 100

Invalid values will show an error message.

## Responsive Design

The configuration panel is fully responsive and works on:
- Desktop computers
- Tablets
- Mobile phones

The layout automatically adjusts for smaller screens.

## Accessibility

- Proper ARIA labels for screen readers
- Keyboard navigation support
- High contrast in both light and dark modes
- Focus indicators for interactive elements

## Security Notes

⚠️ **Important**: 
- Database passwords are stored in browser localStorage
- This is suitable for development/testing only
- For production use, implement proper secret management
- Never commit configuration files with real passwords to version control

## Troubleshooting

### Configuration not saving
- Check browser console for errors
- Ensure localStorage is enabled in your browser
- Try clearing browser cache and reloading

### Theme not persisting
- Check if localStorage is enabled
- Some browsers in private/incognito mode may not persist localStorage

### Styles not loading
- Ensure `config-panel.css` is in the same directory as `config-panel.html`
- Check browser console for 404 errors

## Future Enhancements

Potential features for future versions:
- Import configuration from JSON file
- Multiple configuration profiles
- Configuration validation against schema
- Integration with Shapers library API
- Real-time preview of settings
- Configuration templates

## Support

For issues or questions:
- GitHub: [https://github.com/borgesaugusto/shapers](https://github.com/borgesaugusto/shapers)
- Check browser console for debug information
- Use `window.configPanel` in console to inspect current state

## License

This configuration panel is part of the Shapers project and follows the same license.
