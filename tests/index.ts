import * as anchor from "@coral-xyz/anchor";
import { fetchAsset, MPL_CORE_PROGRAM_ID } from "@metaplex-foundation/mpl-core";
import {
  createSignerFromKeypair,
  keypairIdentity,
} from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { Keypair, SystemProgram } from "@solana/web3.js";
import assert from "assert";
import { randomBytes } from "crypto";
import { Alpiners } from "../target/types/alpiners";
import {
  getAssetAttributes,
  getAssetByOwner,
  getAuthStruct,
  getEventStruct,
  getLastEventStructFromAdmin,
  getPreviousEventStructFromAdmin,
  getReferrerAsset,
} from "./utils";
import { confirmTx, confirmTxs } from "./utils/helpers";

describe("Alpiners", () => {
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.Alpiners as anchor.Program<Alpiners>;
  const [user1, user2, asset1, asset2, collection1] = [
    new anchor.web3.Keypair(),
    new anchor.web3.Keypair(),
    new anchor.web3.Keypair(),
    new anchor.web3.Keypair(),
    new anchor.web3.Keypair(),
  ];
  const umi = createUmi(anchor.AnchorProvider.env().connection.rpcEndpoint, {
    commitment: "confirmed",
  });
  const myKeypair = umi.eddsa.createKeypairFromSecretKey(
    anchor.AnchorProvider.env().wallet["payer"].secretKey
  );
  const myKeypairSigner = createSignerFromKeypair(umi, myKeypair);
  umi.use(keypairIdentity(myKeypairSigner));

  let admin = Keypair.fromSecretKey(
    anchor.AnchorProvider.env().wallet["payer"].secretKey
  );

  console.log(`wallet address: ${admin.publicKey}`);
  console.log(`user1 address: ${user1.publicKey}`);
  console.log(`user2 address: ${user2.publicKey}`);
  console.log(`asset1 address: ${asset1.publicKey}`);
  console.log(`asset2 address: ${asset2.publicKey}`);
  console.log(`collection1 address: ${collection1.publicKey}`);

  const eventSeed1 = new anchor.BN(randomBytes(8));
  const eventSeed2 = new anchor.BN(randomBytes(8));
  const eventSeed3 = new anchor.BN(randomBytes(8));
  const eventSeed4 = new anchor.BN(randomBytes(8));
  const eventSeed5 = new anchor.BN(randomBytes(8));

  const auth = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("auth")],
    program.programId
  )[0];
  console.log(`auth address: ${auth}`);

  const event1 = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("event"), eventSeed1.toBuffer().reverse()],
    program.programId
  )[0];

  const event2 = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("event"), eventSeed2.toBuffer().reverse()],
    program.programId
  )[0];

  const event3 = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("event"), eventSeed3.toBuffer().reverse()],
    program.programId
  )[0];

  //expired event
  const event4 = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("event"), eventSeed4.toBuffer().reverse()],
    program.programId
  )[0];

  //future event
  const event5 = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("event"), eventSeed5.toBuffer().reverse()],
    program.programId
  )[0];

  console.log(`event1 address: ${event1}`);
  console.log(`event2 address: ${event2}`);
  console.log(`event3 address: ${event3}`);
  console.log(`event4 address: ${event4}`);
  console.log(`event5 address: ${event5}`);

  const XP_PER_CHECKIN = 200;

  it("Airdrop", async () => {
    await Promise.all(
      [admin, user1, user2].map(async (key) => {
        return await anchor
          .getProvider()
          .connection.requestAirdrop(
            new anchor.web3.PublicKey(key.publicKey),
            2 * anchor.web3.LAMPORTS_PER_SOL
          );
      })
    ).then(confirmTxs);
  });

  it("Should fail to init the program auth with the wrong address", async () => {
    try {
      const authStruct = await getAuthStruct(program);

      if (!authStruct) {
        await program.methods
          .authInit()
          .accounts({
            admin: user1.publicKey,
            auth: auth,
          })
          .signers([user1])
          .rpc({
            skipPreflight: true,
          });
      } else {
        console.log("Auth already initialized");
        throw new Error("Auth already initialized");
      }
    } catch (e) {
      assert.ok(e instanceof Error);
      return;
    }
    assert.fail("Test should have failed");
  });

  it("Should init the program auth", async () => {
    const authStruct = await getAuthStruct(program);

    if (!authStruct) {
      await program.methods
        .authInit()
        .accounts({
          admin: admin.publicKey,
          auth: auth,
        })
        .signers([admin])
        .rpc({
          skipPreflight: true,
        });
    } else {
      console.log("Auth already initialized");
    }
  });

  it("Should fail to create event with the wrong address", async () => {
    try {
      const attendeesMax = new anchor.BN(10);

      const lastEventStruct = await getLastEventStructFromAdmin(
        program,
        admin.publicKey
      );
      const lastEvent = lastEventStruct?.publicKey ?? null;

      const startDate = new anchor.BN(Date.now() / 1000 - 100);
      const endDate = new anchor.BN(Date.now() / 1000 + 86400);

      await program.methods
        .eventCreate(eventSeed1, attendeesMax, lastEvent, startDate, endDate)
        .accounts({
          admin: user1.publicKey,
          event: event1,
          systemProgram: SystemProgram.programId,
        })
        .signers([user1])
        .rpc({
          skipPreflight: true,
        })
        .then(confirmTx);
    } catch (e) {
      assert.ok(e instanceof Error);
      return;
    }
    assert.fail("Test should have failed");
  });

  it("Should create event", async () => {
    const attendeesMax = new anchor.BN(10);

    const lastEventStruct = await getLastEventStructFromAdmin(
      program,
      admin.publicKey
    );
    const lastEvent = lastEventStruct?.publicKey ?? null;

    const startDate = new anchor.BN(Date.now() / 1000 - 100);
    const endDate = new anchor.BN(Date.now() / 1000 + 86400);

    await program.methods
      .eventCreate(eventSeed1, attendeesMax, lastEvent, startDate, endDate)
      .accounts({
        admin: admin.publicKey,
        event: event1,
        systemProgram: SystemProgram.programId,
      })
      .signers([admin])
      .rpc({
        skipPreflight: true,
      })
      .then(confirmTx);
  });

  it("Should create event 2", async () => {
    const attendeesMax = new anchor.BN(1);

    const lastEventStruct = await getLastEventStructFromAdmin(
      program,
      admin.publicKey
    );
    const lastEvent = lastEventStruct?.publicKey ?? null;

    const startDate = new anchor.BN(Date.now() / 1000 - 100);
    const endDate = new anchor.BN(Date.now() / 1000 + 86400);

    await program.methods
      .eventCreate(eventSeed2, attendeesMax, lastEvent, startDate, endDate)
      .accounts({
        admin: admin.publicKey,
        event: event2,
        systemProgram: SystemProgram.programId,
      })
      .signers([admin])
      .rpc({
        skipPreflight: true,
      })
      .then(confirmTx);
  });

  it("Should create event 3", async () => {
    const attendeesMax = new anchor.BN(100);

    const lastEventStruct = await getLastEventStructFromAdmin(
      program,
      admin.publicKey
    );
    const lastEvent = lastEventStruct?.publicKey ?? null;

    const startDate = new anchor.BN(Date.now() / 1000 - 100);
    const endDate = new anchor.BN(Date.now() / 1000 + 86400);

    await program.methods
      .eventCreate(eventSeed3, attendeesMax, lastEvent, startDate, endDate)
      .accounts({
        admin: admin.publicKey,
        event: event3,
        systemProgram: SystemProgram.programId,
      })
      .signers([admin])
      .rpc({
        skipPreflight: true,
      })
      .then(confirmTx);
  });

  //expired event
  it("Should create event 4", async () => {
    const attendeesMax = new anchor.BN(100);

    const lastEventStruct = await getLastEventStructFromAdmin(
      program,
      admin.publicKey
    );
    const lastEvent = lastEventStruct?.publicKey ?? null;

    const startDate = new anchor.BN(Date.now() / 1000 - 10000);
    const endDate = new anchor.BN(Date.now() / 1000 - 10000);

    await program.methods
      .eventCreate(eventSeed4, attendeesMax, lastEvent, startDate, endDate)
      .accounts({
        admin: admin.publicKey,
        event: event4,
        systemProgram: SystemProgram.programId,
      })
      .signers([admin])
      .rpc({
        skipPreflight: true,
      })
      .then(confirmTx);
  });

  //future event
  it("Should create event 5", async () => {
    const attendeesMax = new anchor.BN(100);

    const lastEventStruct = await getLastEventStructFromAdmin(
      program,
      admin.publicKey
    );
    const lastEvent = lastEventStruct?.publicKey ?? null;

    const startDate = new anchor.BN(Date.now() / 1000 + 10000);
    const endDate = new anchor.BN(Date.now() / 1000 + 10000);

    await program.methods
      .eventCreate(eventSeed5, attendeesMax, lastEvent, startDate, endDate)
      .accounts({
        admin: admin.publicKey,
        event: event5,
        systemProgram: SystemProgram.programId,
      })
      .signers([admin])
      .rpc({
        skipPreflight: true,
      })
      .then(confirmTx);
  });

  // TODO: This should be allowed only by the admin
  it("create a core collection", async () => {
    await program.methods
      .collectionCreate()
      .accounts({
        auth: auth,
        admin: admin.publicKey,
        collection: collection1.publicKey,
        systemProgram: SystemProgram.programId,
        mplCoreProgram: MPL_CORE_PROGRAM_ID,
      })
      .signers([admin, collection1])
      .rpc({
        skipPreflight: true,
      });
  });

  // REGISTRATION
  it("Should fail to checkin to an event without registering", async () => {
    try {
      const previousEvent = await getPreviousEventStructFromAdmin(
        program,
        admin.publicKey,
        event1
      );

      await program.methods
        .attendeeCheckIn(eventSeed1, previousEvent?.account.seed ?? null)
        .accounts({
          auth: auth,
          user: user1.publicKey,
          event: event1,
          previousEvent: previousEvent?.publicKey ?? null,
          asset: asset1.publicKey,
          collection: collection1.publicKey,
          systemProgram: SystemProgram.programId,
          mplCoreProgram: MPL_CORE_PROGRAM_ID,
        })
        .signers([user1])
        .rpc({
          skipPreflight: true,
        });
    } catch (e) {
      assert.ok(e instanceof Error);
      return;
    }
    assert.fail("Test should have failed");
  });

  it("Should register user1 attendee", async () => {
    await program.methods
      .attendeeRegister(null)
      .accounts({
        auth: auth,
        user: user1.publicKey,
        asset: asset1.publicKey,
        collection: collection1.publicKey,
        systemProgram: SystemProgram.programId,
        mplCoreProgram: MPL_CORE_PROGRAM_ID,
      })
      .signers([user1, asset1])
      .rpc({
        skipPreflight: true,
      })
      .then(confirmTx);

    const asset = await fetchAsset(umi, asset1.publicKey.toBase58(), {
      skipDerivePlugins: false,
    });

    const attributes = getAssetAttributes(asset);
    assert.equal(attributes["level"], "1");
    assert.equal(attributes["experience"], "0");
    assert.equal(attributes["consumable"], "0");
    assert.equal(attributes["referrals"], "0");
    assert.equal(attributes["referrer"], "None");
  });

  it("Should fail to register user2 with an existing asset", async () => {
    try {
      await program.methods
        .attendeeRegister(null)
        .accounts({
          auth: auth,
          user: user2.publicKey,
          asset: asset1.publicKey,
          collection: collection1.publicKey,
          systemProgram: SystemProgram.programId,
          mplCoreProgram: MPL_CORE_PROGRAM_ID,
        })
        .signers([user2, asset1])
        .rpc({
          skipPreflight: true,
        });
    } catch (e) {
      assert.ok(e instanceof Error);
      return;
    }
    assert.fail("Test should have failed");
  });

  it("Should register user2 attendee", async () => {
    await program.methods
      .attendeeRegister(user1.publicKey)
      .accounts({
        auth: auth,
        user: user2.publicKey,
        asset: asset2.publicKey,
        collection: collection1.publicKey,
        systemProgram: SystemProgram.programId,
        mplCoreProgram: MPL_CORE_PROGRAM_ID,
      })
      .signers([user2, asset2])
      .rpc({
        skipPreflight: true,
      })
      .then(confirmTx);

    const asset = await fetchAsset(umi, asset2.publicKey.toBase58(), {
      skipDerivePlugins: false,
    });

    const attributes = getAssetAttributes(asset);
    assert.equal(attributes["level"], "1");
    assert.equal(attributes["experience"], "0");
    assert.equal(attributes["consumable"], "0");
    assert.equal(attributes["referrals"], "0");
    assert.equal(attributes["referrer"], user1.publicKey.toBase58());
  });

  // CHECKIN
  it("Should checkin user1 to event1", async () => {
    const user = user1;
    const event = event1;
    const eventSeed = eventSeed1;
    const collection = collection1;

    const previousEvent = await getPreviousEventStructFromAdmin(
      program,
      admin.publicKey,
      event
    );

    const currentAsset = await getAssetByOwner(
      umi,
      user.publicKey,
      collection1.publicKey
    );

    const referrerAsset = await getReferrerAsset(
      umi,
      new anchor.web3.PublicKey(currentAsset.publicKey),
      collection1.publicKey
    );

    await program.methods
      .attendeeCheckIn(eventSeed, previousEvent?.account.seed ?? null)
      .accounts({
        auth: auth,
        user: user.publicKey,
        event: event,
        previousEvent: previousEvent?.publicKey ?? null,
        asset: currentAsset.publicKey,
        referrerAsset: referrerAsset?.publicKey ?? null,
        collection: collection.publicKey,
        systemProgram: SystemProgram.programId,
        mplCoreProgram: MPL_CORE_PROGRAM_ID,
      })
      .signers([user])
      .rpc({
        skipPreflight: true,
      })
      .then(confirmTx);

    const asset = await fetchAsset(umi, currentAsset.publicKey.toString(), {
      skipDerivePlugins: false,
    });

    const attributes = getAssetAttributes(asset);
    assert.equal(attributes["level"], "1");
    assert.equal(attributes["experience"], XP_PER_CHECKIN);
    assert.equal(attributes["consumable"], "0");
    assert.equal(attributes["consecutive_attendance"], "1");
    assert.equal(attributes["referrals"], "0");
    assert.equal(attributes["referrer"], "None");
  });

  it("Should checkin user2 to event1", async () => {
    const user = user2;
    const event = event1;
    const eventSeed = eventSeed1;
    const collection = collection1;

    const previousEvent = await getPreviousEventStructFromAdmin(
      program,
      admin.publicKey,
      event
    );

    const currentAsset = await getAssetByOwner(
      umi,
      user.publicKey,
      collection1.publicKey
    );

    const referrerAsset = await getReferrerAsset(
      umi,
      new anchor.web3.PublicKey(currentAsset.publicKey),
      collection1.publicKey
    );

    await program.methods
      .attendeeCheckIn(eventSeed, previousEvent?.account.seed ?? null)
      .accounts({
        auth: auth,
        user: user.publicKey,
        event: event,
        previousEvent: previousEvent?.publicKey ?? null,
        asset: currentAsset.publicKey,
        referrerAsset: referrerAsset?.publicKey ?? null,
        collection: collection.publicKey,
        systemProgram: SystemProgram.programId,
        mplCoreProgram: MPL_CORE_PROGRAM_ID,
      })
      .signers([user])
      .rpc({
        skipPreflight: true,
      })
      .then(confirmTx);

    const assetData2 = await fetchAsset(
      umi,
      currentAsset.publicKey.toString(),
      {
        skipDerivePlugins: false,
      }
    );
    const attributesAsset2 = getAssetAttributes(assetData2);
    assert.equal(attributesAsset2["level"], "1");
    assert.equal(attributesAsset2["experience"], XP_PER_CHECKIN);
    assert.equal(attributesAsset2["consumable"], "0");
    assert.equal(attributesAsset2["consecutive_attendance"], "1");
    assert.equal(attributesAsset2["referrals"], "0");
    assert.equal(attributesAsset2["referrer"], user1.publicKey.toBase58());

    const assetData1 = await fetchAsset(umi, asset1.publicKey.toBase58(), {
      skipDerivePlugins: false,
    });
    const attributesAsset1 = getAssetAttributes(assetData1);
    assert.equal(attributesAsset1["referrals"], "1");
  });

  it("Shouldn't be able to checkin user1 twice to an event", async () => {
    try {
      const user = user1;
      const event = event1;
      const eventSeed = eventSeed1;
      const collection = collection1;

      const previousEvent = await getPreviousEventStructFromAdmin(
        program,
        admin.publicKey,
        event
      );

      const currentAsset = await getAssetByOwner(
        umi,
        user.publicKey,
        collection1.publicKey
      );

      const referrerAsset = await getReferrerAsset(
        umi,
        new anchor.web3.PublicKey(currentAsset.publicKey),
        collection1.publicKey
      );

      await program.methods
        .attendeeCheckIn(eventSeed, previousEvent?.account.seed ?? null)
        .accounts({
          auth: auth,
          user: user.publicKey,
          event: event,
          previousEvent: previousEvent?.publicKey ?? null,
          asset: currentAsset.publicKey,
          referrerAsset: referrerAsset?.publicKey ?? null,
          collection: collection.publicKey,
          systemProgram: SystemProgram.programId,
          mplCoreProgram: MPL_CORE_PROGRAM_ID,
        })
        .signers([user])
        .rpc({
          skipPreflight: true,
        })
        .then(confirmTx);
    } catch (e) {
      assert.ok(e instanceof Error);
      return;
    }
    assert.fail("Test should have failed");
  });

  it("Should fail to checkin user2 and asset 1", async () => {
    try {
      const user = user1;
      const event = event1;
      const eventSeed = eventSeed1;
      const collection = collection1;

      const previousEvent = await getPreviousEventStructFromAdmin(
        program,
        admin.publicKey,
        event
      );

      const referrerAsset = await getReferrerAsset(
        umi,
        asset1.publicKey,
        collection1.publicKey
      );

      await program.methods
        .attendeeCheckIn(eventSeed, previousEvent?.account.seed ?? null)
        .accounts({
          auth: auth,
          user: user.publicKey,
          event: event,
          previousEvent: previousEvent?.publicKey ?? null,
          asset: asset1.publicKey,
          referrerAsset: referrerAsset?.publicKey ?? null,
          collection: collection.publicKey,
          systemProgram: SystemProgram.programId,
          mplCoreProgram: MPL_CORE_PROGRAM_ID,
        })
        .signers([user])
        .rpc({
          skipPreflight: true,
        })
        .then(confirmTx);
    } catch (e) {
      assert.ok(e instanceof Error);
      return;
    }
    assert.fail("Test should have failed");
  });

  it("Should checkin user1 to event2", async () => {
    const user = user1;
    const event = event2;
    const eventSeed = eventSeed2;
    const collection = collection1;

    const previousEvent = await getPreviousEventStructFromAdmin(
      program,
      admin.publicKey,
      event
    );

    const currentAsset = await getAssetByOwner(
      umi,
      user.publicKey,
      collection1.publicKey
    );

    const referrerAsset = await getReferrerAsset(
      umi,
      new anchor.web3.PublicKey(currentAsset.publicKey),
      collection1.publicKey
    );

    await program.methods
      .attendeeCheckIn(eventSeed, previousEvent?.account.seed ?? null)
      .accounts({
        auth: auth,
        user: user.publicKey,
        event: event,
        previousEvent: previousEvent?.publicKey ?? null,
        asset: currentAsset.publicKey,
        referrerAsset: referrerAsset?.publicKey ?? null,
        collection: collection.publicKey,
        systemProgram: SystemProgram.programId,
        mplCoreProgram: MPL_CORE_PROGRAM_ID,
      })
      .signers([user])
      .rpc({
        skipPreflight: true,
      })
      .then(confirmTx);

    const asset = await fetchAsset(umi, currentAsset.publicKey.toString(), {
      skipDerivePlugins: false,
    });

    const attributes = getAssetAttributes(asset);
    assert.equal(attributes["level"], "2");
    assert.equal(attributes["experience"], XP_PER_CHECKIN * 2);
    assert.equal(attributes["consumable"], "1");
    assert.equal(attributes["consecutive_attendance"], "2");
    assert.equal(attributes["referrals"], "1");
    assert.equal(attributes["referrer"], "None");
  });

  it("Should fail when checkin user2 to event2 overbooking second event", async () => {
    try {
      const user = user2;
      const event = event2;
      const eventSeed = eventSeed2;
      const collection = collection1;

      const previousEvent = await getPreviousEventStructFromAdmin(
        program,
        admin.publicKey,
        event
      );

      const currentAsset = await getAssetByOwner(
        umi,
        user.publicKey,
        collection1.publicKey
      );

      const referrerAsset = await getReferrerAsset(
        umi,
        new anchor.web3.PublicKey(currentAsset.publicKey),
        collection1.publicKey
      );

      await program.methods
        .attendeeCheckIn(eventSeed, previousEvent?.account.seed ?? null)
        .accounts({
          auth: auth,
          user: user.publicKey,
          event: event,
          previousEvent: previousEvent?.publicKey ?? null,
          asset: currentAsset.publicKey,
          referrerAsset: referrerAsset?.publicKey ?? null,
          collection: collection.publicKey,
          systemProgram: SystemProgram.programId,
          mplCoreProgram: MPL_CORE_PROGRAM_ID,
        })
        .signers([user])
        .rpc({
          skipPreflight: true,
        })
        .then(confirmTx);
    } catch (e) {
      assert.ok(e instanceof Error);
      return;
    }
    assert.fail("Test should have failed");
  });

  it("Should checkin user1 to event3", async () => {
    const user = user1;
    const event = event3;
    const eventSeed = eventSeed3;
    const collection = collection1;

    const previousEvent = await getPreviousEventStructFromAdmin(
      program,
      admin.publicKey,
      event
    );

    const currentAsset = await getAssetByOwner(
      umi,
      user.publicKey,
      collection1.publicKey
    );

    const referrerAsset = await getReferrerAsset(
      umi,
      new anchor.web3.PublicKey(currentAsset.publicKey),
      collection1.publicKey
    );

    await program.methods
      .attendeeCheckIn(eventSeed, previousEvent?.account.seed ?? null)
      .accounts({
        auth: auth,
        user: user.publicKey,
        event: event,
        previousEvent: previousEvent?.publicKey ?? null,
        asset: currentAsset.publicKey,
        referrerAsset: referrerAsset?.publicKey ?? null,
        collection: collection.publicKey,
        systemProgram: SystemProgram.programId,
        mplCoreProgram: MPL_CORE_PROGRAM_ID,
      })
      .signers([user])
      .rpc({
        skipPreflight: true,
      })
      .then(confirmTx);

    const asset = await fetchAsset(umi, asset1.publicKey.toBase58(), {
      skipDerivePlugins: false,
    });

    const attributes = getAssetAttributes(asset);
    assert.equal(attributes["level"], "2");
    assert.equal(attributes["experience"], XP_PER_CHECKIN * 3);
    assert.equal(attributes["consumable"], "1");
    assert.equal(attributes["consecutive_attendance"], "3");
    assert.equal(attributes["referrals"], "1");
    assert.equal(attributes["referrer"], "None");
  });

  it("Should fail to checkin user2 to event3 if previous event is wrong", async () => {
    try {
      const user = user2;
      const event = event3;
      const eventSeed = eventSeed3;
      const collection = collection1;

      const currentAsset = await getAssetByOwner(
        umi,
        user.publicKey,
        collection1.publicKey
      );

      const referrerAsset = await getReferrerAsset(
        umi,
        new anchor.web3.PublicKey(currentAsset.publicKey),
        collection1.publicKey
      );

      await program.methods
        .attendeeCheckIn(eventSeed, eventSeed1)
        .accounts({
          auth: auth,
          user: user.publicKey,
          event: event,
          previousEvent: event1,
          asset: currentAsset.publicKey,
          referrerAsset: referrerAsset?.publicKey ?? null,
          collection: collection.publicKey,
          systemProgram: SystemProgram.programId,
          mplCoreProgram: MPL_CORE_PROGRAM_ID,
        })
        .signers([user])
        .rpc({
          skipPreflight: true,
        })
        .then(confirmTx);
    } catch (e) {
      assert.ok(e instanceof Error);
      return;
    }
    assert.fail("Test should have failed");
  });

  it("Should checkin user2 to event3", async () => {
    const user = user2;
    const event = event3;
    const eventSeed = eventSeed3;
    const collection = collection1;

    const previousEvent = await getPreviousEventStructFromAdmin(
      program,
      admin.publicKey,
      event
    );

    const currentAsset = await getAssetByOwner(
      umi,
      user.publicKey,
      collection1.publicKey
    );

    const referrerAsset = await getReferrerAsset(
      umi,
      new anchor.web3.PublicKey(currentAsset.publicKey),
      collection1.publicKey
    );

    await program.methods
      .attendeeCheckIn(eventSeed, previousEvent?.account.seed ?? null)
      .accounts({
        auth: auth,
        user: user.publicKey,
        event: event,
        previousEvent: previousEvent?.publicKey ?? null,
        asset: currentAsset.publicKey,
        referrerAsset: referrerAsset?.publicKey ?? null,
        collection: collection.publicKey,
        systemProgram: SystemProgram.programId,
        mplCoreProgram: MPL_CORE_PROGRAM_ID,
      })
      .signers([user])
      .rpc({
        skipPreflight: true,
      })
      .then(confirmTx);

    const asset = await fetchAsset(umi, asset2.publicKey.toBase58(), {
      skipDerivePlugins: false,
    });

    const attributes = getAssetAttributes(asset);
    assert.equal(attributes["level"], "2");
    assert.equal(attributes["experience"], XP_PER_CHECKIN * 2);
    assert.equal(attributes["consumable"], "1");
    assert.equal(attributes["consecutive_attendance"], "1");
    assert.equal(attributes["referrals"], "0");
    assert.equal(attributes["referrer"], user1.publicKey.toBase58());
  });

  it("Should check that user1 and user 2 are registered to event 1", async () => {
    const event = await getEventStruct(program, eventSeed1);
    assert.equal(event.account.attendees.length, 2);
    assert.equal(event.account.attendees[0].toBase58(), user1.publicKey);
    assert.equal(event.account.attendees[1].toBase58(), user2.publicKey);
  });

  it("Should fail to checkin user1 to event4 as it's expired", async () => {
    try {
      const user = user1;
      const event = event4;
      const eventSeed = eventSeed4;
      const collection = collection1;

      const previousEvent = await getPreviousEventStructFromAdmin(
        program,
        admin.publicKey,
        event
      );

      const currentAsset = await getAssetByOwner(
        umi,
        user.publicKey,
        collection1.publicKey
      );

      const referrerAsset = await getReferrerAsset(
        umi,
        new anchor.web3.PublicKey(currentAsset.publicKey),
        collection1.publicKey
      );

      await program.methods
        .attendeeCheckIn(eventSeed, previousEvent?.account.seed ?? null)
        .accounts({
          auth: auth,
          user: user.publicKey,
          event: event,
          previousEvent: previousEvent?.publicKey ?? null,
          asset: currentAsset.publicKey,
          referrerAsset: referrerAsset?.publicKey ?? null,
          collection: collection.publicKey,
          systemProgram: SystemProgram.programId,
          mplCoreProgram: MPL_CORE_PROGRAM_ID,
        })
        .signers([user])
        .rpc({
          skipPreflight: true,
        })
        .then(confirmTx);
    } catch (e) {
      assert.ok(e.msg === "Event expired already");
      return;
    }
    assert.fail("Test should have failed");
  });

  it("Should fail to checkin user1 to event5 as it's not started", async () => {
    try {
      const user = user1;
      const event = event5;
      const eventSeed = eventSeed5;
      const collection = collection1;

      const previousEvent = await getPreviousEventStructFromAdmin(
        program,
        admin.publicKey,
        event
      );

      const currentAsset = await getAssetByOwner(
        umi,
        user.publicKey,
        collection1.publicKey
      );

      const referrerAsset = await getReferrerAsset(
        umi,
        new anchor.web3.PublicKey(currentAsset.publicKey),
        collection1.publicKey
      );

      await program.methods
        .attendeeCheckIn(eventSeed, previousEvent?.account.seed ?? null)
        .accounts({
          auth: auth,
          user: user.publicKey,
          event: event,
          previousEvent: previousEvent?.publicKey ?? null,
          asset: currentAsset.publicKey,
          referrerAsset: referrerAsset?.publicKey ?? null,
          collection: collection.publicKey,
          systemProgram: SystemProgram.programId,
          mplCoreProgram: MPL_CORE_PROGRAM_ID,
        })
        .signers([user])
        .rpc({
          skipPreflight: true,
        })
        .then(confirmTx);
    } catch (e) {
      assert.ok(e.msg === "Event not started yet");
      return;
    }
    assert.fail("Test should have failed");
  });

  it("should fail to use consumables for user1", async () => {
    try {
      const user = user1;
      const collection = collection1;

      const currentAsset = await getAssetByOwner(
        umi,
        user.publicKey,
        collection1.publicKey
      );

      const attributesBefore = getAssetAttributes(currentAsset);
      assert.equal(attributesBefore["consumable"], "1");

      await program.methods
        .attendeeConsume(2)
        .accounts({
          auth: auth,
          user: user.publicKey,
          asset: currentAsset.publicKey,
          collection: collection.publicKey,
          systemProgram: SystemProgram.programId,
          mplCoreProgram: MPL_CORE_PROGRAM_ID,
        })
        .signers([user])
        .rpc({
          skipPreflight: true,
        })
        .then(confirmTx);
    } catch (e) {
      assert.ok(e instanceof Error);
      return;
    }
    assert.fail("Test should have failed");
  });

  it("should use consumables for user1", async () => {
    const user = user1;
    const collection = collection1;

    const currentAsset = await getAssetByOwner(
      umi,
      user.publicKey,
      collection1.publicKey
    );

    const attributesBefore = getAssetAttributes(currentAsset);
    assert.equal(attributesBefore["consumable"], "1");

    await program.methods
      .attendeeConsume(1)
      .accounts({
        auth: auth,
        user: user.publicKey,
        asset: currentAsset.publicKey,
        collection: collection.publicKey,
        systemProgram: SystemProgram.programId,
        mplCoreProgram: MPL_CORE_PROGRAM_ID,
      })
      .signers([user])
      .rpc({
        skipPreflight: true,
      })
      .then(confirmTx);

    const assetAfter = await fetchAsset(umi, currentAsset.publicKey, {
      skipDerivePlugins: false,
    });

    const attributesAfter = getAssetAttributes(assetAfter);
    assert.equal(attributesAfter["consumable"], "0");
  });
});

// ADMIN
// [x] can create an event:
// [x] event has a date (start date end date ?)
// [x] event has a participant number
// [ ] only admin should be able to create an event

// ATTENDEE
// [x] can register with wallet (create NFT)
// [x] attendee can scan QR of an event to add points to their nft (take double scan into account)
// [x] for a specific event should be able to check if member was here
// [x] There should be two types of points: experience and spendables
// [x] should track most consecutive attendance
// [x] can refer a friend to the event - each account can be referred only once

// [ ] should be able to spend spendables
/*
  referee does registration while providing referant address/nftIndex then checks in to an event
  after checks in, referral point is up for claim by referant

*/

// [ ] should be able to find the current consecutive memberships

// unlocks should be onchain or not?
