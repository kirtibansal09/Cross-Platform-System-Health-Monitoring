# System Health Monitor Backend

Express/Node.js backend API for the system health monitoring solution.

## Features

- RESTful API for receiving and managing system health reports
- MongoDB storage for historical data
- Filtering and querying capabilities
- CSV export functionality
- Cross-origin resource sharing (CORS) support

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Configure environment variables:
   - Copy .env.example to .env
   - Adjust settings as needed:
     ```
     PORT=3000
     MONGODB_URI=mongodb://localhost:27017/system-health-monitor
     ```

3. Start the server:
   ```
   npm run dev
   ```

## API Endpoints

- `POST /api/health-reports` - Receive health reports from clients
- `GET /api/machines` - List all machines
- `GET /api/machines/:machineId` - Get specific machine details
- `GET /api/export/csv` - Export machine data as CSV

## Database Schema

### Machine Report
```
{
  machine_id: String,
  timestamp: Date,
  os_name: String,
  os_version: String,
  checks: {
    disk_encryption: Boolean,
    os_updated: Boolean,
    antivirus_active: Boolean,
    sleep_settings_ok: Boolean
  }
}
```

## Deployment

For production deployment:
1. Set NODE_ENV=production
2. Use a process manager like PM2
3. Set up proper MongoDB authentication
