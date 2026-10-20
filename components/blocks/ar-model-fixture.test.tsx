// @vitest-environment node
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { afterAll, describe, expect, it } from "vitest";
import { arModelBlock } from "@/components/blocks/ar-model";

/**
 * W4 — the 3D/AR block is tested against a LOCAL FIXTURE ONLY. OSI has sent
 * no model, so none is committed: the fixture is a few dozen bytes of valid
 * glTF 2.0 binary generated into the OS temp directory at test time and
 * deleted afterwards. A model that isn't OSI's must never reach the repo or
 * the live site; the last test fails if anyone adds one.
 */
function minimalGlb(): Buffer {
  const json = Buffer.from('{"asset":{"version":"2.0"}}', "utf8");
  const padded = Buffer.concat([json, Buffer.alloc((4 - (json.length % 4)) % 4, 0x20)]);
  const header = Buffer.alloc(12);
  header.writeUInt32LE(0x46546c67, 0); // "glTF"
  header.writeUInt32LE(2, 4);
  header.writeUInt32LE(12 + 8 + padded.length, 8);
  const chunk = Buffer.alloc(8);
  chunk.writeUInt32LE(padded.length, 0);
  chunk.writeUInt32LE(0x4e4f534a, 4); // "JSON"
  return Buffer.concat([header, chunk, padded]);
}

const dir = mkdtempSync(path.join(tmpdir(), "osi-glb-fixture-"));
afterAll(() => rmSync(dir, { recursive: true, force: true }));

describe("3D/AR block with a local fixture model", () => {
  const glb = path.join(dir, "fixture.glb");
  writeFileSync(glb, minimalGlb());

  it("the generated fixture is a well-formed binary glTF", () => {
    const bytes = readFileSync(glb);
    expect(bytes.subarray(0, 4).toString("ascii")).toBe("glTF");
    expect(bytes.readUInt32LE(8)).toBe(bytes.length);
  });

  it("the block accepts the fixture, and refuses it once the paired .usdz is missing", () => {
    const data = {
      background: "cream",
      spacingTop: "md",
      spacingBottom: "md",
      glbUrl: pathToFileURL(glb).href,
      usdzUrl: pathToFileURL(path.join(dir, "fixture.usdz")).href,
      alt: "Fixture model for tests",
    };
    expect(arModelBlock.schema.safeParse(data).success).toBe(true);
    expect(arModelBlock.schema.safeParse({ ...data, usdzUrl: "" }).success).toBe(false);
  });

  it("no 3D model file is tracked in git", () => {
    const tracked = execFileSync("git", ["ls-files"], { encoding: "utf8", cwd: process.cwd() }).split("\n");
    expect(tracked.filter((file) => /\.(glb|gltf|usdz|obj|fbx|stl|3ds|blend)$/i.test(file))).toEqual([]);
  });
});
