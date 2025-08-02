import { randomInt } from "crypto"

export function GenerateRandomPort() {
    //Min is inclusive and max is exclusive. Inclusive range would be 1025 - 65535
    return randomInt(1025, 65536)
}