import { fetchUpstream } from "@/server/upstream-fetch";
import { withApiHandler } from "@/server/api-handler";
import { publicErrorMessage } from "@/server/public-error";
import type { NextApiRequest, NextApiResponse } from "next";
import { getTravelportAccessToken } from "@/server/travelport-token";

type AncillaryShopBody = {
  CatalogOfferingsQueryAncillaries?: unknown;
  ancillaryRequest?: {
    offerListIdentifier?: unknown;
    offerIdentifier?: unknown;
    productIdentifiers?: unknown;
    reservationId?: unknown;
    mode?: unknown;
  };
  offerListIdentifier?: unknown;
  OfferListIdentifier?: unknown;
  offerIdentifier?: unknown;
  OfferIdentifier?: unknown;
  productIdentifiers?: unknown;
  ProductIdentifiers?: unknown;
  productIdentifier?: unknown;
  ProductIdentifier?: unknown;
  reservationId?: unknown;
  ReservationId?: unknown;
  mode?: unknown;
};

type ErrorResponse = {
  message: string;
  details?: string;
};

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value || value.trim().length === 0) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getValueByKeys(
  obj: Record<string, unknown> | null | undefined,
  keys: string[]
): unknown {
  if (!obj || typeof obj !== "object") return undefined;
  for (const key of keys) {
    const value = (obj as Record<string, unknown>)[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return undefined;
}

function normalizeIdentifier(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value.trim();
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const normalized = normalizeIdentifier(item);
      if (normalized) return normalized;
    }
    return "";
  }
  if (typeof value === "object") {
    const source = value as Record<string, unknown>;
    return (
      normalizeIdentifier(source.value) ||
      normalizeIdentifier(source.Value) ||
      normalizeIdentifier(source.id) ||
      normalizeIdentifier(source.ID) ||
      normalizeIdentifier(source.identifier) ||
      normalizeIdentifier(source.Identifier) ||
      normalizeIdentifier(source.offerIdentifier) ||
      normalizeIdentifier(source.OfferIdentifier) ||
      ""
    );
  }
  return "";
}

function normalizeIdentifierList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return Array.from(
      new Set(
        value
          .map((item) => normalizeIdentifier(item))
          .filter((item) => item.length > 0)
      )
    );
  }
  const single = normalizeIdentifier(value);
  return single ? [single] : [];
}

type AncillaryShopMode = "offerList" | "offer" | "reservationWorkbench";

function resolveAncillaryInput(body: AncillaryShopBody) {
  const source =
    body?.ancillaryRequest && typeof body.ancillaryRequest === "object"
      ? (body.ancillaryRequest as Record<string, unknown>)
      : (body as Record<string, unknown>);

  const offerListIdentifier = normalizeIdentifier(
    getValueByKeys(source, ["offerListIdentifier", "OfferListIdentifier"])
  );
  const offerIdentifier = normalizeIdentifier(
    getValueByKeys(source, [
      "offerIdentifier",
      "OfferIdentifier",
      "Identifier",
      "identifier",
      "ResultId",
    ])
  );
  const productIdentifiers = normalizeIdentifierList(
    getValueByKeys(source, [
      "productIdentifiers",
      "ProductIdentifiers",
      "productIdentifier",
      "ProductIdentifier",
    ])
  );
  const reservationId = normalizeIdentifier(
    getValueByKeys(source, ["reservationId", "ReservationId"])
  );
  const modeText = normalizeIdentifier(getValueByKeys(source, ["mode", "Mode"])).toLowerCase();
  const mode: AncillaryShopMode =
    modeText === "offer"
      ? "offer"
      : modeText === "reservationworkbench" || modeText === "reservation_workbench"
        ? "reservationWorkbench"
        : modeText === "offerlist" || modeText === "offer_list"
          ? "offerList"
          : reservationId && !offerListIdentifier && !offerIdentifier
            ? "reservationWorkbench"
            : "offerList";

  return {
    offerListIdentifier,
    offerIdentifier,
    productIdentifiers,
    reservationId,
    mode,
  };
}

function resolveDirectModeFromPayload(
  body: Record<string, unknown>
): AncillaryShopMode | null {
  const root =
    body?.CatalogOfferingsQueryAncillaries &&
    typeof body.CatalogOfferingsQueryAncillaries === "object"
      ? (body.CatalogOfferingsQueryAncillaries as Record<string, unknown>)
      : null;
  if (!root) return null;
  const ancillaryOfferings =
    root?.AncillaryOfferings && typeof root.AncillaryOfferings === "object"
      ? (root.AncillaryOfferings as Record<string, unknown>)
      : null;
  if (!ancillaryOfferings) return null;
  const typeText = normalizeIdentifier(
    getValueByKeys(ancillaryOfferings, ["@type", "type"])
  ).toLowerCase();
  if (typeText.includes("buildfromreservationworkbench")) {
    return "reservationWorkbench";
  }
  if (typeText.includes("buildfromofferlist")) {
    return "offerList";
  }
  if (typeText.includes("buildfromoffer")) {
    return "offer";
  }
  return null;
}

function resolveAncillaryShopUrl(version: string): string {
  const directUrl =
    process.env.TRAVELPORT_ANCILLARY_SHOP_URL ||
    process.env.TRAVELPORT_SHOP_ANCILLARY ||
    "";
  if (directUrl.trim()) {
    return directUrl.trim();
  }

  const baseUrl = process.env.TRAVELPORT_BASE_URL || "https://api.pp.travelport.net";
  const normalizedBase = baseUrl.replace(/\/+$/, "");

  if (/\/\d+$/.test(normalizedBase)) {
    return `${normalizedBase}/air/ancillaryshop/catalogofferingsancillaries`;
  }

  return `${normalizedBase}/${version}/air/ancillaryshop/catalogofferingsancillaries`;
}

async function createToken(): Promise<string> {
  return getTravelportAccessToken();
}

async function handler(
  req: NextApiRequest,
  res: NextApiResponse<Record<string, unknown> | ErrorResponse>
) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method not allowed" });
  }

  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");

  try {
    const body = (req.body || {}) as AncillaryShopBody;
    const bodyObj =
      body && typeof body === "object" ? (body as Record<string, unknown>) : {};
    const directMode = resolveDirectModeFromPayload(bodyObj);
    const { offerListIdentifier, offerIdentifier, productIdentifiers, reservationId, mode } =
      resolveAncillaryInput(body);
    const gdsOnly =
      String(process.env.TRAVELPORT_GDS_ONLY || "").toLowerCase() === "true";
    const effectiveMode: AncillaryShopMode =
      gdsOnly && mode !== "reservationWorkbench" ? "offerList" : mode;

    const explicitReservationMode = effectiveMode === "reservationWorkbench";
    const explicitOfferMode = effectiveMode === "offer";
    const explicitOfferListMode = effectiveMode === "offerList";

    if (explicitReservationMode && !reservationId) {
      return res.status(400).json({
        message: "reservationId is required for reservationWorkbench mode",
      });
    }

    const looksLikeOfferRowId = /^o\d+$/i.test(offerIdentifier);
    const buildFromOfferIdentifierValue =
      !looksLikeOfferRowId && offerIdentifier ? offerIdentifier : offerListIdentifier;
    const canUseBuildFromOffer =
      buildFromOfferIdentifierValue.length > 0 && productIdentifiers.length > 0;
    const canUseBuildFromOfferList = offerListIdentifier.length > 0 && offerIdentifier.length > 0;

    let requestPayload: Record<string, unknown> | null = null;
    let resolvedMode: AncillaryShopMode | null = null;

    if (directMode) {
      requestPayload = bodyObj;
      resolvedMode = directMode;
    }

    if (
      !requestPayload &&
      (explicitReservationMode || (!explicitOfferMode && !explicitOfferListMode && reservationId))
    ) {
      if (!reservationId) {
        return res.status(400).json({
          message: "reservationId is required for reservationWorkbench mode",
        });
      }
      requestPayload = {
        CatalogOfferingsQueryAncillaries: {
          AncillaryOfferings: {
            "@type": "AncillaryOfferingsBuildFromReservationWorkbench",
            BuildFromReservationWorkbench: {
              ReservationIdentifier: {
                Identifier: {
                  value: reservationId,
                },
              },
            },
          },
        },
      };
      resolvedMode = "reservationWorkbench";
    } else if (
      !requestPayload &&
      (explicitOfferMode || (!explicitOfferListMode && canUseBuildFromOffer))
    ) {
      if (!canUseBuildFromOffer) {
        return res.status(400).json({
          message:
            "offer mode requires offerListIdentifier (or offerIdentifier with value form) and productIdentifiers",
        });
      }
      requestPayload = {
        CatalogOfferingsQueryAncillaries: {
          AncillaryOfferings: {
            "@type": "AncillaryOfferingsBuildFromOffer",
            BuildFromOffer: {
              "@type": "BuildFromOfferAir",
              OfferIdentifier: {
                Identifier: {
                  value: buildFromOfferIdentifierValue,
                },
              },
              ProductIdentifier: productIdentifiers.map((id) => ({
                Identifier: { value: id },
              })),
            },
          },
        },
      };
      resolvedMode = "offer";
    } else if (!requestPayload && canUseBuildFromOfferList) {
      requestPayload = {
        CatalogOfferingsQueryAncillaries: {
          AncillaryOfferings: {
            "@type": "AncillaryOfferingsBuildFromOfferList",
            BuildFromOfferList: {
              OfferListIdentifier: offerListIdentifier,
              OfferIdentifier: [{ id: offerIdentifier }],
            },
          },
        },
      };
      resolvedMode = "offerList";
    }

    if (!requestPayload || !resolvedMode) {
      return res.status(400).json({
        message:
          "Unable to resolve ancillary shop mode. Send either: (1) offerListIdentifier + offerIdentifier, (2) offerListIdentifier/productIdentifiers for offer mode, or (3) reservationId.",
      });
    }

    const accessToken = await createToken();
    const accessGroup = getRequiredEnv("TRAVELPORT_ACCESS_GROUP");
    const version = process.env.TRAVELPORT_VERSION || "11";
    const ancillaryShopUrl = resolveAncillaryShopUrl(version);

    const requestHeaders = {
      Accept: "application/json",
      "Content-Type": "application/json",
      XAUTH_TRAVELPORT_ACCESSGROUP: accessGroup,
      "Accept-Version": version,
      "Content-Version": version,
      Authorization: `Bearer ${accessToken}`,
    };
    let response = await fetchUpstream(ancillaryShopUrl, {
      method: "POST",
      headers: requestHeaders,
      body: JSON.stringify(requestPayload),
    });

    let responsePayload = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    const hasAncillaryOfferings = (payloadObj: Record<string, unknown>) => {
      const root =
        (payloadObj?.CatalogOfferingsAncillaryListResponse as Record<string, unknown>) ||
        payloadObj;
      const listA = Array.isArray(root?.CatalogOfferingsID) ? root.CatalogOfferingsID : [];
      const listB = Array.isArray(root?.CatalogOfferingsAncillary) ? root.CatalogOfferingsAncillary : [];
      return listA.length > 0 || listB.length > 0;
    };

    // If offer mode failed or returned empty ancillaries, fall back to BuildFromOfferList when offerListIdentifier + offerIdentifier exist
    if (
      resolvedMode === "offer" &&
      canUseBuildFromOfferList &&
      (!response.ok || !hasAncillaryOfferings(responsePayload))
    ) {
      const fallbackPayload = {
        CatalogOfferingsQueryAncillaries: {
          AncillaryOfferings: {
            "@type": "AncillaryOfferingsBuildFromOfferList",
            BuildFromOfferList: {
              OfferListIdentifier: offerListIdentifier,
              OfferIdentifier: [{ id: offerIdentifier }],
            },
          },
        },
      };
      const fallbackRes = await fetchUpstream(ancillaryShopUrl, {
        method: "POST",
        headers: requestHeaders,
        body: JSON.stringify(fallbackPayload),
      });
      const fallbackJson = (await fallbackRes.json().catch(() => ({}))) as Record<
        string,
        unknown
      >;
      if (fallbackRes.ok && (hasAncillaryOfferings(fallbackJson) || !response.ok)) {
        response = fallbackRes;
        responsePayload = fallbackJson;
        requestPayload = fallbackPayload;
        resolvedMode = "offerList";
      }
    }

    try {
      const { logTravelportApi } = await import("@/utils/travelportLogger");
      logTravelportApi({
        endpoint: ancillaryShopUrl,
        request: { method: "POST", headers: requestHeaders, body: requestPayload },
        response: responsePayload,
        status: response.status,
        meta: { api: "ancillary-shop", mode: resolvedMode },
      });
    } catch { }
    if (!response.ok) {
      const errDetail =
        normalizeIdentifier(
          (responsePayload as any)?.CatalogOfferingsAncillaryListResponse?.Result?.Error?.[0]?.Message ||
          (responsePayload as any)?.ErrorResponse?.Result?.Error?.[0]?.Message ||
          getValueByKeys(responsePayload, [
            "message",
            "Message",
            "error_description",
            "error",
          ])
        ) || "Unable to fetch ancillary offerings for this offer.";

      // Gracefully report empty add-ons when carrier/offer has no ancillaries available
      if (/NO ANCILLAR|NOT FOUND|NOT SUPPORTED|NO OPTIONAL/i.test(errDetail)) {
        return res.status(200).json({
          CatalogOfferingsAncillaryListResponse: { CatalogOfferingsID: [] },
          ancillaryNotice: errDetail,
          ancillaryShopMeta: { mode: resolvedMode, empty: true },
        });
      }

      return res.status(response.status >= 400 && response.status < 500 ? 422 : 502).json({
        code: "ANCILLARY_SHOP_ERROR",
        message: errDetail,
        details: errDetail,
        travelportResponse: responsePayload,
        mode: resolvedMode,
      });
    }

    const upstreamWarning = normalizeIdentifier(
      (responsePayload as any)?.CatalogOfferingsAncillaryListResponse?.Result?.Error?.[0]?.Message ||
      (responsePayload as any)?.CatalogOfferingsAncillaryListResponse?.Result?.Warning?.[0]?.Message ||
      ""
    );

    return res.status(200).json({
      ...responsePayload,
      ...(upstreamWarning && !hasAncillaryOfferings(responsePayload)
        ? { ancillaryNotice: upstreamWarning }
        : {}),
      ancillaryShopMeta: {
        mode: resolvedMode,
      },
    });
  } catch (error) {
    const message =
      publicErrorMessage(error, "Unexpected server error");
    return res.status(500).json({ message });
  }
}

export default withApiHandler(handler, { methods: ["POST"] });

export const config = { api: { bodyParser: false } };
