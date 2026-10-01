import assert from "node:assert/strict";
import {describe, it} from "node:test";

import {
  AdminCatalogValidationError,
  OfficialExamCatalogItem,
  parseAdminCatalogItem,
  TerritoryCatalogItem,
} from "./adminCatalog.js";

describe("admin catalog validation", () => {
  it("normalizes opposition and territory items", () => {
    assert.deepEqual(parseAdminCatalogItem("oppositions", "firefighters_es", {
      name: " Bomberos ", slug: "bomberos", active: true, priority: 10,
    }), {
      id: "firefighters_es", name: "Bomberos", slug: "bomberos", active: true, priority: 10,
    });
    const territory = parseAdminCatalogItem("territories", "cartagena", {
      label: "Cartagena", country: "es", autonomousCommunity: "Murcia",
      province: "Murcia", municipality: "Cartagena", specificBody: null,
      active: true, priority: 20,
    }) as TerritoryCatalogItem;
    assert.equal(territory.country, "ES");
  });

  it("rejects category cycles and invalid identifiers", () => {
    assert.throws(() => parseAdminCatalogItem("categories", "fires", {
      oppositionId: "firefighters_es", name: "Incendios", parentId: "fires",
      active: true, priority: 10,
    }), AdminCatalogValidationError);
    assert.throws(() => parseAdminCatalogItem("oppositions", "invalid id", {
      name: "Bomberos", slug: "bomberos", active: true, priority: 10,
    }), AdminCatalogValidationError);
  });

  it("validates official exam dates and rules", () => {
    const exam = parseAdminCatalogItem("officialExams", "cartagena_2025", {
      oppositionId: "firefighters_es",
      name: "Ayuntamiento de Cartagena 2025",
      date: "2025-06-15",
      year: 2025,
      territoryKeys: ["ES", "ES-Murcia", "ES-Murcia-Cartagena"],
      source: "Convocatoria oficial",
      status: "draft",
      rules: {
        questionCount: 100,
        durationSeconds: 7_200,
        correctPoints: 1,
        incorrectPenalty: 0.33,
        blankPoints: 0,
      },
    }) as OfficialExamCatalogItem;
    assert.equal(exam.name, "Ayuntamiento de Cartagena 2025");
    assert.throws(() => parseAdminCatalogItem("officialExams", "cartagena_2025", {
      ...exam, year: 2024,
    }), AdminCatalogValidationError);
  });
});
