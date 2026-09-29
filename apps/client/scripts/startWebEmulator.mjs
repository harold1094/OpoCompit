import {spawn} from "node:child_process";
import {resolve} from "node:path";

const expoCli = resolve("node_modules", "expo", "bin", "cli");
const child = spawn(process.execPath, [
  expoCli,
  "start",
  "--web",
  "--port",
  process.env.EXPO_PORT ?? "8082",
], {
  stdio: "inherit",
  env: {
    ...process.env,
    EXPO_PUBLIC_FIREBASE_ENABLED: "true",
    EXPO_PUBLIC_FIREBASE_API_KEY: "emulator-key",
    EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: "opocompit-dev.firebaseapp.com",
    EXPO_PUBLIC_FIREBASE_PROJECT_ID: "opocompit-dev",
    EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: "opocompit-dev.firebasestorage.app",
    EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: "38007659451",
    EXPO_PUBLIC_FIREBASE_APP_ID: "1:38007659451:web:local-emulator",
    EXPO_PUBLIC_FIREBASE_FUNCTIONS_REGION: "us-central1",
    EXPO_PUBLIC_USE_FIREBASE_EMULATORS: "true",
    EXPO_PUBLIC_FIREBASE_EMULATOR_HOST: "127.0.0.1",
  },
});

child.on("exit", (code) => {
  process.exitCode = code ?? 1;
});
