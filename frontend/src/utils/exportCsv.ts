export function exportToCsv(filename: string, rows: any[], headers?: string[]) {
  if (rows.length === 0) {
    console.warn("No data to export");
    return;
  }

  const keys = headers || Object.keys(rows[0]);

  const csvHeaders = keys.join(",");

  const csvRows = rows.map((row) => {
    return keys
      .map((key) => {
        let cell = row[key] ?? "";

        if (typeof cell === "object" && cell !== null) {
          cell = JSON.stringify(cell);
        }

        cell = String(cell).replace(/"/g, '""');

        if (cell.includes(",") || cell.includes('"') || cell.includes("\n")) {
          cell = `"${cell}"`;
        }

        return cell;
      })
      .join(",");
  });

  const csv = [csvHeaders, ...csvRows].join("\n");

  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });

  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Export CSV with simple headers and rows array
export function exportCSV(headers: string[], rows: any[][], filename: string) {
  if (rows.length === 0) {
    console.warn("No data to export");
    return;
  }

  const csvHeaders = headers.map(h => `"${String(h).replace(/"/g, '""')}"`).join(",");

  const csvRows = rows.map((row) => {
    return row.map(cell => {
      let c = cell ?? "";
      if (typeof c === "object" && c !== null) {
        c = JSON.stringify(c);
      }
      c = String(c).replace(/"/g, '""');
      return `"${c}"`;
    }).join(",");
  });

  const csv = [csvHeaders, ...csvRows].join("\n");
  const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
