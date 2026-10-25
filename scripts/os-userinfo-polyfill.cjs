const os = require("node:os");

if (process.platform === "win32" && !process.geteuid) {
  process.geteuid = () => 0;
  const nativeUserInfo = os.userInfo.bind(os);
  os.userInfo = (...args) => {
    try {
      return nativeUserInfo(...args);
    } catch {
      return {
        username: process.env.USERNAME || "local",
        uid: -1,
        gid: -1,
        shell: null,
        homedir: process.env.USERPROFILE || process.cwd(),
      };
    }
  };
}
