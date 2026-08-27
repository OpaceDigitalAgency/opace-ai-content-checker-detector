const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;

function result(valid, errors = []) {
  return { valid, errors };
}

export function validateProtectedSpan(span) {
  const errors = [];
  if (span.end_utf16 <= span.start_utf16) errors.push("utf16_range_empty_or_reversed");
  if (span.end_codepoint <= span.start_codepoint) errors.push("codepoint_range_empty_or_reversed");
  if (typeof span.text === "string") {
    if (span.end_utf16 - span.start_utf16 !== span.text.length) errors.push("utf16_length_mismatch");
    if (span.end_codepoint - span.start_codepoint !== [...span.text].length) errors.push("codepoint_length_mismatch");
  }
  if (!HASH_PATTERN.test(span.content_hash ?? "")) errors.push("source_hash_invalid");
  return result(errors.length === 0, errors);
}

export function validatePatternFinding(finding) {
  const errors = [];
  const span = finding.span ?? {};
  if (span.end_utf16 <= span.start_utf16) errors.push("utf16_range_empty_or_reversed");
  if (span.end_codepoint <= span.start_codepoint) errors.push("codepoint_range_empty_or_reversed");
  if (!HASH_PATTERN.test(finding.matched_text_hash ?? "")) errors.push("matched_text_hash_invalid");
  return result(errors.length === 0, errors);
}

export function validateContractSemantics(schemaName, value) {
  if (schemaName === "protected-span.schema.json") return validateProtectedSpan(value);
  if (schemaName === "pattern-finding.schema.json") return validatePatternFinding(value);
  return result(true);
}
