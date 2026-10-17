# Publicação

Deploy usa `opusto-ci`, SSH com comando forçado e executor instalado por administrador em diretório root-owned. Actions publica `ghcr.io/vamaral2020/opusto:<commit>` e envia seu digest imutável; não envia Compose, scripts ou configurações à VPS.

Antes de habilitar o workflow, seguir [provisionamento, revisão, migração e rollback](security-migration.md). Instalação nova também requer canal administrativo independente, secrets protegidos e revisão separada da infraestrutura.

Environment `production-opus`: `VPS_HOST`, `VPS_SSH_KEY` (chave exclusiva CI), `VPS_KNOWN_HOSTS` verificado fora de banda. `VPS_USER` e `VPS_DEPLOY_PATH` não são utilizados. GHCR privado exige credencial root somente leitura. Nunca fornecer chave administrativa ao Actions.

PRs validam formatação, lint, tipos, testes, isolamento Linux, backup/restauração descartáveis, migrations, build, E2E e Compose. Após `main` validado, executor faz backup opcional, pull, migrations, troca do app e readiness. Falha na troca/readiness restaura imagem anterior; migrations não são revertidas e exigem expand/contract. Estado em `/var/lib/opusto/.deploy-state` é acessível somente ao administrador.

Nginx/Certbot/firewall são administrados separadamente. Usar template `ops/nginx/opusto.conf.template` revisado, `nginx -t` antes do reload e `certbot renew --dry-run` para TLS. Somente portas 80/443 e SSH necessário ficam públicas; app em loopback e PostgreSQL sem porta pública. Não gerar configurações como root de checkout gravável pelo CI.

Após publicação, verificar readiness, navegação, login CMS, upload e publicação de item. Acompanhar timers/Healthchecks. Workflow não instala infraestrutura, ativa agendamentos ou restaura produção.
