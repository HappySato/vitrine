# Demo script (about 2 minutes 40 seconds)

Record the screen with the app already open on the Floor. If a vLLM endpoint on MI300X is up, export the AMD env vars before you start so the reply badge can say **Served on AMD MI300X via vLLM/ROCm**. If it is not up, say so on camera and show the local-planner badge. Do not pretend a local answer ran on the GPU.

## 0:00 — The problem (20s)

"Independent shops already know their regulars. The till only knows what sold last week. Vitrine is the floor tool for Northline Goods: a clerk loads who walked in, the shelf reorders from their taste, and checkout is a sandbox order, not a slide."

## 0:20 — Who is here (20s)

Point at Amina Okonkwo. Read the signals: Mulatu Astatke, berbere cooking, handmade ceramics. Point at the header. If it says `Configured: AMD MI300X via vLLM/ROCm`, say the words will be generated on that GPU. If it says local planner, say the ranking is already live and the sentences will switch to the GPU when `LLM_BASE_URL` points at vLLM.

## 0:40 — Ask (35s)

Click **A gift under $80 that feels like her records.**

When the reply lands:

- Read one because-path out loud ("It shares Ethiopian jazz with Mulatu Astatke").
- Point at the badge under the reply. If the GPU answered, the badge is exactly `Served on AMD MI300X via vLLM/ROCm`.
- Point at the floor-math line. Say: "That margin gap is the scoring function. The model did not invent it."

Click **Set aside these**. The bag should show the record and the bowl, about $80.

## 1:15 — Checkout (25s)

Click **Sandbox checkout**, then **Create sandbox order**.

Read the order id, `charged: no`, and the provider line (mock, or PayPal sandbox if credentials are configured). Say: "Vitrine creates the order and does not capture it. There is no path to live PayPal."

## 1:40 — A different regular (25s)

Select Sable Chen. The shelf should jump to the Bauhaus poster, GRID, the black cups. Say: "Same catalog, different taste. The bestsellers did not move."

## 2:05 — The desk (25s)

Open **Desk**. Read the formula once, then Amina's margin gap versus the chili crisp, the house blend, and the cedar sticks. Point at the sandbox order that just landed. Say: "Eight counter visits are the fixture. Swap in a till export and the same math runs. The language model is not in this page."

## 2:30 — Close (10s)

"Taste provider, payment provider, and the model endpoint are each a plug. The commercial action is the bag. The GPU's job is the sentence that tells the clerk why."

Stop.
