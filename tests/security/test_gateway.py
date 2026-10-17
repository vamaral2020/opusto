import importlib.util
from pathlib import Path
import stat
import types
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('gateway', Path(__file__).parents[2] / 'ops/security/deploy-gateway.py')
gateway = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gateway)
REQUEST = 'deploy ghcr.io/vamaral2020/opusto@sha256:' + 'a' * 64 + ' ' + 'b' * 40


class GatewayTests(unittest.TestCase):
    def test_exact_digest_and_revision(self):
        self.assertEqual(gateway.parse_request(REQUEST + '\n'), (REQUEST.split()[1], 'b' * 40))

    def test_reject_commands_images_options_and_injection(self):
        for value in ['id', 'sudo sh', 'scp -t /etc/opusto', REQUEST + '; id', REQUEST + '\nid',
                      REQUEST + ' extra', REQUEST.replace('deploy ', 'rollback '),
                      REQUEST.replace('vamaral2020', 'attacker'), REQUEST.replace('@sha256:', ':latest@sha256:'),
                      REQUEST.replace('a' * 64, 'a' * 63), REQUEST.replace('b' * 40, '--help'),
                      REQUEST.replace('ghcr.io', 'ghcr.io.evil'), REQUEST + '\x00', ' ' + REQUEST]:
            with self.subTest(value=value), self.assertRaises(ValueError):
                gateway.parse_request(value)

    def test_privileged_paths_reject_writable_ancestors_owners_and_symlinks(self):
        for bad_path in ['/', '/usr', '/usr/local', '/usr/local/libexec', '/usr/local/libexec/opusto', '/usr/local/libexec/opusto/deploy.sh']:
            for mode, uid in [(stat.S_IFDIR | 0o775, 0), (stat.S_IFDIR | 0o755, 1000), (stat.S_IFLNK | 0o777, 0)]:
                def info(path):
                    return types.SimpleNamespace(st_mode=mode if str(path) == bad_path else stat.S_IFDIR | 0o755,
                                                 st_uid=uid if str(path) == bad_path else 0)
                with patch.object(Path, 'lstat', info), self.assertRaises(ValueError):
                    gateway.trusted('/usr/local/libexec/opusto/deploy.sh')

    def test_secret_must_be_private(self):
        info = types.SimpleNamespace(st_mode=stat.S_IFREG | 0o644, st_uid=0)
        with patch.object(Path, 'lstat', return_value=info), patch.object(Path, 'stat', return_value=info), self.assertRaises(ValueError):
            gateway.trusted('/etc/opusto/.env', private=True)

    def test_invalid_input_never_launches_process(self):
        with patch.object(gateway.subprocess, 'run') as run, self.assertRaises(ValueError):
            gateway.execute('deploy $(id) secret')
        run.assert_not_called()

    def test_fixed_environment_has_no_caller_overrides(self):
        self.assertNotIn('SSH_ORIGINAL_COMMAND', gateway.ENV)
        self.assertNotIn('RESTIC_PASSWORD', gateway.ENV)
        self.assertEqual(gateway.ENV['COMPOSE_FILE'], '/etc/opusto/compose.prod.yaml')
        self.assertEqual(gateway.ENV['PATH'], '/usr/sbin:/usr/bin:/sbin:/bin')


if __name__ == '__main__':
    unittest.main()
