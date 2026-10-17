"""Run ONLY inside the disposable Ubuntu image; never against the VPS."""
from pathlib import Path
import fcntl
import os
import socket
import subprocess
import threading
import time


def run(args, **kwargs):
    return subprocess.run(args, capture_output=True, text=True, **kwargs)


def denied(args):
    result = run(['/usr/sbin/runuser', '-u', 'opusto-ci', '--', *args])
    assert result.returncode != 0, (args, result.stdout)


Path('/etc/opusto/.env').write_text('APP_PORT=3000\nBACKUP_REQUIRED=false\n')
Path('/etc/opusto/.env.backup').write_text('RESTIC_PASSWORD=fake-test-only\n')
os.chmod('/etc/opusto/.env', 0o600)
os.chmod('/etc/opusto/.env.backup', 0o600)
assert run(['id', '-Gn', 'opusto-ci']).stdout.strip() == 'opusto-ci'
# Reinstallation is safe; suspicious existing privileges are never silently retained.
assert run(['/bin/bash', '/reviewed/ops/security/install-reviewed.sh', '--install-reviewed']).returncode == 0
subprocess.run(['usermod', '-aG', 'sudo', 'opusto-ci'], check=True)
assert run(['/bin/bash', '/reviewed/ops/security/install-reviewed.sh', '--install-reviewed']).returncode != 0
subprocess.run(['usermod', '-G', '', 'opusto-ci'], check=True)
denied(['/usr/bin/sudo', '-n', '/bin/sh', '-c', 'id'])
for target in ['/etc/opusto/.env', '/etc/opusto/.env.backup', '/etc/opusto/registry', '/root']:
    denied(['test', '-r', target])
for target in ['/usr/local', '/usr/local/libexec', '/usr/local/libexec/opusto', '/usr/local/libexec/opusto/backup.sh', '/etc/opusto', '/etc/opusto/compose.prod.yaml', '/var/lib/opusto', '/var/empty/opusto-ci', '/etc/ssh/authorized_keys']:
    denied(['test', '-w', target])
denied(['touch', '/usr/local/libexec/opusto/replacement'])
denied(['mv', '/usr/local/libexec/opusto', '/usr/local/libexec/stolen'])
denied(['sh', '-c', 'echo stolen > /etc/opusto/compose.prod.yaml'])
# A fake Docker socket proves CI has no permission to connect; never mount host Docker.
with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as docker:
    docker.bind('/run/docker.sock')
    os.chmod('/run/docker.sock', 0o600)
    denied(['python3', '-c', "import socket;s=socket.socket(socket.AF_UNIX);s.connect('/run/docker.sock')"])
Path('/run/docker.sock').unlink()
Path('/run/sshd').mkdir(exist_ok=True)
subprocess.run(['ssh-keygen', '-A'], check=True, stdout=subprocess.DEVNULL)
config = run(['/usr/sbin/sshd', '-T', '-C', 'user=opusto-ci,host=localhost,addr=127.0.0.1'])
assert config.returncode == 0, config.stderr
for setting in ['disableforwarding yes', 'permittty no', 'permituserrc no', 'passwordauthentication no', 'authorizedkeysfile /etc/ssh/authorized_keys/opusto-ci', 'forcecommand /usr/bin/python3 -I /usr/local/libexec/opusto/deploy-gateway.py client']:
    assert setting in config.stdout, setting
# Real IPC, forced command parser and privileged executor with isolated fake tools.
for name, content in {
    'docker': '#!/bin/sh\n[ /dev/null -ef /proc/self/fd/0 ] || exit 99\necho "$*" >> /var/lib/opusto/calls\ncase "$*" in *revision*) echo bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb;; *source*) echo https://github.com/vamaral2020/opusto;; inspect*) echo ghcr.io/vamaral2020/opusto@sha256:' + 'c' * 64 + ';; esac\n',
    'curl': '#!/bin/sh\nexit 0\n',
}.items():
    tool = Path('/usr/bin') / name
    tool.write_text(content)
    tool.chmod(0o755)
# Authenticate through real sshd as the provisioned CI identity, with an ephemeral key.
subprocess.run(['ssh-keygen', '-q', '-t', 'ed25519', '-N', '', '-f', '/root/ci-test-key'], check=True)
Path('/etc/ssh/authorized_keys/opusto-ci').write_text('restrict ' + Path('/root/ci-test-key.pub').read_text())
os.chmod('/etc/ssh/authorized_keys/opusto-ci', 0o644)
sshd = subprocess.Popen(['/usr/sbin/sshd', '-D', '-e', '-p', '2222', '-o', 'ListenAddress=127.0.0.1'], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
for attempt in range(40):
    try:
        with socket.create_connection(('127.0.0.1', 2222), timeout=0.1):
            break
    except OSError:
        time.sleep(0.05)
else:
    raise AssertionError('Test sshd did not start')
SSH = ['/usr/bin/ssh', '-F', '/dev/null', '-n', '-p', '2222', '-i', '/root/ci-test-key',
       '-o', 'BatchMode=yes', '-o', 'IdentitiesOnly=yes', '-o', 'StrictHostKeyChecking=accept-new',
       '-o', 'UserKnownHostsFile=/root/ci-test-known-hosts', 'opusto-ci@127.0.0.1']
request = 'deploy ghcr.io/vamaral2020/opusto@sha256:' + 'a' * 64 + ' ' + 'b' * 40

def exchange(value, remote=False):
    with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as listener:
        listener.bind('/run/opusto-deploy.sock')
        os.chown('/run/opusto-deploy.sock', 0, __import__('grp').getgrnam('opusto-ci').gr_gid)
        os.chmod('/run/opusto-deploy.sock', 0o660)
        listener.listen()
        processes = []
        def serve():
            connection, _ = listener.accept()
            with connection:
                processes.append(subprocess.run(['/usr/bin/python3', '-I', '/usr/local/libexec/opusto/deploy-gateway.py', 'server'], stdin=connection, stdout=connection, stderr=subprocess.PIPE))
        thread = threading.Thread(target=serve, daemon=True)
        thread.start()
        result = run([*SSH, value] if remote else ['/usr/sbin/runuser', '-u', 'opusto-ci', '--', '/usr/bin/env', 'SSH_ORIGINAL_COMMAND=' + value, 'ENV_FILE=/attacker', 'PATH=/attacker', '/usr/bin/python3', '-I', '/usr/local/libexec/opusto/deploy-gateway.py', 'client'])
        thread.join(timeout=30)
        assert not thread.is_alive()
    Path('/run/opusto-deploy.sock').unlink()
    return result

assert exchange(request, remote=True).returncode == 0
calls = Path('/var/lib/opusto/calls').read_text()
assert 'pull app migrate' in calls and '--profile operations run --rm migrate' in calls
assert '/etc/opusto/compose.prod.yaml' in calls and '/attacker' not in calls
assert 'down' not in calls and 'prune' not in calls
# A concurrent request cannot enter the deployment while its root lock is held.
with open('/var/lib/opusto/deploy.lock', 'a') as lock:
    fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    assert exchange(request).returncode != 0
assert Path('/var/lib/opusto/calls').read_text() == calls
# Failed readiness restores the prior app but still reports failure.
Path('/usr/bin/curl').write_text('#!/bin/sh\nexit 1\n')
Path('/usr/bin/sleep').write_text('#!/bin/sh\nexit 0\n')
Path('/usr/bin/sleep').chmod(0o755)
assert exchange(request).returncode != 0
failed_calls = Path('/var/lib/opusto/calls').read_text()[len(calls):]
assert failed_calls.count('up -d --no-deps app') == 2
# Failed migration never starts the new application and never reports success.
Path('/usr/bin/docker').write_text('#!/bin/sh\n[ /dev/null -ef /proc/self/fd/0 ] || exit 99\necho "$*" >> /var/lib/opusto/calls\ncase "$*" in *revision*) echo bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb;; *source*) echo https://github.com/vamaral2020/opusto;; *"run --rm migrate"*) echo fake-secret >&2; exit 1;; esac\n')
before = Path('/var/lib/opusto/calls').read_text()
result = exchange(request)
assert result.returncode != 0 and 'fake-secret' not in result.stdout + result.stderr
assert 'up -d --no-deps app' not in Path('/var/lib/opusto/calls').read_text()[len(before):]
calls = Path('/var/lib/opusto/calls').read_text()
# Source/revision mismatch fails before migrations or application replacement.
Path('/usr/bin/docker').write_text('#!/bin/sh\n[ /dev/null -ef /proc/self/fd/0 ] || exit 99\necho "$*" >> /var/lib/opusto/calls\ncase "$*" in *revision*) echo wrong-revision;; *source*) echo https://github.com/vamaral2020/opusto;; esac\n')
before = Path('/var/lib/opusto/calls').read_text()
assert exchange(request).returncode != 0
assert 'run --rm migrate' not in Path('/var/lib/opusto/calls').read_text()[len(before):]
calls = Path('/var/lib/opusto/calls').read_text()
# Tampering with an ancestor causes fail closed BEFORE calling Docker.
os.chmod('/usr/local/libexec', 0o777)
assert exchange(request).returncode != 0
assert Path('/var/lib/opusto/calls').read_text() == calls
os.chmod('/usr/local/libexec', 0o755)
for value in ['id', 'scp -t /etc/opusto', request + '; cat /etc/opusto/.env', 'rollback']:
    result = run(['/usr/sbin/runuser', '-u', 'opusto-ci', '--', '/usr/bin/env', 'SSH_ORIGINAL_COMMAND=' + value, '/usr/bin/python3', '-I', '/usr/local/libexec/opusto/deploy-gateway.py', 'client'])
    assert result.returncode != 0 and 'fake-test-only' not in result.stdout
for value in ['id', 'cat /etc/opusto/.env', 'scp -t /etc/opusto', 'internal-sftp']:
    result = run([*SSH, value])
    assert result.returncode != 0 and 'FAILED' in result.stdout
# Direct TCP forwarding is refused by the server.
result = run([*SSH[:-1], '-W', '127.0.0.1:2222', SSH[-1]])
assert result.returncode != 0 and 'administratively prohibited' in result.stderr
sshd.terminate()
sshd.wait(timeout=5)
# No daemon reload/start happens in installation. Validate unit syntax offline.
units = run(['systemd-analyze', 'verify', '/etc/systemd/system/opusto-deploy.socket', '/etc/systemd/system/opusto-deploy@.service', '/etc/systemd/system/opusto-backup.service', '/etc/systemd/system/opusto-monitor.service'])
# Docker unit is intentionally absent from this isolated image.
assert all('docker.service' in line or not line for line in units.stderr.splitlines()), units.stderr
print('Linux isolation: permissions, sudo denial, Docker denial, SSH policy and real deploy IPC passed')
