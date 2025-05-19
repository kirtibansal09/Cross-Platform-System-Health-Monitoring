# System Health Monitor Dashboard

React-based frontend for the system health monitoring solution.

## Features

- Real-time display of system health status across multiple machines
- Filtering by OS type
- Option to show only machines with issues
- Export data to CSV
- Visual indicators for health check status

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Configure the backend API endpoint:
   - Create a .env file with:
     ```
     REACT_APP_API_URL=http://localhost:3000/api
     ```

3. Start the development server:
   ```
   npm start
   ```

## Building for Production

```
npm run build
```

This creates optimized files in the `build` folder that can be deployed to any static hosting service.

## Customization

- Edit `src/config.js` to adjust dashboard settings
- Modify theme colors in `src/styles/theme.js`
- Add additional health checks by updating the relevant components

## Browser Compatibility

Tested and working in:
- Chrome (latest)
- Firefox (latest)
- Edge (latest)
- Safari (latest)

