# Infraestrutura

## Topologia

A VPS executa Nginx no host e dois containers persistentes: `app` e `postgres`. O container pontual `migrate` reutiliza exatamente a imagem da aplicação. Volumes nomeados `opusto_postgres` e `opusto_media` sobrevivem a substituições dos containers.

Somente Nginx recebe tráfego público. A aplicação liga em `127.0.0.1:3000`; PostgreSQL não declara `ports` em produção. A rede padrão do Compose permite comunicação interna por nome de serviço.

## Orçamento de recursos

O Compose limita aplicação a 1,5 GB/0,90 CPU e PostgreSQL a 1,5 GB/0,50 CPU para a VPS de 1 vCPU e 4 GB de RAM. Os limites de CPU são tetos individuais, não reservas: quando há concorrência, os serviços compartilham a única vCPU com o sistema, Nginx, Docker e tarefas curtas. São limites iniciais, a ajustar com métricas reais. Evite executar build, transcodificação de vídeo ou uma stack pesada de métricas na VPS.

Vídeos devem permanecer em plataformas externas. Imagens do CMS usam o volume local; acompanhe crescimento e migre para storage S3 compatível antes de o disco se tornar gargalo.

## PNPM na imagem de produção

A aplicação e o serviço `migrate` executam como `nextjs` (UID 1001). `/pnpm`, seu store e `/home/nextjs/.cache` pertencem a esse usuário. As dependências são instaladas durante o build e copiadas para a imagem final.

No PNPM 11, `pnpm_config_verify_deps_before_run=false` impede a verificação com instalação automática antes de scripts. `pnpm_config_pm_on_fail=error` faz uma divergência da versão fixa falhar sem baixar outro PNPM. A CI verifica permissões e execução sem rede e executa as migrações com o usuário padrão da imagem contra seu banco de testes.

## Disponibilidade e logs

- `/api/health/live`: confirma que o processo responde.
- `/api/health/ready`: confirma inicialização do Payload e acesso ao banco.
- `ops/monitor.sh`: verifica readiness, health dos containers e uso do filesystem.
- `docker compose logs`: saída de aplicação e PostgreSQL com rotação `json-file`.
- `systemctl status opusto-monitor.timer`: execução local a cada cinco minutos.

Instale os units em `/etc/systemd/system`, recarregue e ative:

```bash
sudo cp ops/systemd/opusto-* /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now opusto-monitor.timer opusto-backup.timer
```

Conecte falhas do systemd ao mecanismo simples disponível na operação (e-mail do host, monitor da Vultr ou serviço externo de uptime). O repositório não contrata nem ativa serviços externos.

Inspecione CPU/memória com `docker stats`, disco com `df -h` e volumes com `docker system df -v`. Defina alertas do provedor para CPU, memória, disco e indisponibilidade quando a conta Vultr estiver disponível.

## Hardening

- SSH somente por chave, login root remoto desabilitado e acesso administrativo restrito.
- UFW/nftables liberando somente portas necessárias.
- Atualizações de segurança automáticas e reinicializações planejadas.
- Docker socket acessível apenas ao usuário de deploy estritamente necessário; associação ao grupo Docker equivale a privilégio root.
- `.env` com modo `600`, backups criptografados e chaves separadas.
- Renovação TLS testada e HSTS ativado após confirmar todos os hostnames HTTPS.
- Revisão periódica de dependências e imagens base via pull requests.

## Capacidade e evolução

Primeiro escale verticalmente e ajuste queries/imagens. Se necessário, a primeira extração recomendada é mídia para S3 compatível, seguida de PostgreSQL gerenciado. Múltiplas réplicas exigiriam storage compartilhado, rate limit compartilhado e estratégia de cache; não fazem parte da fase atual.
