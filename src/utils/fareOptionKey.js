const toSafeText = (value) => String(value ?? "").trim();

const getBrandCode = (option) =>
  toSafeText(
    option?.AllLegsInfo?.[0]?.BrandCode ??
      option?.allLegsInfo?.[0]?.brandCode ??
      option?.AllLegsInfo?.[0]?.BrandFeatures?.code ??
      option?.allLegsInfo?.[0]?.brandFeatures?.code
  );

const getBrandName = (option) =>
  toSafeText(
    option?.AllLegsInfo?.[0]?.BrandName ??
      option?.allLegsInfo?.[0]?.brandName ??
      option?.AllLegsInfo?.[0]?.BrandFeatures?.name ??
      option?.allLegsInfo?.[0]?.brandFeatures?.name ??
      option?.FareType ??
      option?.fareType
  );

export const getFareOptionKey = (option, index = 0) => {
  const parts = [
    toSafeText(option?.ResultId ?? option?.resultId),
    toSafeText(option?.offerIdentifier ?? option?.OfferIdentifier),
    toSafeText(option?.SearchId ?? option?.searchId),
    toSafeText(
      option?.NetFare ??
        option?.netFare ??
        option?.GrossFare ??
        option?.grossFare
    ),
    getBrandCode(option),
    getBrandName(option),
    toSafeText(index),
  ].filter(Boolean);

  return parts.join("|") || `fare-option-${index}`;
};

