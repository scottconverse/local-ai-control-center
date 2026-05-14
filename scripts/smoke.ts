async function check(url: string) {
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) {
    throw new Error(`${url} returned ${response.status}`);
  }
}

async function main() {
  await check("http://127.0.0.1:11434/api/tags");
  await check("http://localhost:3000");
  await check("http://localhost:8080");
  console.log("Smoke checks passed: Ollama, OpenHands, and Open WebUI are reachable.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

export {};
