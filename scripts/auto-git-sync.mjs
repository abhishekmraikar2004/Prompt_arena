import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const safeDirectory = root.replaceAll("\\", "/");
const pollIntervalMs = 1_500;
const quietPeriodMs = 5_000;

function runGit(args, allowFailure = false) {
  const result = spawnSync(
    "git",
    ["-c", `safe.directory=${safeDirectory}`, ...args],
    {
      cwd: root,
      encoding: "utf8",
      windowsHide: true,
      env: {
        ...process.env,
        GIT_TERMINAL_PROMPT: "0",
        GCM_INTERACTIVE: "Never",
      },
    },
  );
  if (result.error) throw result.error;
  if (!allowFailure && result.status !== 0) {
    throw new Error(result.stderr.trim() || `git ${args[0]} failed`);
  }
  return result;
}

function treeStatus() {
  return runGit(["status", "--porcelain=v1", "--untracked-files=all"]).stdout;
}

function hasUnpushedCommits() {
  const branch = runGit(["branch", "--show-current"]).stdout.trim();
  if (!branch) return false;
  const upstream = runGit(
    [
      "rev-parse",
      "--abbrev-ref",
      "--symbolic-full-name",
      `${branch}@{upstream}`,
    ],
    true,
  );
  if (upstream.status !== 0) return true;
  const counts = runGit([
    "rev-list",
    "--left-right",
    "--count",
    `${upstream.stdout.trim()}...HEAD`,
  ])
    .stdout.trim()
    .split(/\s+/);
  return Number(counts[1]) > 0;
}

let lastStatus = treeStatus();
let quietSince = lastStatus ? Date.now() : 0;
let nextCommitAttemptAt = 0;
let busy = false;
let pushPending = hasUnpushedCommits();
let nextPushAt = pushPending ? Date.now() : 0;
let pushBackoffMs = 15_000;

console.log(
  `[git-sync] Watching ${root}; changes commit after ${quietPeriodMs / 1000}s of inactivity, then push to origin.`,
);

function commitChanges() {
  const status = treeStatus();
  if (!status) return;
  runGit(["add", "-A"]);
  const stagedDiff = runGit(["diff", "--cached", "--quiet"], true);
  if (stagedDiff.status === 0) return;
  if (stagedDiff.status !== 1) {
    throw new Error(
      stagedDiff.stderr.trim() || "Could not inspect staged changes.",
    );
  }
  const timestamp = new Date().toISOString();
  runGit(["commit", "-m", `Auto-sync: ${timestamp}`]);
  console.log(`[git-sync] Committed changes at ${timestamp}.`);
  pushPending = true;
  nextPushAt = Date.now();
}

function pushChanges() {
  try {
    const result = runGit(["push", "-u", "origin", "HEAD"]);
    console.log(result.stdout.trim() || "[git-sync] GitHub is up to date.");
    pushPending = false;
    nextPushAt = 0;
    pushBackoffMs = 15_000;
  } catch (error) {
    console.error(`[git-sync] Push failed; retrying: ${error.message}`);
    nextPushAt = Date.now() + pushBackoffMs;
    pushBackoffMs = Math.min(pushBackoffMs * 2, 5 * 60_000);
  }
}

const timer = setInterval(() => {
  if (busy) return;
  busy = true;
  try {
    const status = treeStatus();
    if (status !== lastStatus) {
      lastStatus = status;
      quietSince = status ? Date.now() : 0;
    }
    if (
      quietSince &&
      Date.now() - quietSince >= quietPeriodMs &&
      Date.now() >= nextCommitAttemptAt
    ) {
      try {
        commitChanges();
        lastStatus = treeStatus();
        quietSince = lastStatus ? Date.now() : 0;
        nextCommitAttemptAt = 0;
      } catch (error) {
        console.error(
          `[git-sync] Commit failed; retrying shortly: ${error.message}`,
        );
        nextCommitAttemptAt = Date.now() + 30_000;
      }
    }
    if (pushPending && Date.now() >= nextPushAt) pushChanges();
  } catch (error) {
    console.error(`[git-sync] Watch check failed: ${error.message}`);
  } finally {
    busy = false;
  }
}, pollIntervalMs);

function stop() {
  clearInterval(timer);
  console.log("[git-sync] Stopped.");
}

process.once("SIGINT", stop);
process.once("SIGTERM", stop);
