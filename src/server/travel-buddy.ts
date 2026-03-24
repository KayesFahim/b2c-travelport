type TravelBuddyRecord = {
    id: number;
    title: string | null;
    firstName: string | null;
    lastName: string | null;
    paxtype: string | null;
    gender: string | null;
    nationality: string | null;
    dateOfBirth: Date | null;
    passportNumber: string | null;
    passportExpiryDate: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
};

export function toText(value: unknown): string {
    if (value === null || value === undefined) return "";
    if (typeof value === "string") return value.trim();
    if (typeof value === "number" || typeof value === "boolean") return String(value);
    return "";
}

export function toUpperText(value: unknown): string {
    return toText(value).toUpperCase();
}

export function parseOptionalDate(value: unknown): Date | null {
    const raw = toText(value);
    if (!raw) return null;

    const normalized = raw.replace(/\//g, "-");
    const ddmmyyyy = normalized.match(/^(\d{2})-(\d{2})-(\d{4})$/);
    if (ddmmyyyy) {
        const [, dd, mm, yyyy] = ddmmyyyy;
        const parsed = new Date(`${yyyy}-${mm}-${dd}T00:00:00.000Z`);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    }

    const parsed = new Date(normalized);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function toIsoDate(value: Date | null | undefined): string {
    return value ? value.toISOString() : "";
}

export function buildTravelBuddyPayload(record: TravelBuddyRecord) {
    const title = toText(record.title);
    const firstName = toText(record.firstName);
    const lastName = toText(record.lastName);
    const fullName = [title, firstName, lastName].filter(Boolean).join(" ");
    const passportNumber = toText(record.passportNumber);
    const passportExpiryDate = toIsoDate(record.passportExpiryDate);
    const dateOfBirth = toIsoDate(record.dateOfBirth);

    return {
        id: record.id,
        title,
        firstName,
        lastName,
        fullName,
        paxtype: toText(record.paxtype),
        gender: toText(record.gender),
        nationality: toText(record.nationality),
        dob: dateOfBirth,
        dateOfBirth,
        passport: passportNumber,
        passportNumber,
        passportexp: passportExpiryDate,
        passportExpiryDate,
        document: passportNumber || `buddy-${record.id}`,
        createdAt: toIsoDate(record.createdAt),
        updatedAt: toIsoDate(record.updatedAt),
    };
}
