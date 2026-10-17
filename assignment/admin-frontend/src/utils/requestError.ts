import axios from "axios";

export function requestError(error: unknown, fallback: string): string {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 429) {
      const seconds = Number(error.response.headers?.["retry-after"]);
      return Number.isFinite(seconds) && seconds > 0
        ? `Too many requests. Please try again in ${Math.ceil(seconds)} seconds.`
        : "Too many requests. Please wait before trying again.";
    }
    if (error.response?.status === 401) return "Your session has expired. Please sign in again.";
    if ([400, 403, 404, 409, 413, 422].includes(error.response?.status ?? 0)) {
      const body = error.response?.data;
      if (typeof body?.message === "string") return body.message;
      if (Array.isArray(body?.errors) && body.errors.every((value: unknown) => typeof value === "string")) return body.errors.join(". ");
    }
  }
  if (error && typeof error === "object") {
    const graph = error as { statusCode?: number; errors?: { message: string; extensions?: { code?: string } }[] };
    if (graph.statusCode === 429) return "Too many requests. Please wait before trying again.";
    if (graph.statusCode === 401) return "Your session has expired. Please sign in again.";
    const expected = graph.errors?.find(item => ["BAD_USER_INPUT", "FORBIDDEN", "UNAUTHENTICATED"].includes(item.extensions?.code ?? ""));
    if (expected) return expected.message;
  }
  if (error instanceof Error && error.message.startsWith("This collection needs")) {
    return "This list exceeds the supported size. Please contact the project maintainer.";
  }
  return fallback;
}
