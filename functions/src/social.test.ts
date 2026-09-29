import assert from "node:assert/strict";
import {describe, it} from "node:test";

import {isValidUsername, socialEdgeId, usernameKey} from "./social.js";

describe("social identity rules", () => {
  it("normalizes usernames for unique lookup", () => {
    assert.equal(usernameKey("  Harold_27 "), "harold_27");
  });

  it("accepts only portable usernames", () => {
    assert.equal(isValidUsername("Harold_27"), true);
    assert.equal(isValidUsername("ab"), false);
    assert.equal(isValidUsername("nombre con espacios"), false);
    assert.equal(isValidUsername("nombre-muy-largo-para-opocompit"), false);
  });

  it("builds the same edge id in both directions", () => {
    assert.equal(socialEdgeId("uid_b", "uid_a"), "uid_a_uid_b");
    assert.equal(socialEdgeId("uid_a", "uid_b"), "uid_a_uid_b");
  });
});
