import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {resolve} from "node:path";
import {deleteApp, initializeApp} from "firebase-admin/app";
import {getFirestore} from "firebase-admin/firestore";

const projectId = "opocompit-dev";
const authBaseUrl = "http://127.0.0.1:9099";
const functionsBaseUrl = `http://127.0.0.1:5001/${projectId}/us-central1`;

type CallableEnvelope<T> = {result?: T; error?: {message?: string; status?: string}};

async function call<T>(name: string, data: unknown, idToken: string): Promise<T> {
  const response = await fetch(`${functionsBaseUrl}/${name}`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${idToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({data}),
  });
  const body = await response.json() as CallableEnvelope<T>;
  if (!response.ok || body.error) {
    throw new Error(
      `${name} failed: ${body.error?.status ?? response.status} ${body.error?.message ?? ""}`,
    );
  }
  assert.ok(body.result, `${name} returned no result.`);
  return body.result;
}

async function createLocalAdmin() {
  const authResponse = await fetch(
    `${authBaseUrl}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=emulator-key`,
    {
      method: "POST",
      headers: {"content-type": "application/json"},
      body: JSON.stringify({returnSecureToken: true}),
    },
  );
  const authText = await authResponse.text();
  assert.equal(authResponse.ok, true, `Local Auth failed: ${authText}`);
  const auth = JSON.parse(authText) as {idToken: string; localId: string};

  await call(
    "bootstrapGuestProfile",
    {
      oppositionId: "firefighters_es",
      oppositionName: "Bomberos",
      territory: {label: "Espana", country: "ES"},
    },
    auth.idToken,
  );
  process.env.GCLOUD_PROJECT = projectId;
  process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
  const app = initializeApp({projectId}, `import-admin-${auth.localId}`);
  await getFirestore(app).collection("users").doc(auth.localId).update({role: "admin"});
  await deleteApp(app);
  return auth;
}

async function main() {
  const fileFlagIndex = process.argv.indexOf("--file");
  const inputPath = fileFlagIndex >= 0 ? process.argv[fileFlagIndex + 1] : undefined;
  if (!inputPath) {
    throw new Error("Usage: npm run import:emulator -- --file <batch.json>");
  }

  const batch = JSON.parse(await readFile(resolve(inputPath), "utf8")) as unknown;
  const auth = await createLocalAdmin();
  const result = await call<{
    batchId: string;
    importedCount: number;
    questionIds: string[];
    status: string;
    idempotent: boolean;
  }>("importQuestionBatch", batch, auth.idToken);
  console.log(JSON.stringify(result, null, 2));
}

void main();
