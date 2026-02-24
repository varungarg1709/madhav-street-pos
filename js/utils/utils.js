function formatDateUI(dateStr) {
  if (!dateStr) return "-";

  const d = new Date(dateStr);

  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}