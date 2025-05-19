import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [machines, setMachines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    os: '',
    showOnlyIssues: false
  });

  // API base URL - change this to your actual backend URL
  const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

  useEffect(() => {
    fetchMachines();
  }, [filters]);

  const fetchMachines = async () => {
    setLoading(true);
    try {
      // Build query string based on filters
      let url = `${API_BASE_URL}/machines`;
      
      // If using filter endpoint
      if (filters.os || filters.showOnlyIssues) {
        url = `${API_BASE_URL}/machines/filter?`;
        if (filters.os) {
          url += `os=${filters.os}&`;
        }
        if (filters.showOnlyIssues) {
          url += `issues=true`;
        }
      }
      
      console.log("Fetching from URL:", url);
      const response = await axios.get(url);
      setMachines(response.data);
      setError('');
    } catch (err) {
      console.error('Error fetching machines:', err);
      setError(`Failed to fetch data: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOsFilterChange = (e) => {
    setFilters({
      ...filters,
      os: e.target.value
    });
  };

  const handleIssuesFilterChange = (e) => {
    setFilters({
      ...filters,
      showOnlyIssues: e.target.checked
    });
  };

  const exportToCsv = async () => {
    try {
      window.open(`${API_BASE_URL}/export/csv`, '_blank');
    } catch (err) {
      console.error('Error exporting CSV:', err);
      setError(`Failed to export CSV: ${err.message}`);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  const getStatusIndicator = (status) => {
    if (status === true) return <span className="status-healthy">✓</span>;
    if (status === false) return <span style={{color: '#ef4444'}}>✗</span>;
    return <span className="status-unknown">?</span>;
  };

  const getOverallStatus = (machine) => {
    if (!machine.checks) return 'unknown';
    
    const { disk_encryption, os_updated, antivirus_active, sleep_settings_ok } = machine.checks;
    
    // If any check is false, machine has issues
    if (disk_encryption === false || os_updated === false || 
        antivirus_active === false || sleep_settings_ok === false) {
      return 'issues';
    }
    
    // If all checks are true, machine is healthy
    if (disk_encryption === true && os_updated === true && 
        antivirus_active === true && sleep_settings_ok === true) {
      return 'healthy';
    }
    
    // If any check is null or undefined, machine has unknown status
    return 'unknown';
  };

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-left">
          <svg className="app-logo" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
            <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12zm8.706-1.442c1.146-.573 2.437.463 2.126 1.706l-.709 2.836.042-.02a.75.75 0 01.67 1.34l-.04.022c-1.147.573-2.438-.463-2.127-1.706l.71-2.836-.042.02a.75.75 0 11-.671-1.34l.041-.022zM12 9a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
          </svg>
          <h1>System Health Dashboard</h1>
        </div>
        <button className="export-btn" onClick={exportToCsv}>
          Export to CSV
        </button>
      </header>
      
      <div className="controls">
        <div className="filter-group">
          <label htmlFor="os-filter">Filter by OS:</label>
          <select 
            id="os-filter" 
            value={filters.os} 
            onChange={handleOsFilterChange}
          >
            <option value="">All Operating Systems</option>
            <option value="Windows">Windows</option>
            <option value="Linux">Linux</option>
            <option value="Darwin">macOS</option>
          </select>
        </div>
        
        <div className="filter-group">
          <input 
            type="checkbox" 
            id="issues-filter" 
            checked={filters.showOnlyIssues} 
            onChange={handleIssuesFilterChange}
          />
          <label htmlFor="issues-filter">Show only machines with issues</label>
        </div>
      </div>
      
      {error && (
        <div className="error-message">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path fillRule="evenodd" d="M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z" clipRule="evenodd" />
          </svg>
          {error}
        </div>
      )}
      
      {loading ? (
        <div className="loading">
          <div className="loading-spinner"></div>
          Loading...
        </div>
      ) : (
        <div className="machines-container">
          <h2>Monitored Machines ({machines.length})</h2>
          
          {machines.length === 0 ? (
            <div className="no-machines">No machines found. Make sure the client utility is running.</div>
          ) : (
            <table className="machines-table">
              <thead>
                <tr>
                  <th>STATUS</th>
                  <th>MACHINE ID</th>
                  <th>OS</th>
                  <th>LAST CHECK-IN</th>
                  <th>DISK ENCRYPTION</th>
                  <th>OS UPDATED</th>
                  <th>ANTIVIRUS</th>
                  <th>SLEEP SETTINGS</th>
                </tr>
              </thead>
              <tbody>
                {machines.map((machine) => {
                  const status = getOverallStatus(machine);
                  
                  return (
                    <tr key={machine.machine_id} className={`status-${status}`}>
                      <td>
                        {status === 'healthy' ? 
                          <span className="status-healthy">✅</span> : 
                          status === 'issues' ? 
                          <span className="status-issues">⚠️</span> : 
                          <span className="status-unknown">❓</span>}
                      </td>
                      <td className="machine-id">
                        {machine.machine_id.substring(0, 8)}...
                      </td>
                      <td>{machine.os_name} {machine.os_version}</td>
                      <td>{formatDate(machine.timestamp)}</td>
                      <td>{getStatusIndicator(machine.checks.disk_encryption)}</td>
                      <td>{getStatusIndicator(machine.checks.os_updated)}</td>
                      <td>{getStatusIndicator(machine.checks.antivirus_active)}</td>
                      <td>{getStatusIndicator(machine.checks.sleep_settings_ok)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      )}
      
      <footer>
        <p>System Health Monitoring Dashboard</p>
      </footer>
    </div>
  );
}

export default App;


