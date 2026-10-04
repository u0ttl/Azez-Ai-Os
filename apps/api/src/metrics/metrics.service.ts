import { Injectable } from "@nestjs/common";

interface RouteMetric {
  count: number;
  durationSeconds: number;
}

function escapeLabel(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("\n", "\\n").replaceAll('"', '\\"');
}

@Injectable()
export class MetricsService {
  private readonly startedAt = Date.now();
  private readonly routes = new Map<string, RouteMetric>();

  recordHttp(method: string, route: string, statusCode: number, durationSeconds: number): void {
    const labels = `method="${escapeLabel(method)}",route="${escapeLabel(route)}",status="${statusCode}"`;
    const metric = this.routes.get(labels) ?? { count: 0, durationSeconds: 0 };
    metric.count += 1;
    metric.durationSeconds += durationSeconds;
    this.routes.set(labels, metric);
  }

  render(): string {
    const memory = process.memoryUsage();
    const lines = [
      "# HELP azez_process_uptime_seconds Process uptime in seconds.",
      "# TYPE azez_process_uptime_seconds gauge",
      `azez_process_uptime_seconds ${Math.floor((Date.now() - this.startedAt) / 1000)}`,
      "# HELP azez_process_resident_memory_bytes Resident memory size in bytes.",
      "# TYPE azez_process_resident_memory_bytes gauge",
      `azez_process_resident_memory_bytes ${memory.rss}`,
      "# HELP azez_http_requests_total Total HTTP responses.",
      "# TYPE azez_http_requests_total counter",
    ];
    for (const [labels, metric] of this.routes) lines.push(`azez_http_requests_total{${labels}} ${metric.count}`);
    lines.push(
      "# HELP azez_http_request_duration_seconds_sum Accumulated HTTP request duration.",
      "# TYPE azez_http_request_duration_seconds_sum counter",
    );
    for (const [labels, metric] of this.routes) lines.push(`azez_http_request_duration_seconds_sum{${labels}} ${metric.durationSeconds.toFixed(6)}`);
    return `${lines.join("\n")}\n`;
  }
}
