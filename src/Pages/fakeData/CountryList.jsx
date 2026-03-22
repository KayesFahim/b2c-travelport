import countries from "i18n-iso-countries";
import en from "i18n-iso-countries/langs/en.json";

countries.registerLocale(en);

const countryNames = countries.getNames("en");

const CountryList = Object.entries(countryNames)
  .map(([alpha2, name]) => ({
    name,
    code: alpha2,
    alpha2,
    alpha3: countries.alpha2ToAlpha3(alpha2) || "",
  }))
  .sort((a, b) => a.name.localeCompare(b.name));

export default CountryList;
