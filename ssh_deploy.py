import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8')

host = "192.168.20.242"
username = "nanda"
password = "Sinau314"
path = "/opt/agent-ai-komunikasi-crm"

files_to_upload = [
    ("src/app/[lang]/(dashboard)/agent/builder/page.tsx", "/tmp/page_builder.tsx"),
    ("src/components/Providers.tsx", "/tmp/Providers.tsx"),
]

try:
    print(f"Connecting to {host}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(host, username=username, password=password, timeout=10)
    print("Connected successfully!")

    # Upload all modified files to /tmp
    sftp = ssh.open_sftp()
    for local_file, remote_tmp in files_to_upload:
        print(f"Uploading {local_file} ...")
        sftp.put(local_file, remote_tmp)
    sftp.close()
    print("All files uploaded to /tmp!")

    # Move files to correct locations with sudo
    move_cmds = [
        f"echo {password} | sudo -S mv /tmp/page_builder.tsx \"{path}/src/app/[lang]/(dashboard)/agent/builder/page.tsx\"",
        f"echo {password} | sudo -S mv /tmp/Providers.tsx \"{path}/src/components/Providers.tsx\"",
    ]

    print("\n--- Moving files into place ---")
    for cmd in move_cmds:
        stdin, stdout, stderr = ssh.exec_command(cmd)
        stdout.channel.recv_exit_status()
        err = stderr.read().decode('utf-8', errors='replace')
        if err and 'password' not in err.lower():
            print(f"STDERR: {err}")

    # Build and restart
    print("\n--- Building Docker image ---")
    build_cmd = f"echo {password} | sudo -S sh -c 'cd {path} && docker compose build web --no-cache 2>&1'"
    stdin, stdout, stderr = ssh.exec_command(build_cmd, get_pty=False)
    for line in iter(lambda: stdout.readline(2048), ""):
        print(line, end="", flush=True)
    status = stdout.channel.recv_exit_status()
    print(f"\nBuild exit status: {status}")

    print("\n--- Restarting container ---")
    up_cmd = f"echo {password} | sudo -S sh -c 'cd {path} && docker compose up -d web 2>&1'"
    stdin, stdout, stderr = ssh.exec_command(up_cmd)
    print(stdout.read().decode('utf-8', errors='replace'))
    print(f"STDERR: {stderr.read().decode('utf-8', errors='replace')}")

    print("\nDone! Container restarted successfully.")

except Exception as e:
    print(f"Error: {e}")
finally:
    try:
        ssh.close()
    except:
        pass
    print("Connection closed.")
