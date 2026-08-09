process.loadEnvFile?.(".env.local");

import { spawn } from "node:child_process";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

if (!url || !anonKey) {
  throw new Error(
    "Thiếu NEXT_PUBLIC_SUPABASE_URL hoặc NEXT_PUBLIC_SUPABASE_ANON_KEY. Hãy điền public values của Supabase hosted project vào .env.local.",
  );
}

const parsedUrl = new URL(url);
if (
  ["localhost", "127.0.0.1", "0.0.0.0"].includes(parsedUrl.hostname) ||
  anonKey.includes("supabase-demo")
) {
  throw new Error(
    "Cấu hình hiện đang trỏ tới Supabase local/Docker. Hãy dùng URL https://<project-ref>.supabase.co và anon key của hosted project.",
  );
}

const child = spawn(
  process.execPath,
  ["node_modules/next/dist/bin/next", "dev"],
  {
    stdio: "inherit",
    env: process.env,
    shell: false,
  },
);

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 1);
});

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});
