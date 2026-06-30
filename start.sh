#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd -P)"
cd "$ROOT_DIR"

if [[ -f "$ROOT_DIR/.env" ]]; then
  set -a
  # shellcheck disable=SC1091
  source "$ROOT_DIR/.env"
  set +a
fi

PORT="${PORT:-5173}"
HOST="${HOST:-0.0.0.0}"
APP_FORCE_KILL_PORTS="${APP_FORCE_KILL_PORTS:-0}"
LOG_DIR="$ROOT_DIR/logs"
PID_DIR="$ROOT_DIR/.pids"
PID_FILE="$PID_DIR/frontend.pid"
LOG_FILE="$LOG_DIR/frontend.log"
mkdir -p "$LOG_DIR" "$PID_DIR"

log_info() { echo "✅ $*"; }
log_warn() { echo "⚠️  $*"; }
log_error() { echo "❌ $*" >&2; }

usage() {
  cat <<USAGE
用法: ./start.sh [start|stop|restart|status]

命令:
  start     启动本地静态服务，默认命令
  stop      停止本项目服务
  restart   重启本项目服务
  status    查看服务状态

环境变量:
  PORT=5173
  HOST=0.0.0.0
  APP_FORCE_KILL_PORTS=0
USAGE
}

process_cwd() {
  local pid="$1"
  readlink "/proc/$pid/cwd" 2>/dev/null || echo ""
}

kill_pid() {
  local pid="$1"
  local label="${2:-process}"
  [[ -z "$pid" ]] && return 0
  kill -0 "$pid" 2>/dev/null || return 0
  kill "$pid" 2>/dev/null || true
  sleep 0.3
  if kill -0 "$pid" 2>/dev/null; then
    kill -9 "$pid" 2>/dev/null || true
  fi
  log_info "已停止 $label pid=$pid"
}

kill_project_pid() {
  local pid="$1"
  [[ -z "$pid" ]] && return 0
  kill -0 "$pid" 2>/dev/null || return 0
  local cwd
  cwd="$(process_cwd "$pid")"
  if [[ "$cwd" == "$ROOT_DIR"* ]]; then
    kill_pid "$pid" "项目进程"
  else
    log_warn "跳过非本项目进程 pid=$pid cwd=${cwd:-?}"
  fi
}

port_pids() {
  local port="$1"
  if command -v ss >/dev/null 2>&1; then
    ss -ltnpH "sport = :$port" 2>/dev/null | sed -n 's/.*pid=\([0-9][0-9]*\).*/\1/p' | sort -u || true
  elif command -v lsof >/dev/null 2>&1; then
    lsof -t -iTCP:"$port" -sTCP:LISTEN 2>/dev/null | sort -u || true
  fi
}

kill_port_pid() {
  local pid="$1"
  local port="$2"
  [[ -z "$pid" ]] && return 0
  kill -0 "$pid" 2>/dev/null || return 0
  local cwd
  cwd="$(process_cwd "$pid")"
  if [[ "$cwd" == "$ROOT_DIR"* ]]; then
    kill_pid "$pid" "端口 $port 的项目进程"
  elif [[ "$APP_FORCE_KILL_PORTS" == "1" ]]; then
    kill_pid "$pid" "端口 $port 的强制清理进程"
  else
    log_warn "端口 $port 被外部进程占用 pid=$pid cwd=${cwd:-?}"
  fi
}

port_owner() {
  port_pids "$1" | head -n 1
}

require_command() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    log_error "缺少命令：$cmd"
    exit 1
  fi
}

stop_service() {
  if [[ -f "$PID_FILE" ]]; then
    kill_project_pid "$(cat "$PID_FILE")"
    rm -f "$PID_FILE"
  fi

  local pid
  for pid in $(port_pids "$PORT"); do
    kill_port_pid "$pid" "$PORT"
  done
}

ensure_port_available() {
  local pid
  pid="$(port_owner "$PORT" || true)"
  if [[ -n "$pid" ]]; then
    local cwd
    cwd="$(process_cwd "$pid")"
    log_error "端口 $PORT 仍被进程 pid=$pid 占用 (cwd=${cwd:-?})，请先处理后再启动。"
    log_error "如果确认要强制清理，可执行：APP_FORCE_KILL_PORTS=1 PORT=$PORT ./start.sh start"
    exit 1
  fi
}

start_frontend() {
  : > "$LOG_FILE"
  setsid nohup npm run dev -- --host "$HOST" --port "$PORT" > "$LOG_FILE" 2>&1 &
  echo $! > "$PID_FILE"
}

wait_for_port() {
  local attempts=20
  local pid=""
  while (( attempts > 0 )); do
    pid="$(port_owner "$PORT" || true)"
    [[ -n "$pid" ]] && return 0
    sleep 0.2
    attempts=$((attempts - 1))
  done
  return 1
}

start_service() {
  require_command npm
  log_info "正在清理旧的本地服务..."
  stop_service
  ensure_port_available

  log_info "正在启动老家 TvT/Vite 小城市： http://localhost:${PORT}"
  start_frontend

  if wait_for_port; then
    log_info "启动成功 pid=$(cat "$PID_FILE")"
    echo "📍 访问地址: http://localhost:${PORT}"
    echo "🧾 日志文件: $LOG_FILE"
    echo "🛑 停止服务: ./start.sh stop"
  else
    rm -f "$PID_FILE"
    log_error "服务未监听端口 $PORT，请查看日志：$LOG_FILE"
    exit 1
  fi
}

status_service() {
  local pid=""
  if [[ -f "$PID_FILE" ]]; then
    pid="$(cat "$PID_FILE")"
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      log_info "服务运行中 pid=$pid url=http://localhost:${PORT}"
      return 0
    fi
  fi

  pid="$(port_owner "$PORT" || true)"
  if [[ -n "$pid" ]]; then
    log_warn "端口 $PORT 有进程监听 pid=$pid cwd=$(process_cwd "$pid")"
    return 0
  fi

  log_warn "服务未运行"
}

cmd="${1:-start}"
case "$cmd" in
  start)
    start_service
    ;;
  stop)
    stop_service
    log_info "老家 TvT/Vite 小城市服务已停止"
    ;;
  restart)
    stop_service
    start_service
    ;;
  status)
    status_service
    ;;
  -h|--help|help)
    usage
    ;;
  *)
    log_error "未知命令：$cmd"
    usage
    exit 1
    ;;
esac
