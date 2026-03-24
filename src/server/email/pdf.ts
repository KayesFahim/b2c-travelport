import PDFDocument from "pdfkit";

function buildPdfBuffer(lines: Array<string>): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({ size: "A4", margin: 40 });
        const chunks: Buffer[] = [];

        doc.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
        doc.on("end", () => resolve(Buffer.concat(chunks)));
        doc.on("error", reject);

        doc.fontSize(18).text("FlyJatt", { align: "left" });
        doc.moveDown(0.4);
        doc.fontSize(10).fillColor("#475569").text(`Generated: ${new Date().toISOString()}`);
        doc.moveDown(1);
        doc.fillColor("#0f172a").fontSize(12);

        for (const line of lines) {
            doc.text(line || "-");
        }

        doc.end();
    });
}

export async function createBookingPdf(params: {
    name: string;
    locator: string;
    reservationId: string;
    route: string;
    travelDate: string;
    amount: string;
}): Promise<Buffer> {
    return buildPdfBuffer([
        "Booking Confirmation",
        "",
        `Passenger: ${params.name || "Traveler"}`,
        `Locator: ${params.locator || "N/A"}`,
        `Reservation ID: ${params.reservationId || "N/A"}`,
        `Route: ${params.route || "N/A"}`,
        `Travel Date: ${params.travelDate || "N/A"}`,
        `Amount: ${params.amount || "N/A"}`,
    ]);
}

export async function createTicketPdf(params: {
    name: string;
    locator: string;
    reservationId: string;
    route: string;
    ticketInfo: string;
}): Promise<Buffer> {
    return buildPdfBuffer([
        "Ticket Copy",
        "",
        `Passenger: ${params.name || "Traveler"}`,
        `Locator: ${params.locator || "N/A"}`,
        `Reservation ID: ${params.reservationId || "N/A"}`,
        `Route: ${params.route || "N/A"}`,
        `Ticket Info: ${params.ticketInfo || "N/A"}`,
    ]);
}
