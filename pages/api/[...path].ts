import { ApiError, withApiHandler } from "@/server/api-handler";
export default withApiHandler(() => { throw new ApiError(404, "NOT_FOUND", "API route not found."); }, { methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"] });
export const config = { api: { bodyParser: false } };
