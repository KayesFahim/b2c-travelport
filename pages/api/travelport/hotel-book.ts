import type { NextApiRequest, NextApiResponse } from "next";
import { withApiHandler } from "@/server/api-handler";
import { withCustomerSession } from "@/server/with-customer-session";
import { callTravelportHotelApi } from "@/server/travelport-hotel";

type HotelBookBody = {
  propertyCode?: string;
  chainCode?: string;
  hotelName?: string;
  checkIn?: string;
  checkOut?: string;
  rooms?: number | string;
  adults?: number | string;
  children?: number | string;
  currency?: string;
  catalogOfferingsIdentifier?: string;
  catalogOfferingIdentifier?: string;
  authority?: string;
  aggregator?: string;
  acceptPriceChangeInd?: boolean;
  acceptGuaranteeChangeInd?: boolean;
  guest?: {
    title?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    countryCode?: string;
  };
  payment?: {
    cardType?: string;
    cardNumber?: string;
    expiryMonth?: string;
    expiryYear?: string;
    cardHolderName?: string;
    billingAddress?: {
      street?: string;
      city?: string;
      state?: string;
      postalCode?: string;
      countryCode?: string;
    };
  };
  specialRequests?: string;
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");

  const body = (req.body ?? {}) as HotelBookBody;
  const guest = body.guest || {};
  const firstName = String(guest.firstName || "").trim();
  const lastName = String(guest.lastName || "").trim();
  const email = String(guest.email || "").trim();
  const phone = String(guest.phone || "").trim();

  if (!firstName || !lastName || !email) {
    return res.status(400).json({
      message: "Guest firstName, lastName, and email are required to create a hotel reservation.",
    });
  }

  const catalogOfferingIdentifier = String(body.catalogOfferingIdentifier || "").trim();
  const authority = String(body.authority || body.aggregator || "TVPT").trim() || "TVPT";

  if (!catalogOfferingIdentifier) {
    return res.status(400).json({
      message: "catalogOfferingIdentifier is required to create a Travelport Stay reservation.",
    });
  }

  const payment = body.payment || {};
  const cleanCardNumber = String(payment.cardNumber || "").replace(/\D+/g, "");
  const expiryMonth = String(payment.expiryMonth || "")
    .replace(/\D+/g, "")
    .padStart(2, "0")
    .slice(-2);
  const expiryYearRaw = String(payment.expiryYear || "").replace(/\D+/g, "");
  const expiryYearFull =
    expiryYearRaw.length === 2 ? `20${expiryYearRaw}` : expiryYearRaw.slice(0, 4);
  const specialRequests = String(body.specialRequests || "").trim();
  const billing = payment.billingAddress || {};

  const requestPayload: Record<string, unknown> = {
    ReservationQueryBuild: {
      "@type": "ReservationQueryBuild",
      ReservationBuild: {
        "@type": "ReservationBuildFromCatalogOffering",
        BuildFromCatalogOfferingHospitality: {
          "@type": "BuildFromCatalogOfferingHospitality",
          CatalogOfferingIdentifier: {
            value: catalogOfferingIdentifier,
            authority,
          },
        },
        Traveler: [
          {
            "@type": "Traveler",
            id: "trav_1",
            passengerTypeCode: "ADT",
            PersonName: {
              "@type": "PersonName",
              ...(guest.title ? { Prefix: String(guest.title).trim() } : {}),
              Given: firstName,
              Surname: lastName,
            },
            Email: [
              {
                "@type": "Email",
                value: email,
              },
            ],
            ...(phone
              ? {
                  Telephone: [
                    {
                      "@type": "Telephone",
                      phoneNumber: phone,
                      ...(guest.countryCode
                        ? { countryAccessCode: String(guest.countryCode).replace(/\D+/g, "") }
                        : {}),
                    },
                  ],
                }
              : {}),
          },
        ],
        ...(cleanCardNumber && expiryMonth && expiryYearFull
          ? {
              FormOfPayment: {
                "@type": "FormOfPayment",
                Payment: {
                  "@type": "PaymentCreditCard",
                  creditCardType: String(payment.cardType || "VI")
                    .trim()
                    .toUpperCase()
                    .slice(0, 2),
                  accountNumber: cleanCardNumber,
                  expiryDate: `${expiryYearFull}-${expiryMonth}`,
                  cardHolderName: String(
                    payment.cardHolderName || `${firstName} ${lastName}`
                  ).trim(),
                  ...(billing.street || billing.city
                    ? {
                        BillingAddress: {
                          "@type": "Address",
                          AddressLine: [String(billing.street || "123 Main St").trim()],
                          city: String(billing.city || "Dubai").trim(),
                          ...(billing.state ? { state: String(billing.state).trim() } : {}),
                          ...(billing.postalCode
                            ? { postalCode: String(billing.postalCode).trim() }
                            : {}),
                          countryCode: String(billing.countryCode || "AE")
                            .trim()
                            .toUpperCase()
                            .slice(0, 2),
                        },
                      }
                    : {}),
                },
              },
            }
          : {}),
        ...(specialRequests
          ? {
              SpecialService: [
                {
                  "@type": "SpecialService",
                  freeText: specialRequests,
                },
              ],
            }
          : {}),
      },
    },
  };

  const queryParams = new URLSearchParams();
  if (body.acceptPriceChangeInd !== false) {
    queryParams.set("acceptPriceChangeInd", "true");
  }
  if (body.acceptGuaranteeChangeInd !== false) {
    queryParams.set("acceptGuaranteeChangeInd", "true");
  }
  const bookPath = `/book/reservations/build${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;

  try {
    const result = await callTravelportHotelApi({
      path: bookPath,
      payload: requestPayload,
      apiName: "hotel-book",
      meta: {
        propertyCode: body.propertyCode,
        chainCode: body.chainCode,
        checkIn: body.checkIn,
        checkOut: body.checkOut,
      },
    });

    if (!result.ok || result.hasPayloadErrors) {
      return res.status(result.status >= 400 ? result.status : 502).json({
        success: false,
        code: "TRAVELPORT_HOTEL_BOOK_ERROR",
        source: "travelport-live",
        message: result.errorMessage,
        status: result.status,
        correlationId: result.correlationId,
        isProvisioningError: result.isProvisioningError,
        upstreamDetails: result.data,
      });
    }

    const reservation =
      (result.data as any)?.ReservationResponse?.Reservation ??
      (result.data as any)?.Reservation ??
      {};
    const locator =
      reservation?.Receipt?.[0]?.Confirmation?.Locator?.value ||
      reservation?.Offer?.[0]?.Identifier?.value ||
      reservation?.Identifier?.value ||
      "";

    return res.status(200).json({
      success: true,
      source: "travelport-live",
      correlationId: result.correlationId,
      confirmationLocator: String(locator || ""),
      reservationId: String(reservation?.Identifier?.value || ""),
      status: "CONFIRMED",
      raw: result.data,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Hotel booking failed";
    return res.status(500).json({
      success: false,
      code: "TRAVELPORT_HOTEL_BOOK_ERROR",
      message,
    });
  }
}

export default withApiHandler(withCustomerSession(handler), { methods: ["POST"] });
