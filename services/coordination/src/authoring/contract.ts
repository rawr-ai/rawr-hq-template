import { contract as workflowContract } from "../service/modules/workflows/contract";

export const contract = workflowContract;

export type Contract = typeof contract;
