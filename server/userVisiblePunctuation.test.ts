import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const projectRoot = "/home/ubuntu/qingshui-media-equipment";

function collectSourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return path.endsWith("server/_core") ? [] : collectSourceFiles(path);
    return /\.(ts|tsx)$/.test(entry.name) && !/\.test\.(ts|tsx)$/.test(entry.name) ? [path] : [];
  });
}

describe("使用者可見文案標點", () => {
  it("前後端使用者可見來源不保留繁中文案句號", () => {
    const sourceFiles = [
      ...collectSourceFiles(join(projectRoot, "client/src")),
      ...collectSourceFiles(join(projectRoot, "server")),
    ];

    const filesWithFullStops = sourceFiles.filter((path) => readFileSync(path, "utf8").includes("。"));
    expect(filesWithFullStops).toEqual([]);
  });
});
