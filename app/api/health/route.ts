import { connection } from "next/server";
import { readAppConfig } from "@/lib/config";

export async function GET() {
  await connection();
  const config = readAppConfig();
  return Response.json({
    llm: {
      id: config.llm.mode,
      label: config.llm.configuredLabel,
      model: config.llm.model,
      host: config.llm.host,
      ready: config.llm.mode !== "local-planner",
    },
    taste: {
      id: config.taste.id,
      label: config.taste.label,
      note: config.tasteNote,
    },
    payment: {
      id: config.payment.id,
      label: config.payment.label,
      note: config.paymentNote,
      sandboxOnly: true,
    },
  });
}
