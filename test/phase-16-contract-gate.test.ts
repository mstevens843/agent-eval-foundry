import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  checkerHiddenVocabularyContract,
  daoCalibrationContract,
  locallyObservableContract,
  originalPhase15WafPacketAsContract,
  repairedWafContract,
  runPhase16Calibration,
} from "../src/phase-16/calibration.js";
import { auditCandidateContract, contractGateB6 } from "../src/phase-16/contract-gate.js";
import { phase16CandidateContracts } from "../src/phase-16/contracts.js";

const root = resolve(import.meta.dirname, "..");

describe("Phase 16 candidate-contract gate", () => {
  it("accepts the repaired WAF and DAO calibration contracts", () => {
    expect(auditCandidateContract(repairedWafContract(root)).status).toBe("accepted");
    expect(auditCandidateContract(daoCalibrationContract(root)).status).toBe("accepted");
  });

  it("finds every Phase 15 WAF drafting omission named by both readers", () => {
    const result = auditCandidateContract(originalPhase15WafPacketAsContract(root));
    expect(result.status).toBe("rejected");
    const codes = result.deficiencies.map((row) => row.code);
    expect(codes).toEqual(
      expect.arrayContaining([
        "missing-grammar",
        "missing-transition-semantics",
        "missing-deterministic-meter",
        "missing-numeric-threshold",
        "missing-threshold-derivation",
        "missing-hidden-envelope",
      ]),
    );
  });

  it("rejects unpublished checker vocabulary and locally visible witnesses", () => {
    expect(
      auditCandidateContract(checkerHiddenVocabularyContract(root)).deficiencies.map((row) => row.code),
    ).toContain("unknown-rule-reference");
    expect(
      auditCandidateContract(locallyObservableContract(root)).deficiencies.map((row) => row.code),
    ).toEqual(expect.arrayContaining(["crossable-authority-boundary", "locally-observable-witness"]));
  });

  it("refuses malformed input instead of grading it", () => {
    expect(auditCandidateContract({})).toMatchObject({ status: "refused", candidateId: null });
    expect(auditCandidateContract([])).toMatchObject({ status: "refused", candidateId: null });
  });

  it("runs known-good, known-bad, malformed and nondegenerate B6 controls together", () => {
    const result = contractGateB6(repairedWafContract(root), originalPhase15WafPacketAsContract(root));
    expect(result).toMatchObject({
      usable: true,
      sameInvocation: true,
      knownGoodPassed: true,
      knownBadFailed: true,
      malformedInputRefused: true,
      nondegenerate: true,
    });
  });

  it("freezes only when every calibration control holds", () => {
    const result = runPhase16Calibration(root);
    expect(result.b6.usable).toBe(true);
    expect(result.controls).toHaveLength(6);
    expect(result.controls.every((row) => row.held)).toBe(true);
  });

  it("accepts every prospective contract without filling deficiencies", () => {
    const contracts = phase16CandidateContracts(root);
    expect(contracts).toHaveLength(6);
    expect(
      contracts.map((contract) => ({
        candidateId: contract.candidateId,
        result: auditCandidateContract(contract),
      })),
    ).toEqual(
      contracts.map((contract) => ({
        candidateId: contract.candidateId,
        result: expect.objectContaining({ status: "accepted", deficiencies: [] }),
      })),
    );
  });
});
