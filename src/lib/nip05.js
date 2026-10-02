// NIP-05 identity verification: does the domain's nostr.json actually point at
// this pubkey? Kept out of ProfileView so the check can be reused (Settings, a
// future profile editor) without dragging the whole screen along.

// name@domain -> true when https://domain/.well-known/nostr.json lists `name`
// with the given pubkey. False on any network or shape error — a failed check
// is never fatal, it only decides whether to show the verified badge.
export async function verifyNip05(nip05, pubkey) {
  const [name, domain] = (nip05 || "").split("@");
  if (!name || !domain) return false;
  try {
    const res = await fetch(
      `https://${domain}/.well-known/nostr.json?name=${encodeURIComponent(name)}`,
      { signal: AbortSignal.timeout(8000) },
    );
    if (!res.ok) return false;
    const data = await res.json();
    return data?.names?.[name] === pubkey;
  } catch {
    return false;
  }
}

// The domain half of a NIP-05 identifier, for display next to the badge.
export function nip05Domain(nip05) {
  return String(nip05 || "").split("@")[1] || "";
}