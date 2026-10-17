import { requestError } from "./requestError";

const responseError = (status: number, data = {}, headers = {}) => ({ isAxiosError: true, response: { status, data, headers } });

test("REST throttling gives a retry delay rather than a credentials or validation error", () => {
  expect(requestError(responseError(429, {}, { "retry-after": "12" }), "Incorrect password")).toBe("Too many requests. Please try again in 12 seconds.");
  expect(requestError(responseError(429), "Save failed")).toMatch(/Too many requests/);
});

test("expected input errors are shown but unexpected server details remain hidden", () => {
  expect(requestError(responseError(400, { message: "Maximum 20 venues allowed" }), "Save failed")).toBe("Maximum 20 venues allowed");
  expect(requestError(responseError(500, { message: "Private SQL details" }), "Save failed")).toBe("Save failed");
});

test("GraphQL HTTP throttling and validation errors are readable", () => {
  expect(requestError({ statusCode: 429 }, "Save failed")).toMatch(/Too many requests/);
  expect(requestError({ errors: [{ message: "Invalid capacity", extensions: { code: "BAD_USER_INPUT" } }] }, "Save failed")).toBe("Invalid capacity");
  expect(requestError({ statusCode: 401 }, "Save failed")).toMatch(/sign in again/);
});
