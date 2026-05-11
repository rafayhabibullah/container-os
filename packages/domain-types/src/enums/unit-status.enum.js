"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UnitKind = exports.UnitStatus = void 0;
var UnitStatus;
(function (UnitStatus) {
    UnitStatus["Available"] = "available";
    UnitStatus["Reserved"] = "reserved";
    UnitStatus["Occupied"] = "occupied";
    UnitStatus["Maintenance"] = "maintenance";
    UnitStatus["OutOfService"] = "out_of_service";
})(UnitStatus || (exports.UnitStatus = UnitStatus = {}));
var UnitKind;
(function (UnitKind) {
    UnitKind["Container"] = "container";
    UnitKind["SelfStorage"] = "self_storage";
})(UnitKind || (exports.UnitKind = UnitKind = {}));
//# sourceMappingURL=unit-status.enum.js.map