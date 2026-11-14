import "server-only";

const KNOWN = ["slot_unavailable", "too_many_bookings", "not_authenticated", "invalid_input", "not_found", "not_allowed", "forbidden"];

/** Map a Postgres RAISE message from our RPCs to a stable error code for the client. */
export function rpcErrorCode(error) {
  const msg = error?.message ?? "";
  const code = KNOWN.find((k) => msg.includes(k));
  if (!code) console.error("[rpc]", error);
  return code ?? "server";
}
