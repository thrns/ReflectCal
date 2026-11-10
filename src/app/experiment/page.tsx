import type { Metadata } from "next";
import { ExperimentClient } from "@/components/experiments/experiment-client";

export const metadata: Metadata = { title: "Live experiment" };

export default function ExperimentPage() {
  return <ExperimentClient />;
}
