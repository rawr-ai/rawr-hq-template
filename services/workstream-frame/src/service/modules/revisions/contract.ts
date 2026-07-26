/**
 * @fileoverview Revisions-module boundary contract.
 *
 * @remarks
 * A revision is a whole coherent version of the work stream. Forking one gives
 * somewhere to try a change — reshaping the frame, resolving a blocker
 * speculatively, letting two agents work without colliding — without that work
 * being visible as truth until it is promoted.
 *
 * Five operations:
 * - `fork` starts a candidate from an existing revision.
 * - `preview` reports what promoting it would do, changing nothing.
 * - `promote` folds a candidate into the committed revision.
 * - `abandon` records that a candidate was set aside. Its history remains.
 * - `list` reports every revision and where it sits.
 *
 * Note what `abandon` is *not*: a delete. A candidate that was not promoted is
 * superseded, and superseding is something you record, not something you erase.
 *
 * @agents
 * Isolation and promotion are supplied by the substrate. This module owns only
 * the vocabulary and the decision of what may be promoted.
 */
import { schema } from "@rawr/hq-sdk";
import { Type } from "typebox";
import { ocBase } from "../../base";
import { PromotionSchema, RevisionSchema } from "../../model/dto/revision";
import {
  LEDGER_UNAVAILABLE,
  READ_ONLY_MODE,
  REVISION_ALREADY_EXISTS,
  REVISION_NOT_CANDIDATE,
  REVISION_NOT_FOUND,
} from "../../model/errors/boundary-errors";

const RevisionName = Type.String({
  minLength: 1,
  maxLength: 120,
  description: "Revision name, unique within the work stream.",
});

const Note = Type.Optional(
  Type.String({ maxLength: 2000, description: "Why this was done. Recorded durably." })
);

/** Caller-visible boundary for every revision procedure in this module. */
export const contract = {
  fork: ocBase
    .meta({ idempotent: false, entity: "revision" })
    .input(
      schema(
        Type.Object(
          {
            revision: RevisionName,
            from: Type.Optional(
              Type.String({
                minLength: 1,
                maxLength: 120,
                description: "Revision to fork from. Defaults to the committed revision.",
              })
            ),
          },
          { additionalProperties: false, description: "Start a candidate revision." }
        )
      )
    )
    .output(schema(RevisionSchema))
    .errors({ READ_ONLY_MODE, REVISION_ALREADY_EXISTS, REVISION_NOT_FOUND, LEDGER_UNAVAILABLE }),

  preview: ocBase
    .meta({ idempotent: true, entity: "revision" })
    .input(
      schema(
        Type.Object(
          { revision: RevisionName },
          {
            additionalProperties: false,
            description: "Report what promoting this candidate would do.",
          }
        )
      )
    )
    .output(
      schema(
        Type.Object(
          {
            revision: RevisionName,
            into: Type.String({ description: "Committed revision it would fold into." }),
            ahead: Type.Number({ minimum: 0, description: "Commits the candidate has." }),
            behind: Type.Number({ minimum: 0, description: "Commits the committed line has." }),
            conflicts: Type.Number({
              minimum: 0,
              description: "Subjects both lines wrote after diverging.",
            }),
            fastForward: Type.Boolean({
              description: "True when the committed line has not advanced since the fork.",
            }),
            mergeable: Type.Boolean({
              description: "Substrate's opinion. Not a guarantee — lines may diverge further.",
            }),
          },
          { additionalProperties: false, description: "What promotion would do." }
        )
      )
    )
    .errors({ REVISION_NOT_FOUND, REVISION_NOT_CANDIDATE, LEDGER_UNAVAILABLE }),

  promote: ocBase
    .meta({ idempotent: false, entity: "revision" })
    .input(
      schema(
        Type.Object(
          { revision: RevisionName, note: Note },
          {
            additionalProperties: false,
            description: "Fold a candidate into the committed revision.",
          }
        )
      )
    )
    .output(schema(PromotionSchema))
    .errors({
      READ_ONLY_MODE,
      REVISION_NOT_FOUND,
      REVISION_NOT_CANDIDATE,
      LEDGER_UNAVAILABLE,
    }),

  abandon: ocBase
    .meta({ idempotent: false, entity: "revision" })
    .input(
      schema(
        Type.Object(
          { revision: RevisionName, note: Note },
          { additionalProperties: false, description: "Record that a candidate was set aside." }
        )
      )
    )
    .output(schema(RevisionSchema))
    .errors({
      READ_ONLY_MODE,
      REVISION_NOT_FOUND,
      REVISION_NOT_CANDIDATE,
      LEDGER_UNAVAILABLE,
    }),

  list: ocBase
    .meta({ idempotent: true, entity: "revision" })
    .input(
      schema(Type.Object({}, { additionalProperties: false, description: "List every revision." }))
    )
    .output(
      schema(
        Type.Object(
          {
            committed: Type.String({ description: "Name of the committed revision." }),
            revisions: Type.Array(RevisionSchema),
          },
          { additionalProperties: false, description: "Every revision of this work stream." }
        )
      )
    )
    .errors({ LEDGER_UNAVAILABLE }),
};
