import { RequestPayload, VerifiedPayload } from "@gitcoin/passport-types";
import { type Provider, type ProviderOptions } from "../../types.js";
import {
  AMAZON_CASUAL_PURCHASER_THRESHOLD,
  AMAZON_REGULAR_CUSTOMER_THRESHOLD,
  AMAZON_HEAVY_USER_THRESHOLD,
  UBER_OCCASIONAL_RIDER_THRESHOLD,
  UBER_REGULAR_RIDER_THRESHOLD,
  UBER_POWER_USER_THRESHOLD,
} from "../types.js";
import { Proof } from "@zk-email/sdk";

// Base ZKEmail Provider
abstract class ZKEmailBaseProvider implements Provider {
  type: string;
  _options: ProviderOptions;

  constructor(type: string, options: ProviderOptions = {}) {
    this.type = type;
    this._options = { ...options };
  }

  async verify(payload: RequestPayload): Promise<VerifiedPayload> {
    const errors: string[] = [];
    const record: { data?: string } | undefined = undefined;

    try {
      // Validate payload structure
      if (!payload.proofs) {
        return {
          valid: false,
          errors: ["No proofs provided in payload"],
          record,
        };
      }

      // Get the appropriate proof type for this provider
      const proofType = this.getProofType();
      const proofsField = proofType === "amazon" ? "amazonProofs" : "uberProofs";

      if (!payload.proofs[proofsField]) {
        return {
          valid: false,
          errors: [`No ${proofType} proofs provided in payload`],
          record,
        };
      }

      const { initZkEmailSdk } = await import("@zk-email/sdk");
      const sdk = initZkEmailSdk();

      const proofs = payload.proofs[proofsField] as unknown as string[];

      if (!Array.isArray(proofs) || proofs.length === 0) {
        return {
          valid: false,
          errors: [`Invalid or empty ${proofType} proofs array`],
          record,
        };
      }

      const unpackedProofs = await Promise.all(proofs.map((p: string) => sdk.unPackProof(p)));

      // count how many proofs are valid
      const validProofs = await Promise.all(
        unpackedProofs.map(async (proof: Proof) => {
          try {
            const verified = await proof.verify();
            return verified;
          } catch (err) {
            return false;
          }
        })
      );
      const validProofCount = validProofs.filter((verified) => verified).length;

      if (validProofCount === 0) {
        return {
          valid: false,
          errors: [`No valid ${proofType} proofs found`],
          record,
        };
      }

      // Check if the proof count meets the threshold for this specific provider
      const threshold = this.getThreshold();
      if (validProofCount < threshold) {
        return {
          valid: false,
          errors: [`Need at least ${threshold} valid ${proofType} proofs, but only found ${validProofCount}`],
          record,
        };
      }

      return {
        valid: true,
        errors,
        record: {
          totalProofs: validProofCount.toString(),
          proofType: proofType,
        },
      };
    } catch (error) {
      errors.push(`Failed to verify email: ${error instanceof Error ? error.message : String(error)}`);
      return {
        valid: false,
        errors,
        record,
      };
    }
  }

  abstract getThreshold(): number;
  abstract getProofType(): "amazon" | "uber";
}

// Amazon Providers
export class AmazonCasualPurchaserProvider extends ZKEmailBaseProvider {
  constructor() {
    super("ZKEmail#AmazonCasualPurchaser");
  }

  getThreshold(): number {
    return AMAZON_CASUAL_PURCHASER_THRESHOLD;
  }

  getProofType(): "amazon" {
    return "amazon";
  }
}

export class AmazonRegularCustomerProvider extends ZKEmailBaseProvider {
  constructor() {
    super("ZKEmail#AmazonRegularCustomer");
  }

  getThreshold(): number {
    return AMAZON_REGULAR_CUSTOMER_THRESHOLD;
  }

  getProofType(): "amazon" {
    return "amazon";
  }
}

export class AmazonHeavyUserProvider extends ZKEmailBaseProvider {
  constructor() {
    super("ZKEmail#AmazonHeavyUser");
  }

  getThreshold(): number {
    return AMAZON_HEAVY_USER_THRESHOLD;
  }

  getProofType(): "amazon" {
    return "amazon";
  }
}

// Uber Providers
export class UberOccasionalRiderProvider extends ZKEmailBaseProvider {
  constructor() {
    super("ZKEmail#UberOccasionalRider");
  }

  getThreshold(): number {
    return UBER_OCCASIONAL_RIDER_THRESHOLD;
  }

  getProofType(): "uber" {
    return "uber";
  }
}

export class UberRegularRiderProvider extends ZKEmailBaseProvider {
  constructor() {
    super("ZKEmail#UberRegularRider");
  }

  getThreshold(): number {
    return UBER_REGULAR_RIDER_THRESHOLD;
  }

  getProofType(): "uber" {
    return "uber";
  }
}

export class UberPowerUserProvider extends ZKEmailBaseProvider {
  constructor() {
    super("ZKEmail#UberPowerUser");
  }

  getThreshold(): number {
    return UBER_POWER_USER_THRESHOLD;
  }

  getProofType(): "uber" {
    return "uber";
  }
}
