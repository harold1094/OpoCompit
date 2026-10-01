import assert from "node:assert/strict";
import {describe, it} from "node:test";

import {getImportFilePath} from "./importCliArgs.js";

describe("getImportFilePath", () => {
  it("accepts the explicit --file argument", () => {
    assert.equal(
      getImportFilePath(["--file", "fixtures/questions.json"]),
      "fixtures/questions.json",
    );
  });

  it("accepts the positional path forwarded by npm 11", () => {
    assert.equal(
      getImportFilePath(["fixtures/questions.json"]),
      "fixtures/questions.json",
    );
  });
});
