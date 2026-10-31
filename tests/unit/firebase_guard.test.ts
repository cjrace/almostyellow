import { describe, expect, test } from "vitest";
import {
  assertEmulatorEnvironment,
  CI_PROJECT_ID,
  LOCAL_PROJECT_ID,
} from "../firebase/guard";

const valid = {
  GCLOUD_PROJECT: LOCAL_PROJECT_ID,
  FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
  FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
};

describe("assertEmulatorEnvironment", () => {
  test("accepts the local and CI demo projects against local emulators", () => {
    expect(assertEmulatorEnvironment(valid).projectId).toBe(LOCAL_PROJECT_ID);
    expect(
      assertEmulatorEnvironment({ ...valid, GCLOUD_PROJECT: CI_PROJECT_ID })
        .projectId,
    ).toBe(CI_PROJECT_ID);
    expect(
      assertEmulatorEnvironment({
        ...valid,
        FIRESTORE_EMULATOR_HOST: "localhost:8080",
      }).firestoreHost,
    ).toBe("localhost:8080");
  });

  test("accepts matching project ID variables", () => {
    expect(() =>
      assertEmulatorEnvironment({
        ...valid,
        GOOGLE_CLOUD_PROJECT: LOCAL_PROJECT_ID,
        NEXT_PUBLIC_FIREBASE_PROJECT_ID: LOCAL_PROJECT_ID,
      }),
    ).not.toThrow();
  });

  test.each([
    ["no project", { GCLOUD_PROJECT: undefined }],
    ["a real project", { GCLOUD_PROJECT: "almostyellow-prod" }],
    ["another demo project", { GCLOUD_PROJECT: "demo-other" }],
    ["no Firestore emulator", { FIRESTORE_EMULATOR_HOST: undefined }],
    ["no Auth emulator", { FIREBASE_AUTH_EMULATOR_HOST: undefined }],
    [
      "a remote Firestore host",
      { FIRESTORE_EMULATOR_HOST: "firestore.example.com:8080" },
    ],
    [
      "a remote Auth host",
      { FIREBASE_AUTH_EMULATOR_HOST: "auth.example.com:9099" },
    ],
    [
      "a production project in a client variable",
      { NEXT_PUBLIC_FIREBASE_PROJECT_ID: "almostyellow-prod" },
    ],
    ["a different Google Cloud project", { GOOGLE_CLOUD_PROJECT: "live" }],
    [
      "service account credentials",
      { GOOGLE_APPLICATION_CREDENTIALS: "/keys/prod.json" },
    ],
    ["a Firebase CI token", { FIREBASE_TOKEN: "1//token" }],
    ["inline service account JSON", { FIREBASE_SERVICE_ACCOUNT_JSON: "{}" }],
  ])("refuses %s", (_name, override) => {
    expect(() => assertEmulatorEnvironment({ ...valid, ...override })).toThrow(
      /Refusing to run the Firebase tests/,
    );
  });

  test("reports every problem at once", () => {
    expect(() =>
      assertEmulatorEnvironment({
        GCLOUD_PROJECT: "live",
        GOOGLE_APPLICATION_CREDENTIALS: "/keys/prod.json",
      }),
    ).toThrow(
      /GCLOUD_PROJECT[\s\S]*FIRESTORE_EMULATOR_HOST[\s\S]*GOOGLE_APPLICATION_CREDENTIALS/,
    );
  });
});
