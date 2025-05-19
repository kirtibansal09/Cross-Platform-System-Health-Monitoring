# System Health Monitor Utility

Cross-platform Python utility that collects system health data and reports to central server.

## Features

- Runs on Windows, macOS, and Linux
- Monitors key security settings:
  - Disk encryption status
  - OS update status
  - Antivirus presence
  - Sleep/screen lock settings
- Sends reports only when changes are detected
- Configurable check intervals
- Unique machine identification

## Setup

1. Create virtual environment:
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Configure the API endpoint in config.json:
   ```json
   {
     "api_endpoint": "http://your-server:3000/api/health-reports",
     "check_interval": 900
   }
   ```

4. Run the utility:
   ```
   python src/main.py
   ```

## Building Executables

```
pyinstaller --onefile src/main.py
```

## Running as a Service

### Windows
Use NSSM (Non-Sucking Service Manager) or Windows Task Scheduler

### Linux
Create a systemd service file

### macOS
Create a LaunchAgent plist file

## Troubleshooting

Check logs in the `logs` directory for detailed error information.
