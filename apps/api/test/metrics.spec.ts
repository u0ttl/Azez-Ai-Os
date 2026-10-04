import { describe, expect, it } from "vitest";
import { MetricsService } from "../src/metrics/metrics.service.js";

describe("MetricsService", () => {
  it("exports bounded Prometheus route metrics", () => {
    const metrics = new MetricsService();
    metrics.recordHttp("GET", "/v1/projects/:id", 200, 0.125);
    metrics.recordHttp("GET", "/v1/projects/:id", 200, 0.075);
    const output = metrics.render();
    expect(output).toContain('azez_http_requests_total{method="GET",route="/v1/projects/:id",status="200"} 2');
    expect(output).toContain(" 0.200000");
    expect(output).not.toContain("customer-123");
  });
});
