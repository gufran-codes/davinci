/** Remove legacy generated answer-framing, preserving authored explanations. */
export function choiceLabel(value: string, label?: string): string {
  if (!label) return value;
  if (
    /^(?:The (?:explanation I would choose is|text supports this interpretation|evidence supports this choice|description that fits is|meaning that fits here is|part or system involved is|main idea is about|point in the sequence is|solution values satisfy)|Use [“"].*to complete the language task)/i.test(
      label,
    )
  )
    return value;
  if (
    /^(?:The (?:fraction is|numerator would be|denominator would be|earlier year would be|count would be|measurement would be|mass would be|amount would be|value that fits would be|result would be)|There would be|Each group would contain)/i.test(
      label,
    )
  )
    return value;
  return label;
}
