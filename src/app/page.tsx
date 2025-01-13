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

  const [escrowAccounts, setEscrowAccounts] = useState([]);
  const [escrowAccountsDepositAmount, setEscrowAccountsDepositAmount] =
    useState([]);

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

  const getEscrowAccounts = async () => {
    const anchorProvider = getProvider(connection, wallet);
    const program = new Program<EscrowProgram>(
      programInfo.idl_object,
      anchorProvider
    );
    const res = await program.account.escrow.all();

    const getLLoggedWalletEscrowAccounts = res?.filter(
      // @ts-ignore
      (r) => {
        getMintInfo(r.account.mintA).then((rp) => {
          isToken2022(rp.address).then((rpp) => {
            const tokenProgram = rpp ? TOKEN_2022_PROGRAM_ID : TOKEN_PROGRAM_ID;
            const vault = getAssociatedTokenAddressSync(
              r.account.mintA,
              r.publicKey,
              true,
              tokenProgram
            );
            connection.getTokenAccountBalance(vault).then((result) => {
              //@ts-ignore
              setEscrowAccountsDepositAmount((prevValues) => [
                ...prevValues,
                result.value.uiAmountString,
              ]);
            });
          });
        });

        // @ts-ignore
        const bigNum = r.account.receiveAmount;

        // Convert to a standard integer
        // const intValue = bigNum.toNumber();
        // console.log(intValue / Math.pow(10, 6));
        return (
          r.account.maker.toBase58() === wallet.publicKey?.toBase58() ||
          r.account.taker.toBase58() === wallet.publicKey?.toBase58()
        );
      }
    );
    // @ts-ignore
    setEscrowAccounts(getLLoggedWalletEscrowAccounts);
  };

  useEffect(() => {
    if (wallet.publicKey) {
      getEscrowAccounts();
    }
  }, [wallet.publicKey]);

  // console.log(escrowAccounts);

  async function cancel(
    sentMintAddress: PublicKey,
    receiveMintAddress: PublicKey,
    maker: PublicKey,
    taker: PublicKey
  ) {
    const anchorProvider = getProvider(connection, wallet);
    const program = new Program<EscrowProgram>(
      programInfo.idl_object,
      anchorProvider
    );
    const tokenProgram = (await isToken2022(sentMintAddress))
      ? TOKEN_2022_PROGRAM_ID
      : TOKEN_PROGRAM_ID;

    const escrow = PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        maker.toBuffer(),
        taker.toBuffer(),
        sentMintAddress.toBuffer(),
        receiveMintAddress.toBuffer(),
      ],
      program.programId
    )[0];

    const vault = getAssociatedTokenAddressSync(
      sentMintAddress,
      escrow,
      true,
      tokenProgram
    );

    const makerAtaA = await getAssociatedTokenAddress(
      sentMintAddress,
      maker,
      false,
      tokenProgram
    );

    try {
      const tx = await program.methods
        .cancelAndRefund()
        .accounts({ tokenProgram })
        .accountsPartial({
          maker,
          mintA: sentMintAddress,
          escrow,
          makerAtaA,
          mintB: receiveMintAddress,
          taker,
          vault,
        })
        .rpc();
      console.log(tx);
    } catch (err) {
      console.log(err);
    }
  }

  async function accept(
    sentMintAddress: PublicKey,
    receiveMintAddress: PublicKey,
    maker: PublicKey,
    taker: PublicKey
  ) {
    const anchorProvider = getProvider(connection, wallet);
    const program = new Program<EscrowProgram>(
      programInfo.idl_object,
      anchorProvider
    );
    const tokenProgramA = (await isToken2022(sentMintAddress))
      ? TOKEN_2022_PROGRAM_ID
      : TOKEN_PROGRAM_ID;

    const escrow = PublicKey.findProgramAddressSync(
      [
        Buffer.from("escrow"),
        maker.toBuffer(),
        taker.toBuffer(),
        sentMintAddress.toBuffer(),
        receiveMintAddress.toBuffer(),
      ],
      program.programId
    )[0];

    const vault = getAssociatedTokenAddressSync(
      sentMintAddress,
      escrow,
      true,
      tokenProgramA
    );

    const makerAtaA = await getAssociatedTokenAddress(
      sentMintAddress,
      maker,
      false,
      tokenProgramA
    );

    const tokenProgramB = (await isToken2022(receiveMintAddress))
      ? TOKEN_2022_PROGRAM_ID
      : TOKEN_PROGRAM_ID;

    const takerAtaB = await getAssociatedTokenAddress(
      receiveMintAddress,
      taker,
      false,
      tokenProgramB
    );
    try {
      const tx = await program.methods
        .takeAndCloseVault()
        .accountsPartial({
          escrow,
          vault,
          maker,
          taker,
          makerAtaA,
          takerAtaB,
          mintA: sentMintAddress,
          mintB: receiveMintAddress,
          tokenProgramMintA: tokenProgramA,
          tokenProgramMintB: tokenProgramB,
        })
        .rpc();
      console.log(tx);
    } catch (err) {
      console.log(err);
    }
  }
  console.log(escrowAccounts, escrowAccountsDepositAmount);

  return (
    <div className="'bg-white mt-[200px]  overflow-scroll w-screen flex flex-wrap gap-4 items-center px-20">
      {escrowAccounts.length > 0 &&
        escrowAccountsDepositAmount.length > 0 &&
        escrowAccounts?.map(({ account }, i) => {
          const isMaker =
            //@ts-ignore
            account.maker.toBase58() === wallet.publicKey?.toBase58();
          return (
            <div
              key={i + "i"}
              className="w-[700px]  flex flex-col gap-2 p-4 border-[2px] bg-black rounded-md"
            >
              <p>
                {" "}
                <span className="font-bold text-white">From:</span>{" "}
                {/* @ts-ignore */}
                {account.maker.toBase58()}
              </p>
              <p>
                <span className="font-bold text-white">To:</span>{" "}
                {/* @ts-ignore */}
                {account.taker.toBase58()}
              </p>
              <p>
                <span className="font-bold text-white">Deposit Mint: </span>
                {/* @ts-ignore */}
                {account.mintA.toBase58()}
              </p>
              {/* @ts-ignore */}
              <p>
                <span className="font-bold text-white">Deposit Amount:</span>{" "}
                {escrowAccountsDepositAmount[i]}
              </p>
              <p>
                <span className="font-bold text-white"> Receive Mint:</span>{" "}
                {/* @ts-ignore */}
                {account.mintB.toBase58()}
              </p>
              <p>
                <span className="font-bold text-white">
                  Receive Amount:
                </span>{" "}
                  {/* @ts-ignore */}
                  {account.receiveAmount.toString() / 1000_000}
                {/* Amount: {account.receiveAmount.toString(16) / Math.pow(10, 6)} */}
              </p>
              <button
                onClick={() => {
                  if (isMaker) {
                    cancel(
                      // @ts-ignore
                      account.mintA,
                      // @ts-ignore
                      account.mintB,
                      // @ts-ignore
                      account.maker,
                      // @ts-ignore
                      account.taker
                    );
                  } else {
                    accept(
                      // @ts-ignore
                      account.mintA,
                      // @ts-ignore
                      account.mintB,
                      // @ts-ignore
                      account.maker,
                      // @ts-ignore
                      account.taker
                    );
                  }
                }}
              >
                {/* @ts-ignore */}
                {isMaker ? "Cancel" : "Accept"}{" "}
              </button>
            </div>
          );
        })}
    </div>
  );
};
export default Page;
