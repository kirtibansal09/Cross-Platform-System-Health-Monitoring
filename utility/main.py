import os
import platform
import json
import time
import requests
import uuid
import subprocess
import threading
import logging
from datetime import datetime

class SystemHealthMonitor:
    def __init__(self, api_endpoint, check_interval=900):  # 15 minutes default
        self.api_endpoint = api_endpoint
        self.check_interval = check_interval
        self.machine_id = self._get_machine_id()
        self.last_report = {}
        self.logger = self._setup_logging()
        
    def _setup_logging(self):
        # Create logs directory if it doesn't exist
        logs_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'logs')
        if not os.path.exists(logs_dir):
            os.makedirs(logs_dir)
            
        logger = logging.getLogger("SystemHealthMonitor")
        logger.setLevel(logging.INFO)
        
        # File handler for logs
        log_file = os.path.join(logs_dir, "health_monitor.log")
        handler = logging.FileHandler(log_file)
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
        handler.setFormatter(formatter)
        logger.addHandler(handler)
        
        # Add console handler for debugging
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)
        
        return logger
        
    def _get_machine_id(self):
        """Generate or retrieve a unique machine identifier."""
        # Determine the appropriate location for the ID file
        if platform.system() == "Windows":
            id_file = os.path.join(os.environ['LOCALAPPDATA'], 'SystemHealthMonitor', '.machine_id')
        else:  # macOS and Linux
            id_file = os.path.join(os.path.expanduser("~"), ".system_health_id")
        
        # Create directory if it doesn't exist
        id_dir = os.path.dirname(id_file)
        if not os.path.exists(id_dir):
            os.makedirs(id_dir)
        
        if os.path.exists(id_file):
            with open(id_file, 'r') as f:
                return f.read().strip()
        
        # Generate new ID if none exists
        machine_id = str(uuid.uuid4())
        try:
            with open(id_file, 'w') as f:
                f.write(machine_id)
        except Exception as e:
            self.logger.error(f"Failed to save machine ID: {e}")
            
        return machine_id
    
    def check_disk_encryption(self):
        """Check if disk encryption is enabled."""
        system = platform.system()
        
        if system == "Darwin":  # macOS
            try:
                result = subprocess.run(['diskutil', 'apfs', 'list'], capture_output=True, text=True)
                return "Encrypted" in result.stdout
            except Exception as e:
                self.logger.error(f"Failed to check disk encryption on macOS: {e}")
                return None
                
        elif system == "Windows":
            try:
                result = subprocess.run(['manage-bde', '-status'], capture_output=True, text=True)
                return "Protection On" in result.stdout
            except Exception as e:
                self.logger.error(f"Failed to check disk encryption on Windows: {e}")
                return None
                
        elif system == "Linux":
            try:
                result = subprocess.run(['lsblk', '-f'], capture_output=True, text=True)
                # Look for common encryption indicators like LUKS
                return "LUKS" in result.stdout or "crypto" in result.stdout
            except Exception as e:
                self.logger.error(f"Failed to check disk encryption on Linux: {e}")
                return None
                
        return None
    
    def check_os_updates(self):
        """Check if OS is up to date."""
        system = platform.system()
        
        if system == "Darwin":  # macOS
            try:
                result = subprocess.run(['softwareupdate', '-l'], capture_output=True, text=True)
                return "No new software available" in result.stdout
            except Exception as e:
                self.logger.error(f"Failed to check OS updates on macOS: {e}")
                return None
                
        elif system == "Windows":
            try:
                # Simplified check for demonstration - in production you might need a more reliable method
                # This PowerShell command might require additional permissions
                cmd = ["powershell", "-Command", 
                      "(New-Object -ComObject Microsoft.Update.AutoUpdate).Results.UpdateCount -eq 0"]
                result = subprocess.run(cmd, capture_output=True, text=True)
                return "True" in result.stdout
            except Exception as e:
                self.logger.error(f"Failed to check OS updates on Windows: {e}")
                return None
                
        elif system == "Linux":
            try:
                # First attempt apt-based systems (Ubuntu, Debian)
                try:
                    # Update package lists first
                    subprocess.run(['apt-get', 'update', '-qq'], capture_output=True, check=True, timeout=60)
                    result = subprocess.run(['apt-get', '-s', 'upgrade'], capture_output=True, text=True, check=True)
                    return "0 upgraded, 0 newly installed" in result.stdout
                except (subprocess.SubprocessError, subprocess.TimeoutExpired):
                    # Try yum-based systems (RedHat, CentOS)
                    result = subprocess.run(['yum', 'check-update', '--quiet'], capture_output=True)
                    # Return code 0 means no updates, 100 means updates available
                    return result.returncode == 0
            except Exception as e:
                self.logger.error(f"Failed to check OS updates on Linux: {e}")
                return None
                    
        return None
    
    def check_antivirus(self):
        """Check if antivirus is installed and active."""
        system = platform.system()
        
        if system == "Darwin":  # macOS
            # macOS has built-in XProtect
            return True
            
        elif system == "Windows":
            try:
                # Check Windows Security status
                cmd = ["powershell", "-Command", 
                      "Get-MpComputerStatus | Select-Object AntivirusEnabled -ExpandProperty AntivirusEnabled"]
                result = subprocess.run(cmd, capture_output=True, text=True)
                
                if "True" in result.stdout:
                    return True
                    
                # Check third-party AV using WMI
                cmd = ["powershell", "-Command", 
                      "Get-WmiObject -Namespace root/SecurityCenter2 -Class AntiVirusProduct | ForEach-Object { $_.displayName }"]
                result = subprocess.run(cmd, capture_output=True, text=True)
                
                return len(result.stdout.strip()) > 0
            except Exception as e:
                self.logger.error(f"Failed to check antivirus on Windows: {e}")
                return None
                
        elif system == "Linux":
            # Check for common Linux AV solutions
            try:
                av_checks = [
                    ['clamav', '--version'],
                    ['freshclam', '--version'],
                    ['rkhunter', '--version'],
                    ['chkrootkit', '--version']
                ]
                
                for cmd in av_checks:
                    try:
                        result = subprocess.run(cmd, capture_output=True, text=True)
                        if result.returncode == 0:
                            return True
                    except:
                        continue
                        
                return False
            except Exception as e:
                self.logger.error(f"Failed to check antivirus on Linux: {e}")
                return None
                
        return None
    
    def check_sleep_settings(self):
        """Check if inactivity sleep is set to ≤ 10 minutes."""
        system = platform.system()
        
        if system == "Darwin":  # macOS
            try:
                result = subprocess.run(['pmset', '-g'], capture_output=True, text=True)
                for line in result.stdout.split('\n'):
                    if 'displaysleep' in line:
                        minutes = int(line.split()[1])
                        return minutes <= 10
                return False
            except Exception as e:
                self.logger.error(f"Failed to check sleep settings on macOS: {e}")
                return None
                
        elif system == "Windows":
            try:
                # PowerShell command to check display sleep timeout (Windows 10+)
                cmd = ["powershell", "-Command", 
                      "(Get-ItemProperty -Path 'HKLM:\\SYSTEM\\CurrentControlSet\\Control\\Power\\PowerSettings\\238C9FA8-0AAD-41ED-83F4-97BE242C8F20\\7bc4a2f9-d8fc-4469-b07b-33eb785aaca0' -Name 'ACSettingIndex').ACSettingIndex / 60"]
                result = subprocess.run(cmd, capture_output=True, text=True)
                if result.stdout.strip():
                    minutes = float(result.stdout.strip())
                    return minutes <= 10
                return False
            except Exception as e:
                self.logger.error(f"Failed to check sleep settings on Windows: {e}")
                return None
                
        elif system == "Linux":
            try:
                # Try gsettings for GNOME
                result = subprocess.run(['gsettings', 'get', 'org.gnome.settings-daemon.plugins.power', 'sleep-inactive-ac-timeout'], capture_output=True, text=True)
                if result.returncode == 0:
                    seconds = int(result.stdout.strip())
                    return seconds <= 600  # 10 minutes in seconds
            except Exception:
                pass
                
            try:
                # Try xset for X11
                result = subprocess.run(['xset', 'q'], capture_output=True, text=True)
                for line in result.stdout.split('\n'):
                    if 'timeout:' in line and 'DPMS is' in line:
                        parts = line.split()
                        timeout_index = parts.index('timeout:') + 1
                        if timeout_index < len(parts):
                            seconds = int(parts[timeout_index])
                            return seconds <= 600  # 10 minutes in seconds
            except Exception as e:
                self.logger.error(f"Failed to check sleep settings on Linux: {e}")
                
            return None
                    
        return None
    
    def collect_system_data(self):
        """Collect all system health data."""
        self.logger.info("Collecting system health data...")
        
        data = {
            "machine_id": self.machine_id,
            "timestamp": datetime.now().isoformat(),
            "os_name": platform.system(),
            "os_version": platform.version(),
            "checks": {
                "disk_encryption": self.check_disk_encryption(),
                "os_updated": self.check_os_updates(),
                "antivirus_active": self.check_antivirus(),
                "sleep_settings_ok": self.check_sleep_settings()
            }
        }
        
        return data

    def should_report(self, current_data):
        """Determine if we should send a report based on changes."""
        # Always report if we haven't reported before
        if not self.last_report:
            return True
        
        # Check if any health check results have changed
        current_checks = current_data.get('checks', {})
        last_checks = self.last_report.get('checks', {})
        
        return current_checks != last_checks
    
    def send_report(self, data):
        """Send report to API endpoint."""
        try:
            self.logger.info(f"Sending report to API: {self.api_endpoint}")
            
            headers = {
                "Content-Type": "application/json",
                "User-Agent": f"SystemHealthMonitor/{platform.system()}"
            }
            
            self.logger.info(f"Request headers: {headers}")
            self.logger.info(f"Request data: {json.dumps(data)}")
            
            response = requests.post(self.api_endpoint, json=data, headers=headers)
            
            self.logger.info(f"API response: {response.status_code} - {response.text}")
            
            if response.status_code == 200:
                self.logger.info(f"Successfully reported to API: {response.status_code}")
                self.last_report = data
                return True
            else:
                self.logger.error(f"Failed to report to API: {response.status_code} - {response.text}")
                return False
                
        except requests.exceptions.ConnectionError as e:
            self.logger.error(f"Connection error while reporting to API: {e}")
            return False
        except Exception as e:
            self.logger.error(f"Exception while reporting to API: {e}")
            return False
    
    def run_periodic_check(self):
        """Run periodic health checks in the background."""
        while True:
            try:
                current_data = self.collect_system_data()
                
                if self.should_report(current_data):
                    self.logger.info("Changes detected, sending report")
                    self.send_report(current_data)
                else:
                    self.logger.info("No changes detected, skipping report")
                    
            except Exception as e:
                self.logger.error(f"Error in periodic check: {e}")
                
            time.sleep(self.check_interval)
    
    def start(self):
        """Start the monitoring daemon."""
        self.logger.info("Starting System Health Monitor")
        self.logger.info(f"Using API endpoint: {self.api_endpoint}")
        self.logger.info(f"Machine ID: {self.machine_id}")
        self.logger.info(f"Check interval: {self.check_interval} seconds")
        
        # Run initial check
        try:
            current_data = self.collect_system_data()
            self.send_report(current_data)
        except Exception as e:
            self.logger.error(f"Error in initial check: {e}")
        
        # Start background thread for periodic checks
        thread = threading.Thread(target=self.run_periodic_check, daemon=True)
        thread.start()
        
        return thread

# Main entry point
if __name__ == "__main__":
    # Configuration
    import argparse
    
    parser = argparse.ArgumentParser(description="System Health Monitor")
    parser.add_argument("--api", help="API endpoint URL")
    parser.add_argument("--interval", type=int, help="Check interval in seconds")
    parser.add_argument("--once", action="store_true", help="Run once and exit")
    parser.add_argument("--config", default="config.json", help="Path to config file")
    args = parser.parse_args()
    
    # Load config from file
    config_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), args.config)
    config = {}
    
    try:
        if os.path.exists(config_path):
            with open(config_path, 'r') as f:
                config = json.load(f)
    except Exception as e:
        print(f"Error loading config: {e}")
    
    # Command line args override config file
    api_endpoint = args.api or config.get('api_endpoint', "http://localhost:3000/api/health-reports")
    check_interval = args.interval or config.get('check_interval', 900)
    
    monitor = SystemHealthMonitor(api_endpoint, check_interval)
    
    if args.once:
        # Run once and exit
        data = monitor.collect_system_data()
        success = monitor.send_report(data)
        exit(0 if success else 1)
    else:
        # Run continuously
        thread = monitor.start()
        try:
            # Keep main thread alive
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("Shutting down...")
