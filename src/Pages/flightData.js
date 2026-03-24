import { airportsData } from "../data/airports";

// Legacy compatibility export used by OneWay/RoundWay/MultiCity search pages.
// Keep structure aligned with historical consumers: { code, name, Address }.
const flightData = (airportsData || []).map((item) => ({
    code: item?.code || "",
    name: item?.name || "",
    Address: item?.location || item?.Address || "",
}));

export default flightData;
