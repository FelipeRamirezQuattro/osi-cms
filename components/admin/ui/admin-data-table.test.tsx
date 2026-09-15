import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { AdminDataTable, type AdminDataTableColumn } from "@/components/admin/ui/admin-data-table";

type Row = { id: string; name: string };

const columns: AdminDataTableColumn<Row>[] = [
  { key: "name", header: "Name", render: (row) => row.name },
];

afterEach(cleanup);

describe("AdminDataTable", () => {
  it("renders one row per item, keyed by getRowKey", () => {
    const rows: Row[] = [
      { id: "1", name: "Alpha" },
      { id: "2", name: "Beta" },
    ];
    render(<AdminDataTable columns={columns} rows={rows} getRowKey={(r) => r.id} />);

    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.getAllByRole("row")).toHaveLength(3); // header + 2 rows
  });

  it("shows the empty message spanning every column when there are no rows", () => {
    render(<AdminDataTable columns={columns} rows={[]} getRowKey={(r) => r.id} emptyMessage="No products yet." />);

    expect(screen.getByText("No products yet.")).toBeInTheDocument();
    const emptyCell = screen.getByText("No products yet.").closest("td");
    expect(emptyCell).toHaveAttribute("colspan", String(columns.length));
  });

  it("falls back to the default empty message when none is provided", () => {
    render(<AdminDataTable columns={columns} rows={[]} getRowKey={(r) => r.id} />);
    expect(screen.getByText("No results yet.")).toBeInTheDocument();
  });

  it("plain variant renders the table without the panel wrapper box", () => {
    const { container } = render(
      <AdminDataTable columns={columns} rows={[]} getRowKey={(r) => r.id} variant="plain" />,
    );
    expect(container.querySelector(".border-osi-sand-300.bg-osi-white")).not.toBeInTheDocument();
    expect(container.querySelector("table")).toBeInTheDocument();
  });

  it("defaults a panel table's inner scroller to overflow-x-auto (Task 13a: horizontal scroll, not clipping)", () => {
    const { container } = render(<AdminDataTable columns={columns} rows={[]} getRowKey={(r) => r.id} />);
    expect(container.querySelector(".overflow-x-auto")).toBeInTheDocument();
  });

  it("still supports opting into overflow-hidden", () => {
    const { container } = render(
      <AdminDataTable columns={columns} rows={[]} getRowKey={(r) => r.id} overflow="hidden" />,
    );
    expect(container.querySelector(".overflow-x-auto")).not.toBeInTheDocument();
  });

  it("renders a toolbar slot above the table for panel variant", () => {
    render(
      <AdminDataTable
        columns={columns}
        rows={[]}
        getRowKey={(r) => r.id}
        toolbar={<div data-testid="toolbar">Filters</div>}
      />,
    );
    expect(screen.getByTestId("toolbar")).toBeInTheDocument();
  });
});
