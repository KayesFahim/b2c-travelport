import fs from "fs";
import path from "path";

/**
 * Appends a log entry to the travelport-api-logs directory.
 * Each log file is named by date (YYYY-MM-DD.log).
 */
export function logTravelportApi({
    endpoint,
    request,
    response,
    status,
    meta = {},
}: {
    endpoint: string;
    request: any;
    response: any;
    status: number;
    meta?: Record<string, any>;
}) {
    try {
        const logDir = path.resolve(process.cwd(), "travelport-api-logs");
        if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);
        const logFile = path.join(logDir, `${new Date().toISOString().slice(0, 10)}.log`);
        const entry = {
            timestamp: new Date().toISOString(),
            endpoint,
            status,
            meta,
            request,
            response,
        };
        fs.appendFileSync(logFile, JSON.stringify(entry) + "\n");
    } catch (err) {
        // Fails silently to avoid breaking API
    }
}
