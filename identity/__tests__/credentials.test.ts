import {
  issueChallengeCredential,
  issueNullifiableCredential,
  NullifierGenerators,
  verifyCredential,
} from "../src/credentials";
import { generateEIP712PairJWK, objToSortedArray } from "../src/helpers";
import {
  HashNullifierGenerator,
  IgnorableNullifierGeneratorError,
  HumanNetworkNullifierGenerator,
  NullifierGenerator,
} from "../src/nullifierGenerators";
import { humanNetworkOprf } from "../src/humanNetworkOprf";
import * as logger from "../src/logger";

// ---- original DIDKit lib
import * as OriginalDIDKit from "@spruceid/didkit-wasm-node";

// ---- base64 encoding
import * as base64 from "@ethersproject/base64";

// ---- crypto lib for hashing
import { createHash } from "crypto";

// ---- Mocked values and helpers
import * as mockDIDKit from "../__mocks__/didkit";

// ---- Types
import { DIDKitLib, VerifiableCredential, SignatureType, VerifiableEip712Credential } from "@gitcoin/passport-types";

// ---- Set up DIDKit mock
const DIDKit: DIDKitLib = mockDIDKit as unknown as DIDKitLib;

// this would need to be a valid key but we've mocked out didkit (and no verifications are made)
const key = "SAMPLE_KEY";

jest.mock("../src/humanNetworkOprf", () => ({
  humanNetworkOprf: jest.fn(),
  initMishti: jest.fn(),
}));

jest.mock("../src/logger", () => ({
  error: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
}));

const mockIssuerKey = generateEIP712PairJWK();

// Set up nullifier generators
const hashNullifierGenerator = HashNullifierGenerator({
  key,
  version: "0.0.0",
});
const nullifierGenerators: NullifierGenerators = [hashNullifierGenerator];
describe("issueChallengeCredential", function () {
  beforeEach(() => {
    mockDIDKit.clearDidkitMocks();
  });

  it("can generate a challenge credential", async () => {
    const record = {
      type: "Simple",
      address: "0x0",
      version: "Test-Case-1",
      challenge: "randomChallengeString",
    };

    // details of this credential are created by issueChallengeCredential - but the proof is added by DIDKit (which is mocked)
    const { credential } = await issueChallengeCredential(DIDKit, key, record);

    // expect to have called issueCredential
    expect(DIDKit.issueCredential).toHaveBeenCalled();
    // expect the structure/details added by issueChallengeCredential to be correct
    expect(credential.credentialSubject.id).toEqual(`did:pkh:eip155:1:${record.address}`);
    expect(credential.credentialSubject.provider).toEqual(`challenge-${record.type}`);
    expect(credential.credentialSubject.challenge).toEqual(record.challenge);
    expect(credential.credentialSubject.address).toEqual(record.address);
    expect(typeof credential.proof).toEqual("object");
  });

  const signType: SignatureType = "EIP712";
  it("can generate am EIP712 signed challenge credential", async () => {
    const record = {
      type: "Simple",
      address: "0x0",
      version: "Test-Case-1",
      challenge: "randomChallengeString",
      signatureType: signType,
    };

    // details of this credential are created by issueChallengeCredential - but the proof is added by DIDKit (which is mocked)
    const { credential } = await issueChallengeCredential(DIDKit, key, record);

    // expect to have called issueCredential
    expect(DIDKit.issueCredential).toHaveBeenCalled();
    // expect the structure/details added by issueChallengeCredential to be correct
    expect(credential.credentialSubject.id).toEqual(`did:pkh:eip155:1:${record.address}`);
    expect(credential.credentialSubject.provider).toEqual(`challenge-${record.type}`);
    expect(credential.credentialSubject.challenge).toEqual(record.challenge);
    expect(credential.credentialSubject.address).toEqual(record.address);
    expect(typeof credential.proof).toEqual("object");
  });

  it("can convert an object to an sorted array for deterministic hashing", async () => {
    const record = {
      type: "Simple",
      address: "0x0",
      version: "Test-Case-1",
      email: "my_own@email.com",
    };

    expect(objToSortedArray(record)).toEqual([
      ["address", "0x0"],
      ["email", "my_own@email.com"],
      ["type", "Simple"],
      ["version", "Test-Case-1"],
    ]);
  });
});

describe("issueNullifiableCredential", function () {
  beforeEach(() => {
    mockDIDKit.clearDidkitMocks();
  });

  it("can generate a credential containing nullifiers", async () => {
    const record = {
      type: "Simple",
      version: "Test-Case-1",
      address: "0x0",
    };

    const expectedHash: string =
      "v0.0.0:" +
      base64.encode(
        createHash("sha256")
          .update(key)
          .update(JSON.stringify(objToSortedArray(record)))
          .digest()
      );

    const { credential } = await issueNullifiableCredential({
      DIDKit,
      issuerKey: key,
      address: "0x0",
      record,
      nullifierGenerators,
      expiresInSeconds: 3600,
    });

    expect(DIDKit.issueCredential).toHaveBeenCalled();
    // expect the structure/details added by issueHashedCredential to be correct
    expect(credential.credentialSubject.id).toEqual(`did:pkh:eip155:1:${record.address}`);
    expect(credential.credentialSubject.provider).toEqual(`${record.type}`);
    expect(Array.isArray(credential.credentialSubject.nullifiers)).toEqual(true);
    expect(credential.credentialSubject.nullifiers).toEqual([expectedHash]);
    expect(typeof credential.proof).toEqual("object");
  });

  it("can generate an eip712 signed credential containing hash", async () => {
    const mockMishtiOprfResponse = "encrypted";
    (humanNetworkOprf as jest.Mock).mockResolvedValue(mockMishtiOprfResponse);

    const record = {
      type: "Simple",
      version: "Test-Case-1",
      address: "0x0",
    };

    const secret = "secret";

    const expectedStandardHash: string =
      "v0.0.0:" +
      base64.encode(
        createHash("sha256")
          .update(key)
          .update(JSON.stringify(objToSortedArray(record)))
          .digest()
      );

    const expectedHumanNetworkHash: string =
      "v3:" +
      base64.encode(createHash("sha256").update(secret, "utf-8").update(mockMishtiOprfResponse, "utf-8").digest());

    const expectedOprfInput = JSON.stringify(objToSortedArray(record));

    const { credential } = await issueNullifiableCredential({
      DIDKit,
      issuerKey: key,
      address: "0x0",
      record,
      nullifierGenerators: [
        hashNullifierGenerator,
        HumanNetworkNullifierGenerator({
          localSecret: secret,
          version: 3,
        }),
      ],
      expiresInSeconds: 100,
      signatureType: "EIP712",
    });

    expect(DIDKit.issueCredential).toHaveBeenCalled();
    // expect the structure/details added by issueHashedCredential to be correct
    expect(credential.credentialSubject.id).toEqual(`did:pkh:eip155:1:${record.address}`);
    expect(credential.credentialSubject.provider).toEqual(`${record.type}`);
    expect(Array.isArray(credential.credentialSubject.nullifiers)).toEqual(true);
    expect(credential.credentialSubject.nullifiers).toEqual([expectedStandardHash, expectedHumanNetworkHash]);
    expect(typeof credential.proof).toEqual("object");
    expect(credential["@context"]).toContain("https://w3id.org/vc/status-list/2021/v1");
    expect(credential["@context"]).toContain("https://w3id.org/vc/status-list/2021/v1");
    expect(humanNetworkOprf).toHaveBeenCalledWith({
      value: expectedOprfInput,
    });
  });
});

describe("verifyCredential", function () {
  beforeEach(() => {
    mockDIDKit.clearDidkitMocks();
  });

  it("can verify a credential", async () => {
    const record = {
      type: "Simple",
      version: "Test-Case-1",
      address: "0x0",
    };

    const { credential: credentialToVerify } = await issueNullifiableCredential({
      DIDKit,
      issuerKey: key,
      address: "0x0",
      record,
      nullifierGenerators,
      expiresInSeconds: 3600,
    });

    // all verifications will pass as the DIDKit response is mocked
    expect(await verifyCredential(DIDKit, credentialToVerify)).toEqual(true);
    // expect to have called verifyCredential
    expect(DIDKit.verifyCredential).toHaveBeenCalled();
    expect(DIDKit.verifyCredential).toHaveBeenCalledWith(JSON.stringify(credentialToVerify), expect.anything());
  });

  it("cannot verify a valid but expired credential", async () => {
    // create a date and move it into the past
    const expired = new Date();
    expired.setSeconds(expired.getSeconds() - 1);

    // if the expiration date is in the past then this VC has expired
    const credential = {
      expirationDate: expired.toISOString(),
    } as unknown as VerifiableCredential;

    // before the credential is verified against DIDKit - we check its expiration date...
    expect(await verifyCredential(DIDKit, credential)).toEqual(false);
    // expect to have not called verify on didkit
    expect(DIDKit.verifyCredential).not.toBeCalled();
  });

  it("returns false when DIDKit.verifyCredential returns with errors", async () => {
    const futureExpirationDate = new Date();
    futureExpirationDate.setFullYear(futureExpirationDate.getFullYear() + 1);
    const credentialToVerify = {
      expirationDate: futureExpirationDate.toISOString(),
      proof: {
        proofPurpose: "myProof",
      },
    } as VerifiableCredential;

    // DIDKit.verifyCredential can return with a non-empty errors array
    mockDIDKit.verifyCredential.mockResolvedValue(
      JSON.stringify({
        checks: ["proof"],
        warnings: [],
        errors: ["signature error"],
      })
    );

    expect(await verifyCredential(DIDKit, credentialToVerify)).toEqual(false);
    expect(DIDKit.verifyCredential).toHaveBeenCalled();
  });

  it("returns false when DIDKit.verifyCredential rejects with an exception", async () => {
    const futureExpirationDate = new Date();
    futureExpirationDate.setFullYear(futureExpirationDate.getFullYear() + 1);
    const credentialToVerify = {
      expirationDate: futureExpirationDate.toISOString(),
      proof: {
        proofPurpose: "myProof",
      },
    } as VerifiableCredential;

    mockDIDKit.verifyCredential.mockRejectedValue(new Error("something went wrong :("));

    expect(await verifyCredential(DIDKit, credentialToVerify)).toEqual(false);
    expect(DIDKit.verifyCredential).toHaveBeenCalled();
  });

  it("returns false when tampering with the hashed credential being verified", async () => {
    const record = {
      type: "Simple",
      version: "Test-Case-1",
      address: "0x0",
    };

    const { credential } = await issueNullifiableCredential({
      DIDKit: OriginalDIDKit,
      issuerKey: mockIssuerKey,
      address: "0x0",
      record,
      nullifierGenerators,
      expiresInSeconds: 1000,
      signatureType: "EIP712",
    });

    const signedCredential = credential as VerifiableEip712Credential;
    signedCredential.proof.proofValue = "tampered";

    // all verifications will pass as the DIDKit response is mocked
    expect(await verifyCredential(OriginalDIDKit, credential)).toEqual(false);
  });

  it("returns false when tampering with the challenge credential being verified", async () => {
    const record = {
      type: "Simple",
      version: "Test-Case-1",
      address: "0x0",
    };

    // we are creating this VC so that we know that we have a valid VC in this context to test against (never expired)
    const { credential } = await issueChallengeCredential(OriginalDIDKit, mockIssuerKey, record);
    const signedCredential = credential as VerifiableEip712Credential;
    signedCredential.proof.proofValue = "tampered";

    // all verifications will pass as the DIDKit response is mocked
    expect(await verifyCredential(OriginalDIDKit, credential)).toEqual(false);
  });

  describe("with legacy hash format", () => {
    let oldFFValue: string | undefined;
    beforeEach(() => {
      oldFFValue = process.env.FF_ROTATING_KEYS;
      process.env.FF_ROTATING_KEYS = "off";
    });

    afterEach(() => {
      process.env.FF_ROTATING_KEYS = oldFFValue;
    });

    it("can generate a credential containing legacy hash", async () => {
      const record = {
        type: "Simple",
        version: "Test-Case-1",
        address: "0x0",
      };

      const expectedHash: string =
        "v0.0.0:" +
        base64.encode(
          createHash("sha256")
            .update(key)
            .update(JSON.stringify(objToSortedArray(record)))
            .digest()
        );

      const { credential } = await issueNullifiableCredential({
        DIDKit,
        issuerKey: key,
        address: "0x0",
        record,
        nullifierGenerators,
        expiresInSeconds: 3600,
      });

      expect(DIDKit.issueCredential).toHaveBeenCalled();
      expect(credential.credentialSubject.nullifiers).toBeUndefined();
      expect(credential.credentialSubject.hash).toEqual(expectedHash);
    });
  });
});

describe("issueNullifiableCredential with ignorable errors", () => {
  beforeEach(() => {
    mockDIDKit.clearDidkitMocks();
    (humanNetworkOprf as jest.Mock).mockReset();
  });

  it("succeeds when some nullifier generators throw ignorable errors", async () => {
    const record = {
      type: "Simple",
      version: "Test-Case-1",
      address: "0x0",
    };

    const throwingGenerator = async () => {
      throw new IgnorableNullifierGeneratorError("Expected test error");
    };

    const expectedHash =
      "v0.0.0:" +
      base64.encode(
        createHash("sha256")
          .update(key)
          .update(JSON.stringify(objToSortedArray(record)))
          .digest()
      );

    const { credential } = await issueNullifiableCredential({
      DIDKit,
      issuerKey: key,
      address: "0x0",
      record,
      nullifierGenerators: [hashNullifierGenerator, throwingGenerator as NullifierGenerator],
      expiresInSeconds: 3600,
    });

    expect(credential.credentialSubject.nullifiers).toEqual([expectedHash]);
    expect(DIDKit.issueCredential).toHaveBeenCalled();
  });

  it("fails when all nullifier generators throw ignorable errors", async () => {
    const record = {
      type: "Simple",
      version: "Test-Case-1",
      address: "0x0",
    };

    const throwingGenerator = async () => {
      throw new IgnorableNullifierGeneratorError("Expected test error");
    };

    await expect(
      issueNullifiableCredential({
        DIDKit,
        issuerKey: key,
        address: "0x0",
        record,
        nullifierGenerators: [throwingGenerator as NullifierGenerator, throwingGenerator as NullifierGenerator],
        expiresInSeconds: 3600,
      })
    ).rejects.toThrow("No valid nullifiers generated");
  });

  describe("unexpected errors", () => {
    let consoleErrorSpy: any;
    beforeEach(() => {
      consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
      consoleErrorSpy.mockRestore();
    });

    it("fails when any nullifier generator throws an unexpected error", async () => {
      const record = {
        type: "Simple",
        version: "Test-Case-1",
        address: "0x0",
      };

      const unexpectedErrorGenerator = async () => {
        throw new Error("Unexpected error");
      };

      await expect(
        issueNullifiableCredential({
          DIDKit,
          issuerKey: key,
          address: "0x0",
          record,
          nullifierGenerators: [hashNullifierGenerator, unexpectedErrorGenerator as NullifierGenerator],
          expiresInSeconds: 3600,
        })
      ).rejects.toThrow("Unable to generate nullifiers");

      expect(logger.error).toHaveBeenCalled();
    });

    it("handles mix of successful, ignorable, and unexpected errors", async () => {
      const record = {
        type: "Simple",
        version: "Test-Case-1",
        address: "0x0",
      };

      const ignorableGenerator = async () => {
        throw new IgnorableNullifierGeneratorError("Expected test error");
      };

      const unexpectedErrorGenerator = async () => {
        throw new Error("Unexpected error");
      };

      await expect(
        issueNullifiableCredential({
          DIDKit,
          issuerKey: key,
          address: "0x0",
          record,
          nullifierGenerators: [
            hashNullifierGenerator,
            ignorableGenerator as NullifierGenerator,
            unexpectedErrorGenerator as NullifierGenerator,
          ],
          expiresInSeconds: 3600,
        })
      ).rejects.toThrow("Unable to generate nullifiers");

      expect(logger.error).toHaveBeenCalled();
    });
  });
});
