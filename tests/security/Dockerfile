FROM ubuntu:24.04
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends python3 openssh-server sudo systemd && rm -rf /var/lib/apt/lists/*
COPY . /reviewed
RUN chown -R root:root /reviewed && chmod -R go-w /reviewed && /bin/bash /reviewed/ops/security/install-reviewed.sh --install-reviewed
RUN python3 /reviewed/tests/security/linux-isolation.py
