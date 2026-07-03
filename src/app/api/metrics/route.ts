import { successResponse } from "@/lib/api-helpers";

export async function GET() {
  return successResponse({
    cpu: "30%",
    memory: "2.1GB",
    status: "Healthy",
  });
}
