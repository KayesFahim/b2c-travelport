import PDFDocument from "pdfkit";
import type PDFKit from "pdfkit";

const PAGE_MARGIN = 40;
const COLORS = {
  pageBackground: "#F1F7FC",
  white: "#FFFFFF",
  border: "#DFE7EF",
  muted: "#607890",
  heading: "#15324F",
  primary: "#0F4B7D",
  badgeBg: "#E8F3FF",
  badgeBorder: "#BFE0FF",
  badgeText: "#15488C",
  successBg: "#E6F9EE",
  successBorder: "#C9EAD7",
  successText: "#1A7A41",
  alertText: "#C0392B",
  tableHeaderBg: "#F4F7FA",
  notesBg: "#FCFDFD",
  notesBorder: "#CCDBEA",
};

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export type PdfItineraryRow = {
  route: string;
  airlineFlight: string;
  departure: string;
  arrival: string;
  terminal: string;
  cabinClass: string;
};

export type PdfPassengerRow = {
  name: string;
  paxType: string;
  gender: string;
  dob: string;
  passportNo: string;
  ticketNo: string;
};

export type PdfFareRow = {
  paxType: string;
  count: string;
  baseFare: string;
  taxesAndFees: string;
  total: string;
};

type RenderPdfParams = {
  copyType: string;
  status: string;
  name: string;
  locator: string;
  reservationId: string;
  route: string;
  travelDate: string;
  flightType?: string;
  airlinesPnr?: string;
  amount?: string;
  ticketInfo?: string;
  dateLabel: string;
  itineraryRows?: PdfItineraryRow[];
  passengerRows?: PdfPassengerRow[];
  fareRows?: PdfFareRow[];
};

type TableAlign = "left" | "right" | "center";

function toText(value: unknown): string {
  return String(value ?? "").trim();
}

function formatDate(value: unknown): string {
  const raw = toText(value);
  if (!raw) return "N/A";
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  const day = String(parsed.getUTCDate()).padStart(2, "0");
  const month = MONTH_NAMES[parsed.getUTCMonth()] || "";
  const year = parsed.getUTCFullYear();
  return `${day} ${month} ${year}`;
}

function formatNow(value = new Date()): string {
  const day = String(value.getUTCDate()).padStart(2, "0");
  const month = MONTH_NAMES[value.getUTCMonth()] || "";
  const year = value.getUTCFullYear();
  const hh = String(value.getUTCHours()).padStart(2, "0");
  const mm = String(value.getUTCMinutes()).padStart(2, "0");
  return `${day} ${month} ${year} ${hh}:${mm} UTC`;
}

function parseAmount(value: unknown): {
  currency: string;
  amount: number | null;
  raw: string;
} {
  const raw = toText(value);
  const currencyMatch = raw.match(/\b[A-Z]{3}\b/);
  const currency = currencyMatch?.[0] || "";
  const numericRaw = raw.replace(/[^0-9.-]/g, "");
  const amount = numericRaw ? Number(numericRaw) : Number.NaN;
  return {
    currency,
    amount: Number.isFinite(amount) ? amount : null,
    raw,
  };
}

function formatMoneyValue(amount: number | null, currency: string, fallback = "N/A"): string {
  if (amount === null) return fallback;
  const formatted = amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${currency ? `${currency} ` : ""}${formatted}`;
}

function resolveTotalAmountLabel(amount: unknown, fareRows: PdfFareRow[]): string {
  const parsedAmount = parseAmount(amount);
  if (parsedAmount.amount !== null) {
    return formatMoneyValue(parsedAmount.amount, parsedAmount.currency, parsedAmount.raw || "N/A");
  }

  let total = 0;
  let hasNumeric = false;
  let currency = parsedAmount.currency;
  fareRows.forEach((row) => {
    const parsedRow = parseAmount(row.total);
    if (parsedRow.amount !== null) {
      total += parsedRow.amount;
      hasNumeric = true;
      if (!currency && parsedRow.currency) {
        currency = parsedRow.currency;
      }
    }
  });

  if (hasNumeric) {
    return formatMoneyValue(total, currency);
  }
  return parsedAmount.raw || "N/A";
}

function resolveFareSummary(fareRows: PdfFareRow[], fallbackAmount: unknown): {
  base: string;
  taxes: string;
  total: string;
} {
  let base = 0;
  let taxes = 0;
  let total = 0;
  let currency = "";
  let hasBase = false;
  let hasTaxes = false;
  let hasTotal = false;

  fareRows.forEach((row) => {
    const parsedBase = parseAmount(row.baseFare);
    if (parsedBase.amount !== null) {
      base += parsedBase.amount;
      hasBase = true;
      if (!currency && parsedBase.currency) currency = parsedBase.currency;
    }

    const parsedTaxes = parseAmount(row.taxesAndFees);
    if (parsedTaxes.amount !== null) {
      taxes += parsedTaxes.amount;
      hasTaxes = true;
      if (!currency && parsedTaxes.currency) currency = parsedTaxes.currency;
    }

    const parsedTotal = parseAmount(row.total);
    if (parsedTotal.amount !== null) {
      total += parsedTotal.amount;
      hasTotal = true;
      if (!currency && parsedTotal.currency) currency = parsedTotal.currency;
    }
  });

  const fallbackParsed = parseAmount(fallbackAmount);
  if (!currency && fallbackParsed.currency) {
    currency = fallbackParsed.currency;
  }

  const computedTotal = hasTotal ? total : fallbackParsed.amount;
  return {
    base: hasBase ? formatMoneyValue(base, currency) : "N/A",
    taxes: hasTaxes ? formatMoneyValue(taxes, currency) : "N/A",
    total: formatMoneyValue(computedTotal, currency, resolveTotalAmountLabel(fallbackAmount, fareRows)),
  };
}

function drawPageBackground(doc: PDFKit.PDFDocument) {
  const width = doc.page.width - PAGE_MARGIN * 2;
  const height = doc.page.height - PAGE_MARGIN * 2;
  doc.save();
  doc.roundedRect(PAGE_MARGIN, PAGE_MARGIN, width, height, 10).fill(COLORS.pageBackground);
  doc.restore();
}

function drawBadge(
  doc: PDFKit.PDFDocument,
  params: {
    x: number;
    y: number;
    width: number;
    text: string;
    fill: string;
    border: string;
    color: string;
  }
) {
  const height = 22;
  doc.save();
  doc.lineWidth(1).strokeColor(params.border).fillColor(params.fill);
  doc.roundedRect(params.x, params.y, params.width, height, 5).fillAndStroke();
  doc.fillColor(params.color).font("Helvetica-Bold").fontSize(9).text(params.text, params.x, params.y + 7, {
    width: params.width,
    align: "center",
  });
  doc.restore();
}

function drawHeader(doc: PDFKit.PDFDocument, params: Pick<RenderPdfParams, "copyType" | "status">): number {
  const x = PAGE_MARGIN + 18;
  const width = doc.page.width - (PAGE_MARGIN + 18) * 2;
  const brandWidth = 150;
  const brandHeight = 44;

  doc.save();
  doc.fillColor(COLORS.primary).roundedRect(x, PAGE_MARGIN + 18, brandWidth, brandHeight, 6).fill();
  doc.fillColor(COLORS.white).font("Helvetica-Bold").fontSize(21).text("Fly Jatt", x, PAGE_MARGIN + 31, {
    width: brandWidth,
    align: "center",
  });

  doc.font("Helvetica").fontSize(9).fillColor(COLORS.muted);
  doc.text("Mirpur-14, Dhaka 1216", x, PAGE_MARGIN + 69);
  doc.text("Email: info@flyjatt.com | Phone: +8801736-987906", x, PAGE_MARGIN + 82);

  const badgeRight = x + width;
  const badgeWidth = 128;
  drawBadge(doc, {
    x: badgeRight - badgeWidth,
    y: PAGE_MARGIN + 18,
    width: badgeWidth,
    text: params.copyType || "Booking Copy",
    fill: COLORS.badgeBg,
    border: COLORS.badgeBorder,
    color: COLORS.badgeText,
  });
  drawBadge(doc, {
    x: badgeRight - badgeWidth,
    y: PAGE_MARGIN + 45,
    width: badgeWidth,
    text: params.status || "Booked",
    fill: COLORS.successBg,
    border: COLORS.successBorder,
    color: COLORS.successText,
  });

  doc.fontSize(8).fillColor(COLORS.muted).text(`Generated: ${formatNow()}`, badgeRight - 180, PAGE_MARGIN + 77, {
    width: 180,
    align: "right",
  });
  doc.restore();

  return PAGE_MARGIN + 108;
}

function drawCardContainer(doc: PDFKit.PDFDocument, x: number, y: number, width: number, height: number) {
  doc.save();
  doc.lineWidth(1).strokeColor(COLORS.border).fillColor(COLORS.white);
  doc.roundedRect(x, y, width, height, 8).fillAndStroke();
  doc.restore();
}

function drawCardHeader(doc: PDFKit.PDFDocument, x: number, y: number, width: number, title: string) {
  doc.save();
  doc.fillColor(COLORS.primary).rect(x + 1, y + 1, width - 2, 24).fill();
  doc.fillColor(COLORS.white).font("Helvetica-Bold").fontSize(10).text(title, x + 12, y + 8, {
    width: width - 24,
  });
  doc.restore();
}

function drawInfoSummary(
  doc: PDFKit.PDFDocument,
  x: number,
  y: number,
  width: number,
  rows: Array<{ label: string; value: string; color?: string; valueSize?: number }>
): number {
  const cardHeight = 72;
  drawCardContainer(doc, x, y, width, cardHeight);
  const colWidth = width / rows.length;

  rows.forEach((row, index) => {
    const colX = x + colWidth * index;
    if (index > 0) {
      doc.save();
      doc.lineWidth(1).strokeColor(COLORS.border).moveTo(colX, y + 10).lineTo(colX, y + cardHeight - 10).stroke();
      doc.restore();
    }

    doc.font("Helvetica").fontSize(8).fillColor(COLORS.muted).text(row.label.toUpperCase(), colX + 10, y + 14, {
      width: colWidth - 20,
    });
    doc
      .font("Helvetica-Bold")
      .fontSize(row.valueSize || 10)
      .fillColor(row.color || COLORS.heading)
      .text(row.value || "N/A", colX + 10, y + 30, {
        width: colWidth - 20,
      });
  });

  return y + cardHeight + 12;
}

function drawTable(
  doc: PDFKit.PDFDocument,
  params: {
    x: number;
    y: number;
    width: number;
    columnRatios: number[];
    header: string[];
    rows: string[][];
    rowHeight?: number;
    alignments?: TableAlign[];
    firstColumnBold?: boolean;
  }
): number {
  const rowHeight = params.rowHeight || 26;
  const alignments = params.alignments || [];
  const widths = params.columnRatios.map((ratio) => Math.floor(params.width * ratio));
  const widthUsed = widths.reduce((sum, size) => sum + size, 0);
  widths[widths.length - 1] += params.width - widthUsed;

  const renderRow = (rowY: number, values: string[], isHeader: boolean) => {
    let cursorX = params.x;
    for (let colIndex = 0; colIndex < widths.length; colIndex += 1) {
      const cellWidth = widths[colIndex];
      const text = toText(values[colIndex]) || "N/A";
      const align = alignments[colIndex] || "left";

      doc
        .font(isHeader || (params.firstColumnBold && colIndex === 0) ? "Helvetica-Bold" : "Helvetica")
        .fontSize(8.5)
        .fillColor(isHeader ? COLORS.muted : COLORS.heading)
        .text(text, cursorX + 6, rowY + 8, {
          width: cellWidth - 12,
          align,
        });

      if (colIndex < widths.length - 1) {
        doc.save();
        doc.lineWidth(1).strokeColor(COLORS.border);
        doc.moveTo(cursorX + cellWidth, rowY).lineTo(cursorX + cellWidth, rowY + rowHeight).stroke();
        doc.restore();
      }
      cursorX += cellWidth;
    }
  };

  doc.save();
  doc.lineWidth(1).strokeColor(COLORS.border).fillColor(COLORS.tableHeaderBg);
  doc.rect(params.x, params.y, params.width, rowHeight).fillAndStroke();
  doc.restore();
  renderRow(params.y, params.header, true);

  let cursorY = params.y + rowHeight;
  params.rows.forEach((row, rowIndex) => {
    const fill = rowIndex % 2 === 0 ? COLORS.white : "#FAFCFE";
    doc.save();
    doc.lineWidth(1).strokeColor(COLORS.border).fillColor(fill);
    doc.rect(params.x, cursorY, params.width, rowHeight).fillAndStroke();
    doc.restore();
    renderRow(cursorY, row, false);
    cursorY += rowHeight;
  });

  return cursorY;
}

function drawNotesBox(doc: PDFKit.PDFDocument, x: number, y: number, width: number): number {
  const height = 70;
  doc.save();
  doc.lineWidth(1).dash(3, { space: 2 }).strokeColor(COLORS.notesBorder).fillColor(COLORS.notesBg);
  doc.roundedRect(x, y, width, height, 6).fillAndStroke();
  doc.undash();
  doc.font("Helvetica-Bold").fontSize(9).fillColor(COLORS.alertText).text("Important Information:", x + 10, y + 10);
  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(COLORS.muted)
    .text(
      "All payments should be made in favor of Fly Jatt. This invoice is valid only with the official receipt. A 3% bank charge may apply for card payments.",
      x + 10,
      y + 24,
      { width: width - 20, lineGap: 2 }
    );
  doc.restore();
  return y + height;
}

function renderTravelPdf(doc: PDFKit.PDFDocument, params: RenderPdfParams) {
  drawPageBackground(doc);
  const contentX = PAGE_MARGIN + 18;
  const contentWidth = doc.page.width - (PAGE_MARGIN + 18) * 2;

  const itineraryRows =
    Array.isArray(params.itineraryRows) && params.itineraryRows.length
      ? params.itineraryRows
      : [
          {
            route: toText(params.route) || "N/A",
            airlineFlight: "N/A",
            departure: formatDate(params.travelDate),
            arrival: "N/A",
            terminal: "TBA",
            cabinClass: "Economy",
          },
        ];

  const passengerRows =
    Array.isArray(params.passengerRows) && params.passengerRows.length
      ? params.passengerRows
      : [
          {
            name: toText(params.name) || "Traveler",
            paxType: "ADT",
            gender: "N/A",
            dob: "N/A",
            passportNo: "N/A",
            ticketNo: toText(params.ticketInfo) || "N/A",
          },
        ];

  const fareRows =
    Array.isArray(params.fareRows) && params.fareRows.length
      ? params.fareRows
      : [
          {
            paxType: "ADT",
            count: "1",
            baseFare: formatMoneyValue(parseAmount(params.amount).amount, parseAmount(params.amount).currency, "N/A"),
            taxesAndFees:
              parseAmount(params.amount).amount === null
                ? "N/A"
                : `${parseAmount(params.amount).currency ? `${parseAmount(params.amount).currency} ` : ""}0.00`,
            total: formatMoneyValue(parseAmount(params.amount).amount, parseAmount(params.amount).currency, parseAmount(params.amount).raw || "N/A"),
          },
        ];

  let y = drawHeader(doc, { copyType: params.copyType, status: params.status });

  const totalAmountLabel = resolveTotalAmountLabel(params.amount, fareRows);

  y = drawInfoSummary(doc, contentX, y, contentWidth, [
    { label: "PNR", value: toText(params.locator) || "N/A", color: COLORS.alertText, valueSize: 12 },
    { label: params.dateLabel, value: formatDate(params.travelDate) },
    { label: "Flight Type", value: toText(params.flightType) || "OneWay" },
    { label: "Airlines PNR", value: toText(params.airlinesPnr) || "N/A" },
  ]);

  y = drawInfoSummary(doc, contentX, y, contentWidth, [
    { label: "Route", value: toText(params.route) || "N/A" },
    { label: "Reservation ID", value: toText(params.reservationId) || "N/A" },
    { label: "Passenger", value: toText(params.name) || "Traveler" },
    { label: "Total Amount", value: totalAmountLabel, color: COLORS.primary },
  ]);

  const tableRowHeight = 27;

  const itineraryCardHeight = 25 + tableRowHeight * (1 + itineraryRows.length) + 2;
  drawCardContainer(doc, contentX, y, contentWidth, itineraryCardHeight);
  drawCardHeader(doc, contentX, y, contentWidth, "FLIGHT ITINERARY");
  drawTable(doc, {
    x: contentX + 1,
    y: y + 25,
    width: contentWidth - 2,
    columnRatios: [0.16, 0.2, 0.2, 0.2, 0.12, 0.12],
    header: ["Route", "Airline & Flight", "Departure", "Arrival", "Terminal", "Class"],
    rows: itineraryRows.map((row) => [
      toText(row.route),
      toText(row.airlineFlight),
      toText(row.departure),
      toText(row.arrival),
      toText(row.terminal),
      toText(row.cabinClass),
    ]),
    rowHeight: tableRowHeight,
    firstColumnBold: true,
  });
  y += itineraryCardHeight + 12;

  const passengerCardHeight = 25 + tableRowHeight * (1 + passengerRows.length) + 2;
  drawCardContainer(doc, contentX, y, contentWidth, passengerCardHeight);
  drawCardHeader(doc, contentX, y, contentWidth, "PASSENGER DETAILS");
  drawTable(doc, {
    x: contentX + 1,
    y: y + 25,
    width: contentWidth - 2,
    columnRatios: [0.24, 0.12, 0.12, 0.16, 0.16, 0.2],
    header: ["Name", "Type", "Gender", "DOB", "Passport No", "Ticket No"],
    rows: passengerRows.map((row) => [
      toText(row.name),
      toText(row.paxType),
      toText(row.gender),
      toText(row.dob),
      toText(row.passportNo),
      toText(row.ticketNo),
    ]),
    rowHeight: tableRowHeight,
    firstColumnBold: true,
  });
  y += passengerCardHeight + 12;

  const fareCardHeight = 25 + tableRowHeight * (1 + fareRows.length) + 8 + 50 + 10;
  drawCardContainer(doc, contentX, y, contentWidth, fareCardHeight);
  drawCardHeader(doc, contentX, y, contentWidth, "PRICE & FARE BREAKDOWN");
  const tableBottomY = drawTable(doc, {
    x: contentX + 1,
    y: y + 25,
    width: contentWidth - 2,
    columnRatios: [0.25, 0.15, 0.2, 0.2, 0.2],
    header: ["Pax Type", "Count", "Base Fare", "Taxes & Fees", "Total"],
    rows: fareRows.map((row) => [
      toText(row.paxType),
      toText(row.count),
      toText(row.baseFare),
      toText(row.taxesAndFees),
      toText(row.total),
    ]),
    rowHeight: tableRowHeight,
    alignments: ["left", "left", "right", "right", "right"],
    firstColumnBold: true,
  });

  const fareSummary = resolveFareSummary(fareRows, params.amount);
  const summaryY = tableBottomY + 8;
  const summaryWidth = 220;
  const summaryX = contentX + contentWidth - summaryWidth - 10;
  doc.save();
  doc.fillColor("#F9FBFC").strokeColor(COLORS.border).lineWidth(1);
  doc.roundedRect(summaryX, summaryY, summaryWidth, 62, 5).fillAndStroke();
  doc
    .font("Helvetica")
    .fontSize(8.5)
    .fillColor(COLORS.muted)
    .text("Base Fare", summaryX + 10, summaryY + 8);
  doc
    .font("Helvetica-Bold")
    .fontSize(8.5)
    .fillColor(COLORS.heading)
    .text(fareSummary.base, summaryX + 10, summaryY + 8, {
      width: summaryWidth - 20,
      align: "right",
    });
  doc
    .font("Helvetica")
    .fontSize(8.5)
    .fillColor(COLORS.muted)
    .text("Taxes & Fees", summaryX + 10, summaryY + 22);
  doc
    .font("Helvetica-Bold")
    .fontSize(8.5)
    .fillColor(COLORS.heading)
    .text(fareSummary.taxes, summaryX + 10, summaryY + 22, {
      width: summaryWidth - 20,
      align: "right",
    });
  doc.moveTo(summaryX + 10, summaryY + 37).lineTo(summaryX + summaryWidth - 10, summaryY + 37).strokeColor(COLORS.border).stroke();
  doc
    .font("Helvetica-Bold")
    .fontSize(10.5)
    .fillColor(COLORS.primary)
    .text("Total Amount", summaryX + 10, summaryY + 43);
  doc
    .font("Helvetica-Bold")
    .fontSize(11)
    .fillColor(COLORS.primary)
    .text(fareSummary.total, summaryX + 10, summaryY + 43, {
      width: summaryWidth - 20,
      align: "right",
    });
  doc.restore();
  y += fareCardHeight + 12;

  drawNotesBox(doc, contentX, y, contentWidth);
}

function buildPdfBuffer(params: RenderPdfParams): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: PAGE_MARGIN });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    renderTravelPdf(doc, params);
    doc.end();
  });
}

export async function createBookingPdf(params: {
  name: string;
  locator: string;
  reservationId: string;
  route: string;
  travelDate: string;
  flightType?: string;
  airlinesPnr?: string;
  amount: string;
  itineraryRows?: PdfItineraryRow[];
  passengerRows?: PdfPassengerRow[];
  fareRows?: PdfFareRow[];
}): Promise<Buffer> {
  return buildPdfBuffer({
    copyType: "Booking Copy",
    status: "Booked",
    dateLabel: "Booking Date",
    name: params.name,
    locator: params.locator,
    reservationId: params.reservationId,
    route: params.route,
    travelDate: params.travelDate,
    flightType: params.flightType,
    airlinesPnr: params.airlinesPnr,
    amount: params.amount,
    itineraryRows: params.itineraryRows,
    passengerRows: params.passengerRows,
    fareRows: params.fareRows,
  });
}

export async function createTicketPdf(params: {
  name: string;
  locator: string;
  reservationId: string;
  route: string;
  ticketInfo: string;
  flightType?: string;
  airlinesPnr?: string;
  amount?: string;
  travelDate?: string;
  itineraryRows?: PdfItineraryRow[];
  passengerRows?: PdfPassengerRow[];
  fareRows?: PdfFareRow[];
}): Promise<Buffer> {
  return buildPdfBuffer({
    copyType: "E-Ticket Copy",
    status: "Ticketed",
    dateLabel: "Issue Date",
    name: params.name,
    locator: params.locator,
    reservationId: params.reservationId,
    route: params.route,
    travelDate: params.travelDate || new Date().toISOString(),
    flightType: params.flightType,
    airlinesPnr: params.airlinesPnr,
    ticketInfo: params.ticketInfo,
    amount: params.amount,
    itineraryRows: params.itineraryRows,
    passengerRows: params.passengerRows,
    fareRows: params.fareRows,
  });
}
