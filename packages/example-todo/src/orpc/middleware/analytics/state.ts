import type { BaseMetadata } from "../../base";
import type { AnalyticsPayloadContributor } from "./types";

type AnalyticsState = {
  requiredContributor?: AnalyticsPayloadContributor<any, any>;
  localContributors?: AnalyticsPayloadContributor<any, any>[];
};

const analyticsState = new WeakMap<object, AnalyticsState>();

function getAnalyticsCarrier(context: object) {
  const maybeInvocation = (context as { invocation?: object }).invocation;
  if (typeof maybeInvocation === "object" && maybeInvocation !== null) {
    return maybeInvocation;
  }

  const maybeProvided = (context as { provided?: object }).provided;
  return typeof maybeProvided === "object" && maybeProvided !== null ? maybeProvided : context;
}

function getAnalyticsState(context: object) {
  const carrier = getAnalyticsCarrier(context);
  let state = analyticsState.get(carrier);
  if (!state) {
    state = {};
    analyticsState.set(carrier, state);
  }

  return state;
}

export function clearAnalyticsState(context: object) {
  analyticsState.delete(getAnalyticsCarrier(context));
}

export function getRequiredAnalyticsContributor<
  TMeta extends BaseMetadata,
  TContext extends object,
>(context: TContext) {
  return getAnalyticsState(context).requiredContributor as
    | AnalyticsPayloadContributor<TMeta, TContext>
    | undefined;
}

export function setRequiredAnalyticsContributor<
  TMeta extends BaseMetadata,
  TContext extends object,
>(
  context: TContext,
  contributor: AnalyticsPayloadContributor<TMeta, TContext>,
) {
  getAnalyticsState(context).requiredContributor = contributor as AnalyticsPayloadContributor<any, any>;
}

export function getLocalAnalyticsContributors<
  TMeta extends BaseMetadata,
  TContext extends object,
>(context: TContext) {
  const state = getAnalyticsState(context);
  state.localContributors ??= [];
  return state.localContributors as AnalyticsPayloadContributor<TMeta, TContext>[];
}

export function peekLocalAnalyticsContributors<
  TMeta extends BaseMetadata,
  TContext extends object,
>(context: TContext) {
  return analyticsState.get(getAnalyticsCarrier(context))?.localContributors as
    | AnalyticsPayloadContributor<TMeta, TContext>[]
    | undefined;
}
