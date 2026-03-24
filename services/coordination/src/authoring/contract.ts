import { contract as serviceContract } from "../service/contract";

export const contract = {
  listWorkflows: serviceContract.listWorkflows,
  saveWorkflow: serviceContract.saveWorkflow,
  getWorkflow: serviceContract.getWorkflow,
  validateWorkflow: serviceContract.validateWorkflow,
};

export type Contract = typeof contract;
