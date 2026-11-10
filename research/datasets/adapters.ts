import type { Question } from "../../src/lib/experiments/types";

/**
 * Future dataset connectors should normalize source records into this interface.
 * They must retain source identifiers/versions and independently validate the key.
 */
export interface DatasetAdapter {
  readonly sourceDataset: string;
  readonly sourceVersion: string;
  load(split: "research" | "playground"): Promise<Question[]>;
}

/**
 * MMLU-Pro is intentionally an interface only in M0. A future adapter should
 * pin a release or commit, map its subject and choices, validate keys locally,
 * and keep licensing/provenance metadata with the normalized records.
 */
export interface MmluProAdapter extends DatasetAdapter {
  readonly sourceDataset: "MMLU-Pro";
}
