export function getCredentials() {
  const email = process.env.TEST_EMAIL;
  const password = process.env.TEST_PASSWORD;

  if (!email || !password) {
    throw new Error(
      "Missing environment variables: TEST_EMAIL or TEST_PASSWORD",
    );
  }

  return { email, password };
}
