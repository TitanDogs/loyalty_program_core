import * as anchor from "@coral-xyz/anchor";

const commitment = "confirmed";

export const confirmTx = async (signature: string) => {
  const latestBlockhash = await anchor
    .getProvider()
    .connection.getLatestBlockhash();
  await anchor.getProvider().connection.confirmTransaction(
    {
      signature,
      ...latestBlockhash,
    },
    commitment
  );
};

export const confirmTxs = async (signatures: string[]) => {
  await Promise.all(signatures.map(confirmTx));
};

export const modifyComputeUnits =
  anchor.web3.ComputeBudgetProgram.setComputeUnitLimit({
    units: 1000000,
  });

export const addPriorityFee =
  anchor.web3.ComputeBudgetProgram.setComputeUnitPrice({
    microLamports: 1,
  });

export const delay = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};
