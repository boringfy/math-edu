#!/usr/bin/env bash
#
# Puts math-edu.hashfront.com in front of the content server.
#
# Run as root on the proxy host. Idempotent: running it twice leaves the
# config exactly as running it once did, so it is safe after an edit or a
# reinstall.
#
# What it does, and nothing else:
#   * adds the domain's certificate to the existing :443 bind
#   * routes the domain to 127.0.0.1:8788 on both :80 and :443
#   * sends plain http to https, leaving ACME challenges alone so renewals work
#
# It validates the result before installing it and keeps a timestamped backup
# either way. This is a live proxy with other sites on it, and a maths app is
# not worth taking them down for.

set -euo pipefail

DOMAIN="math-edu.hashfront.com"
PORT="8788"
CFG="/etc/haproxy/haproxy.cfg"
CERT="/etc/haproxy/certs/${DOMAIN}.pem"
HTTP_FRONTEND="fe_adnv_http"
HTTPS_FRONTEND="fe_adnv_https"

# --dry-run builds the new config and checks it, changing nothing. Worth
# running first: this is a live proxy with other people's sites on it.
DRY_RUN=0
[[ ${1:-} == "--dry-run" ]] && DRY_RUN=1

die() { echo "  x $*" >&2; exit 1; }
note() { echo "  $*"; }

[[ $DRY_RUN -eq 1 || $EUID -eq 0 ]] || die "run this as root, or pass --dry-run"
[[ -f $CFG ]] || die "no haproxy config at $CFG"
[[ -f $CERT ]] || die "no certificate at $CERT — put the fullchain+key pem there first"

# A pem HAProxy can serve has to carry the private key as well as the chain.
# The file is normally root-only, so being unable to read it is not the same
# as it being wrong — saying so saves chasing the wrong fault during a dry run.
if [[ -r $CERT ]]; then
  grep -q "PRIVATE KEY" "$CERT" || die "$CERT has no private key in it"
else
  note "note: $CERT is not readable as $(whoami); its key will be checked when run as root"
fi

if grep -q "be_math_edu" "$CFG"; then
  note "already configured — nothing to do"
  exit 0
fi

if [[ $DRY_RUN -eq 0 ]]; then
  BACKUP="${CFG}.bak.$(date +%Y%m%d-%H%M%S)"
  cp -a "$CFG" "$BACKUP"
  note "backed up to $BACKUP"
fi

WORK="$(mktemp)"
trap 'rm -f "$WORK"' EXIT
cp -a "$CFG" "$WORK"

DOMAIN="$DOMAIN" PORT="$PORT" \
HTTP_FRONTEND="$HTTP_FRONTEND" HTTPS_FRONTEND="$HTTPS_FRONTEND" \
python3 - "$WORK" "$CERT" <<'PY'
import os, re, sys

path, cert = sys.argv[1], sys.argv[2]
domain = os.environ["DOMAIN"]
port = os.environ["PORT"]
http_fe = os.environ["HTTP_FRONTEND"]
https_fe = os.environ["HTTPS_FRONTEND"]

text = open(path).read()

# 1. The certificate, appended to the bind's own list rather than swapping in
#    the whole directory — swapping would quietly start serving every other
#    pem sitting in there as well.
if f"crt {cert}" not in text:
    text = re.sub(r"(bind \*:443 ssl crt \S+)", rf"\1 crt {cert}", text, count=1)

def frontend_span(src: str, name: str):
    pattern = re.compile(rf"(?ms)^(frontend {re.escape(name)}\n.*?)(?=^(?:frontend |backend |listen )|\Z)")
    match = pattern.search(src)
    if not match:
        raise SystemExit(f"  x frontend {name} not found in the config")
    return match

def append_to_frontend(src: str, name: str, body: str) -> str:
    """Adds lines at the end of one named frontend."""
    match = frontend_span(src, name)
    return src[: match.start(1)] + match.group(1).rstrip("\n") + "\n" + body + src[match.end(1) :]

def insert_before_routing(src: str, name: str, body: str) -> str:
    """
    Adds lines above the frontend's first `use_backend`.

    HAProxy evaluates every `http-request` before any `use_backend` whatever
    the order in the file, and warns when the file implies otherwise. Putting
    a redirect after the routing lines therefore works but reads as a bug and
    makes the config noisy on every reload, so it goes where it belongs.
    """
    match = frontend_span(src, name)
    block = match.group(1)
    lines = block.split("\n")
    for i, line in enumerate(lines):
        if line.strip().startswith("use_backend"):
            merged = "\n".join(lines[:i]).rstrip("\n") + "\n" + body + "\n".join(lines[i:])
            return src[: match.start(1)] + merged + src[match.end(1) :]
    # No routing in this frontend yet, so the end is the right place after all.
    return append_to_frontend(src, name, body)

# 2. On :80 — answer ACME first, then send everything else to https. The
#    letsencrypt acl is already defined in this frontend by the existing site.
add_http = f"""
  # {domain} -> maths content server
  acl host_math_edu hdr(host) -i {domain}
  http-request redirect scheme https code 301 if host_math_edu !letsencrypt_acl
"""
text = insert_before_routing(text, http_fe, add_http)

# 3. On :443 — straight to the backend.
add_https = f"""
  # {domain} -> maths content server (docker, 127.0.0.1:{port})
  acl host_math_edu hdr(host) -i {domain}
  use_backend be_math_edu if host_math_edu

"""
text = append_to_frontend(text, https_fe, add_https)

# 4. The backend itself.
text = text.rstrip("\n") + f"""

backend be_math_edu
  mode http
  option forwardfor
  # The app records who sent a suggestion or a bug report, and behind a proxy
  # every request otherwise looks like it came from the proxy.
  http-request set-header X-Forwarded-Proto https if {{ ssl_fc }}
  http-request set-header X-Forwarded-Proto http unless {{ ssl_fc }}
  http-request set-header X-Forwarded-Host %[req.hdr(Host)]
  server math1 127.0.0.1:{port} check
"""

open(path, "w").write(text)
PY

note "certificate, routing and backend added"

if ! haproxy -c -f "$WORK" >/dev/null 2>&1; then
  # Both of these pipelines start with a command that exits non-zero by
  # design, which under `set -e -o pipefail` killed the script at exactly
  # the moment it was trying to explain itself. Report, then leave.
  set +e +o pipefail
  echo "  x the new config does not parse. Nothing has been changed." >&2
  haproxy -c -f "$WORK" 2>&1 | sed 's/^/      /' >&2
  echo "  the lines it would have added:" >&2
  diff -u "$CFG" "$WORK" | sed -n '4,200p' | sed 's/^/      /' >&2
  exit 1
fi
note "config parses"

if [[ $DRY_RUN -eq 1 ]]; then
  note "dry run — nothing installed. The additions would be:"
  { diff -u "$CFG" "$WORK" || true; } | sed -n '4,200p' | sed 's/^/      /'
  exit 0
fi

install -m 644 -o root -g root "$WORK" "$CFG"
systemctl reload haproxy
note "haproxy reloaded"
note "check: curl -sS https://${DOMAIN}/healthz"
