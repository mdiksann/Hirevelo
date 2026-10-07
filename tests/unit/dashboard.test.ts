import { expect, it } from "vitest";
import { activityDetails, jobActivityLabels } from "@/lib/activity";
it("maps stage/comment JSON safely without leaking unknown data", () => {
  expect(
    activityDetails({
      from: "APPLIED",
      to: "HIRED",
      comment: "Discussed portfolio",
      body: "private",
    }),
  ).toEqual({ from: "APPLIED", to: "HIRED", comment: "Discussed portfolio" });
  for (const data of [null, "bad", [], { from: "FAKE" }, { comment: 123 }])
    expect(activityDetails(data)).toEqual({
      from: null,
      to: null,
      comment: null,
    });
  expect(activityDetails({})).toEqual({ from: null, to: null, comment: null });
  expect(Object.values(jobActivityLabels)).toEqual([
    "Job created",
    "Job updated",
    "Job published",
    "Job closed",
    "Job archived",
  ]);
});
