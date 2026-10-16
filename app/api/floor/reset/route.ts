import { connection } from "next/server";
import { resetFloor, stockSnapshot } from "@/lib/floor-state";

export async function POST() {
  await connection();
  resetFloor();
  return Response.json({ ok: true, stock: stockSnapshot() });
}
