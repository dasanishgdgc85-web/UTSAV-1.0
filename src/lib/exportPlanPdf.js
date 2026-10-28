import { jsPDF } from "jspdf";
import { EVENT_TYPE_LABELS, PRIORITY_LABELS, formatDate, formatMoney, midOf } from "./format";

export function exportPlanPdf({ plan, budget, tasks, vendors }) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 46;
  const width = pageW - M * 2;
  let y = M + 10;
  const currency = plan.currency || "INR";

  const need = (h) => {
    if (y + h > pageH - M) {
      doc.addPage();
      y = M + 10;
    }
  };
  const heading = (text) => {
    need(46);
    y += 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(38, 20, 55);
    doc.text(text, M, y);
    y += 6;
    doc.setDrawColor(226, 219, 235);
    doc.line(M, y, pageW - M, y);
    y += 15;
    doc.setTextColor(30, 25, 35);
  };
  const para = (text, size = 10, style = "normal", indent = 0) => {
    if (!text) return;
    doc.setFont("helvetica", style);
    doc.setFontSize(size);
    doc.splitTextToSize(String(text), width - indent).forEach((line) => {
      need(14);
      doc.text(line, M + indent, y);
      y += 13;
    });
  };
  const columns = (left, right, strong = false) => {
    const leftLines = doc.splitTextToSize(String(left || ""), width * 0.62);
    const rightLines = doc.splitTextToSize(String(right || ""), width * 0.35);
    const rows = Math.max(leftLines.length, rightLines.length);
    need(rows * 13 + 4);
    doc.setFont("helvetica", strong ? "bold" : "normal");
    doc.setFontSize(10);
    leftLines.forEach((line, idx) => doc.text(line, M, y + idx * 13));
    rightLines.forEach((line, idx) => doc.text(line, pageW - M, y + idx * 13, { align: "right" }));
    y += rows * 13 + 3;
  };

  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text(plan.title || "Celebration plan", M, y);
  y += 22;
  para(
    [
      EVENT_TYPE_LABELS[plan.event_type] || "Celebration",
      formatDate(plan.event_date),
      plan.guest_count ? `${plan.guest_count} guests` : "",
      plan.location || "",
      plan.venue_type ? `${plan.venue_type}` : "",
    ]
      .filter(Boolean)
      .join("  ·  "),
    11,
    "normal"
  );
  para(`Planned budget ${formatMoney(plan.budget_total, currency)}`, 11, "bold");

  if (plan.style || plan.dietary?.length || plan.cultural_traditions?.length || plan.must_haves?.length) {
    heading("The brief");
    if (plan.style) para(`Style: ${plan.style}`);
    if (plan.dietary?.length) para(`Dietary needs: ${plan.dietary.join(", ")}`);
    if (plan.cultural_traditions?.length) para(`Traditions: ${plan.cultural_traditions.join(", ")}`);
    if (plan.must_haves?.length) para(`Must-haves: ${plan.must_haves.join(", ")}`);
    if (plan.exclusions?.length) para(`Excluded: ${plan.exclusions.join(", ")}`);
    if (plan.accessibility_needs?.length) para(`Accessibility: ${plan.accessibility_needs.join(", ")}`);
  }

  heading("Budget");
  budget
    .slice()
    .sort((a, b) => midOf(b) - midOf(a))
    .forEach((item) => {
      columns(
        `${item.label}  ·  ${PRIORITY_LABELS[item.priority] || ""}${item.locked ? "  ·  locked" : ""}`,
        `${formatMoney(item.estimate_low, currency)} – ${formatMoney(item.estimate_high, currency)}`
      );
      if (item.rationale) para(item.rationale, 9, "italic", 10);
      if (item.hidden_cost_note) para(`Watch for: ${item.hidden_cost_note}`, 9, "normal", 10);
    });
  columns("Total", formatMoney(budget.reduce((sum, i) => sum + midOf(i), 0), currency), true);
  para("Estimates only — always confirm prices with vendors.", 9, "italic");

  heading("Timeline");
  const phases = [];
  tasks.forEach((task) => {
    const key = task.phase || "To schedule";
    if (!phases.some((p) => p.key === key)) phases.push({ key, items: [] });
    phases[phases.findIndex((p) => p.key === key)].items.push(task);
  });
  phases.forEach((phase) => {
    need(30);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text(phase.key, M, y);
    y += 15;
    phase.items
      .slice()
      .sort((a, b) => (a.due_date || "").localeCompare(b.due_date || ""))
      .forEach((task) => {
        columns(
          `${task.status === "done" ? "[x]" : "[ ]"} ${task.title}${task.is_at_risk ? "  (at risk)" : ""}`,
          `${task.due_date ? formatDate(task.due_date) : ""}  ·  ${task.owner || ""}`
        );
        if (task.description) para(task.description, 9, "normal", 12);
      });
  });

  heading("Vendors");
  vendors.forEach((vendor) => {
    columns(
      `${vendor.vendor_type}${vendor.essential ? "  ·  essential" : "  ·  optional"}`,
      `${vendor.name || "Not chosen yet"}${vendor.status ? `  ·  ${vendor.status.replace(/_/g, " ")}` : ""}`
    );
    if (vendor.why) para(vendor.why, 9, "italic", 12);
    if (vendor.questions?.length) para(`Ask: ${vendor.questions.join(" · ")}`, 9, "normal", 12);
    if (vendor.contract_checks?.length) para(`Check in the contract: ${vendor.contract_checks.join(" · ")}`, 9, "normal", 12);
    if (vendor.red_flags?.length) para(`Red flags: ${vendor.red_flags.join(" · ")}`, 9, "normal", 12);
  });

  if (plan.assumptions?.length) {
    heading("Assumptions to check");
    plan.assumptions.forEach((a) => para(`• ${a}`, 9));
  }

  need(40);
  y += 12;
  para("Planning guidance only, not legal, tax or financial advice. Prices are estimates to verify with vendors.", 8, "italic");

  const file = `${(plan.title || "celebration-plan").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}.pdf`;
  doc.save(file);
}