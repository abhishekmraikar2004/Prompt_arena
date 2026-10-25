// tsx calls os.userInfo() on Windows to name its cache directory. Some
// restricted Windows environments reject that OS query. Preload a fallback
// in both this process and tsx's watch child.
import { fileURLToPath } from "node:url";
import os from "node:os";

if (process.platform === "win32" && !process.geteuid) {
  Object.defineProperty(process, "geteuid", { value: () => 0 });
  os.userInfo = () => ({
    username: "local",
    uid: -1,
    gid: -1,
    shell: null,
    homedir: process.env.USERPROFILE ?? process.cwd(),
  });
  const preloader = fileURLToPath(
    new URL("./os-userinfo-polyfill.cjs", import.meta.url),
  ).replaceAll("\\", "/");
  process.env.NODE_OPTIONS =
    `${process.env.NODE_OPTIONS ?? ""} --require="${preloader}"`.trim();
}

await import("../node_modules/tsx/dist/cli.mjs");
