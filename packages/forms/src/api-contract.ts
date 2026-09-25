import type { FormSubmission } from "./models";

/** The `apps/api` forms route. `/api/contact` is retired in favour of this. */
export const formsApiPaths = {
  submit: (): `/${string}` => "/forms/submit"
};

export type SubmitFormRequest = FormSubmission;
