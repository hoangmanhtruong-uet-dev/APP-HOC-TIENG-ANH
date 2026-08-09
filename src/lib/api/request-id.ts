const REQUEST_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

export const REQUEST_ID_HEADER = "x-request-id";

export function isValidRequestId(value: string | null | undefined) {
  return Boolean(value && REQUEST_ID_PATTERN.test(value));
}

export function resolveRequestId(value: string | null | undefined): string {
  return isValidRequestId(value) ? value! : crypto.randomUUID();
}
