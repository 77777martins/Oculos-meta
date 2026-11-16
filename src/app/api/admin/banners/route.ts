import { crudCollection } from "@/lib/http/admin-crud";
import { config } from "./config";

export const { POST } = crudCollection(config);
