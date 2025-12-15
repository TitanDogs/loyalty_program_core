import * as anchor from "@coral-xyz/anchor";
import {
  AssetV1,
  fetchAsset,
  fetchAssetsByCollection,
} from "@metaplex-foundation/mpl-core";
import { Context } from "@metaplex-foundation/umi";
import { PublicKey } from "@solana/web3.js";
import { Alpiners } from "../../target/types/alpiners";

const numbertoBase58 = (number: anchor.BN) => {
  return anchor.utils.bytes.bs58.encode(number.toArrayLike(Buffer, "le", 8));
};

export const getAuthStruct = async (program: anchor.Program<Alpiners>) => {
  const auths = await program.account.auth.all();
  return auths[0];
};

export const getAssetAttributes = (asset: AssetV1) => {
  const object = {};
  for (let attribute of asset.attributes.attributeList) {
    object[attribute.key] = attribute.value;
  }
  return object;
};

export const getEventStruct = async (
  program: anchor.Program<Alpiners>,
  seed: anchor.BN
) => {
  const events = await program.account.event.all([
    {
      memcmp: {
        offset: 8 + 32, // discriminator + admin pubkey offset
        bytes: numbertoBase58(seed),
      },
    },
  ]);
  return events[0];
};

export const getLastEventStructFromAdmin = async (
  program: anchor.Program<Alpiners>,
  admin: anchor.web3.PublicKey
) => {
  const events = await program.account.event.all([
    {
      memcmp: {
        offset: 8, //discriminator offset
        bytes: admin.toBase58(),
      },
    },
  ]);

  const sortedEvents = events.sort((a, b) =>
    a.account.creationDate > b.account.creationDate ? 1 : -1
  );

  return sortedEvents[sortedEvents.length - 1];
};

export const getPreviousEventStructFromAdmin = async (
  program: anchor.Program<Alpiners>,
  admin: anchor.web3.PublicKey,
  currentEvent: anchor.web3.PublicKey
) => {
  const events = await program.account.event.all([
    {
      memcmp: {
        offset: 8, //discriminator offset
        bytes: admin.toBase58(),
      },
    },
  ]);

  const sortedEvents = events.sort((a, b) =>
    a.account.creationDate > b.account.creationDate ? 1 : -1
  );

  const currentEventIndex = sortedEvents.findIndex(
    (event) => event?.publicKey.toBase58() === currentEvent.toBase58()
  );

  return currentEventIndex > 0
    ? sortedEvents[currentEventIndex - 1]
    : undefined;
};

export const getAssetByOwner = async (
  umi: Context,
  owner: PublicKey,
  collection: PublicKey
): Promise<AssetV1 | null> => {
  const assets = await fetchAssetsByCollection(umi, collection.toString(), {
    skipDerivePlugins: false,
  });

  return assets.find((asset) => asset.owner.toString() === owner.toString());
};

export const getReferrerAsset = async (
  umi: Context,
  asset: PublicKey,
  collection: PublicKey
): Promise<AssetV1 | null> => {
  const assetData = await fetchAsset(umi, asset.toString(), {
    skipDerivePlugins: false,
  });
  const attributesAsset = getAssetAttributes(assetData);

  let referrerAsset =
    attributesAsset["referrer"] !== "None"
      ? await getAssetByOwner(umi, attributesAsset["referrer"], collection)
      : null;

  return referrerAsset;
};
