import { GraphQLError, Kind, SelectionSetNode, ValidationRule } from "graphql";
import { positiveInteger } from "../config";

export function operationLimits(): ValidationRule {
  const maxDepth = positiveInteger("GRAPHQL_MAX_DEPTH", 8, 20);
  const maxFields = positiveInteger("GRAPHQL_MAX_FIELDS", 100, 1000);
  return context => ({
    Document(document) {
      const fragments = new Map(document.definitions.filter(def => def.kind === Kind.FRAGMENT_DEFINITION).map(def => [def.name.value, def]));
      const operations = document.definitions.filter(def => def.kind === Kind.OPERATION_DEFINITION);
      let fields = 0;
      let exceeded = operations.length !== 1;
      function inspect(set: SelectionSetNode, depth: number, seen: Set<string>) {
        if (exceeded) return;
        if (depth > maxDepth) { exceeded = true; return; }
        for (const node of set.selections) {
          if (exceeded) return;
          if (node.kind === Kind.FIELD) {
            if (++fields > maxFields) { exceeded = true; return; }
            if (node.selectionSet) inspect(node.selectionSet, depth + 1, seen);
          } else if (node.kind === Kind.INLINE_FRAGMENT) inspect(node.selectionSet, depth, seen);
          else {
            const fragment = fragments.get(node.name.value);
            if (seen.has(node.name.value)) { exceeded = true; return; }
            if (fragment) inspect(fragment.selectionSet, depth, new Set([...seen, node.name.value]));
          }
        }
      }
      for (const operation of operations) inspect(operation.selectionSet, 1, new Set());
      if (exceeded) context.reportError(new GraphQLError("Use one operation within the configured depth and field limits", { extensions: { code: "GRAPHQL_VALIDATION_FAILED" } }));
    },
  });
}
