import { SetMetadata } from "@nestjs/common";

export const ALLOW_UNVERIFIED_KEY = "allowUnverifiedEmail";
export const AllowUnverified = () => SetMetadata(ALLOW_UNVERIFIED_KEY, true);
