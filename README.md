# System Health Monitoring Solution

A cross-platform utility and dashboard for monitoring system health across multiple machines.

## Components

1. **System Utility**: Cross-platform Python utility to collect system health data
2. **Backend API**: Node.js/Express server with MongoDB for data storage
3. **Admin Dashboard**: React-based web interface for monitoring system health

## Features

- Cross-platform monitoring (Windows, macOS, Linux)
- Checks for disk encryption, OS updates, antivirus status, and sleep settings
- Centralized dashboard for monitoring multiple machines
- Data export capabilities (CSV)
- Filtering by OS type and issue status

## Setup Instructions

See individual component READMEs for detailed setup instructions:
- [Utility README](utility/README.md)
- [Backend README](backend/README.md)
- [Frontend README](system-health-frontend/README.md)

## Architecture

The system uses a client-server architecture:
1. Python clients run on monitored machines and send reports to the central server
2. Express.js backend receives, processes, and stores the reports
3. React frontend displays the data in a user-friendly dashboard

## License

MIT
