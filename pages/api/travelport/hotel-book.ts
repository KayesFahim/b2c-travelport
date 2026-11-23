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
  productIdentifier?: string;
  rateCode?: string;
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
  };
  specialRequests?: string;
};

async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ message: "Method not allowed" });
  }

  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");

  const body = (req.body ?? {}) as HotelBookBody;
  const guest = body.guest || {};
  const firstName = String(guest.firstName || "").trim();
  const lastName = String(guest.lastName || "").trim();
  const email = String(guest.email || "").trim();
  const phone = String(guest.phone || "").trim();

  if (!firstName || !lastName || !email) {
    return res.status(400).json({
      message: "Guest firstName, lastName, and email are required to complete hotel booking.",
    });
  }

  const catalogOfferingsIdentifier = String(body.catalogOfferingsIdentifier || "").trim();
  const catalogOfferingIdentifier = String(body.catalogOfferingIdentifier || "").trim();
  const productIdentifier = String(body.productIdentifier || "").trim();

  if (!catalogOfferingsIdentifier || !catalogOfferingIdentifier) {
    return res.status(400).json({
      message:
        "catalogOfferingsIdentifier and catalogOfferingIdentifier are required to book a Travelport Stay.",
    });
  }

  const payment = body.payment || {};
  const cleanCardNumber = String(payment.cardNumber || "").replace(/\D+/g, "");
  const expiryMonth = String(payment.expiryMonth || "").replace(/\D+/g, "").padStart(2, "0").slice(-2);
  const expiryYear = String(payment.expiryYear || "").replace(/\D+/g, "").slice(-2);
  const specialRequests = String(body.specialRequests || "").trim();

  const requestPayload: Record<string, unknown> = {
    ReservationQueryBuild: {
      "@type": "ReservationQueryBuild",
      ReservationBuild: {
        "@type": "ReservationBuild",
        OfferList: [
          {
            "@type": "OfferQueryBuildFromCatalogOfferingHospitality",
            BuildFromCatalogOfferingHospitality: {
              "@type": "BuildFromCatalogOfferingHospitality",
              CatalogOfferingsIdentifier: {
                Identifier: {
                  value: catalogOfferingsIdentifier,
                  authority: "Travelport",
                },
              },
              CatalogOfferingIdentifier: {
                Identifier: {
                  value: catalogOfferingIdentifier,
                  authority: "Travelport",
                },
              },
              ...(productIdentifier
                ? {
                    ProductIdentifier: [
                      {
                        Identifier: {
                          value: productIdentifier,
                        },
                      },
                    ],
                  }
                : {}),
            },
          },
        ],
        Traveler: [
          {
            "@type": "Traveler",
            id: "trav_1",
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
        ...(cleanCardNumber && expiryMonth && expiryYear
          ? {
              FormOfPayment: [
                {
                  "@type": "FormOfPaymentPaymentCard",
                  PaymentCard: {
                    "@type": "PaymentCard",
                    CardCode: String(payment.cardType || "VI").trim().toUpperCase().slice(0, 2),
                    CardNumber: {
                      "@type": "EncryptionToken",
                      PlainText: cleanCardNumber,
                    },
                    expireDate: `${expiryMonth}${expiryYear}`,
                    CardHolderName:
                      String(payment.cardHolderName || `${firstName} ${lastName}`).trim(),
                  },
                },
              ],
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

  try {
    const result = await callTravelportHotelApi({
      path: "/book/reservations/build",
      payload: requestPayload,
      apiName: "hotel-book",
      meta: {
        propertyCode: body.propertyCode,
        chainCode: body.chainCode,
        checkIn: body.checkIn,
        checkOut: body.checkOut,
      },
    });

    if (!result.ok) {
      return res.status(result.status >= 400 ? result.status : 502).json({
        success: false,
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
      message,
    });
  }
}

export default withApiHandler(withCustomerSession(handler), { methods: ["POST"] });
