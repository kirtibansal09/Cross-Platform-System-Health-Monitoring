const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const morgan = require('morgan');
const { createObjectCsvWriter } = require('csv-writer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/system-health-monitor';

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Define Schema
const healthReportSchema = new mongoose.Schema({
  machine_id: {
    type: String,
    required: true,
    index: true
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true
  },
  os_name: String,
  os_version: String,
  checks: {
    disk_encryption: Boolean,
    os_updated: Boolean,
    antivirus_active: Boolean,
    sleep_settings_ok: Boolean
  }
});

const HealthReport = mongoose.model('HealthReport', healthReportSchema);

// API Routes
const apiRouter = express.Router();

// Report health data (from client utility)
apiRouter.post('/health-reports', async (req, res) => {
  try {
    const reportData = req.body;
    
    // Validate required fields
    if (!reportData.machine_id || !reportData.checks) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Convert timestamp string to Date if needed
    if (typeof reportData.timestamp === 'string') {
      reportData.timestamp = new Date(reportData.timestamp);
    }
    
    const newReport = new HealthReport(reportData);
    await newReport.save();
    
    res.status(200).json({ success: true, message: 'Report received' });
  } catch (error) {
    console.error('Error saving report:', error);
    res.status(500).json({ error: 'Failed to save report' });
  }
});

// Get all machines with their latest report
apiRouter.get('/machines', async (req, res) => {
  try {
    // MongoDB aggregation to get latest report for each machine
    const machines = await HealthReport.aggregate([
      { 
        $sort: { machine_id: 1, timestamp: -1 } 
      },
      { 
        $group: {
          _id: '$machine_id',
          latestReport: { $first: '$$ROOT' }
        } 
      },
      {
        $replaceRoot: { newRoot: '$latestReport' }
      }
    ]);
    
    res.status(200).json(machines);
  } catch (error) {
    console.error('Error fetching machines:', error);
    res.status(500).json({ error: 'Failed to fetch machines' });
  }
});

// Get reports for a specific machine
apiRouter.get('/machines/:machineId/reports', async (req, res) => {
  try {
    const { machineId } = req.params;
    const reports = await HealthReport.find({ machine_id: machineId })
      .sort({ timestamp: -1 })
      .limit(50);
    
    res.status(200).json(reports);
  } catch (error) {
    console.error(`Error fetching reports for machine ${req.params.machineId}:`, error);
    res.status(500).json({ error: 'Failed to fetch reports' });
  }
});

// Filter machines by criteria
apiRouter.get('/machines/filter', async (req, res) => {
  try {
    const { os, issues } = req.query;
    const filter = {};
    
    // Apply OS filter
    if (os) {
      filter.os_name = os;
    }
    
    // Apply issues filter
    if (issues === 'true') {
      filter.$or = [
        { 'checks.disk_encryption': false },
        { 'checks.os_updated': false },
        { 'checks.antivirus_active': false },
        { 'checks.sleep_settings_ok': false }
      ];
    }
    
    const machines = await HealthReport.find(filter)
      .sort({ timestamp: -1 });
    
    res.status(200).json(machines);
  } catch (error) {
    console.error('Error filtering machines:', error);
    res.status(500).json({ error: 'Failed to filter machines' });
  }
});

// Export machine data as CSV
apiRouter.get('/export/csv', async (req, res) => {
  try {
    // Get latest report for each machine
    const machines = await HealthReport.aggregate([
      { 
        $sort: { machine_id: 1, timestamp: -1 } 
      },
      { 
        $group: {
          _id: '$machine_id',
          latestReport: { $first: '$$ROOT' }
        } 
      },
      {
        $replaceRoot: { newRoot: '$latestReport' }
      }
    ]);
    
    // Create CSV file
    const csvFilePath = path.join(__dirname, 'temp', 'machines_export.csv');
    
    // Ensure temp directory exists
    if (!fs.existsSync(path.join(__dirname, 'temp'))) {
      fs.mkdirSync(path.join(__dirname, 'temp'));
    }
    
    const csvWriter = createObjectCsvWriter({
      path: csvFilePath,
      header: [
        { id: 'machine_id', title: 'Machine ID' },
        { id: 'timestamp', title: 'Last Report' },
        { id: 'os_name', title: 'OS' },
        { id: 'os_version', title: 'OS Version' },
        { id: 'disk_encryption', title: 'Disk Encrypted' },
        { id: 'os_updated', title: 'OS Updated' },
        { id: 'antivirus_active', title: 'Antivirus Active' },
        { id: 'sleep_settings_ok', title: 'Sleep Settings OK' }
      ]
    });
    
    // Format data for CSV
    const csvData = machines.map(machine => ({
      machine_id: machine.machine_id,
      timestamp: machine.timestamp,
      os_name: machine.os_name,
      os_version: machine.os_version,
      disk_encryption: machine.checks.disk_encryption,
      os_updated: machine.checks.os_updated,
      antivirus_active: machine.checks.antivirus_active,
      sleep_settings_ok: machine.checks.sleep_settings_ok
    }));
    
    await csvWriter.writeRecords(csvData);
    
    // Send file
    res.download(csvFilePath, 'system_health_report.csv', (err) => {
      // Delete the temporary file after sending
      if (fs.existsSync(csvFilePath)) {
        fs.unlinkSync(csvFilePath);
      }
      
      if (err) {
        console.error('Error sending CSV:', err);
      }
    });
  } catch (error) {
    console.error('Error exporting CSV:', error);
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

// Mount the API router
app.use('/api', apiRouter);

// Serve static frontend files (if you want to serve the dashboard from the same server)
app.use(express.static(path.join(__dirname, 'public')));

// Default route for API to verify it's working
app.get('/', (req, res) => {
  res.json({ message: 'System Health Monitoring API is running' });
});

// Handle 404 errors
app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;