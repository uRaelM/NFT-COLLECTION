import styles from "../styles/Home.module.css";
import { useMetaplex } from "./useMetaplex";
import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { getMerkleProof } from '@metaplex-foundation/js';

const DEFAULT_GUARD_NAME = null;
export const MintNFTs = ({ onClusterChange }) => {
  const allowList = [
    {
      groupName: "OG",
      wallets: [
      ],
    },
    {
      groupName: "WL",
      wallets: [
      ],
    },
  ];

  const { metaplex } = useMetaplex();
  const wallet = useWallet();

  const [nft, setNft] = useState(null);


  /* ------ Boolean verifications -------- */
  const [isLive, setIsLive ] = useState(true)
  const [hasEnded, setHasEnded ] = useState(false)
  const [addressGateAllowedToMint, setAddressGateAllowedToMint ] = useState(true)
  const [mintLimitReached, setMintLimitReached ] = useState(false)
  const [hasEnoughSol, setHasEnoughSol ] = useState(true)
  const [isSoldOut, setIsSoldOut ] = useState(false)
  const [disableMint, setDisableMint] = useState(true);
  const [mintingInProgress, setMintingInProgress] = useState(false);
  /* ------ Boolean verifications -------- */

  const [groups, setGroups] = useState([]);

  /* Groud created to storage guards */
  const [selectedGroup, setSelectedGroup] = useState(DEFAULT_GUARD_NAME);

  /* ----------- Candy Machine ---------- */
  const [candyMachineLoaded, setCandyMachineLoaded] = useState(false);

  const candyMachineAddress = new PublicKey(
    process.env.NEXT_PUBLIC_CANDY_MACHINE_ID
  );

  let candyMachine;
  let walletBalance;


  const getGuard = (selectedGroup, candyMachine) => {
    if (selectedGroup == DEFAULT_GUARD_NAME) {
      return candyMachine.candyGuard.guards;
    }

    const group = candyMachine.candyGuard.groups.find((group) => {
      return group.label == selectedGroup;
    });

    /* If there are no guards */
    if (!group) {
      console.error(selectedGroup + " group not found. Defaulting to public");
      return candyMachine.candyGuard.guards;
    }

    return group.guards;
  };

  useEffect(() => {
    if (mintingInProgress) {
      return;
    }
    checkEligibility();
  }, [selectedGroup, mintingInProgress])



  /* ----------------------------------------------------------------------------
  -------------------------------------------------------------------------------
  -------------------------------------------------------------------------------
  -------------------------------------------------------------------------------
  -------------------------------------------------------------------------------
  -------------------------------------------------------------------------------
  -Real code starts: */


  const checkEligibility = async () => {
    //wallet not connected?
    if (!wallet.connected) {
      setDisableMint(true);
      return;
    }

    // read candy machine state from chain
    candyMachine = await metaplex
      .candyMachines()
      .findByAddress({ address: candyMachineAddress });
    
    setCandyMachineLoaded(true);

    const guardGroups = candyMachine.candyGuard.groups.map((group) => {
      return group.label;
    });
    if (groups.join(",") != guardGroups.join(",")) {
      setGroups(guardGroups);
      if (selectedGroup === DEFAULT_GUARD_NAME) {
        setSelectedGroup(guardGroups[0]);
      }
    }

    // enough items available?
    // If the number is Negative there is enought items available
    // If the number is Positive there isn't enought items available
    if (
      candyMachine.itemsMinted.toString(10) - candyMachine.itemsAvailable.toString(10) >= 0
    ) {
      console.error("not enough items available");
      setDisableMint(true);
      setIsSoldOut(true);
      return;
    }

    const guard = getGuard(selectedGroup, candyMachine);

    if (guard.addressGate != null) {
      if (metaplex.identity().publicKey.toBase58() != guard.addressGate.address.toBase58()) {
        console.error("addressGate: You are not allowed to mint");
        setDisableMint(true);
        setAddressGateAllowedToMint(false)
        return;
      }
    }

    if (guard.mintLimit != null) {
      const mitLimitCounter = metaplex.candyMachines().pdas().mintLimitCounter({
        id: guard.mintLimit.id,
        user: metaplex.identity().publicKey,
        candyMachine: candyMachine.address,
        candyGuard: candyMachine.candyGuard.address,
      });
      //Read Data from chain
      const mintedAmountBuffer = await metaplex.connection.getAccountInfo(mitLimitCounter, "processed");
      let mintedAmount;
      if (mintedAmountBuffer != null) {
        mintedAmount = mintedAmountBuffer.data.readUintLE(0, 1);
      }
      if (mintedAmount != null && mintedAmount >= guard.mintLimit.limit) {
        console.error("mintLimit: mintLimit reached!");
        setDisableMint(true);
        setMintLimitReached(true);
        return;
      }
    }

    if (guard.solPayment != null) {
      walletBalance = await metaplex.connection.getBalance(
        metaplex.identity().publicKey
      );

      const costInLamports = guard.solPayment.amount.basisPoints.toString(10);
deemed
      if (costInLamports > walletBalance) {
        console.error("solPayment: Not enough SOL!");
        setDisableMint(true);
        setHasEnoughSol(false);
        return;
      }
    }

    //good to go! Allow them to mint
    setDisableMint(false);
    setIsLive(true)
    setHasEnded(false)
    setAddressGateAllowedToMint(true)
    setMintLimitReached(false)
    setHasEnoughSol(true)
    setIsSoldOut(false)
  };

  // show and do nothing if no wallet is connected
  if (!wallet.connected) {
    return null;
  }

  const onClick = async () => {
    setMintingInProgress(true);

    try {
      await mintingGroupAllowlistCheck();

      const group = selectedGroup == DEFAULT_GUARD_NAME ? undefined : selectedGroup;
      const { nft } = await metaplex.candyMachines().mint({
        candyMachine,
        collectionUpdateAuthority: candyMachine.authorityAddress,
        ...group && { group },
      });

      setNft(nft);
    } catch(e) {
      throw e;
    } finally {
      setMintingInProgress(false);
    }
  };

  const mintingGroupAllowlistCheck = async () => {
    const group = selectedGroup == DEFAULT_GUARD_NAME ? undefined : selectedGroup;

    const guard = getGuard(selectedGroup, candyMachine);
    if (!guard.allowList) {
      return;
    }

    const groupDetails = allowList.find((group) => {
      return group.groupName == selectedGroup;
    });

    if (!groupDetails) {
      throw new Error(`Cannot mint, as no list of accounts provided for group ${selectedGroup} with allowlist settings enabled`)
    }

    const mintingWallet = metaplex.identity().publicKey.toBase58();

    try {
      await metaplex.candyMachines().callGuardRoute({
        candyMachine,
        guard: 'allowList',
        settings: {
          path: 'proof',
          merkleProof: getMerkleProof(groupDetails.wallets, mintingWallet),
        },
        ...group && { group },
      });
    } catch (e) {
      console.error(`MerkleTreeProofMismatch: Wallet ${mintingWallet} is not allowlisted for minting in the group ${selectedGroup}`);
      throw e;
    }
  }

  const onGroupChanged = (event) => {
    setSelectedGroup(event.target.value);
  };

  const status = candyMachineLoaded && (
    <div className={styles.container}>
      { (isLive && !hasEnded) && <h1 className={styles.title}>Minting Live!</h1> }
      { (isLive && hasEnded) && <h1 className={styles.title}>Minting End!</h1> }
      { !isLive && <h1 className={styles.title}>Minting Not Live!</h1> }
      { !addressGateAllowedToMint && <h1 className={styles.title}>Wallet address not allowed to mint</h1> }
      { mintLimitReached && <h1 className={styles.title}>Minting limit reached</h1> }
      { !hasEnoughSol && <h1 className={styles.title}>Insufficient SOL balance</h1> }
      { isSoldOut && <h1 className={styles.title}>Sold out!</h1> }
    </div>
  );

  return (
    <div>
      <div className={styles.container}>
        <div className={styles.inlineContainer}>
          <h1 className={styles.title}>Network: </h1>
          <select onChange={onClusterChange} className={styles.dropdown}>
            <option value="devnet">Devnet</option>
            <option value="mainnet">Mainnet</option>
            <option value="testnet">Testnet</option>
          </select>
        </div>
        {
          groups.length > 0 &&
          (
            <div className={styles.inlineContainer}>
              <h1 className={styles.title}>Minting Group: </h1>
              <select onChange={onGroupChanged} className={styles.dropdown} defaultValue={selectedGroup}>
                {
                  groups.map(group => {
                    return (
                      <option key={group} value={group}>{group}</option>
                    );
                  })
                }
              </select>
            </div>
          )
        }
      </div>
      <div>
        <div className={styles.container}>
          <h1 className={styles.title}>NFT Mint Address: {nft ? nft.mint.address.toBase58() : "Nothing Minted yet"}</h1>
          { disableMint && status }
          { mintingInProgress && <h1 className={styles.title}>Minting In Progress!</h1> }
          <div className={styles.nftForm}>
            {
              !disableMint && !mintingInProgress && (
                <button onClick={onClick} disabled={disableMint}>
                  Mint NFT
                </button>
              )
            }
          </div>
          {nft && (
            <div className={styles.nftPreview}>
              <h1>{nft.name}</h1>
              <img
                src={nft?.json?.image || "/fallbackImage.jpg"}
                alt="The downloaded illustration of the provided NFT address."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
