#!/usr/bin/python3 -I
"""Root installed socket executor / unprivileged forced SSH command. No shell parsing."""
import fcntl
import os
from pathlib import Path
import re
import socket
import stat
import subprocess
import sys

REQUEST = re.compile(r"deploy (ghcr\.io/vamaral2020/opusto@sha256:[0-9a-f]{64}) ([0-9a-f]{40})\n?")
LIB = Path('/usr/local/libexec/opusto')
CONFIG = Path('/etc/opusto')
STATE = Path('/var/lib/opusto')
ENV = {'PATH': '/usr/sbin:/usr/bin:/sbin:/bin', 'HOME': '/root',
       'DOCKER_CONFIG': '/etc/opusto/registry', 'DEPLOY_DIR': str(STATE),
       'ENV_FILE': str(CONFIG / '.env'), 'BACKUP_ENV_FILE': str(CONFIG / '.env.backup'),
       'COMPOSE_FILE': str(CONFIG / 'compose.prod.yaml'),
       'BACKUP_SCRIPT': str(LIB / 'backup.sh')}


def parse_request(value):
    match = REQUEST.fullmatch(value)
    if not match:
        raise ValueError('invalid request')
    return match.groups()


def trusted(path, private=False):
    """Reject symlinks and writable ancestors, including a writable installation parent."""
    path = Path(path)
    for item in (*reversed(path.parents), path):
        info = item.lstat()
        if stat.S_ISLNK(info.st_mode) or info.st_uid != 0 or info.st_mode & 0o022:
            raise ValueError('unsafe privileged path')
    if private and path.stat().st_mode & 0o077:
        raise ValueError('unsafe secret permissions')


def execute(request):
    image, revision = parse_request(request)
    for path in (LIB / 'deploy-gateway.py', LIB / 'deploy.sh', LIB / 'backup.sh',
                 CONFIG / 'compose.prod.yaml', STATE, CONFIG / 'registry'):
        trusted(path)
    for path in (CONFIG / '.env', CONFIG / '.env.backup'):
        trusted(path, private=True)
    for path in (*CONFIG.rglob('*'), *LIB.rglob('*')):
        trusted(path, private=path.is_file() and str(path).startswith(str(CONFIG)))
    # Only root-created state files may be followed or overwritten by the shell executor.
    for path in STATE.rglob('*'):
        trusted(path)
    with open(STATE / 'deploy.lock', 'a', encoding='ascii') as lock:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        # Never return Docker/Compose output to the CI identity (it can contain secrets).
        print('OpusTO deploy accepted: ' + revision, file=sys.stderr, flush=True)
        result = subprocess.run(['/bin/sh', str(LIB / 'deploy.sh'), image, revision],
                                cwd=STATE, env=ENV, stdin=subprocess.DEVNULL, stdout=subprocess.DEVNULL,
                                stderr=subprocess.DEVNULL, timeout=1200, check=False)
        print('OpusTO deploy ' + ('completed' if result.returncode == 0 else 'failed'), file=sys.stderr, flush=True)
        return result.returncode == 0


def main():
    try:
        if len(sys.argv) != 2:
            raise ValueError('invalid mode')
        if sys.argv[1] == 'client':
            request = os.environ.get('SSH_ORIGINAL_COMMAND', '')
            parse_request(request)
            with socket.socket(socket.AF_UNIX, socket.SOCK_STREAM) as connection:
                connection.settimeout(1250)
                connection.connect('/run/opusto-deploy.sock')
                connection.sendall(request.rstrip('\n').encode('ascii') + b'\n')
                connection.shutdown(socket.SHUT_WR)
                response = b''
                while not response.endswith(b'\n') and len(response) < 128:
                    chunk = connection.recv(128 - len(response))
                    if not chunk:
                        break
                    response += chunk
                ok = response == b'OK\n'
        elif sys.argv[1] == 'server' and os.getuid() == 0:
            # systemd Accept=yes supplies one connected socket on stdin.
            with socket.fromfd(0, socket.AF_UNIX, socket.SOCK_STREAM) as connection:
                connection.settimeout(5)
                data = b''
                while not data.endswith(b'\n') and len(data) <= 256:
                    chunk = connection.recv(257 - len(data))
                    if not chunk:
                        break
                    data += chunk
                ok = execute(data.decode('ascii'))
        else:
            raise ValueError('invalid mode')
    except (OSError, ValueError, subprocess.SubprocessError):
        ok = False
    print('OK' if ok else 'FAILED', flush=True)
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
