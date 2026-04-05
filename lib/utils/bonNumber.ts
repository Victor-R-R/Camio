export function getBonNumber(createdAt: Date, sequenceIndex: number): string {
  const year = createdAt.getFullYear();
  return `BT-${year}-${String(sequenceIndex).padStart(4, "0")}`;
}
