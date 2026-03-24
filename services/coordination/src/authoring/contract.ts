import { contract as serviceContract } from "../service/contract";

export const contract = serviceContract.workflows;

export type Contract = typeof contract;
