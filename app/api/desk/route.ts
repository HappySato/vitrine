import { connection } from "next/server";
import { deskReport } from "@/lib/desk";
import { listOrders, stockSnapshot } from "@/lib/floor-state";

export async function GET() {
  await connection();
  return Response.json({
    report: deskReport(),
    orders: listOrders(),
    stock: stockSnapshot(),
  });
}
