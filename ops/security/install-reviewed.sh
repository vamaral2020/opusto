#!/usr/bin/env bash
# OFFLINE installer: only a human administrator may run this after approval.
# Does not activate services, reload SSH, copy credentials, or touch the application.
set -euo pipefail
umask 077
[[ ${1:-} == --install-reviewed && $# == 1 && $EUID == 0 ]] || {
  echo 'Usage (administrator only): install-reviewed.sh --install-reviewed' >&2; exit 1;
}
SOURCE=$(cd -- "$(dirname -- "$0")/../.." && pwd -P)
# Installing root code from an editable checkout would recreate the vulnerability.
/usr/bin/python3 -I - "$SOURCE" <<'CHECK'
import pathlib, stat, sys
root = pathlib.Path(sys.argv[1])
for entry in [*root.parents, root, *root.rglob('*')]:
    info = entry.lstat()
    if stat.S_ISLNK(info.st_mode) or info.st_uid != 0 or info.st_mode & 0o022:
        raise SystemExit('Reviewed staging tree and ancestors must be root-owned, without symlinks or group/other writes')
CHECK
if id opusto-ci >/dev/null 2>&1; then
  [[ $(id -Gn opusto-ci) == opusto-ci ]] || { echo 'Existing CI account has unexpected groups; stop for administrative review' >&2; exit 1; }
  [[ $(getent passwd opusto-ci | cut -d: -f6-7) == /var/empty/opusto-ci:/bin/sh ]] || { echo 'Unexpected CI account home/shell' >&2; exit 1; }
else
  useradd --system --user-group --home-dir /var/empty/opusto-ci --shell /bin/sh opusto-ci
fi
# Never follow an attacker-created installation path, even during first provisioning.
/usr/bin/python3 -I - <<'CHECK'
import pathlib, stat
for name in ['/usr/local/libexec/opusto', '/etc/opusto', '/var/lib/opusto',
             '/var/empty/opusto-ci', '/etc/ssh/authorized_keys',
             '/etc/ssh/sshd_config.d', '/etc/systemd/system', '/var/backups/opusto']:
    path = pathlib.Path(name)
    for entry in [*path.parents, path]:
        if entry.exists() or entry.is_symlink():
            info = entry.lstat()
            if stat.S_ISLNK(info.st_mode) or info.st_uid != 0 or info.st_mode & 0o022:
                raise SystemExit('Unsafe existing installation path; stop for administrative review')
CHECK
install -d -o root -g root -m 0755 /usr/local/libexec/opusto /var/empty /var/empty/opusto-ci /etc/ssh/authorized_keys
install -d -o root -g root -m 0700 /etc/opusto /etc/opusto/registry /var/lib/opusto /var/backups/opusto
# Reject symlink/directory destinations rather than following links while copying.
for destination in /usr/local/libexec/opusto/{deploy-gateway.py,deploy.sh,backup.sh,verify-backup.sh,monitor.sh,rollback.sh} \
  /etc/opusto/compose.prod.yaml /etc/ssh/sshd_config.d/60-opusto-ci.conf \
  /etc/systemd/system/{opusto-deploy.socket,opusto-deploy@.service,opusto-backup.service,opusto-backup.timer,opusto-monitor.service,opusto-monitor.timer}; do
  [[ ! -L $destination && ! -d $destination ]] || { echo 'Unsafe destination' >&2; exit 1; }
done
install -o root -g root -m 0755 "$SOURCE/ops/security/deploy-gateway.py" /usr/local/libexec/opusto/
for script in deploy backup verify-backup monitor rollback; do
  install -o root -g root -m 0700 "$SOURCE/ops/$script.sh" /usr/local/libexec/opusto/
done
install -o root -g root -m 0600 "$SOURCE/compose.prod.yaml" /etc/opusto/
install -o root -g root -m 0644 "$SOURCE/ops/security/sshd-opusto-ci.conf" /etc/ssh/sshd_config.d/60-opusto-ci.conf
install -o root -g root -m 0644 "$SOURCE"/ops/systemd/opusto-* /etc/systemd/system/
echo 'Installed reviewed files. No services started/reloaded. Follow docs/security-migration.md before activation.'
