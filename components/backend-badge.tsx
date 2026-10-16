import { Badge } from "@/components/ui/badge";
import { cn } from "cn";

export type BackendInfo = {
  id: "amd-mi300x" | "openai-compatible" | "local-planner";
  label: string;
  model: string | null;
  host: string | null;
  usedFallback: boolean;
  detail: string | null;
};

export function isAmdServe(backend: BackendInfo): boolean {
  return backend.id === "amd-mi300x" && !backend.usedFallback;
}

export function BackendBadge({ backend }: { backend: BackendInfo }) {
  const amd = isAmdServe(backend);
  return (
    <p className="mt-3 flex flex-col gap-1" data-testid={amd ? "amd-badge" : "backend-badge"}>
      <Badge
        variant="outline"
        className={cn(
          "h-auto overflow-visible px-2.5 py-1 text-[0.72rem] leading-snug tracking-wide whitespace-normal",
          amd
            ? "border-transparent bg-pine text-paper"
            : "bg-muted text-muted-foreground",
        )}
      >
        {amd ? "Served on AMD MI300X via vLLM/ROCm" : backend.label}
      </Badge>
      {(backend.model || backend.host) && (
        <span className="text-[0.7rem] text-muted-foreground">
          {[backend.model, backend.host].filter(Boolean).join(" · ")}
        </span>
      )}
      {backend.detail && !amd && (
        <span className="text-[0.7rem] text-muted-foreground">{backend.detail}</span>
      )}
    </p>
  );
}
