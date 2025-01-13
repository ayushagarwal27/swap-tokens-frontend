"use client";
import React, { useEffect, useState } from "react";
import {
  useWallet,
  useConnection,
  AnchorWallet,
} from "@solana/wallet-adapter-react";
import programInfo from "@/constants/programInfo";
import { BN, Program, web3 } from "@coral-xyz/anchor";
import { EscrowProgram } from "@/solflixProgram/escrow_program";
import { getProvider } from "@/calls/calls";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { useRouter } from "next/navigation";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  getAssociatedTokenAddressSync,
  getMint,
} from "@solana/spl-token";

const Page = () => {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [depositAmount, setDepositAmount] = useState(0);
  const [receiveAmount, setReceiveAmount] = useState(0);
  const [sendMintAddress, setSendMintAddress] = useState("");
  const [receiveMintAddress, setReceiveMintAddress] = useState("");
  const [receiverAddress, setReceiverAddress] = useState("");
  async function deposit() {
    const isToken2022 = async (mint: PublicKey) => {
      const mintInfo = await connection.getAccountInfo(mint);
      return mintInfo?.owner.equals(TOKEN_2022_PROGRAM_ID);
    };

    const getMintInfo = async (mint: PublicKey) => {
      const tokenProgram = (await isToken2022(mint))
        ? TOKEN_2022_PROGRAM_ID
        : TOKEN_PROGRAM_ID;

      return getMint(connection, mint, undefined, tokenProgram);
    };
    try {
      const anchorProvider = getProvider(connection, wallet);
      const program = new Program<EscrowProgram>(
        programInfo.idl_object,
        anchorProvider
      );

      const mintAInfo = await getMintInfo(new PublicKey(sendMintAddress));
      const mintAAmount = new BN(depositAmount).mul(
        new BN(10).pow(new BN(mintAInfo.decimals))
      );
      const mintBInfo = await getMintInfo(new PublicKey(receiveMintAddress));
      const mintBAmount = new BN(receiveAmount).mul(
        new BN(10).pow(new BN(mintBInfo.decimals))
      );

      const tokenProgramSend = (await isToken2022(
        new PublicKey(sendMintAddress)
      ))
        ? TOKEN_2022_PROGRAM_ID
        : TOKEN_PROGRAM_ID;

      const tokenProgramReceive = (await isToken2022(
        new PublicKey(receiveMintAddress)
      ))
        ? TOKEN_2022_PROGRAM_ID
        : TOKEN_PROGRAM_ID;

      const makerAtaA = getAssociatedTokenAddressSync(
        new PublicKey(sendMintAddress),
        wallet.publicKey!,
        false,
        tokenProgramSend
      );
      //       const mkATA = getAssociatedTokenAddressSync(
      //         new PublicKey(sendMintAddress),
      //         wallet.publicKey!,
      //         false,
      //         tokenProgramSend
      //       );
      // lo
      const takerAtaB = await getAssociatedTokenAddress(
        new PublicKey(receiveMintAddress),
        new PublicKey(receiverAddress),
        false,
        tokenProgramReceive
      );

      const escrow = PublicKey.findProgramAddressSync(
        [
          Buffer.from("escrow"),
          wallet.publicKey!.toBuffer(),
          new PublicKey(receiverAddress).toBuffer(),
          new PublicKey(sendMintAddress).toBuffer(),
          new PublicKey(receiveMintAddress).toBuffer(),
        ],
        program.programId
      )[0];

      const vault = getAssociatedTokenAddressSync(
        new PublicKey(sendMintAddress),
        escrow,
        true,
        tokenProgramSend
      );

      const tx = await program.methods
        .initEscrowAndDeposit(mintBAmount, mintAAmount)
        .accountsPartial({
          maker: wallet.publicKey!,
          taker: new PublicKey(receiverAddress),
          mintA: new PublicKey(sendMintAddress),
          mintB: new PublicKey(receiveMintAddress),
          escrow,
          takerAtaB,
          makerAtaA,
          vault,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          tokenProgramMintA: tokenProgramSend,
          tokenProgramMintB: tokenProgramReceive,
        })
        .rpc();
      console.log(tx);
    } catch (err) {
      console.log(err);
    }
  }
  return (
    <div className="'h-screen w-screen flex items-center justify-center mt-[250px]">
      <div className="flex flex-col w-[400px] gap-3 items-center border-[1px] rounded-md border-white p-3">
        <h2 className="font-bold text-xl text-white">Swap Tokens</h2>
        <label className="self-start text-[14px] text-white -mb-1">
          Deposit amount
        </label>
        <input
          placeholder="amount"
          type="number"
          className="p-2 w-full"
          value={depositAmount}
          onChange={(e) => setDepositAmount(Number(e.target.value))}
        />
        <label className="self-start text-[14px] text-white -mb-1">
          Receive amount
        </label>
        <input
          placeholder="amount"
          type="number"
          className="p-2 w-full"
          value={receiveAmount}
          onChange={(e) => setReceiveAmount(Number(e.target.value))}
        />
        <label className="self-start text-[14px] text-white -mb-1">
          Deposit Token Mint Address
        </label>
        <input
          placeholder="send token mint address"
          type="text"
          className="p-2 w-full"
          value={sendMintAddress}
          onChange={(e) => setSendMintAddress(e.target.value)}
        />
        <label className="self-start text-[14px] text-white -mb-1">
          Receive Token Mint Address
        </label>
        <input
          placeholder="receive token mint address"
          type="text"
          className="p-2 w-full"
          value={receiveMintAddress}
          onChange={(e) => setReceiveMintAddress(e.target.value)}
        />
        <label className="self-start text-[14px] text-white -mb-1">{`Receiver's Public Key`}</label>
        <input
          placeholder="user public key"
          type="text"
          className="p-2 w-full"
          value={receiverAddress}
          onChange={(e) => setReceiverAddress(e.target.value)}
        />
        <button
          className="btn btn-primary"
          onClick={deposit}
          disabled={!sendMintAddress || !receiveMintAddress}
        >
          Deposit
        </button>
      </div>
    </div>
  );
};

export default Page;
