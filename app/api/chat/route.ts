import { connection } from "next/server";
import { runTurn } from "@/lib/agent";
import { parseChatRequest } from "@/lib/requests";
import { shopperById } from "@/lib/shoppers";

export async function POST(request: Request) {
  await connection();
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Expected JSON." }, { status: 400 });
  }
  const parsed = parseChatRequest(body);
  if (!parsed.ok) return Response.json({ error: parsed.error }, { status: 400 });
  const shopper = shopperById(parsed.value.shopperId);
  if (!shopper) return Response.json({ error: "Unknown shopper." }, { status: 400 });

  const turn = await runTurn({
    shopper,
    message: parsed.value.message,
    history: parsed.value.history,
    cart: parsed.value.cart,
  });

  if (turn.error) {
    return Response.json({ error: turn.error, backend: turn.backend }, { status: 502 });
  }

  return Response.json({
    say: turn.say,
    offer: turn.offer,
    backend: turn.backend,
    shelf: turn.shelf,
    floorMath: turn.floorMath,
    taste: turn.taste,
  });
}
