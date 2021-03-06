import { Model, Prop, Record } from "app/core";

export interface ApplicationPackageAttributes {
    version: string;
    state: PackageState;
    format: string;
    lastActivationTime: Date;
    storageUrl: string;
    storageUrlExpiry: Date;
}

/**
 * Class for displaying Batch application package information.
 */
@Model()
export class ApplicationPackage extends Record<ApplicationPackageAttributes> {
    @Prop() public version: string;
    @Prop() public state: PackageState;
    @Prop() public format: string;
    @Prop() public lastActivationTime: Date;
    @Prop() public storageUrl: string;
    @Prop() public storageUrlExpiry: Date;
}

export enum PackageState {
    active = "active",
    pending = "pending",
}
