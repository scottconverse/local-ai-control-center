const { _electron: electron } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

async function main() {
  const root = path.resolve(__dirname, "..");
  const executablePath = path.join(root, "release", "win-unpacked", "Local AI Control Center.exe");
  if (!fs.existsSync(executablePath)) {
    throw new Error(`Packaged app was not found: ${executablePath}`);
  }

  const userData = path.join(process.env.TEMP || root, `local-ai-control-center-clean-${Date.now()}`);
  fs.mkdirSync(userData, { recursive: true });

  const app = await electron.launch({
    executablePath,
    args: [`--user-data-dir=${userData}`],
    env: {
      ...process.env,
      LOCAL_AI_APP_ROOT: root
    }
  });

  try {
    const window = await app.firstWindow();
    await window.waitForLoadState("domcontentloaded");
    await window.getByText("First Run Setup").waitFor({ timeout: 20_000 });

    await window.getByRole("button", { name: /First Run/ }).click();
    await window.waitForTimeout(2_500);
    await window.screenshot({ path: path.join(root, "landing", "assets", "control-center-first-run.png") });

    await window.getByRole("button", { name: /Dashboard/ }).click();
    await window.getByText("Model Settings And Reset Controls").waitFor({ timeout: 10_000 });
    await window.waitForTimeout(1_000);
    await window.screenshot({ path: path.join(root, "landing", "assets", "control-center-dashboard.png") });
  } finally {
    await app.close();
    fs.rmSync(userData, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
