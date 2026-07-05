/**
 * Surge status panel
 *
 * Displays:
 * - Engine uptime
 * - MITM status
 * - Rewrite status
 * - Scripting status
 *
 * Tapping the panel reloads the active profile.
 */

const DEFAULT_ICON = "speedometer";
const DEFAULT_COLOR = "#F6C970";

function callAPI(method, path, body = null) {
  return new Promise((resolve, reject) => {
    $httpAPI(method, path, body, (result) => {
      if (result === undefined || result === null) {
        reject(new Error(`No response from ${path}`));
        return;
      }
      resolve(result);
    });
  });
}

function parseArguments(argument = "") {
  const values = {};

  for (const item of argument.split("&")) {
    if (!item) continue;

    const separator = item.indexOf("=");
    const key = separator === -1 ? item : item.slice(0, separator);
    const value = separator === -1 ? "" : item.slice(separator + 1);

    try {
      values[key] = decodeURIComponent(value);
    } catch (_) {
      values[key] = value;
    }
  }

  return values;
}

function statusMark(enabled) {
  return enabled ? "✅" : "❌";
}

function formatDuration(milliseconds) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (days > 0) return `${days}天 ${hours}小时 ${minutes}分钟`;
  if (hours > 0) return `${hours}小时 ${minutes}分钟`;
  if (minutes > 0) return `${minutes}分钟 ${seconds}秒`;
  return `${seconds}秒`;
}

async function getFeatureStatus(path) {
  try {
    const result = await callAPI("GET", path);
    return statusMark(Boolean(result.enabled));
  } catch (_) {
    return "⚠️";
  }
}

async function main() {
  const args = parseArguments(typeof $argument === "string" ? $argument : "");
  const icon = args.icon || DEFAULT_ICON;
  const color = args.color || DEFAULT_COLOR;
  let reloadMessage = "";

  if (typeof $trigger !== "undefined" && $trigger === "button") {
    try {
      await callAPI("POST", "/v1/profiles/reload");
      reloadMessage = "\n配置：已重新载入";
    } catch (_) {
      reloadMessage = "\n配置：重新载入失败";
    }
  }

  try {
    const [traffic, mitm, rewrite, scripting] = await Promise.all([
      callAPI("GET", "/v1/traffic"),
      getFeatureStatus("/v1/features/mitm"),
      getFeatureStatus("/v1/features/rewrite"),
      getFeatureStatus("/v1/features/scripting"),
    ]);

    const startTime = Number(traffic.startTime) * 1000;
    const uptime = Number.isFinite(startTime)
      ? formatDuration(Date.now() - startTime)
      : "未知";

    $done({
      title: "Surge 运行状态",
      content:
        `运行时间：${uptime}\n` +
        `MITM：${mitm}  Rewrite：${rewrite}\n` +
        `Scripting：${scripting}` +
        reloadMessage,
      icon,
      "icon-color": color,
    });
  } catch (error) {
    $done({
      title: "Surge 运行状态",
      content: `状态读取失败\n${error.message || error}`,
      icon,
      "icon-color": "#FF453A",
    });
  }
}

main();
