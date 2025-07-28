import { GetProgramAccountsConfig, PublicKey } from "@solana/web3.js";
import { httpConnection } from "../../bot";

let config: GetProgramAccountsConfig = {
  commitment: "finalized",
  filters: [
    {
      dataSize: 17,
    },
    {
      memcmp: {
        bytes: "3Mc6vR",
        offset: 4,
      },
    },
  ],
};

httpConnection.getProgramAccounts(
  new PublicKey("TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb"),
  config
);
