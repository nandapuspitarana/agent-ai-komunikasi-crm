import paramiko
import time
import sys
import codecs

# Fix charmap encode error for windows
sys.stdout.reconfigure(encoding='utf-8')

host = "192.168.20.242"
username = "nanda"
password = "Sinau314"
path = "/opt/agent-ai-komunikasi-crm"

try:
    print(f"Connecting to {host}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(host, username=username, password=password, timeout=10)
    print("Connected successfully!")
    
    # Upload modified files
    sftp = ssh.open_sftp()
    
    # page.tsx
    sftp.put("src/app/[lang]/(dashboard)/agent/builder/page.tsx", "/tmp/page.tsx")
    
    # Providers.tsx
    sftp.put("src/components/Providers.tsx", "/tmp/Providers.tsx")
    
    sftp.close()
    print("Upload complete!")
    
    # Run commands
    commands = [
        f"echo {password} | sudo -S sh -c \"mv /tmp/page.tsx {path}/src/app/[lang]/(dashboard)/agent/builder/page.tsx\"",
        f"echo {password} | sudo -S sh -c \"mv /tmp/Providers.tsx {path}/src/components/Providers.tsx\"",
        f"echo {password} | sudo -S sh -c \"cd {path} && docker compose build web --no-cache\"",
        f"echo {password} | sudo -S sh -c \"cd {path} && docker compose up -d web\""
    ]
    
    for cmd in commands:
        print(f"Running: {cmd}")
        stdin, stdout, stderr = ssh.exec_command(cmd)
        
        # Read output line by line as it comes
        for line in iter(stdout.readline, ""):
            print(line, end="")
            
        err = stderr.read().decode('utf-8')
        if err:
            print("STDERR:", err)
            
        status = stdout.channel.recv_exit_status()
        print(f"Exit status: {status}\n")
        
except Exception as e:
    print(f"Error: {e}")
finally:
    ssh.close()
    print("Connection closed.")
