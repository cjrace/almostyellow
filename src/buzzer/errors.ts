export function playerSignInError(error: unknown) {
  const code =
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string" &&
    error.code.startsWith("auth/")
      ? error.code
      : undefined;
  let message = "Could not sign in as a player. Reload to try again.";
  if (code === "auth/network-request-failed")
    message =
      "Could not connect to player sign-in. Check your connection and reload.";
  else if (code === "auth/web-storage-unsupported")
    message =
      "Player sign-in needs browser storage. Allow browser storage and reload.";
  else if (code === "auth/operation-not-allowed")
    message =
      "Player sign-in is unavailable. Ask the host to check the sign-in settings.";
  else if (code === "auth/admin-restricted-operation")
    message =
      "Player account creation is restricted. Ask the host to check the sign-in settings.";
  else if (code === "auth/too-many-requests")
    message =
      "Player sign-in is temporarily limited. Wait a moment and reload.";
  return code ? `${message} Error code: ${code}.` : message;
}
