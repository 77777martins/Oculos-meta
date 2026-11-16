import { crudItem } from "@/lib/http/admin-crud";
import { config } from "../config";

export const { PUT, DELETE } = crudItem(config);
